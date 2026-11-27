// Rate limits for ClockMe's server functions, kept in Upstash Redis (REST API, no SDK needed).
// Works with the Vercel Marketplace integration (KV_REST_API_URL / KV_REST_API_TOKEN)
// or a direct Upstash database (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// If Upstash isn't connected, or doesn't answer within 1.5 s, requests are allowed so the app keeps working.
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

// rules: [{ key, limit, window (seconds), scope }]. Each rule is a fixed window that starts at its first hit.
// Returns { ok: true } or { ok: false, scope, retryAfter }.
export async function check(rules) {
  if (!limiterReady() || !rules.length) return { ok: true, skipped: true };
  const cmds = [];
  for (const r of rules) {
    cmds.push(["SET", r.key, "0", "EX", String(r.window), "NX"]);
    cmds.push(["INCR", r.key]);
    cmds.push(["TTL", r.key]);
  }
  const out = await pipeline(cmds);
  if (!Array.isArray(out)) return { ok: true, skipped: true };
  for (let i = 0; i < rules.length; i++) {
    const count = Number(out[i * 3 + 1] && out[i * 3 + 1].result);
    const ttl = Number(out[i * 3 + 2] && out[i * 3 + 2].result);
    if (Number.isFinite(count) && count > rules[i].limit) {
      return { ok: false, scope: rules[i].scope, retryAfter: ttl > 0 ? ttl : rules[i].window };
    }
  }
  return { ok: true };
}
