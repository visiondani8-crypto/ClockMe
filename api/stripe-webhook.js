// Stripe webhook for ClockMe Pro.
// Every request's Stripe-Signature header is checked against the exact raw body with STRIPE_WEBHOOK_SECRET
// (HMAC-SHA256, constant-time compare, 5-minute tolerance) before anything is parsed or trusted.
// Events are de-duplicated and the latest subscription state per customer is kept in Upstash Redis,
// so Pro checks stay current when someone cancels, renews or a payment fails.
// Settings: STRIPE_WEBHOOK_SECRET (whsec_…, Sensitive). Upstash is optional: without it, events are verified and acknowledged only.
import { verifyStripeSignature } from "../lib/stripe-signature.js";
import { pipeline } from "../lib/ratelimit.js";
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

  // Stripe retries until it gets a 2xx, so the same event can arrive more than once.
  const first = await pipeline([["SET", `stripe:evt:${event.id}`, "1", "EX", "604800", "NX"]]);
  if (Array.isArray(first) && first[0] && first[0].result === null) return json(200, { received: true, duplicate: true });

  const obj = event.data && event.data.object;
  if (SUB_EVENTS.has(event.type) && obj && obj.customer) {
    const customer = typeof obj.customer === "string" ? obj.customer : obj.customer.id;
    const state = { ...summary(obj), sub: obj.id, event: event.type, at: event.created || Math.floor(Date.now() / 1000) };
    await pipeline([["SET", `stripe:sub:${customer}`, JSON.stringify(state), "EX", String(45 * 86400)]]);
  }
  // Logged without personal data: Vercel keeps these in the function logs.
  console.log(JSON.stringify({ stripe_event: event.type, id: event.id, livemode: !!event.livemode }));
  return json(200, { received: true });
}

export function GET() { return json(405, { code: "method_not_allowed" }); }
