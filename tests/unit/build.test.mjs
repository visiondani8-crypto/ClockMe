import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("the committed build matches the source", () => {
  execFileSync(process.execPath, ["scripts/build.mjs", "--check"], { cwd: new URL("../../", import.meta.url) });
});

test("no secrets in the page", () => {
  for (const re of [/sk_(live|test)_[A-Za-z0-9]{8,}/, /rk_(live|test)_/, /whsec_[A-Za-z0-9]{8,}/, /service_role/i, /SUPABASE_SERVICE/, /ANTHROPIC_API_KEY\s*[:=]\s*['"]sk-/]) assert.ok(!re.test(html), String(re));
});

test("strict CSP: hashed inline scripts, no unsafe-inline or eval for scripts", () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, "CSP meta present");
  const script = m[1].split(";").map(s => s.trim()).find(s => s.startsWith("script-src"));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(script), script);
  assert.equal((script.match(/'sha256-/g) || []).length, (html.match(/<script>/g) || []).length);
  assert.match(m[1], /object-src 'none'/); assert.match(m[1], /base-uri 'none'/);
});

test("jsPDF is self-hosted from the pinned, audited version", () => {
  assert.ok(!html.includes("cdnjs.cloudflare.com"));
  assert.ok(html.includes('<script src="/vendor/jspdf.umd.min.js" defer></script>'));
  assert.ok(existsSync(new URL("../../vendor/jspdf.umd.min.js", import.meta.url)));
  assert.equal(JSON.parse(readFileSync(new URL("../../package.json", import.meta.url))).dependencies.jspdf, "4.2.1");
});

test("optional services stay off until configured: no Sentry or Turnstile script, no extra CSP hosts", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const cfg = JSON.parse(readFileSync(new URL("../../config/public.json", import.meta.url), "utf8"));
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  if (!cfg.sentry) { assert.ok(!html.includes("/vendor/monitor.min.js")); assert.ok(!/sentry\.io/.test(csp)); }
  if (!cfg.turnstile) { assert.ok(!html.includes("challenges.cloudflare.com")); assert.ok(!csp.includes("frame-src")); }
});

test("upgrade-insecure-requests comes from the Vercel header, not the page (Safari applies a <meta> one to localhost)", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.ok(!csp.includes("upgrade-insecure-requests"));
  const v = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  const all = v.headers.find((h) => h.source === "/(.*)").headers;
  const hcsp = all.find((h) => h.key === "Content-Security-Policy").value;
  assert.ok(hcsp.split(";").map((d) => d.trim()).includes("upgrade-insecure-requests"));
  assert.ok(all.some((h) => h.key === "Strict-Transport-Security"));
});

test("security headers: no framing, no plugins, no <base> or off-site form posts, isolated window, no cross-site embedding", () => {
  const v = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  const all = Object.fromEntries(v.headers.find((h) => h.source === "/(.*)").headers.map((h) => [h.key, h.value]));
  const csp = all["Content-Security-Policy"].split(";").map((d) => d.trim());
  for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'"]) assert.ok(csp.includes(d), d);
  // The header policy adds no fetch directives, so it can never block what the page's own <meta> policy allows.
  assert.ok(!csp.some((d) => /^(default|script|style|img|font|connect|worker|manifest)-src/.test(d)));
  assert.equal(all["X-Frame-Options"], "DENY");
  assert.equal(all["X-Content-Type-Options"], "nosniff");
  assert.equal(all["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(all["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(all["X-Permitted-Cross-Domain-Policies"], "none");
  assert.match(all["Strict-Transport-Security"], /max-age=\d{8}/);
  assert.match(all["Permissions-Policy"], /camera=\(\)/, "the app never uses the camera API (photos come from a file picker)");
  const api = v.headers.find((h) => h.source.startsWith("/api")).headers;
  assert.ok(api.some((h) => h.key === "Cache-Control" && h.value.includes("no-store")));
  assert.ok(!JSON.stringify(v).includes("Access-Control-Allow-Origin"), "no CORS: other sites can't read the API");
});

test("only the app's own files are published (dist/ allowlist), and everything they reference is there", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const root = new URL("../../dist/", import.meta.url).pathname;
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const f = `${d}/${e}`; statSync(f).isDirectory() ? walk(f) : files.push(f.slice(root.length).replace(/^\/+/, "")); } };
  walk(root.replace(/\/$/, ""));
  for (const f of files) assert.match(f, /^(index\.html|sw\.js|manifest\.webmanifest|icons\/[\w-]+\.png|vendor\/[\w.-]+\.js|vendor\/fonts\/[\w-]+\.woff2)$/, f);
  for (const bad of ["package.json", "vercel.json", "README.md", "docs", "supabase", "src", "lib", "api", "tests", ".github", ".env", ".git"]) assert.ok(!files.some((f) => f === bad || f.startsWith(bad + "/")), bad);
  const v = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.equal(v.outputDirectory, "dist");
  const html = readFileSync(new URL("../../dist/index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8");
  const refs = new Set([...html.matchAll(/(?:href|src)="\/?((?:icons|vendor)\/[^"?#]+)"/g), ...html.matchAll(/url\(\/?((?:vendor)\/[^)"']+)\)/g), ...sw.matchAll(/"\/((?:icons|vendor)\/[^"]+|manifest\.webmanifest)"/g)].map((m) => m[1]));
  assert.ok(refs.size >= 5, `found ${refs.size} references`);
  for (const r of refs) assert.ok(files.includes(r), `referenced but not published: ${r}`);
  for (const f of ["index.html", "sw.js", "manifest.webmanifest"]) assert.equal(readFileSync(root + f, "utf8"), readFileSync(new URL(`../../${f}`, import.meta.url), "utf8"), `${f} is the built copy`);
});
