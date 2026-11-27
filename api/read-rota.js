// ClockMe: reads a rota photo or text with Claude and returns the shifts as JSON.
// Needs ANTHROPIC_API_KEY set in Vercel (Project → Settings → Environment Variables).
// Until it's set, this answers 503 "not_setup" and the app tells people to paste the rota as text.
export const config = { maxDuration: 60 };

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
