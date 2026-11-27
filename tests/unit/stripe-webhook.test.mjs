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

test("with Upstash: duplicates are ignored and subscription state is stored per customer", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  const sub = { id: "sub_9", customer: "cus_9", status: "past_due", items: { data: [{ current_period_end: 1800000000, price: { recurring: { interval: "month" } } }] } };
  const body = evt("evt_3", "customer.subscription.updated", sub);
  const a = await (await send(body, signForTest(body, SECRET))).json();
  const b = await (await send(body, signForTest(body, SECRET))).json();
  assert.equal(a.duplicate, undefined); assert.equal(b.duplicate, true);
  const saved = JSON.parse(up.store.get("stripe:sub:cus_9").v);
  assert.equal(saved.status, "past_due"); assert.equal(saved.pro, true); assert.equal(saved.plan, "month");
});
