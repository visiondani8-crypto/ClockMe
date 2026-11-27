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
