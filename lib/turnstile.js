// Cloudflare Turnstile: proves a request came from a person using the ClockMe page, not a script.
// Off until TURNSTILE_SECRET_KEY is set in Vercel (and turnstile.siteKey in config/public.json for the page).
// API: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileOn = () => !!process.env.TURNSTILE_SECRET_KEY;

// Returns { ok: true } or { ok: false, reason }. Fails closed: if Cloudflare can't be reached, the request is refused,
// as Cloudflare's own examples do. Rate limits (lib/ratelimit.js) are a separate layer.
export async function verifyTurnstile(token, { ip = "", action = "", hostnames = null, fetchImpl = fetch } = {}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, reason: "missing-input-response" };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  let out;
  try {
    const r = await fetchImpl(VERIFY, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    out = await r.json();
  } catch {
    return { ok: false, reason: "internal-error" };
  }
  if (!out || out.success !== true) return { ok: false, reason: ((out && out["error-codes"]) || []).join(",") || "failed" };
  if (action && out.action !== action) return { ok: false, reason: "wrong-action" };
  const allowed = hostnames || (process.env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(out.hostname)) return { ok: false, reason: "wrong-hostname" };
  return { ok: true };
}

// The visitor's IP as Vercel reports it (first address in x-forwarded-for).
export const clientIp = (req) => String((req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) || "").split(",")[0].trim();
