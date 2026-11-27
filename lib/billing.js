// ClockMe Pro billing: a small Stripe REST client, signed passes, and subscription status.
// Settings (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY        sk_test_… or sk_live_… (or a restricted key with Checkout, Subscriptions,
//                            Prices and Customer portal access)
//   CLOCKME_SIGNING_SECRET   any long random string; signs the passes the app keeps
//   STRIPE_PORTAL_CONFIGURATION (optional) bpc_… for the customer portal
//   PRO_TRIAL_DAYS (optional, default 7), STRIPE_AUTOMATIC_TAX (optional, "on" once VAT registered)
// Prices are found by lookup key, so test and live keys both work without code changes.
import { createHmac, timingSafeEqual } from "node:crypto";

export const LOOKUP = { monthly: "clockme_pro_monthly", yearly: "clockme_pro_yearly" };
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

const key = () => process.env.STRIPE_SECRET_KEY || "";
const secret = () => process.env.CLOCKME_SIGNING_SECRET || "";
export const trialDays = () => { const n = parseInt(process.env.PRO_TRIAL_DAYS || "7", 10); return Number.isFinite(n) && n >= 0 ? n : 7; };

// --- Stripe REST (form-encoded, no SDK) ---
function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" ? form(x, `${name}[${i}]`, out) : out.push([`${name}[]`, String(x)])));
    else if (typeof v === "object") form(v, name, out);
    else out.push([name, String(v)]);
  }
  return out;
}

export class StripeError extends Error {
  constructor(status, body) { super((body && body.error && body.error.message) || `Stripe ${status}`); this.status = status; this.body = body; }
}

export async function stripe(method, path, params) {
  const pairs = form(params);
  const qs = new URLSearchParams(pairs).toString();
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && qs ? `?${qs}` : ""}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key()}`, ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }) },
    body: method === "GET" ? undefined : qs,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new StripeError(r.status, body);
  return body;
}

// --- Plans (cached for 5 minutes per server instance) ---
let cache = { at: 0, data: null };
export async function billingConfig() {
  if (!key() || !secret()) return { ready: false };
  if (cache.data && Date.now() - cache.at < 300000) return cache.data;
  try {
    const list = await stripe("GET", "prices", { lookup_keys: Object.values(LOOKUP), active: "true", limit: 10 });
    const by = Object.fromEntries((list.data || []).map((p) => [p.lookup_key, p]));
    const plans = Object.entries(LOOKUP)
      .filter(([, lk]) => by[lk])
      .map(([id, lk]) => ({ id, price: by[lk].id, amount: by[lk].unit_amount, currency: by[lk].currency, interval: by[lk].recurring && by[lk].recurring.interval }));
    const data = { ready: plans.length > 0, trialDays: trialDays(), plans, live: !key().startsWith("sk_test") && !key().startsWith("rk_test") };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return { ready: false, error: true };
  }
}
export const publicConfig = (c) => ({ ready: !!c.ready, trialDays: c.trialDays || 0, live: !!c.live, plans: (c.plans || []).map(({ id, amount, currency, interval }) => ({ id, amount, currency, interval })) });

// --- Signed passes: base64url(JSON).base64url(HMAC) ---
const b64u = (b) => Buffer.from(b).toString("base64url");
export function signPass(data) {
  const body = b64u(JSON.stringify({ ...data, v: 1 }));
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}
export function readPass(token) {
  if (!secret() || typeof token !== "string" || token.length > 800 || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const want = createHmac("sha256", secret()).update(body).digest();
  let got; try { got = Buffer.from(mac, "base64url"); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { const d = JSON.parse(Buffer.from(body, "base64url").toString()); return d && d.c && d.s ? d : null; } catch { return null; }
}

// --- Subscription summary the app can show ---
export function summary(sub) {
  if (!sub) return { pro: false, status: "none" };
  const item = sub.items && sub.items.data && sub.items.data[0];
  const until = sub.current_period_end || (item && item.current_period_end) || null;
  return {
    pro: PRO_STATUSES.has(sub.status),
    status: sub.status,
    until,
    trialEnd: sub.trial_end || null,
    cancelAt: sub.cancel_at || null,
    cancelling: !!sub.cancel_at_period_end || !!sub.cancel_at,
    plan: item && item.price && item.price.recurring ? item.price.recurring.interval : null,
  };
}

// The newest subscription for this customer that still gives Pro, if the one on the pass has ended.
export async function currentSubscription(pass) {
  let sub = null;
  try { sub = await stripe("GET", `subscriptions/${encodeURIComponent(pass.s)}`); } catch (e) { if (!(e instanceof StripeError) || e.status !== 404) throw e; }
  if (sub && PRO_STATUSES.has(sub.status)) return sub;
  const list = await stripe("GET", "subscriptions", { customer: pass.c, status: "all", limit: 10 });
  const live = (list.data || []).filter((s) => PRO_STATUSES.has(s.status)).sort((a, b) => b.created - a.created)[0];
  return live || sub;
}

// For other functions (rota reading): is this request from someone with Pro? Returns null when billing is off.
export async function proGate(req) {
  const c = await billingConfig();
  if (!c.ready) return null;
  const pass = readPass(req.headers["x-clockme-pass"]);
  if (!pass) return { ok: false };
  try { const s = summary(await currentSubscription(pass)); return { ok: s.pro }; }
  catch { return { ok: true, degraded: true }; } // Stripe unreachable: don't punish paying users
}
