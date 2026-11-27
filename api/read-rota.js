// ClockMe: reads a rota photo or text with Claude and returns the shifts as JSON.
// Needs ANTHROPIC_API_KEY set in Vercel (Project → Settings → Environment Variables).
// Until it's set, this answers 503 "not_setup" and the app tells people to paste the rota as text.
// Upstash Redis (optional) caps how often it can be used, so the AI key can't be run up: see lib/ratelimit.js.
import { check, who } from "../lib/ratelimit.js";
// Once ClockMe Pro is set up in Stripe, reading rotas needs Pro (lib/billing.js).
import { proGate } from "../lib/billing.js";
// Cloudflare Turnstile (optional): only real visitors of the ClockMe page can use it. See lib/turnstile.js.
import { verifyTurnstile, clientIp } from "../lib/turnstile.js";

export const config = { maxDuration: 60 };

const n = (v, d) => { const x = parseInt(v, 10); return Number.isFinite(x) && x > 0 ? x : d; };
const PER_HOUR = () => n(process.env.ROTA_PER_HOUR, 15);   // one person, per hour
const PER_DAY = () => n(process.env.ROTA_PER_DAY, 40);     // one person, per day
const ALL_DAY = () => n(process.env.ROTA_DAILY_CAP, 1000); // everyone together, per day

const MODEL = process.env.CLOCKME_MODEL || "claude-sonnet-5-5";
const TYPES = /^image\/(jpeg|png|webp|gif)$/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ code: "method_not_allowed" }); }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ code: "not_setup" });

  // Only the ClockMe site itself may call this.
  const origin = req.headers.origin;
  try { if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ code: "forbidden" }); }
  catch { return res.status(403).json({ code: "forbidden" }); }

  const { prompt, image, mediaType } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) return res.status(400).json({ code: "bad_request" });
  if (image != null && (typeof image !== "string" || image.length > 6_000_000)) return res.status(413).json({ code: "image_too_large" });

  const id = who(req), day = new Date().toISOString().slice(0, 10);
  const lim = await check([
    { key: `rl:rota:h:${id}`, limit: PER_HOUR(), window: 3600, scope: "you" },
    { key: `rl:rota:d:${id}`, limit: PER_DAY(), window: 86400, scope: "you" },
    { key: `rl:rota:all:${day}`, limit: ALL_DAY(), window: 90000, scope: "everyone" },
  ]);
  if (!lim.ok) {
    res.setHeader("Retry-After", String(lim.retryAfter));
    return res.status(429).json({ code: lim.scope === "everyone" ? "busy_today" : "too_many", retryAfter: lim.retryAfter });
  }

  const human = await verifyTurnstile(req.headers["x-clockme-check"], { ip: clientIp(req), action: "read_rota" });
  if (!human.ok) { console.warn(JSON.stringify({ turnstile: "refused", reason: human.reason })); return res.status(403).json({ code: "check_failed" }); }

  const gate = await proGate(req);
  if (gate && !gate.ok) return res.status(402).json({ code: "pro_required" });

  const content = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: TYPES.test(mediaType) ? mediaType : "image/jpeg", data: image } });
  content.push({ type: "text", text: `${prompt}\n\nReply with only the JSON object, no other text.` });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content }] }),
    });
    if (r.status === 429) return res.status(429).json({ code: "rate_limited" });
    if (!r.ok) return res.status(502).json({ code: "upstream_error" });
    const out = await r.json();
    const text = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(422).json({ code: "invalid_json" });
    try { return res.status(200).json(JSON.parse(m[0])); }
    catch { return res.status(422).json({ code: "invalid_json" }); }
  } catch {
    return res.status(502).json({ code: "upstream_error" });
  }
}
