# ClockMe

Live: https://clockme-two.vercel.app

Track your shifts and see exactly what you'll be paid, with Polo the mascot.

- `src/`: the app's source (template, `app.js`, `styles/`, `monitor.js`). Edit here, then run `npm run build`.
- `index.html`, `vendor/`: the built site (committed; CI and Vercel check it matches `src/`)
- `dist/`: what is actually published, made by the build from an allowlist (the page, service worker, manifest, icons, vendor files). Nothing else in the repo is ever served.
- `api/`: server functions: `read-rota.js` (AI rota reading), `billing.js` (Stripe), `stripe-webhook.js`
- `lib/`: shared server code: rate limits, billing, the rota-reading instructions (`rota.js`), Stripe signature check, Turnstile
- `tests/`: unit tests (`node --test`) and end-to-end, accessibility and responsive tests (Playwright + axe)
- `.github/`: CI, CodeQL, Dependabot and the nightly encrypted database backup
- `supabase/migrations/`: the database changes that have been applied, in order (schema, row level security)
- `docs/runbooks.md`: environments, rollback, backup and restore, leaked secrets, webhooks, cost spikes
- `manifest.webmanifest`, `sw.js`, `icons/`: install to the home screen and open offline
- `vercel.json`: security headers, caching, the build check, and `outputDirectory: dist`
- `docs/security-audit.md`: the security audit: every finding, its fix and how it was tested

Hosted on Vercel. Work on `dev` (preview deployments). Merging to `main` deploys to production.

## Working on it

```sh
npm ci
npm run build        # src/ → index.html and vendor/
npm run serve        # http://localhost:8787 with the api/ functions
npm test             # unit + end-to-end (run `npx playwright install chromium` once first)
npm run audit        # dependency vulnerabilities (high and above fail)
```

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns on reading rota photos. Without it the app asks people to paste the rota as text. |
| `CLOCKME_MODEL` | Optional. The Claude model used for rota reading. |

## Usage stats (PostHog, EU Cloud)

After setup, Home asks once whether to share anonymous usage stats, and Profile → Account & privacy has a switch for it.
Nothing loads or is stored until the person says yes. Events record which features get used
(shift_saved, clocked_in, rota_read, invoice_saved, tab_opened and similar). They never include names, emails, pay, rates, tax or notes.
Autocapture, heatmaps and session replay are off. The project token is public by design and is set in `config/public.json`.

## Rate limits (Upstash Redis, optional)

`api/read-rota.js` caps rota reading so the AI key can't be run up: 15 an hour and 40 a day per person,
1,000 a day for everyone together. People are counted by a hashed IP, never the raw address.
Connect Upstash for Redis from the Vercel Marketplace (it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`),
or set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` yourself. Change the caps with
`ROTA_PER_HOUR`, `ROTA_PER_DAY` and `ROTA_DAILY_CAP`. Without Upstash (or while it's down) the same limits are kept
in each server instance's memory instead: weaker, because each instance counts separately and restarts reset it,
but never off.

## ClockMe Pro (Stripe)

Pro (£2.99 a month or £19.99 a year, 7-day free trial) unlocks rota reading, invoices and payslip checks on the website.
`api/billing.js` makes Stripe Checkout sessions, confirms finished ones, checks status and opens the customer portal.
There are no accounts yet, so the device keeps a signed pass (customer + subscription IDs) that also travels in backups.
Prices are found by lookup key (`clockme_pro_monthly`, `clockme_pro_yearly`), so test and live keys need no code change.

Environment variables: `STRIPE_SECRET_KEY` (required), `CLOCKME_SIGNING_SECRET` (set), `STRIPE_PORTAL_CONFIGURATION`
(optional), `PRO_TRIAL_DAYS` (default 7), `STRIPE_AUTOMATIC_TAX=on` once VAT registered.
Until the key is set and the prices exist, nothing is locked.

## Optional services, off until configured

- **Sentry** (errors and performance): add `sentry.dsn` to `config/public.json`. See `docs/runbooks.md` §7.
- **Cloudflare Turnstile** (bot check on rota reading): `turnstile.siteKey` in `config/public.json` and `TURNSTILE_SECRET_KEY` in Vercel.

Every server setting is listed in `.env.example`.
