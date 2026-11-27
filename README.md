# ClockMe

Live: https://clockme-two.vercel.app

Track your shifts and see exactly what you'll be paid, with Polo the mascot.

- `index.html`: the whole app (one file: layout, styles and code)
- `api/read-rota.js`: reads a rota photo or text on the server (needs `ANTHROPIC_API_KEY`)
- `manifest.webmanifest`, `sw.js`, `icons/`: install to the home screen and open offline
- `vercel.json`: security headers and caching

Hosted on Vercel. Every push to `main` deploys automatically.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns on reading rota photos. Without it the app asks people to paste the rota as text. |
| `CLOCKME_MODEL` | Optional. The Claude model used for rota reading. |

## Usage stats (PostHog, EU Cloud)

After setup, Home asks once whether to share anonymous usage stats, and Profile → Account & privacy has a switch for it.
Nothing loads or is stored until the person says yes. Events record which features get used
(shift_saved, clocked_in, rota_read, invoice_saved, tab_opened and similar). They never include names, emails, pay, rates, tax or notes.
Autocapture, heatmaps and session replay are off. The project token is public by design and is set in the build (site.env).

## Rate limits (Upstash Redis, optional)

`api/read-rota.js` caps rota reading so the AI key can't be run up: 15 an hour and 40 a day per person,
1,000 a day for everyone together. People are counted by a hashed IP, never the raw address.
Connect Upstash for Redis from the Vercel Marketplace (it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`),
or set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` yourself. Change the caps with
`ROTA_PER_HOUR`, `ROTA_PER_DAY` and `ROTA_DAILY_CAP`. Without Upstash the limits are simply off.

## ClockMe Pro (Stripe)

Pro (£2.99 a month or £19.99 a year, 7-day free trial) unlocks rota reading, invoices and payslip checks on the website.
`api/billing.js` makes Stripe Checkout sessions, confirms finished ones, checks status and opens the customer portal.
There are no accounts yet, so the device keeps a signed pass (customer + subscription IDs) that also travels in backups.
Prices are found by lookup key (`clockme_pro_monthly`, `clockme_pro_yearly`), so test and live keys need no code change.

Environment variables: `STRIPE_SECRET_KEY` (required), `CLOCKME_SIGNING_SECRET` (set), `STRIPE_PORTAL_CONFIGURATION`
(optional), `PRO_TRIAL_DAYS` (default 7), `STRIPE_AUTOMATIC_TAX=on` once VAT registered.
Until the key is set and the prices exist, nothing is locked.
