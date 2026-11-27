// Shared test setup: blocks every outside host unless a test fakes it, and records page errors,
// console errors and Content-Security-Policy violations so each test can assert there were none.
import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

export const SEED = readFileSync(new URL("./seed.js", import.meta.url), "utf8");

export const test = base.extend({
  problems: async ({ page }, use) => {
    const problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|net::ERR/.test(m.text())) problems.push(`console: ${m.text()}`); if (/Content Security Policy|Refused to/.test(m.text())) problems.push(`csp: ${m.text()}`); });
    await page.addInitScript(() => { document.addEventListener("securitypolicyviolation", (e) => { (window.__csp = window.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`); }); });
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await use(problems);
  },
});
export { expect };

export async function openApp(page, { seed = false, stats = "no" } = {}) {
  await page.goto("/");
  await page.evaluate((s) => { localStorage.setItem("clockme-stats", s); }, stats);
  if (seed) { await page.evaluate(SEED); await page.waitForTimeout(300); await page.reload(); }
  await page.waitForFunction(() => typeof window.S === "object" || typeof S === "object");
}
export async function cspViolations(page) { return page.evaluate(() => window.__csp || []); }
