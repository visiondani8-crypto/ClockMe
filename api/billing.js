// ClockMe Pro: plans, Stripe Checkout, claiming a finished checkout, status, and the customer portal.
//   GET  /api/billing                         -> { ready, trialDays, plans }
//   POST /api/billing { action: "checkout", plan, device, email }   -> { url, id }
//   POST /api/billing { action: "claim", session, device }          -> { pass, sub }
//   POST /api/billing { action: "status", pass }                    -> { pass, sub }
//   POST /api/billing { action: "portal", pass }                    -> { url }
// There are no accounts yet, so the app keeps a signed "pass" (customer + subscription IDs). It travels in backups.
import { billingConfig, publicConfig, stripe, StripeError, signPass, readPass, summary, currentSubscription, trialDays } from "../lib/billing.js";
import { check, who } from "../lib/ratelimit.js";

const DEVICE = /^[a-zA-Z0-9-]{8,64}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-zA-Z]{2,}$/;

// Where Stripe sends people back to. Only the Host header is used: Vercel routes by it, so it is always one of
// this project's own domains. X-Forwarded-Host and X-Forwarded-Proto are ignored, so a caller can't make a real
// ClockMe checkout page send the payer on to another site. Always https, except for local testing.
export function siteOrigin(req) {
  const host = String(req.headers.host || "").toLowerCase();
  if (!/^[a-z0-9.-]{1,253}(:\d{1,5})?$/.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  try { if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ code: "forbidden" }); }
  catch { return res.status(403).json({ code: "forbidden" }); }

  const c = await billingConfig();
  if (req.method === "GET") return res.status(200).json(publicConfig(c));
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ code: "method_not_allowed" }); }
  if (!c.ready) return res.status(503).json({ code: "not_setup" });

  const lim = await check([{ key: `rl:bill:${who(req)}`, limit: 60, window: 600, scope: "you" }]);
  if (!lim.ok) { res.setHeader("Retry-After", String(lim.retryAfter)); return res.status(429).json({ code: "too_many" }); }

  const b = req.body || {};
  try {
    if (b.action === "checkout") {
      const plan = (c.plans || []).find((p) => p.id === b.plan);
      if (!plan || !DEVICE.test(String(b.device || ""))) return res.status(400).json({ code: "bad_request" });
      const site = siteOrigin(req);
      if (!site) return res.status(400).json({ code: "bad_request" });
      const params = {
        mode: "subscription",
        line_items: [{ price: plan.price, quantity: 1 }],
        client_reference_id: b.device,
        success_url: `${site}/?checkout=done&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/?checkout=cancelled`,
        allow_promotion_codes: "true",
        metadata: { app: "clockme", device: b.device },
        subscription_data: { metadata: { app: "clockme", device: b.device } },
      };
      if (trialDays() > 0) params.subscription_data.trial_period_days = trialDays();
      if (typeof b.email === "string" && EMAIL.test(b.email.trim())) params.customer_email = b.email.trim();
      if (process.env.STRIPE_AUTOMATIC_TAX === "on") params.automatic_tax = { enabled: "true" };
      const s = await stripe("POST", "checkout/sessions", params);
      return res.status(200).json({ url: s.url, id: s.id });
    }

    if (b.action === "claim") {
      if (!/^cs_[a-zA-Z0-9_]{10,200}$/.test(String(b.session || "")) || !DEVICE.test(String(b.device || ""))) return res.status(400).json({ code: "bad_request" });
      const s = await stripe("GET", `checkout/sessions/${b.session}`, { expand: ["subscription"] });
      if (s.client_reference_id !== b.device) return res.status(403).json({ code: "not_yours" });
      if (s.status !== "complete" || !s.subscription) return res.status(409).json({ code: "not_finished", status: s.status });
      const sub = typeof s.subscription === "string" ? await stripe("GET", `subscriptions/${s.subscription}`) : s.subscription;
      const pass = signPass({ c: typeof s.customer === "string" ? s.customer : s.customer && s.customer.id, s: sub.id, t: Date.now() });
      return res.status(200).json({ pass, sub: summary(sub) });
    }

    if (b.action === "status" || b.action === "portal") {
      const pass = readPass(b.pass);
      if (!pass) return res.status(401).json({ code: "bad_pass" });
      if (b.action === "status") {
        const sub = await currentSubscription(pass);
        const next = sub && sub.id !== pass.s ? signPass({ c: pass.c, s: sub.id, t: Date.now() }) : b.pass;
        return res.status(200).json({ pass: next, sub: summary(sub) });
      }
      const site = siteOrigin(req);
      if (!site) return res.status(400).json({ code: "bad_request" });
      const params = { customer: pass.c, return_url: `${site}/?portal=back` };
      if (process.env.STRIPE_PORTAL_CONFIGURATION) params.configuration = process.env.STRIPE_PORTAL_CONFIGURATION;
      const p = await stripe("POST", "billing_portal/sessions", params);
      return res.status(200).json({ url: p.url });
    }

    return res.status(400).json({ code: "bad_request" });
  } catch (e) {
    if (e instanceof StripeError && e.status === 404) return res.status(404).json({ code: "not_found" });
    return res.status(502).json({ code: "upstream_error" });
  }
}
