import { test, expect, openApp } from "./fixtures/app.mjs";

const READY = { ready: true, trialDays: 7, live: false, plans: [{ id: "monthly", amount: 299, currency: "gbp", interval: "month" }, { id: "yearly", amount: 1999, currency: "gbp", interval: "year" }] };
const SUB = { pro: true, status: "trialing", until: 1900000000, trialEnd: 1900000000, cancelAt: null, cancelling: false, plan: "year" };

test("with billing off (no Stripe key), nothing is locked", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  expect(await page.evaluate(() => billingOn())).toBe(false);
  await page.evaluate(() => A.openImport());
  expect(await page.evaluate(() => UI.sheet.kind)).toBe("import");
  expect(problems).toEqual([]);
});

test("paywall, Stripe checkout, return and unlock (Stripe faked)", async ({ page, problems }) => {
  const posts = [];
  await page.route("**/api/billing", async (r) => {
    if (r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(READY) });
    const b = JSON.parse(r.request().postData()); posts.push(b);
    const body = b.action === "checkout" ? { id: "cs_test_abcdefghijkl", url: "/?checkout=done&session_id=cs_test_abcdefghijkl" } : b.action === "portal" ? { url: "/?portal=back" } : { pass: "PASS.SIG", sub: SUB };
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await openApp(page, { seed: true });
  await page.reload();
  await expect.poll(() => page.evaluate(() => billingOn())).toBe(true);
  await page.evaluate(() => A.openImport());
  await expect(page.locator(".prowall")).toBeVisible();
  await expect(page.locator("#probuy")).toHaveText(/Try 7 days free/);
  await page.click("[data-act=pickPlan][data-v=monthly]");
  await expect(page.locator(".pw-fine")).toContainText("£2.99 a month");
  await page.click("[data-act=pickPlan][data-v=yearly]");
  await Promise.all([page.waitForURL(/checkout=done/), page.click("#probuy")]);
  await page.waitForLoadState("load");
  await expect.poll(async () => { try { return await page.evaluate(() => isPro() && !!proSub()); } catch { return false; } }, { timeout: 10_000 }).toBe(true);
  await expect(page.locator(".toast")).toContainText(/Welcome to Pro/);
  expect(posts.find((p) => p.action === "checkout").plan).toBe("yearly");
  expect(posts.filter((p) => p.action === "claim").length, "the checkout is claimed exactly once").toBe(1);
  expect(await page.evaluate(() => location.search)).toBe("");
  await page.evaluate(() => A.openImport());
  expect(await page.evaluate(() => UI.sheet.kind)).toBe("import");
  expect(problems).toEqual([]);
});
