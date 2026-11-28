// Stripe webhook for ClockMe Pro.
// Every request's Stripe-Signature header is checked against the exact raw body with STRIPE_WEBHOOK_SECRET
// (HMAC-SHA256, constant-time compare, 5-minute tolerance) before anything is parsed or trusted.
// Each subscription's recent states are kept in Upstash Redis in a sorted set ordered by when Stripe created the
// event, so an older event that arrives late can never overwrite a newer one, and a customer's other
// subscriptions never affect this one. Pro checks (lib/billing.js) only trust a recent "has Pro" from here.
// Settings: STRIPE_WEBHOOK_SECRET (whsec_…, Sensitive). Upstash is optional: without it, events are verified and acknowledged only.
import { verifyStripeSignature } from "../lib/stripe-signature.js";
import { pipeline, limiterReady } from "../lib/ratelimit.js";
import { summary } from "../lib/billing.js";

const SUB_EVENTS = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"]);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) return json(503, { code: "not_setup" });
  const raw = await request.text();
  if (raw.length > 512 * 1024) return json(413, { code: "too_large" });
  const check = verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret);
  if (!check.ok) return json(400, { code: "bad_signature", reason: check.reason });

  let event;
  try { event = JSON.parse(raw); } catch { return json(400, { code: "bad_json" }); }
  if (!event || typeof event.id !== "string" || typeof event.type !== "string") return json(400, { code: "bad_event" });

  // Stripe retries until it gets a 2xx, so the same event can arrive more than once, and events can arrive out of
  // order. Storing a subscription state is idempotent (the same event is the same member of the set), so a retry is
  // always processed again in full; the event ID is only recorded to report duplicates.
  const obj = event.data && event.data.object;
  const cmds = [];
  if (SUB_EVENTS.has(event.type) && obj && typeof obj.id === "string" && /^sub_\w{1,250}$/.test(obj.id)) {
    const at = Number.isInteger(event.created) && event.created > 0 ? event.created : Math.floor(Date.now() / 1000);
    const key = `stripe:sub:${obj.id}`;
    const state = JSON.stringify({ ...summary(obj), sub: obj.id, event: event.type, evt: event.id, at });
    cmds.push(["ZADD", key, String(at), state], ["ZREMRANGEBYRANK", key, "0", "-6"], ["EXPIRE", key, String(45 * 86400)]);
  }
  cmds.push(["SET", `stripe:evt:${event.id}`, "1", "EX", "604800", "NX"]);
  const out = await pipeline(cmds);
  // Upstash is set up but the write failed: answer 500 so Stripe sends the event again later.
  if (limiterReady() && (!Array.isArray(out) || out.slice(0, -1).some((r) => !r || r.error))) return json(500, { code: "store_failed" });
  const duplicate = Array.isArray(out) && out.at(-1) && out.at(-1).result === null;

  // Logged without personal data: Vercel keeps these in the function logs.
  console.log(JSON.stringify({ stripe_event: event.type, id: event.id, livemode: !!event.livemode }));
  return json(200, duplicate ? { received: true, duplicate: true } : { received: true });
}

export function GET() { return json(405, { code: "method_not_allowed" }); }
