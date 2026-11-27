// /api/read-rota with Turnstile switched on: no AI call is made unless Cloudflare confirms the visitor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { call } from "./helpers/fakes.mjs";

let ai = 0, verdict = { success: true, action: "read_rota", hostname: "clockme-two.vercel.app" }; const sent = [];
globalThis.fetch = async (url, opts) => {
  url = String(url);
  if (url.startsWith("https://challenges.cloudflare.com/")) { sent.push(Object.fromEntries(opts.body)); return new Response(JSON.stringify(verdict)); }
  if (url.includes("anthropic")) { ai++; return new Response(JSON.stringify({ content: [{ type: "text", text: '{"shifts":[],"warning":""}' }] })); }
  throw new Error("unexpected fetch " + url);
};
process.env.ANTHROPIC_API_KEY = "k";
process.env.TURNSTILE_SECRET_KEY = "test-secret";
const { default: rota } = await import("../../api/read-rota.js");

test("no check token: 403 check_failed and the AI is never called", async () => {
  const r = await call(rota, "POST", { prompt: "x" });
  assert.equal(r.code, 403); assert.equal(r.body.code, "check_failed"); assert.equal(ai, 0); assert.equal(sent.length, 0);
});

test("Cloudflare rejects the token: 403 and no AI call", async () => {
  verdict = { success: false, "error-codes": ["invalid-input-response"] };
  const r = await call(rota, "POST", { prompt: "x" }, { "x-clockme-check": "bad" });
  assert.equal(r.code, 403); assert.equal(ai, 0); assert.equal(sent.at(-1).response, "bad");
});

test("a token for a different action is refused", async () => {
  verdict = { success: true, action: "signup", hostname: "clockme-two.vercel.app" };
  const r = await call(rota, "POST", { prompt: "x" }, { "x-clockme-check": "t" });
  assert.equal(r.code, 403); assert.equal(ai, 0);
});

test("a confirmed visitor gets through to the rota reader", async () => {
  verdict = { success: true, action: "read_rota", hostname: "clockme-two.vercel.app" };
  const r = await call(rota, "POST", { prompt: "x" }, { "x-clockme-check": "good" });
  assert.equal(r.code, 200); assert.equal(ai, 1); assert.equal(sent.at(-1).remoteip, "1.2.3.4");
});
