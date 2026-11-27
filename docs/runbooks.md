# ClockMe runbooks

Plain steps for the things that go wrong or need doing by hand. Checked against the providers' docs on 27 November 2026.

## 1. Environments

| | Development | Preview | Production |
|---|---|---|---|
| Where | your machine, `npm run serve` | every push to any branch except `main` (for example `dev`) | pushes to `main` |
| Address | http://localhost:8787 | `clockme-git-<branch>-visiondani8-crypto.vercel.app`, behind Vercel sign-in | https://clockme-two.vercel.app (and the custom domain once bought) |
| Stripe | none (billing off) | test mode: `sk_test_…` | live mode: `sk_live_…` |
| `CLOCKME_SIGNING_SECRET` | none | its own value | its own value (never the same as Preview) |
| Anthropic, Upstash | optional | same project is fine, with lower caps | full caps |
| Supabase | — | today one project (`wknhfyeruhbynoddeiuo`). Add a second project or a branch before real users sign in. | `wknhfyeruhbynoddeiuo` |

Work goes on `dev`. A pull request from `dev` to `main` runs CI (build check, unit, end-to-end, accessibility, audit, secret scan, CodeQL). Merge only when it's green. Merging deploys to production.

## 2. Roll back a bad release

1. Check that production is really broken: Vercel → clockme → Logs, filter status 5xx for the last 30 minutes, or `vercel logs requests --environment production --query 'httpStatus >= 500 AND httpStatus < 600' --since 30m`.
2. Roll back: Vercel → clockme → Deployments → the previous production deployment → **Instant Rollback**, or run `vercel rollback`. Traffic moves within seconds and nothing is rebuilt.
   - On the Hobby plan you can only go back to the **immediately previous** production deployment. Going further back needs Pro.
3. After a rollback, new pushes to `main` are **not** put live automatically. Fix the bug with `git revert <bad commit>` on `dev`, let CI pass, merge, then run `vercel promote <new deployment>` (or press Promote in the dashboard) to switch automatic releases back on.
4. Check that it worked: run the 5xx log filter again for the last 5 minutes, open the site, and add a test shift.

Shift data lives on each person's device, so rolling back the site never loses it. A release that changes how data is saved must stay able to read the old format.

## 3. Back up and restore the database

The Supabase Free plan has no downloadable daily backups. `.github/workflows/db-backup.yml` makes one every night with `supabase db dump` (roles, schema and data), encrypts it with AES-256 and keeps it for 30 days as a workflow artifact.

**To switch it on**, add two repository secrets (GitHub → Settings → Secrets and variables → Actions):
- `SUPABASE_DB_URL`: Supabase → Connect → Session pooler connection string, with the database password.
- `BACKUP_PASSPHRASE`: a long random passphrase. Store it in your password manager as well; a backup can't be opened without it.

Then run it once by hand (Actions → Database backup → Run workflow) and check that it uploaded a `.gpg` file.

**To restore**, into a new or empty project:
```sh
gpg -d clockme-db-<date>.tar.gz.gpg | tar -xzf - -C restore/     # asks for BACKUP_PASSPHRASE
# Supabase's documented restore order (one transaction, stops at the first error):
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file restore/roles.sql --file restore/schema.sql \
  --command 'SET session_replication_role = replica' --file restore/data.sql \
  --dbname "$TARGET_DB_URL"
```
Afterwards, run the Supabase security advisor and confirm row-level security is on for every public table.

Test a restore into a scratch project once a quarter. A backup that has never been restored hasn't been tested.

## 4. A secret has leaked

1. Revoke it at the provider first: Stripe → Developers → API keys → roll; Anthropic console; Upstash; Cloudflare Turnstile → rotate the secret; Supabase → database password.
2. Put the new value in Vercel (Production and Preview separately), then redeploy.
3. If it was `CLOCKME_SIGNING_SECRET`, every Pro pass stops working. People get theirs back by tapping "Restore purchase", which asks Stripe.
4. If it was ever committed, rotating it is the fix. Rewriting git history doesn't help once a public repository has been cloned.
5. CI's gitleaks job scans every push. Don't add an allowlist entry without a written reason in `.gitleaks.toml`.

## 5. Stripe webhook

1. Stripe → Developers → Webhooks → Add endpoint: `https://<production domain>/api/stripe-webhook`.
2. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`.
3. Copy the signing secret (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET` (Production). Do the same with a test-mode endpoint for Preview.
4. Send a test event from the dashboard. Vercel logs should show `{"stripe_event":…}`. A forged or replayed event gets 400 `bad_signature`.

## 6. Rota-reading costs spike

- Lower `ROTA_DAILY_CAP` (for everyone) or `ROTA_PER_DAY` in Vercel and redeploy. Limits only work once Upstash is connected.
- To stop it completely, remove `ANTHROPIC_API_KEY`. The app tells people to paste the rota as text.
- Turn on Turnstile (add `TURNSTILE_SECRET_KEY` and `turnstile.siteKey`) if the traffic looks automated.
- Set a monthly spend limit in the Anthropic console as a backstop.

## 7. Turn on monitoring (Sentry)

1. Create a free Sentry project (platform: Browser JavaScript; EU data region if offered). In its settings, turn on "Prevent storing of IP addresses".
2. Add to `config/public.json`: `"sentry": {"dsn": "https://…", "productionHosts": ["clockme-two.vercel.app"], "tracesSampleRate": 0.1}`.
3. Run `npm run build`, commit, and push to `dev`. The build adds `/vendor/monitor.min.js` and the Sentry ingest host to the Content-Security-Policy.
4. Before going live, add a line to the privacy notice: errors are reported to Sentry without names, shifts or IP addresses.
