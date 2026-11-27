import { test, expect, openApp, cspViolations } from "./fixtures/app.mjs";

const XSS = `<img src=x onerror="window.__pwned=1">"><script>window.__pwned=2</script>`;

test("text people type is shown as text, never run as code", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  await page.evaluate((x) => { S.settings.name = x; S.jobs[0].name = x; S.shifts[0].notes = x; S.goals[0].title = x; S.business.name = x; save(); render(); }, XSS);
  for (const tab of ["home", "shifts", "insights", "profile"]) { await page.click(`[data-tab=${tab}]`); await page.waitForTimeout(200); }
  await page.evaluate(() => { UI.tab = "profile"; UI.stack = [{ page: "jobs" }]; render(); });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.locator("img[src=x]").count()).toBe(0);
  expect(await cspViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("usage stats: nothing is loaded or sent before a yes, and a no keeps it that way", async ({ page }) => {
  const hits = [];
  await page.route(/posthog\.com/, (r) => { hits.push(r.request().url()); return r.fulfill({ status: 200, contentType: "application/javascript", body: "" }); });
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("clockme-stats"));
  await openApp(page, { seed: true, stats: "" });
  await page.evaluate(() => localStorage.removeItem("clockme-stats"));
  await page.reload();
  await expect(page.locator(".statsask")).toBeVisible();
  expect(hits).toEqual([]);
  await page.click("[data-act=statsNo]");
  await page.reload(); await page.waitForTimeout(500);
  expect(hits).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("clockme-stats"))).toBe("no");
});

test("usage stats: a yes loads PostHog from the EU host only", async ({ page }) => {
  const hits = [];
  await page.route(/posthog\.com/, (r) => { hits.push(r.request().url()); return r.fulfill({ status: 200, contentType: "application/javascript", body: "" }); });
  await openApp(page, { seed: true, stats: "" });
  await page.evaluate(() => localStorage.removeItem("clockme-stats"));
  await page.reload();
  await page.click("[data-act=statsYes]");
  await expect.poll(() => hits.length).toBeGreaterThan(0);
  for (const h of hits) expect(h).toMatch(/^https:\/\/eu(-assets)?\.i\.posthog\.com\//);
});
