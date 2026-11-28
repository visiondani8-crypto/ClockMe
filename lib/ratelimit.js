// Rate limits for ClockMe's server functions, kept in Upstash Redis (REST API, no SDK needed).
// Works with the Vercel Marketplace integration (KV_REST_API_URL / KV_REST_API_TOKEN)
// or a direct Upstash database (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// If Upstash isn't connected, or doesn't answer within 1.5 s, the same limits are kept in this server instance's
// memory instead. That's weaker (each instance counts on its own, and counts reset when it restarts), but the
// endpoints are never left without any limit.
import { createHash } from "node:crypto";

const env = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
});

export const limiterReady = () => { const e = env(); return !!(e.url && e.token); };

// The caller's IP, hashed so raw addresses are never stored.
export function who(req) {
  const h = req.headers || {};
  const ip = String(h["x-real-ip"] || h["x-vercel-forwarded-for"] || h["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update("clockme|" + ip).digest("hex").slice(0, 24);
}

// Runs Redis commands in one round trip. Returns null if Upstash is missing, down or slow.
export async function pipeline(cmds) {
  if (!limiterReady()) return null;
  const { url, token } = env();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 1500);
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// In-memory fallback: same fixed windows, per server instance. Capped so it can't grow without bound.
const mem = new Map();
const MEM_MAX = 20000;
export function memoryCheck(rules, now = Date.now()) {
  if (mem.size > MEM_MAX) {
    for (const [k, v] of mem) if (v.reset <= now) mem.delete(k);
    // Still full: drop the least recently used entries (the Map is kept in use order below).
    for (const k of mem.keys()) { if (mem.size <= MEM_MAX * 0.9) break; mem.delete(k); }
  }
  let block = null;
  for (const r of rules) {
    let e = mem.get(r.key);
    if (!e || e.reset <= now) e = { count: 0, reset: now + r.window * 1000 };
    mem.delete(r.key); mem.set(r.key, e); // most recently used last
    e.count++;
    if (e.count > r.limit && !block) block = { ok: false, scope: r.scope, retryAfter: Math.max(1, Math.ceil((e.reset - now) / 1000)), memory: true };
  }
  return block || { ok: true, memory: true };
}
export const _resetMemory = () => mem.clear(); // tests only
export const _memorySize = () => mem.size;      // tests only

// rules: [{ key, limit, window (seconds), scope }]. Each rule is a fixed window that starts at its first hit.
// Returns { ok: true } or { ok: false, scope, retryAfter }.
export async function check(rules) {
  if (!rules.length) return { ok: true };
  if (!limiterReady()) return memoryCheck(rules);
  const cmds = [];
  for (const r of rules) {
    cmds.push(["SET", r.key, "0", "EX", String(r.window), "NX"]);
    cmds.push(["INCR", r.key]);
    cmds.push(["TTL", r.key]);
  }
  const out = await pipeline(cmds);
  if (!Array.isArray(out)) return memoryCheck(rules);
  for (let i = 0; i < rules.length; i++) {
    const count = Number(out[i * 3 + 1] && out[i * 3 + 1].result);
    const ttl = Number(out[i * 3 + 2] && out[i * 3 + 2].result);
    if (Number.isFinite(count) && count > rules[i].limit) {
      return { ok: false, scope: rules[i].scope, retryAfter: ttl > 0 ? ttl : rules[i].window };
    }
  }
  return { ok: true };
}
