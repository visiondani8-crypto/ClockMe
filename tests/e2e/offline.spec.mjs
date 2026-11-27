// Offline: ClockMe must keep working with no connection (warehouses, hospitals, basements), because shifts are
// saved on the phone. These tests visit once online so the offline helper (sw.js) saves the app, then cut the
// connection with Playwright and check what still works, what says it needs a connection, and recovery.
import { test, expect, openApp, cspViolations } from "./fixtures/app.mjs";

test.use({ serviceWorkers: "allow" });

const READY = { ready: true, trialDays: 7, live: false, plans: [{ id: "monthly", amount: 299, currency: "gbp", interval: "month" }, { id: "yearly", amount: 1999, currency: "gbp", interval: "year" }] };
const DAY = 86400;

// One online visit with sample data, then wait until the offline helper controls the page and has saved the app.
async function visitOnlineThenCut(page, context) {
  await openApp(page, { seed: true });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await expect.poll(() => page.evaluate(async () => {
    const c = await caches.open("clockme-v3");
    return (await Promise.all(["/", "/vendor/jspdf.umd.min.js"].map((u) => c.match(u)))).every(Boolean);
  })).toBe(true);
  await context.setOffline(true);
}

test("opens with no connection and shows the saved shifts", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  const shifts = await page.evaluate(() => S.shifts.length);
  await page.reload();
  await page.waitForFunction(() => typeof S === "object");
  expect(await page.evaluate(() => S.shifts.length)).toBe(shifts);
  await expect(page.locator(".home")).toBeVisible();
  await expect(page.locator("#net-banner")).toHaveText("Offline · your shifts still save on this phone");
  await expect(page.locator("#net-banner")).toHaveAttribute("role", "status");
  expect(await cspViolations(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test("clocking in and out, and adding a shift, work offline and survive a reload", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  await page.reload();
  await page.waitForFunction(() => typeof S === "object");
  const before = await page.evaluate(() => S.shifts.length);

  // Clock in (the sample data has several jobs, so ClockMe asks which one), work 2 hours, clock out and save.
  const job = await page.evaluate(() => { S.clock = null; save(); UI.tab = "home"; render(); A.clock(); return activeJobs()[0].name; });
  await page.getByRole("button", { name: job, exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => !!S.clock)).toBe(true);
  await page.evaluate(() => { S.clock.start -= 2 * 3600e3; save(); A.clock(); });
  await page.click("#savebtn");
  await expect.poll(() => page.evaluate(() => !S.clock && S.shifts.length)).toBe(before + 1);

  await page.click("[data-act=newShift]");
  await page.click("#savebtn");
  await expect.poll(() => page.evaluate(() => S.shifts.length)).toBe(before + 2);

  await page.reload();
  await page.waitForFunction(() => typeof S === "object");
  expect(await page.evaluate(() => S.shifts.length)).toBe(before + 2);
  expect(problems).toEqual([]);
});

test("PDFs can still be made offline (jsPDF comes from the saved copy)", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  await page.reload();
  await page.waitForFunction(() => !!window.jspdf, null, { timeout: 10_000 });
  const bytes = await page.evaluate(() => { const d = new window.jspdf.jsPDF(); d.text("ClockMe offline", 20, 20); return d.output("arraybuffer").byteLength; });
  expect(bytes).toBeGreaterThan(1000);
  expect(problems).toEqual([]);
});

test("rota reading says up front that it needs a connection, and says so again if tried", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  await page.reload();
  await page.waitForFunction(() => typeof S === "object");
  await page.evaluate(() => A.openImport());
  await expect(page.locator("#imp-offline")).toContainText("You're offline. Reading a rota needs a connection");
  await page.fill("#imp-text", "Mon 9-5, Wed 12-8");
  await page.click("[data-act=importRead]");
  await expect(page.locator(".sheet .warn")).toContainText("You can still add shifts by hand");
  expect(await page.evaluate(() => UI.sheet.data.code)).toBe("offline");
  expect(problems).toEqual([]);
});

test("Pro keeps working offline while paid, with 3 days' grace, then asks to reconnect", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  const now = Math.floor(Date.now() / 1000);
  const setSub = (until) => page.evaluate(([b, u]) => {
    localStorage.setItem("clockme-billing", JSON.stringify(b));
    S.settings.pro = { pass: "signed-pass", sub: { pro: true, status: "active", until: u, trialEnd: null, plan: "year" }, checkedAt: Date.now() - 864e5 }; save();
  }, [READY, until]);

  await setSub(now + 20 * DAY);  // paid up for 20 more days
  await page.reload(); await page.waitForFunction(() => typeof S === "object");
  expect(await page.evaluate(() => [billingOn(), isPro()])).toEqual([true, true]);
  await page.evaluate(() => A.openImport());
  expect(await page.evaluate(() => UI.sheet && UI.sheet.kind)).toBe("import");

  await setSub(now - 2 * DAY);   // ended 2 days ago: still inside the grace period
  await page.reload(); await page.waitForFunction(() => typeof S === "object");
  expect(await page.evaluate(() => isPro())).toBe(true);

  await setSub(now - 5 * DAY);   // ended 5 days ago: Pro features lock until it can check with Stripe
  await page.reload(); await page.waitForFunction(() => typeof S === "object");
  expect(await page.evaluate(() => isPro())).toBe(false);
  expect(problems).toEqual([]);
});

test("buying Pro offline gives a clear message, not a broken checkout", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  await page.evaluate((b) => { localStorage.setItem("clockme-billing", JSON.stringify(b)); delete S.settings.pro; save(); }, READY);
  await page.reload(); await page.waitForFunction(() => typeof S === "object");
  await page.evaluate(() => openPro("profile"));
  await page.click("#probuy");
  await expect(page.locator(".toast")).toContainText("You're offline. Connect and try again.");
  expect(page.url()).not.toContain("stripe");
  expect(problems).toEqual([]);
});

test("coming back online: the banner goes, a toast says so, and billing is checked again", async ({ page, context, problems }) => {
  await visitOnlineThenCut(page, context);
  await page.reload(); await page.waitForFunction(() => typeof S === "object");
  await expect(page.locator("#net-banner")).toBeVisible();
  const checks = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/billing")) checks.push(r.method()); });
  await context.setOffline(false);
  await expect(page.locator("#net-banner")).toHaveCount(0);
  await expect(page.locator(".toast")).toContainText("Back online");
  await expect.poll(() => checks.length).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});
