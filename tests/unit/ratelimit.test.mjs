import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeUpstash, call } from "./helpers/fakes.mjs";

const up = fakeUpstash(); let ai = 0;
globalThis.fetch = async (url, opts) => {
  url = String(url);
  if (url.startsWith("https://upstash.test")) return up.handle(url, opts);
  if (url.includes("anthropic")) { ai++; return new Response(JSON.stringify({ content: [{ type: "text", text: '{"shifts":[],"warning":""}' }] }), { status: 200 }); }
  throw new Error("unexpected fetch " + url);
};
process.env.ANTHROPIC_API_KEY = "k";
const { default: rota } = await import("../../api/read-rota.js");
const lim = await import("../../lib/ratelimit.js");

test("without Upstash, requests go through and limits are off", async () => {
  assert.equal(lim.limiterReady(), false);
  const r = await call(rota, "POST", { prompt: "x" });
  assert.equal(r.code, 200);
});

test("one person is stopped on the 16th read in an hour, with Retry-After", async () => {
  process.env.KV_REST_API_URL = "https://upstash.test"; process.env.KV_REST_API_TOKEN = "tok"; process.env.ROTA_DAILY_CAP = "100";
  const codes = [];
  for (let i = 0; i < 16; i++) codes.push((await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "2.2.2.2" })).code);
  assert.deepEqual(codes.slice(0, 15), Array(15).fill(200));
  const last = await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "2.2.2.2" });
  assert.equal(last.code, 429); assert.equal(last.body.code, "too_many"); assert.ok(Number(last.h["Retry-After"]) > 0);
});

test("the everyone-per-day cap answers busy_today", async () => {
  up.store.clear(); process.env.ROTA_DAILY_CAP = "5";
  let r; for (let i = 0; i < 6; i++) r = await call(rota, "POST", { prompt: "x" }, { "x-real-ip": `9.9.9.${i}` });
  assert.equal(r.code, 429); assert.equal(r.body.code, "busy_today");
});

test("Upstash down, slow or rejecting the token: requests still go through", async () => {
  up.store.clear(); process.env.ROTA_DAILY_CAP = "100";
  up.state.mode = "down"; assert.equal((await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "3.3.3.3" })).code, 200);
  up.state.mode = "slow"; const t = Date.now(); assert.equal((await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "3.3.3.4" })).code, 200); assert.ok(Date.now() - t < 3000);
  up.state.mode = "ok"; process.env.KV_REST_API_TOKEN = "wrong"; assert.equal((await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "3.3.3.5" })).code, 200);
  process.env.KV_REST_API_TOKEN = "tok";
});

test("raw IP addresses are never stored", async () => {
  up.store.clear();
  await call(rota, "POST", { prompt: "x" }, { "x-real-ip": "203.0.113.7" });
  assert.ok(up.store.size > 0);
  for (const k of up.store.keys()) assert.ok(!k.includes("203.0.113.7"), k);
});

test("other sites can't call it, and bad input is refused", async () => {
  assert.equal((await call(rota, "POST", { prompt: "x" }, { origin: "https://evil.example" })).code, 403);
  assert.equal((await call(rota, "POST", { prompt: "" })).code, 400);
  assert.equal((await call(rota, "GET")).code, 405);
});
