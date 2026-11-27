// Sentry error monitoring (src/monitor.js, served as /vendor/monitor.min.js). It is off in the committed build
// (no DSN), so this test switches it on with a DSN that points at the local server and catches what would be sent.
import { test, expect, openApp, cspViolations } from "./fixtures/app.mjs";

test("monitoring is off by default: the Sentry bundle is not loaded", async ({ page, problems }) => {
  const loaded = [];
  page.on("request", (r) => { if (r.url().includes("/vendor/monitor.min.js")) loaded.push(r.url()); });
  await openApp(page, { seed: true });
  await page.waitForTimeout(800);
  expect(loaded).toEqual([]);
  expect(await page.evaluate(() => typeof window.ClockMeMonitor)).toBe("undefined");
  expect(problems).toEqual([]);
});

test("with a DSN, errors are reported without personal data, query strings or console text", async ({ page, problems }) => {
  const envelopes = [];
  await page.route("**/api/42/envelope/**", async (r) => { envelopes.push(r.request().postData() || ""); await r.fulfill({ status: 200, body: "{}" }); });
  await openApp(page, { seed: true });
  await page.evaluate(() => history.replaceState(null, "", "/?checkout=done&session_id=cs_test_SHOULD_NOT_LEAVE"));
  await page.evaluate(() => { window.CLOCKME_CFG.sentry = { dsn: "http://publickey@localhost:8787/42", productionHosts: ["clockme-two.vercel.app"], tracesSampleRate: 0 }; });
  await page.addScriptTag({ url: "/vendor/monitor.min.js" });
  await page.waitForFunction(() => !!window.ClockMeMonitor);
  await page.evaluate(() => { console.log("console text Tesco Express should not leave"); window.ClockMeMonitor.captureException(new Error("monitor-test-error")); });
  await expect.poll(() => envelopes.join("\n").includes("monitor-test-error"), { timeout: 10_000 }).toBe(true);
  const sent = envelopes.join("\n");
  expect(sent).toContain('"environment":"development"');
  expect(sent).not.toContain("cs_test_SHOULD_NOT_LEAVE");
  expect(sent).not.toContain("Tesco Express");
  expect(sent).not.toContain("Mersey Events");
  expect(sent).not.toContain("{{auto}}");
  expect(sent).not.toMatch(/"ip_address"/);
  expect(await cspViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});
