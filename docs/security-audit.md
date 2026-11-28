# ClockMe security audit

Date: 27–28 November 2026. Scope: everything in this repository (the app in `src/`, the server functions in `api/`
and `lib/`, the build, Vercel settings, GitHub workflows), the Supabase project `wknhfyeruhbynoddeiuo`, the git
history, and the live production and preview sites (read-only checks).

All fixes are on the `dev` branch. Production (`main`) is unchanged until the merge is approved.

## How ClockMe is built (this decides what applies)

- The app keeps everyone's data **on their own device** (browser storage). There are no user accounts or sign-in yet,
  so there are no passwords to store and no "admin" users or pages.
- Three server functions: `/api/read-rota` (reads a rota with Claude), `/api/billing` (Stripe checkout, status,
  portal) and `/api/stripe-webhook` (Stripe events).
- Supabase holds the database for future accounts. It has 8 tables and **0 rows**. Every table only lets a signed-in
  user touch their own rows.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| A1 | The rota endpoint passed any text to Claude: anyone could use the AI key as a free general-purpose AI | High | Fixed |
| A2 | Rate limits were switched off whenever Upstash wasn't connected (it isn't) | High | Fixed |
| S1 | The site published files that were never meant to be public (server code, docs, database SQL, workflows) | Medium | Fixed on `dev` (live in production after merge) |
| X1 | A crafted backup file could plant unsafe values (IDs, colours, icons) into the page | Medium | Fixed |
| A4 | Stripe webhook state could be overwritten by a late event, or by a customer's other subscription | Medium | Fixed |
| A5 | Passcode stored with one fast hash, unlimited guesses, and copied into backup files | Medium | Fixed |
| S2 | Preview and production share one signing secret, so a Pro pass made on a preview works in production | Medium | **Needs Daniel** (Vercel setting) |
| DB1 | The `anon` database role still had table privileges (row level security was blocking it) | Low | Fixed and verified |
| A3 | Stripe return links trusted the `X-Forwarded-Host` header | Low | Fixed |
| X2 | A backup with an unknown setting value stopped the app from drawing | Low | Fixed |
| H1 | Missing security headers: frame-ancestors, object-src, base-uri, form-action, COOP, CORP | Low | Fixed |
| D1 | One outdated package (`@sentry/browser` 11.19.0) | Info | Updated to 11.20.0 |

**Is anything exploitable in production right now?** Checked on 28 Nov: the only secret set in Vercel is
`CLOCKME_SIGNING_SECRET`. No Anthropic key is set, so production's rota endpoint answers "not set up" and A1 and A2
can't be abused today. They would become live the moment the key is added, so merge these fixes first. S1 is live in
production now (server code readable), but no secrets are exposed by it.

Checked and found sound (details below): no API keys in the app, clean git history, no CORS on the API, no debug mode,
all text escaped on every screen, strict Content-Security-Policy, webhook signatures checked, Pro passes signed.

---

## 1. Secrets and environment

**API keys in the app: none.** The only key in the page is the PostHog project token (`phc_…`). It is public by
design: it can send analytics events but can't read any data. Every real secret (Anthropic, Stripe, the pass
signing secret, Turnstile, Upstash) is read only inside `api/` and `lib/` from Vercel environment variables, and
never sent to the browser.

**Environment files.** `.env` and `.env.*` are git-ignored. Only `.env.example` is tracked, and it holds variable
names and harmless defaults only (`ROTA_PER_HOUR=15` and similar). `dist/` and `.vercel/` are now ignored too.

**Git history: clean.** gitleaks 8.30.1 scanned all 12 commits and the working tree: no leaks. The only allowed
exception (in `.gitleaks.toml`) is the public PostHog token, and only in `config/public.json` and the built page.

### S1: files that should never be public were published (Medium)

**What was wrong.** Vercel served the whole repository folder. In production today, for example,
`https://clockme-two.vercel.app/lib/billing.js` returns the server's billing code (checked 28 Nov). On the preview,
`docs/runbooks.md`, the database SQL in `supabase/`, the GitHub workflows and `vercel.json` were also readable. None
of these contain secrets, but they tell an attacker exactly how the server works. Blocking paths one by one (a
denylist) was already in place on `dev` and had already missed some.

**Fix.** An allowlist instead. The build now writes `dist/` with only the 14 files the app needs: `index.html`,
`sw.js`, `manifest.webmanifest`, `icons/*.png`, `vendor/*.js` and `vendor/fonts/*.woff2`. Vercel publishes only
`dist/` (`outputDirectory: "dist"`). The local test server serves the same folder, so the tests run against exactly
what is deployed. The old redirect list is gone.

**Tested by** `tests/unit/build.test.mjs`. It checks that `dist/` contains nothing outside the allowlist, that
`docs`, `supabase`, `src`, `lib`, `api`, `tests`, `.github`, `.env` and `package.json` are absent, and that every
file the page and service worker reference is present. All 186 browser tests run against `dist/`.

### S2: one signing secret for preview and production (Medium, needs Daniel)

`CLOCKME_SIGNING_SECRET` signs the "Pro pass" the app keeps. Vercel shows one value set for both Production and
Preview (checked 28 Nov). So once billing is switched on, a pass made on a preview (with Stripe test cards) would be
accepted in production.

**Fix (Vercel → Settings → Environment Variables):** give Preview its own long random value. Production passes are
unaffected. I haven't changed it myself because it means handling the secret's value.

## 2. Authentication and access

**Admin routes: there are none.** The app has no admin page and no admin API. The three server endpoints are listed
above, and each one protects itself (below). Hiding a route isn't protection anyway: every route has to check who is
calling.

**Accounts, sign-in and roles: not built yet, and nothing needs them today.** All data is on the person's own
device, so no other user can reach it. The database side is ready for accounts:
- Row level security is on for all 8 tables.
- Each table has 4 policies (select, insert, update, delete), for signed-in users only, each limited to rows where
  `user_id = auth.uid()`.
- `delete_my_account()` refuses anyone signed out and deletes only the caller.
- Supabase's sign-in service stores and hashes the passwords itself, so the app never handles them.

Adding sign-in is a product decision, so I haven't added it unasked. When it's added, each user gets their own rows
and nothing else. There is no second role ("admin") to separate.

**What does control access today:**
- **Pro features** need a pass signed with HMAC-SHA256, compared in constant time.
- **Claiming a checkout** only works from the device that started it, and only once Stripe says it's paid.
- **The Stripe webhook** accepts only events signed with the webhook secret (HMAC-SHA256 over the exact raw body,
  constant-time compare, 5-minute tolerance).

### A5: the passcode (Medium)

**What was wrong.**
- The 4-digit passcode was stored as one round of SHA-256. All 10,000 codes can be tried in a fraction of a second,
  and people often reuse a bank-card PIN.
- The lock screen allowed unlimited guesses.
- The hash was copied into every backup file, the copy most likely to be emailed or uploaded somewhere.

**Fix.**
- **Stored only as a slow, salted hash:** PBKDF2-SHA256, 600,000 rounds (OWASP's current figure), 16 random bytes of
  salt per passcode. Format: `pbkdf2$600000$<salt>$<hash>`. One check took about 80 ms on this server. It wasn't
  timed on a phone.
- **Guesses limited:** 5 free tries, then waits of 30 s, 60 s, 2 min and so on, up to 15 min. The count is saved, so
  closing or reloading the app doesn't reset it, and moving the clock back doesn't skip the wait.
- **Left out of backups.** Restoring a backup keeps the passcode already set on that device.
- **Older passcodes still unlock,** and are upgraded to PBKDF2 at that moment.
- A backup can't set an invalid passcode that locks someone out.

**Limits, said plainly.** This is a privacy lock for a shared phone, not encryption. Someone with full access to the
device or browser can read the data without the code. A 4-digit code can never resist a determined offline attack,
even with PBKDF2. The real protections are the guess limit and keeping it out of backups.

**Tested by** `tests/e2e/passcode.spec.mjs`, which covers:
- the stored format and the random salt
- the 5 free tries
- the wait surviving a reload
- typing during the wait being ignored
- the doubling waits and the 15-minute cap
- the clock-moved-back case
- upgrading an old passcode
- backups leaving the passcode out
- a restore keeping the device's passcode

### A4: Stripe webhook state (Medium)

**What was wrong.** The webhook stored the latest subscription state **per customer**, from whichever event arrived
last. Stripe doesn't guarantee the order events arrive in. That caused two problems:
- A late "active" event could arrive after "cancelled" and give back Pro for up to a day.
- A customer with an old cancelled subscription and a new active one could be shut out of Pro for up to a day,
  because the event for the old one overwrote the new one's state.

**Fix.**
- **Stored per subscription:** state is now stored per subscription, in a sorted set ordered by the time Stripe
  created each event, so the newest state always wins whatever order events arrive in. The 5 newest states are
  kept, with a 45-day expiry.
- **Pro check trusts only a recent "has Pro":** the Pro check trusts the stored state only when it is a "has Pro"
  for the pass's own subscription, under a day old. Anything else is checked with Stripe directly, which also
  finds a newer subscription.
- **Failed writes are retried:** if Upstash is connected but the write fails, the webhook answers 500, so Stripe
  sends the event again. Previously the event was marked as seen and then lost.

**Tested by** `tests/unit/stripe-webhook.test.mjs` and `tests/unit/pro-cache.test.mjs`, which cover:
- a late old event
- a customer with two subscriptions
- duplicate events
- the size limit
- a failed write followed by a retry
- non-subscription events
- stale and tied states
- a forged pass

### DB1: database privileges (Low)

**What was wrong.** Supabase's anonymous role (`anon`, used by anyone holding the public API key) still had
select/insert/update/delete privileges on the tables. Row level security had no policies for `anon`, so it was
blocked anyway, but a single mistaken policy later would have opened a table.

**Fix.** Migration `20261127233518_revoke_anon_and_fk_indexes`, applied 27 Nov. It removes every `anon` privilege
on current and future tables and sequences, and adds the two indexes the performance advisor asked for.

**Verified afterwards:**
- `anon` has no privilege on any of the 8 tables.
- `authenticated` keeps its access, still limited by row level security.
- Every table has RLS on with 4 policies.
- Both indexes exist.

The security advisor now reports one item only: `delete_my_account()` can be called by signed-in users. That's
intended: it's how a user deletes their own account, and it refuses anyone signed out.

Both migrations are now in `supabase/migrations/`. The first one was copied from the database's own migration
record, and its MD5 matches.

## 3. Input and API protection

### A1: the rota endpoint was an open AI proxy (High)

**What was wrong.** `/api/read-rota` took a `prompt` of up to 20,000 characters from the browser and sent it
straight to Claude with the ClockMe API key, then returned whatever Claude said. Anyone could call it from a script
and use the key for anything (essays, code, spam), with the bill landing on the key. Rota text could also contain
instructions aimed at Claude.

**Fix.**
- **The server writes the instructions** (`lib/rota.js`). The app now sends only these checked fields:
  - name: up to 80 characters
  - rota text: up to 8,000 characters
  - today's date and the week's start date: both `YYYY-MM-DD`
  - two weekday numbers: 0–6

  Anything else is refused with 400 before Claude is called, and a `prompt` field is ignored.
- **The name is JSON-escaped,** so it can't break out of its quotes. Claude is told the rota text is data, not
  instructions.
- **A photo must be base64** of jpeg, png, webp or gif.
- **Only shift data comes back:** at most 62 shifts, each with:
  - a date (`YYYY-MM-DD`)
  - start and end times (`HH:MM`)
  - a break of 0–720 minutes or none
  - a note of up to 60 characters

  Plus a warning of up to 200 characters. Everything else Claude returns is dropped, and a reply that isn't JSON is
  refused.
- **The on-device prompt** (used inside the Claude app) got the same name-escaping and "data, not instructions" rule.

**Tested by** `tests/unit/rota.test.mjs`, which covers:
- a prompt field being ignored
- the old request shape being refused before any AI call
- every field's type and length check
- name escaping
- output filtering
- the 62-shift cap
- non-JSON replies
- photo checks

### A2: no rate limits in production (High)

**What was wrong.** Limits for the rota endpoint (15 an hour and 40 a day per person, 1,000 a day for everyone) and
for billing (60 per 10 minutes) were only kept in Upstash Redis. Without Upstash they were switched off, and Upstash
isn't connected. Turnstile (the human check) and Stripe billing aren't set up either, so nothing limited the endpoint.

**Fix.** When Upstash is missing, down or slow, the same limits are kept in each server instance's memory.
- **Bounded:** up to 20,000 keys, with the least recently used dropped first, so a flood of new addresses can't reset
  a busy one.
- **Weaker than Upstash, but never off:** each instance counts on its own, and a restart resets its counts. Connect
  Upstash (free tier) for limits shared across instances.
- **The address used** is the one Vercel itself sets, which callers can't fake (Vercel overwrites
  `x-forwarded-for`, `x-real-ip` and `x-vercel-forwarded-for`). It is stored only as a hash.

**Tested by** `tests/unit/ratelimit.test.mjs`. Without Upstash, the 16th read in an hour is refused and other people
aren't affected. Windows reopen on time, memory stays bounded, a flood doesn't reset a busy key, and limits still
hold while Upstash is down.

### A3: Stripe return links (Low)

**What was wrong.** The address Stripe sends people back to after checkout was built from `X-Forwarded-Host`. A
caller could make a genuine ClockMe Stripe checkout page send the payer to another site afterwards. That site would
get a checkout session ID, and it could be used for phishing.

**Fix.** Only the `Host` header is used, because Vercel routes by it, so it is always one of this project's own
domains. Its characters are checked, and the link is always https except on localhost.

**Tested by** `tests/unit/pro-cache.test.mjs`.

### X1 and X2: crafted backup files (Medium, Low)

**What was wrong.** Restoring a backup trusted its contents:
- IDs, colours and icon names are written into the page's markup and styles. A crafted file could plant markup there.
- Keys like `__proto__` were copied.
- An unknown setting (a region that doesn't exist, say) stopped the app from drawing at all.

**Fix.** `cleanData()` runs before any outside data is used. It cleans every restored backup, every older saved
version and every synced copy:
- unsafe IDs are replaced consistently, so links between shifts and jobs are kept
- colours must be hex
- icons must be known
- times must be `HH:MM`
- numbers are made numbers
- settings must be one of their known values
- prototype keys are dropped

**Tested by** `tests/e2e/xss-fuzz.spec.mjs`, test 2. It restores a hostile backup and checks that the restore
applied, the data was cleaned, links between shifts and jobs survived, every tab still draws, and nothing was
injected. Turning `cleanData()` off makes that test fail.

### XSS and forms

- **Everything typed in is escaped on every screen.** `tests/e2e/xss-fuzz.spec.mjs` test 1 adds HTML and script
  payloads to every free-text field the app stores, then opens all 4 tabs, the calendar, every page, 15 windows
  and the rota results. Nothing is injected and nothing runs. Removing the escaping from one job name makes it fail.
- **Content-Security-Policy:**
  - scripts only from the site itself, PostHog's script host, and 3 inline scripts allowed by their exact SHA-256
    hash
  - no `eval`
  - fonts from the site only
  - images from the site or made in the page (`data:`, `blob:`)
  - connections only to the site and PostHog

  An injected `<script>` wouldn't run even if escaping were missed.
- Notifications use `textContent`, never HTML.
- **Server-side checks:** every server input is checked by type, length and pattern (plan IDs, device IDs, email,
  checkout session IDs, pass length, the rota fields above).
- **No cookies:** the app uses no cookies for access, so cross-site request forgery doesn't apply. The API also
  refuses calls whose `Origin` is another site.

## 4. Configuration and headers

**CORS.** The API sends no `Access-Control-Allow-Origin`, so other websites' pages can't read its answers.
Static files are public anyway. A new test fails if CORS is ever added to `vercel.json`.

### H1: security headers (Low)

Already present:
- HSTS: 2 years, subdomains, preload
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- the page's CSP
- `no-store` on the API

Added:

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `upgrade-insecure-requests; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'` | No framing (clickjacking), no plugins, no `<base>` hijack, no form posts to other sites. It adds no fetch rules, so it can't break what the page's own policy allows. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Other windows can't keep a handle on ClockMe's window. Stripe checkout is a full-page redirect, not a popup, so it is unaffected. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Other sites can't embed ClockMe's files. |
| `X-Permitted-Cross-Domain-Policies` | `none` | Old plugin cross-domain loading is refused. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | The app never uses these. Rota photos come from the file picker, which doesn't need the camera permission. |

**Tested by** `tests/unit/build.test.mjs`.

**Debug mode: none.**
- There's no debug switch.
- No source maps are published.
- API errors are short codes only (`bad_request`, `too_many`…), with no stack traces.
- Error monitoring (Sentry) is off until a DSN is set.
- The only server log line (a Stripe event's type and ID) holds no personal data.

## 5. Database and dependencies

**Database:** see DB1. The schema is now in the repo for review.

**Dependencies:**
- `npm audit`: 0 vulnerabilities.
- `npm outdated`: only `@sentry/browser`, now updated from 11.19.0 to 11.20.0 and rebuilt.
- Dependabot checks weekly. CI fails on high-severity advisories.

**Unused packages or files: none found.** All 7 packages are used:
- `jspdf`: PDFs
- `esbuild`: build
- `@sentry/browser`: monitoring bundle
- the two `@fontsource-variable` packages: self-hosted fonts
- `@playwright/test`: browser tests
- `@axe-core/playwright`: accessibility tests

Every tracked file has a job (the README lists them).

## Also fixed during the audit

- **A date-dependent accessibility bug.** When today's chart bar had earnings, its amount was read before the day
  name, so screen readers heard the button's name in a different order from its visible text. It was fixed by
  reordering the markup, with no visual change.

## Test results (28 Nov 2026)

- Unit tests: 54 of 54 passed.
- Browser tests (Chromium, phone and laptop sizes, accessibility in 6 themes, offline, desktop, XSS fuzz, passcode):
  186 of 186 passed.
- Secret scan of history and files: no leaks. Workflow lint (actionlint): clean.
- Build check: the committed build matches the source.
- Safari engine (WebKit) tests run in GitHub CI.

## What still needs Daniel

1. **Separate signing secret for previews (S2).** Vercel → Settings → Environment Variables → give
   `CLOCKME_SIGNING_SECRET` its own value for Preview.
2. **Connect Upstash** (Vercel Marketplace, free tier), so rate limits are shared across server instances.
3. **Optional: Cloudflare Turnstile** (free), so only real visitors of the page can use rota reading.
4. **Approve merging `dev` into `main`,** before adding the Anthropic key. Until then, production still publishes
   its server code (S1), and A1 and A2 would go live as soon as the key is added.
5. **Decide on sign-in.** The database is ready for it (see section 2).
