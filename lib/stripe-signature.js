// Verifies Stripe's webhook signature header ("t=timestamp,v1=signature[,v1=…]") without the Stripe SDK.
// Signed payload = `${t}.${rawBody}`, HMAC-SHA256 with the endpoint's signing secret (whsec_…).
// See https://docs.stripe.com/webhooks#verify-manually
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStripeSignature(rawBody, header, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret) return { ok: false, reason: "no_secret" };
  if (typeof header !== "string" || !header) return { ok: false, reason: "no_header" };
  let t = null;
  const sigs = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === "t") t = Number(v);
    else if (k === "v1" && /^[0-9a-f]{64}$/i.test(v)) sigs.push(v.toLowerCase());
  }
  if (!Number.isFinite(t)) return { ok: false, reason: "no_timestamp" };
  if (!sigs.length) return { ok: false, reason: "no_v1_signature" };
  if (Math.abs(nowSec - t) > toleranceSec) return { ok: false, reason: "timestamp_out_of_tolerance" };
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest();
  const match = sigs.some((s) => { const b = Buffer.from(s, "hex"); return b.length === expected.length && timingSafeEqual(b, expected); });
  return match ? { ok: true, t } : { ok: false, reason: "signature_mismatch" };
}

// Test helper: builds a valid header the way Stripe does.
export function signForTest(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex")}`;
}
