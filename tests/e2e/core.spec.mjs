import { test, expect, openApp, cspViolations } from "./fixtures/app.mjs";

test("first visit: welcome screen, no errors, no CSP violations", async ({ page, problems }) => {
  await openApp(page);
  await expect(page.locator("[data-act=authSignup]")).toBeVisible();
  expect(await cspViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("setup questions lead to Home and the data is saved on the device", async ({ page, problems }) => {
  await openApp(page);
  await page.click("[data-act=authSignup]");
  await page.fill("#ob-name", "Daniel");
  await page.fill("#ob-email", "d@example.com");
  await page.press("#ob-email", "Enter");
  for (let i = 0; i < 4; i++) { await page.click("#obnext"); await page.waitForTimeout(120); }
  await page.fill("#ob-job", "Costa");
  await page.fill("#ob-rate", "12.71");
  await page.click("#obnext"); await page.click("#obnext"); await page.waitForTimeout(120); await page.click("#obnext");
  await expect(page.locator(".home")).toBeVisible({ timeout: 15_000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("shiftpay")));
  expect(saved.settings.onboarded).toBe(true);
  expect(saved.jobs[0].name).toBe("Costa");
  expect(problems).toEqual([]);
});

test("a shift added by hand is saved and paid at the job's rate", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  const before = await page.evaluate(() => S.shifts.length);
  await page.click("[data-act=newShift]");
  await expect(page.locator("#savebtn")).toBeEnabled();
  await page.click("#savebtn");
  await expect.poll(() => page.evaluate(() => S.shifts.length)).toBe(before + 1);
  const pay = await page.evaluate(() => { const s = S.shifts.at(-1); return context().pay(s); });
  expect(pay.base).toBeGreaterThan(0);
  expect(pay.hours).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test("backup downloads, and restoring it brings every shift back", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  const count = await page.evaluate(() => S.shifts.length);
  await page.click("[data-tab=profile]");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("[data-act=backup]")]);
  const file = await dl.path();
  expect(dl.suggestedFilename()).toMatch(/^ClockMe-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await page.evaluate(() => { localStorage.removeItem("shiftpay"); });
  await page.reload();
  expect(await page.evaluate(() => S.shifts.length)).toBe(0);
  await page.click("[data-act=authLogin]");
  await page.setInputFiles("#restore-file", file);
  await page.click(".dlg [data-act=dlg] >> nth=0");
  await expect.poll(() => page.evaluate(() => S.shifts.length)).toBe(count);
  expect(problems).toEqual([]);
});

test("invoice PDF is made with the self-hosted jsPDF 4", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  await page.waitForFunction(() => !!window.jspdf);
  const ver = await page.evaluate(() => window.jspdf.jsPDF.version);
  expect(ver).toMatch(/^4\./);
  await page.evaluate(() => A.newInvoice());
  await expect(page.locator("#savebtn")).toBeEnabled();
  await page.click("#savebtn");
  const id = await page.evaluate(() => S.invoices.at(-1).id);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate((i) => A.invPDF({ dataset: { id: i } }), id)]);
  const buf = await (await import("node:fs/promises")).readFile(await dl.path());
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(buf.length).toBeGreaterThan(2000);
  expect(problems).toEqual([]);
});

test("rota photo is sent to /api/read-rota and the shifts come back", async ({ page, problems }) => {
  await page.route("**/api/read-rota", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ shifts: [{ date: "2026-11-30", start: "09:00", end: "17:00" }], warning: "" }) }));
  await openApp(page, { seed: true });
  await page.evaluate(() => A.openImport());
  await page.setInputFiles("#imp-file", new URL("./fixtures/rota.jpg", import.meta.url).pathname);
  await page.click("[data-act=importRead]");
  await expect.poll(() => page.evaluate(() => (UI.sheet && UI.sheet.data.results || []).length)).toBe(1);
  expect(problems).toEqual([]);
});

test("the real rota function answers not_setup without an AI key, and the app says so", async ({ page }) => {
  await openApp(page, { seed: true });
  await page.evaluate(() => A.openImport());
  await page.setInputFiles("#imp-file", new URL("./fixtures/rota.jpg", import.meta.url).pathname);
  await page.click("[data-act=importRead]");
  await expect.poll(() => page.evaluate(() => UI.sheet && UI.sheet.data.code)).toBe("not_setup");
});
