import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeUpstash, call, ROTA } from "./helpers/fakes.mjs";

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

test("without Upstash, the same limits are kept in memory: the 16th read in an hour is refused", async () => {
  assert.equal(lim.limiterReady(), false);
  const codes = [];
  for (let i = 0; i < 16; i++) codes.push((await call(rota, "POST", ROTA, { "x-real-ip": "8.8.4.4" })).code);
  assert.deepEqual(codes.slice(0, 15), Array(15).fill(200));
  assert.equal(codes[15], 429);
  assert.equal((await call(rota, "POST", ROTA, { "x-real-ip": "8.8.4.5" })).code, 200, "someone else is not affected");
  lim._resetMemory();
});

test("the memory limiter keeps fixed windows, reopens after the window, and stays bounded", () => {
  lim._resetMemory();
  const rule = [{ key: "k", limit: 2, window: 60, scope: "you" }];
  const t = 1_000_000;
  assert.equal(lim.memoryCheck(rule, t).ok, true);
  assert.equal(lim.memoryCheck(rule, t + 1).ok, true);
  const no = lim.memoryCheck(rule, t + 2);
  assert.equal(no.ok, false); assert.equal(no.scope, "you"); assert.ok(no.retryAfter >= 59 && no.retryAfter <= 60);
  assert.equal(lim.memoryCheck(rule, t + 60_000).ok, true, "a new window starts after 60 s");
  // A flood of one-off keys can't grow memory without bound, and a key in constant use isn't evicted (so it isn't reset).
  const hot = [{ key: "hot", limit: 1_000_000, window: 600, scope: "everyone" }];
  for (let i = 0; i < 25_000; i++) { lim.memoryCheck([{ key: `x${i}`, limit: 1, window: 600, scope: "you" }], t); if (i % 500 === 0) lim.memoryCheck(hot, t); }
  assert.ok(lim._memorySize() <= 20_001, `size ${lim._memorySize()}`);
  lim._resetMemory();
  const tight = [{ key: "tight", limit: 3, window: 600, scope: "you" }];
  for (let i = 0; i < 3; i++) lim.memoryCheck(tight, t);
  for (let i = 0; i < 25_000; i++) { lim.memoryCheck([{ key: `y${i}`, limit: 1, window: 600, scope: "you" }], t); if (i % 500 === 0) assert.equal(lim.memoryCheck(tight, t).ok, false, "a flood doesn't reset a busy key"); }
  lim._resetMemory();
});

test("one person is stopped on the 16th read in an hour, with Retry-After", async () => {
  process.env.KV_REST_API_URL = "https://upstash.test"; process.env.KV_REST_API_TOKEN = "tok"; process.env.ROTA_DAILY_CAP = "100";
  const codes = [];
  for (let i = 0; i < 16; i++) codes.push((await call(rota, "POST", ROTA, { "x-real-ip": "2.2.2.2" })).code);
  assert.deepEqual(codes.slice(0, 15), Array(15).fill(200));
  const last = await call(rota, "POST", ROTA, { "x-real-ip": "2.2.2.2" });
  assert.equal(last.code, 429); assert.equal(last.body.code, "too_many"); assert.ok(Number(last.h["Retry-After"]) > 0);
});

test("the everyone-per-day cap answers busy_today", async () => {
  up.store.clear(); process.env.ROTA_DAILY_CAP = "5";
  let r; for (let i = 0; i < 6; i++) r = await call(rota, "POST", ROTA, { "x-real-ip": `9.9.9.${i}` });
  assert.equal(r.code, 429); assert.equal(r.body.code, "busy_today");
});

test("Upstash down, slow or rejecting the token: requests still work, with the limits kept in memory", async () => {
  up.store.clear(); process.env.ROTA_DAILY_CAP = "100";
  up.state.mode = "down"; assert.equal((await call(rota, "POST", ROTA, { "x-real-ip": "3.3.3.3" })).code, 200);
  up.state.mode = "slow"; const t = Date.now(); assert.equal((await call(rota, "POST", ROTA, { "x-real-ip": "3.3.3.4" })).code, 200); assert.ok(Date.now() - t < 3000);
  up.state.mode = "ok"; process.env.KV_REST_API_TOKEN = "wrong"; assert.equal((await call(rota, "POST", ROTA, { "x-real-ip": "3.3.3.5" })).code, 200);
  process.env.KV_REST_API_TOKEN = "tok";
  up.state.mode = "down"; const codes = [];
  for (let i = 0; i < 16; i++) codes.push((await call(rota, "POST", ROTA, { "x-real-ip": "3.3.3.9" })).code);
  assert.equal(codes[14], 200); assert.equal(codes[15], 429, "still limited while Upstash is down");
  up.state.mode = "ok"; lim._resetMemory();
});

test("raw IP addresses are never stored", async () => {
  up.store.clear();
  await call(rota, "POST", ROTA, { "x-real-ip": "203.0.113.7" });
  assert.ok(up.store.size > 0);
  for (const k of up.store.keys()) assert.ok(!k.includes("203.0.113.7"), k);
});

test("other sites can't call it, and bad input is refused", async () => {
  assert.equal((await call(rota, "POST", ROTA, { origin: "https://evil.example" })).code, 403);
  assert.equal((await call(rota, "POST", { rota: { ...ROTA.rota, text: "" } })).code, 400);
  assert.equal((await call(rota, "GET")).code, 405);
});
