// Builds index.html from src/ (template, styles, app) and copies pinned vendor files.
// The built index.html is committed so Vercel serves it without a build step.
//   node scripts/build.mjs          write index.html and vendor/
//   node scripts/build.mjs --check  fail if the committed build is out of date (used in CI)
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => join(root, ...x);
const check = process.argv.includes("--check");

const template = readFileSync(p("src/template.html"), "utf8");
const order = JSON.parse(readFileSync(p("src/styles/order.json"), "utf8")).styles;
const styles = order.map((f) => readFileSync(p("src/styles", f), "utf8")).join("");
const app = readFileSync(p("src/app.js"), "utf8");
const publicCfg = JSON.parse(readFileSync(p("config/public.json"), "utf8"));

// Public, non-secret settings only. Secrets never enter this file.
for (const [k, v] of Object.entries({ ...publicCfg.posthog, ...publicCfg.sentry, ...publicCfg.turnstile })) {
  if (/secret/i.test(k) || /sk_live|sk_test|rk_live|whsec_|service_role/i.test(String(v))) throw new Error(`config/public.json looks like it holds a secret (${k})`);
}
// Optional services: switched on only by adding their public settings to config/public.json.
const sentryDsn = publicCfg.sentry && publicCfg.sentry.dsn;
const sentryOrigin = sentryDsn ? new URL(sentryDsn).origin : "";
const turnstileOn = !!(publicCfg.turnstile && publicCfg.turnstile.siteKey);

let html = template.replace("/*__STYLES__*/\n", () => styles).replace("/*__APP__*/\n", () => app);
if (html.includes("/*__STYLES__*/") || html.includes("/*__APP__*/")) throw new Error("template placeholders not replaced");

// Fonts, self-hosted from @fontsource-variable (OFL-1.1): Latin and Latin Extended, variable weight.
const FONTS = [
  ["Rubik", "rubik", "rubik-latin-wght-normal.woff2", "300 900", "latin"],
  ["Rubik", "rubik", "rubik-latin-ext-wght-normal.woff2", "300 900", "latin-ext"],
  ["Bricolage Grotesque", "bricolage-grotesque", "bricolage-grotesque-latin-opsz-normal.woff2", "200 800", "latin"],
  ["Bricolage Grotesque", "bricolage-grotesque", "bricolage-grotesque-latin-ext-opsz-normal.woff2", "200 800", "latin-ext"],
];
const RANGES = {
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext": "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
};
const fontFiles = FONTS.map(([, pkg, file]) => [p(`node_modules/@fontsource-variable/${pkg}/files/${file}`), p(`vendor/fonts/${file}`)]);
for (const [src] of fontFiles) if (!existsSync(src)) throw new Error(`run npm ci first (${src} missing)`);
const fontCss = `<style>${FONTS.map(([fam, , file, w, r]) => `@font-face{font-family:"${fam}";font-style:normal;font-display:swap;font-weight:${w};src:url(/vendor/fonts/${file}) format("woff2");unicode-range:${RANGES[r]}}`).join("")}</style>
<link rel="preload" href="/vendor/fonts/rubik-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>`;

const cfgScript = `<script>window.CLOCKME_CFG=${JSON.stringify(publicCfg)};</script>`;
const swScript = `<script>if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));</script>`;

// Content-Security-Policy: inline scripts are allowed only by their exact hash.
const inline = [];
const collect = (s) => { const m = s.match(/^<script>([\s\S]*)<\/script>$/); if (m) inline.push(m[1]); return s; };
collect(cfgScript); collect(swScript);
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) inline.push(m[1]);
const hashes = [...new Set(inline.map((s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`))];
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")} https://eu-assets.i.posthog.com${turnstileOn ? " https://challenges.cloudflare.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  `connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com${sentryOrigin ? " " + sentryOrigin : ""}`,
  ...(turnstileOn ? ["frame-src https://challenges.cloudflare.com"] : []),
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  // upgrade-insecure-requests is sent as an HTTP header by Vercel (vercel.json), not here: in a <meta> tag,
  // Safari applies it to http://localhost too, which breaks local development and the Safari tests.
].join("; ");

const head = `<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="description" content="Track your shifts and see exactly what you'll be paid. Sunday and night extras, tax, payday, invoices and your rota, with Polo.">
<meta name="theme-color" content="#EAF5FF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#050E1C" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ClockMe">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta property="og:title" content="ClockMe">
<meta property="og:description" content="Every hour, paid right. Track shifts, extras, tax and payday.">
<meta property="og:image" content="/icons/icon-512.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" href="/icons/favicon-64.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
${fontCss}
${cfgScript}
${sentryDsn ? '<script src="/vendor/monitor.min.js" defer></script>\n' : ""}${turnstileOn ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>\n' : ""}`;
if (!html.includes("<title>ClockMe</title>")) throw new Error("template has no <title>ClockMe</title>");
html = html.replace("<title>ClockMe</title>", () => `<title>ClockMe</title>\n${head}`);
const k = html.lastIndexOf("</body>");
html = html.slice(0, k) + swScript + "\n" + html.slice(k);

const vendorSrc = p("node_modules/jspdf/dist/jspdf.umd.min.js");
if (!existsSync(vendorSrc)) throw new Error("run npm ci first (jspdf missing)");
const vendorNow = readFileSync(vendorSrc);
// Sentry, bundled and self-hosted (no third-party script host). esbuild output is deterministic for a pinned version.
const monitor = buildSync({ entryPoints: [p("src/monitor.js")], bundle: true, minify: true, format: "iife", target: "es2020", legalComments: "none", write: false }).outputFiles[0].contents;

if (check) {
  const same = (f, data) => existsSync(f) && Buffer.compare(readFileSync(f), Buffer.from(data)) === 0;
  const stale = [];
  if (!same(p("index.html"), html)) stale.push("index.html");
  if (!same(p("vendor/jspdf.umd.min.js"), vendorNow)) stale.push("vendor/jspdf.umd.min.js");
  if (!same(p("vendor/monitor.min.js"), monitor)) stale.push("vendor/monitor.min.js");
  for (const [src, dst] of fontFiles) if (!same(dst, readFileSync(src))) stale.push(dst.split("/").slice(-3).join("/"));
  if (stale.length) { console.error(`Build is out of date: ${stale.join(", ")}. Run npm run build and commit.`); process.exit(1); }
  console.log("Build is up to date.");
} else {
  writeFileSync(p("index.html"), html);
  mkdirSync(p("vendor"), { recursive: true });
  copyFileSync(vendorSrc, p("vendor/jspdf.umd.min.js"));
  writeFileSync(p("vendor/monitor.min.js"), monitor);
  mkdirSync(p("vendor/fonts"), { recursive: true });
  for (const [src, dst] of fontFiles) copyFileSync(src, dst);
  console.log(`Built index.html (${(html.length / 1024).toFixed(0)} KB, ${hashes.length} inline script hashes), vendor/jspdf.umd.min.js and vendor/monitor.min.js (${(monitor.length / 1024).toFixed(0)} KB, ${sentryDsn ? "on" : "off until a Sentry DSN is set"})`);
}
