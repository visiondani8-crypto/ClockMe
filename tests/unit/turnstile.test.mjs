// Cloudflare Turnstile verification (lib/turnstile.js), with Cloudflare's siteverify faked.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile, clientIp } from "../../lib/turnstile.js";

const fake = (reply, seen = []) => async (url, init) => { seen.push({ url, body: Object.fromEntries(init.body) }); if (reply instanceof Error) throw reply; return { json: async () => reply }; };
beforeEach(() => { delete process.env.TURNSTILE_SECRET_KEY; delete process.env.TURNSTILE_HOSTNAMES; });

test("switched off without a secret: nothing is checked", async () => {
  const seen = [];
  assert.deepEqual(await verifyTurnstile("", { fetchImpl: fake({}, seen) }), { ok: true, skipped: true });
  assert.equal(seen.length, 0);
});

test("a missing or oversized token is refused without calling Cloudflare", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const seen = [];
  assert.equal((await verifyTurnstile(undefined, { fetchImpl: fake({}, seen) })).ok, false);
  assert.equal((await verifyTurnstile("x".repeat(2049), { fetchImpl: fake({}, seen) })).ok, false);
  assert.equal(seen.length, 0);
});

test("a good token passes; secret, token and IP are sent to siteverify", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  const seen = [];
  const r = await verifyTurnstile("tok", { ip: "203.0.113.9", action: "read_rota", fetchImpl: fake({ success: true, action: "read_rota", hostname: "clockme.app", "error-codes": [] }, seen) });
  assert.deepEqual(r, { ok: true });
  assert.equal(seen[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.deepEqual(seen[0].body, { secret: "test-secret", response: "tok", remoteip: "203.0.113.9" });
});

test("Cloudflare saying no, a reused token, the wrong action or the wrong site are all refused", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  assert.equal((await verifyTurnstile("t", { fetchImpl: fake({ success: false, "error-codes": ["invalid-input-response"] }) })).reason, "invalid-input-response");
  assert.equal((await verifyTurnstile("t", { fetchImpl: fake({ success: false, "error-codes": ["timeout-or-duplicate"] }) })).reason, "timeout-or-duplicate");
  assert.equal((await verifyTurnstile("t", { action: "read_rota", fetchImpl: fake({ success: true, action: "login" }) })).reason, "wrong-action");
  process.env.TURNSTILE_HOSTNAMES = "clockme.app, getclockme.com";
  assert.equal((await verifyTurnstile("t", { fetchImpl: fake({ success: true, hostname: "evil.example" }) })).reason, "wrong-hostname");
  assert.equal((await verifyTurnstile("t", { fetchImpl: fake({ success: true, hostname: "getclockme.com" }) })).ok, true);
});

test("if Cloudflare can't be reached, the request is refused (fails closed)", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  assert.deepEqual(await verifyTurnstile("t", { fetchImpl: fake(new Error("network down")) }), { ok: false, reason: "internal-error" });
});

test("client IP is the first x-forwarded-for address", () => {
  assert.equal(clientIp({ headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.1" } }), "198.51.100.4");
  assert.equal(clientIp({ headers: {} }), "");
});
