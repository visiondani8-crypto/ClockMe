import { test } from "node:test";
import assert from "node:assert/strict";
import { call, ROTA } from "./helpers/fakes.mjs";

let subStatus = "trialing"; const calls = [];
const SUB = () => ({ id: "sub_1", status: subStatus, created: 1, trial_end: 1800000000, cancel_at_period_end: false, cancel_at: null, items: { data: [{ current_period_end: 1800000000, price: { recurring: { interval: "year" } } }] } });
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); calls.push([opts.method || "GET", url, opts.body || ""]);
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
  if (url.includes("anthropic")) return J({ content: [{ type: "text", text: '{"shifts":[]}' }] });
  if (!url.startsWith("https://api.stripe.com/")) throw new Error("unexpected " + url);
  if (opts.headers.Authorization !== "Bearer sk_test_x") return J({ error: { message: "bad key" } }, 401);
  const u = new URL(url);
  if (u.pathname === "/v1/prices") return J({ data: [
    { id: "price_m", lookup_key: "clockme_pro_monthly", unit_amount: 299, currency: "gbp", recurring: { interval: "month" } },
    { id: "price_y", lookup_key: "clockme_pro_yearly", unit_amount: 1999, currency: "gbp", recurring: { interval: "year" } }] });
  if (u.pathname === "/v1/checkout/sessions" && opts.method === "POST") return J({ id: "cs_test_abcdefghijkl", url: "https://checkout.stripe.com/c/pay/cs_test_abcdefghijkl" });
  if (u.pathname === "/v1/checkout/sessions/cs_test_abcdefghijkl") return J({ id: "cs_test_abcdefghijkl", status: "complete", client_reference_id: "dev-12345678", customer: "cus_1", subscription: SUB() });
  if (u.pathname === "/v1/checkout/sessions/cs_test_openopenopen") return J({ id: "cs_test_openopenopen", status: "open", client_reference_id: "dev-12345678", subscription: null });
  if (u.pathname === "/v1/subscriptions/sub_1") return J(SUB());
  if (u.pathname === "/v1/subscriptions") return J({ data: [] });
  if (u.pathname === "/v1/billing_portal/sessions") return J({ url: "https://billing.stripe.com/p/session/x" });
  return J({ error: { message: "nf" } }, 404);
};
const { default: bill } = await import("../../api/billing.js");

test("without keys, billing reports not ready and refuses checkout", async () => {
  const r = await call(bill, "GET"); assert.equal(r.code, 200); assert.equal(r.body.ready, false);
  assert.equal((await call(bill, "POST", { action: "checkout", plan: "yearly", device: "dev-12345678" })).code, 503);
});

let pass;
test("with keys: plans come from Stripe lookup keys", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.CLOCKME_SIGNING_SECRET = "s3cret-long-random";
  const r = await call(bill, "GET");
  assert.equal(r.body.ready, true); assert.equal(r.body.trialDays, 7);
  assert.deepEqual(r.body.plans.map(p => [p.id, p.amount]), [["monthly", 299], ["yearly", 1999]]);
  assert.ok(!JSON.stringify(r.body).includes("price_"), "price IDs are not exposed");
});

test("checkout sends the right subscription request", async () => {
  const r = await call(bill, "POST", { action: "checkout", plan: "yearly", device: "dev-12345678", email: "d@example.com" });
  assert.equal(r.code, 200); assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\//);
  const form = decodeURIComponent(calls.find(c => c[0] === "POST" && c[1].endsWith("/checkout/sessions"))[2]);
  for (const s of ["mode=subscription", "line_items[0][price]=price_y", "client_reference_id=dev-12345678", "subscription_data[trial_period_days]=7", "customer_email=d@example.com", "success_url=https://clockme-two.vercel.app/?checkout=done&session_id={CHECKOUT_SESSION_ID}"]) assert.ok(form.includes(s), s);
});

test("claim: only the device that started checkout, only once paid", async () => {
  assert.equal((await call(bill, "POST", { action: "claim", session: "cs_test_abcdefghijkl", device: "someone-else-1" })).body.code, "not_yours");
  assert.equal((await call(bill, "POST", { action: "claim", session: "cs_test_openopenopen", device: "dev-12345678" })).body.code, "not_finished");
  const r = await call(bill, "POST", { action: "claim", session: "cs_test_abcdefghijkl", device: "dev-12345678" });
  assert.equal(r.code, 200); assert.equal(r.body.sub.pro, true); assert.equal(r.body.sub.status, "trialing"); pass = r.body.pass;
});

test("status and portal need a genuine pass; forged passes are refused", async () => {
  assert.equal((await call(bill, "POST", { action: "status", pass })).body.sub.pro, true);
  assert.equal((await call(bill, "POST", { action: "status", pass: pass.split(".")[0] + ".AAAA" })).code, 401);
  assert.match((await call(bill, "POST", { action: "portal", pass })).body.url, /^https:\/\/billing\.stripe\.com\//);
});

test("bad plans and other sites are refused", async () => {
  assert.equal((await call(bill, "POST", { action: "checkout", plan: "lifetime", device: "dev-12345678" })).code, 400);
  assert.equal((await call(bill, "POST", { action: "checkout", plan: "yearly", device: "dev-12345678" }, { origin: "https://evil.example" })).code, 403);
});

test("rota reading needs Pro once billing is on", async () => {
  process.env.ANTHROPIC_API_KEY = "k";
  const { default: rota } = await import("../../api/read-rota.js");
  assert.equal((await call(rota, "POST", ROTA)).body.code, "pro_required");
  assert.equal((await call(rota, "POST", ROTA, { "x-clockme-pass": pass })).code, 200);
  subStatus = "canceled";
  assert.equal((await call(rota, "POST", ROTA, { "x-clockme-pass": pass })).body.code, "pro_required");
});
