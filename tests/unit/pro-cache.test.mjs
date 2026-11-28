import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeUpstash, call } from "./helpers/fakes.mjs";

// Fake Stripe (one customer, cus_1, whose live subscriptions the test sets) and fake Upstash.
const up = fakeUpstash(); const stripeCalls = []; let live = {};
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (url.startsWith("https://upstash.test")) return up.handle(url, opts);
  if (!url.startsWith("https://api.stripe.com/")) throw new Error("unexpected " + url);
  stripeCalls.push(url);
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
  const u = new URL(url);
  if (u.pathname === "/v1/prices") return J({ data: [{ id: "price_m", lookup_key: "clockme_pro_monthly", unit_amount: 299, currency: "gbp", recurring: { interval: "month" } }] });
  const m = u.pathname.match(/^\/v1\/subscriptions\/(.+)$/);
  if (m) return live[m[1]] ? J(live[m[1]]) : J({ error: { message: "nf" } }, 404);
  if (u.pathname === "/v1/subscriptions") return J({ data: Object.values(live) });
  return J({ error: { message: "nf" } }, 404);
};
process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.CLOCKME_SIGNING_SECRET = "s3cret-long-random";
process.env.UPSTASH_REDIS_REST_URL = "https://upstash.test"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
const { proGate, signPass } = await import("../../lib/billing.js");
const { siteOrigin } = await import("../../api/billing.js");
const now = () => Math.floor(Date.now() / 1000);
const store = (subId, state, at) => up.store.set(`stripe:sub:${subId}`, { z: new Map([[JSON.stringify({ sub: subId, ...state, at }), at]]), exp: Infinity });
const gate = (pass) => proGate({ headers: { "x-clockme-pass": pass } });
const passFor = (s) => signPass({ c: "cus_1", s, t: Date.now() });

test("a recent 'has Pro' from the webhook is used without asking Stripe", async () => {
  store("sub_a", { pro: true, status: "active" }, now() - 60);
  stripeCalls.length = 0;
  assert.deepEqual(await gate(passFor("sub_a")), { ok: true, cached: true });
  assert.equal(stripeCalls.filter((u) => u.includes("/subscriptions")).length, 0);
});

test("a stored 'no Pro' is never trusted on its own: Stripe is asked, so a paying customer isn't locked out", async () => {
  store("sub_old", { pro: false, status: "canceled" }, now() - 10);
  live = { sub_old: { id: "sub_old", status: "canceled", created: 1 }, sub_new: { id: "sub_new", status: "active", created: 2 } };
  stripeCalls.length = 0;
  assert.equal((await gate(passFor("sub_old"))).ok, true, "the newer live subscription counts");
  assert.ok(stripeCalls.some((u) => u.includes("/subscriptions")));
  live = { sub_old: { id: "sub_old", status: "canceled", created: 1 } };
  assert.equal((await gate(passFor("sub_old"))).ok, false, "and with nothing live, no Pro");
});

test("a 'has Pro' over a day old, or tied with a 'no Pro' from the same second, is checked with Stripe", async () => {
  live = {};
  store("sub_b", { pro: true, status: "active" }, now() - 90000);
  assert.equal((await gate(passFor("sub_b"))).ok, false);
  const t = now();
  up.store.set("stripe:sub:sub_c", { z: new Map([[JSON.stringify({ sub: "sub_c", pro: true, at: t, evt: "a" }), t], [JSON.stringify({ sub: "sub_c", pro: false, at: t, evt: "b" }), t]]), exp: Infinity });
  assert.equal((await gate(passFor("sub_c"))).ok, false);
});

test("a stored state for a different subscription than the pass's is ignored", async () => {
  live = {};
  up.store.set("stripe:sub:sub_d", { z: new Map([[JSON.stringify({ sub: "sub_other", pro: true, at: now() }), now()]]), exp: Infinity });
  assert.equal((await gate(passFor("sub_d"))).ok, false);
});

test("no pass, or a forged one, gets no Pro", async () => {
  assert.equal((await gate("")).ok, false);
  const p = passFor("sub_a");
  assert.equal((await gate(p.split(".")[0] + ".AAAA")).ok, false);
});

test("Stripe return addresses use only the Host header, always https except locally", () => {
  const o = (headers) => siteOrigin({ headers });
  assert.equal(o({ host: "clockme-two.vercel.app", "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" }), "https://clockme-two.vercel.app");
  assert.equal(o({ host: "localhost:4173" }), "http://localhost:4173");
  assert.equal(o({ host: "evil.example/path?x" }), null);
  assert.equal(o({ host: "a b" }), null);
  assert.equal(o({}), null);
});
