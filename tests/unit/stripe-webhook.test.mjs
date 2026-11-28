import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeUpstash } from "./helpers/fakes.mjs";
import { verifyStripeSignature, signForTest } from "../../lib/stripe-signature.js";

const up = fakeUpstash();
globalThis.fetch = async (url, opts) => { if (String(url).startsWith("https://upstash.test")) return up.handle(url, opts); throw new Error("unexpected " + url); };
const { POST, GET } = await import("../../api/stripe-webhook.js");
const SECRET = "whsec_test_secret";
const evt = (id, type, obj) => JSON.stringify({ id, type, created: Math.floor(Date.now() / 1000), livemode: false, data: { object: obj } });
const send = (body, header) => POST(new Request("https://x/api/stripe-webhook", { method: "POST", headers: header ? { "stripe-signature": header } : {}, body }));

test("signature check: valid, tampered, wrong secret, stale, missing", () => {
  const body = evt("evt_1", "ping", {});
  assert.equal(verifyStripeSignature(body, signForTest(body, SECRET), SECRET).ok, true);
  assert.equal(verifyStripeSignature(body + " ", signForTest(body, SECRET), SECRET).reason, "signature_mismatch");
  assert.equal(verifyStripeSignature(body, signForTest(body, "whsec_other"), SECRET).reason, "signature_mismatch");
  assert.equal(verifyStripeSignature(body, signForTest(body, SECRET, Math.floor(Date.now() / 1000) - 600), SECRET).reason, "timestamp_out_of_tolerance");
  assert.equal(verifyStripeSignature(body, "", SECRET).reason, "no_header");
  assert.equal(verifyStripeSignature(body, "t=1,v1=zz", SECRET).reason, "no_v1_signature");
});

test("not set up until STRIPE_WEBHOOK_SECRET exists", async () => {
  assert.equal((await send("{}", "t=1,v1=" + "a".repeat(64))).status, 503);
});

test("rejects unsigned or tampered events, accepts genuine ones", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  const body = evt("evt_2", "invoice.paid", {});
  assert.equal((await send(body)).status, 400);
  assert.equal((await send(body.replace("invoice.paid", "invoice.voided"), signForTest(body, SECRET))).status, 400);
  const ok = await send(body, signForTest(body, SECRET));
  assert.equal(ok.status, 200); assert.equal((await ok.json()).received, true);
  assert.equal((await GET()).status, 405);
});

const evtT = (id, type, obj, created) => JSON.stringify({ id, type, created, livemode: false, data: { object: obj } });
const sendT = (id, type, obj, created) => { const b = evtT(id, type, obj, created); return send(b, signForTest(b, SECRET)); };
const states = (subId) => { const x = up.store.get(`stripe:sub:${subId}`); return x ? [...x.z].sort((p, q) => q[1] - p[1]).map(([m]) => JSON.parse(m)) : []; };
const now = () => Math.floor(Date.now() / 1000);

test("with Upstash: a subscription's state is stored under that subscription, and a duplicate is reported but harmless", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  const sub = { id: "sub_9", customer: "cus_9", status: "past_due", items: { data: [{ current_period_end: 1800000000, price: { recurring: { interval: "month" } } }] } };
  const body = evt("evt_3", "customer.subscription.updated", sub);
  const a = await (await send(body, signForTest(body, SECRET))).json();
  const b = await (await send(body, signForTest(body, SECRET))).json();
  assert.equal(a.duplicate, undefined); assert.equal(b.duplicate, true);
  const saved = states("sub_9");
  assert.equal(saved.length, 1, "the same event twice is one stored state");
  assert.equal(saved[0].status, "past_due"); assert.equal(saved[0].pro, true); assert.equal(saved[0].plan, "month"); assert.equal(saved[0].sub, "sub_9");
  assert.equal(up.store.get("stripe:sub:cus_9"), undefined, "nothing is keyed by customer any more");
});

test("an older event that arrives late doesn't overwrite a newer one", async () => {
  const t = now();
  await sendT("evt_del", "customer.subscription.deleted", { id: "sub_10", customer: "cus_10", status: "canceled" }, t);
  await sendT("evt_old", "customer.subscription.updated", { id: "sub_10", customer: "cus_10", status: "active" }, t - 30);
  const s = states("sub_10");
  assert.equal(s[0].status, "canceled"); assert.equal(s[0].pro, false);
});

test("a customer's old subscription ending doesn't touch their new one", async () => {
  const t = now();
  await sendT("evt_new", "customer.subscription.created", { id: "sub_new", customer: "cus_11", status: "active" }, t - 5);
  await sendT("evt_end", "customer.subscription.deleted", { id: "sub_oldone", customer: "cus_11", status: "canceled" }, t);
  assert.equal(states("sub_new")[0].pro, true);
  assert.equal(states("sub_oldone")[0].pro, false);
});

test("only the newest few states are kept, with an expiry", async () => {
  const t = now();
  for (let i = 0; i < 9; i++) await sendT(`evt_many_${i}`, "customer.subscription.updated", { id: "sub_12", customer: "cus_12", status: "active" }, t - 100 + i);
  assert.equal(states("sub_12").length, 5);
  assert.ok(up.store.get("stripe:sub:sub_12").exp < Date.now() + 46 * 86400e3);
});

test("if Upstash is set up but the write fails, Stripe is told to retry (500), and the retry is stored", async () => {
  up.state.mode = "error";
  const r = await sendT("evt_retry", "customer.subscription.updated", { id: "sub_13", customer: "cus_13", status: "active" }, now());
  assert.equal(r.status, 500);
  up.state.mode = "ok";
  const again = await sendT("evt_retry", "customer.subscription.updated", { id: "sub_13", customer: "cus_13", status: "active" }, now());
  assert.equal(again.status, 200);
  assert.equal(states("sub_13")[0].pro, true);
});

test("events that aren't subscriptions, or carry a strange ID, store no state", async () => {
  await sendT("evt_odd", "customer.subscription.updated", { id: "cus_14", customer: "cus_14", status: "active" }, now());
  await sendT("evt_inv", "invoice.paid", { id: "in_1", customer: "cus_14" }, now());
  assert.ok(![...up.store.keys()].some((k) => k.includes("cus_14") || k.includes("in_1")));
});
