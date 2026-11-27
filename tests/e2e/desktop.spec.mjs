// The computer version (Mac first): laptop layout, keyboard shortcuts and the install guide.
import { test, expect, openApp } from "./fixtures/app.mjs";
import AxeBuilder from "@axe-core/playwright";

const SAFARI_17 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const SAFARI_16 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15";
const FIREFOX_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:132.0) Gecko/20100101 Firefox/132.0";
const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

test.describe("laptop layout (1440 x 900)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the tab bar becomes a labelled sidebar and the content sits beside it", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    const nav = await page.locator("nav.tabbar").boundingBox();
    const main = await page.locator("main.app").boundingBox();
    expect(nav.x).toBeLessThan(40);
    expect(nav.height).toBeGreaterThan(600);
    expect(main.x).toBeGreaterThanOrEqual(nav.x + nav.width);
    for (const l of ["Home", "Insights", "Shifts", "Profile"]) await expect(page.locator("nav.tabbar .tl", { hasText: l })).toBeVisible();
    await expect(page.locator("[data-act=shortcuts]")).toBeVisible();
    // Home uses two columns of cards
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".stack.home")).columnCount);
    expect(cols).toBe("2");
    expect(problems).toEqual([]);
  });

  test("sheets open as centred windows", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    await page.click("[data-act=newShift]");
    await page.locator(".sheet").evaluate((e) => Promise.all(e.getAnimations({ subtree: true }).map((a) => a.finished)));
    const box = await page.locator(".sheet").boundingBox();
    expect(box.width).toBeLessThanOrEqual(600);
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(4);
    expect(box.y).toBeGreaterThan(8);
    expect(box.y + box.height).toBeLessThan(892);
    expect(problems).toEqual([]);
  });

  test("keyboard: number keys switch tabs, N adds a shift, Esc closes, ? lists shortcuts", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    await page.keyboard.press("2");
    expect(await page.evaluate(() => UI.tab)).toBe("insights");
    await page.keyboard.press("4");
    expect(await page.evaluate(() => UI.tab)).toBe("profile");
    await page.keyboard.press("1");
    expect(await page.evaluate(() => UI.tab)).toBe("home");
    await page.keyboard.press("n");
    expect(await page.evaluate(() => UI.sheet && UI.sheet.kind)).toBe("shift");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => UI.sheet)).toBe(null);
    await page.keyboard.press("?");
    await expect(page.locator(".sheet[aria-label='Keyboard shortcuts']")).toBeVisible();
    await expect(page.locator(".keys .item")).toHaveCount(8);
    expect(problems).toEqual([]);
  });

  test("keyboard: C clocks in (asking which job when there are several)", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    await page.evaluate(() => { S.clock = null; save(); render(); });
    await page.keyboard.press("c");
    const job = await page.evaluate(() => activeJobs()[0].name);
    await page.getByRole("button", { name: job, exact: true }).first().click();
    await expect.poll(() => page.evaluate(() => !!S.clock)).toBe(true);
    expect(problems).toEqual([]);
  });

  test("keyboard: shortcuts never fire while typing, or with Cmd/Ctrl held", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    await page.click("[data-act=newShift]");
    await page.locator(".sheet input[type=number], .sheet input[inputmode]").first().focus();
    await page.keyboard.type("2n");
    expect(await page.evaluate(() => [UI.tab, UI.sheet && UI.sheet.kind])).toEqual(["home", "shift"]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+2");
    await page.keyboard.press("Meta+3");
    expect(await page.evaluate(() => UI.tab)).toBe("home");
    expect(problems).toEqual([]);
  });

  test("install guide and shortcuts pass the accessibility check", async ({ page }) => {
    await openApp(page, { seed: true });
    for (const open of ["A.installMac()", "A.shortcuts()"]) {
      await page.evaluate(open);
      // wait for the window's entry animation (the mascot's idle loop never ends, so skip endless ones)
      await page.locator(".overlay").evaluate((e) => Promise.all(e.getAnimations({ subtree: true }).filter((a) => a.effect && a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
      const r = await new AxeBuilder({ page }).include(".sheet").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => ["critical", "serious"].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(bad, open).toEqual([]);
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("install guide on a Mac", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.describe("Safari 17 (macOS Sonoma or later)", () => {
    test.use({ userAgent: SAFARI_17 });
    test("explains File → Add to Dock and the Mac requirements", async ({ page, problems }) => {
      await openApp(page, { seed: true });
      await expect(page.locator("[data-act=installMac]")).toHaveText("Install on Mac");
      await page.click("[data-act=installMac]");
      await expect(page.locator(".sheet[aria-label='Install on your Mac']")).toBeVisible();
      await expect(page.locator(".inst-steps li").first()).toContainText("File → Add to Dock");
      await expect(page.locator("#mac-req")).toContainText("macOS Sonoma 14 or later (MacBook Air or Pro from 2018)");
      expect(problems).toEqual([]);
    });
  });

  test.describe("Safari 16 (older macOS)", () => {
    test.use({ userAgent: SAFARI_16 });
    test("says Add to Dock needs macOS Sonoma, and offers Chrome or Edge instead", async ({ page }) => {
      await openApp(page, { seed: true });
      await page.click("[data-act=installMac]");
      await expect(page.locator(".inst-steps")).toContainText("macOS Sonoma 14");
      await expect(page.locator(".inst-steps")).toContainText("Chrome or Edge");
    });
  });

  test.describe("Firefox", () => {
    test.use({ userAgent: FIREFOX_MAC });
    test("says Firefox can't install apps and suggests Safari or Chrome", async ({ page }) => {
      await openApp(page, { seed: true });
      await page.click("[data-act=installMac]");
      await expect(page.locator(".inst-steps")).toContainText("Firefox can't install apps");
      await expect(page.locator(".inst-steps")).toContainText("Safari or Chrome");
    });
  });

  test.describe("Chrome with the browser's install prompt", () => {
    test.use({ userAgent: CHROME_MAC });
    test("the Install button uses the browser's own prompt", async ({ page, problems }) => {
      await openApp(page, { seed: true });
      await page.evaluate(() => {
        const e = new Event("beforeinstallprompt", { cancelable: true });
        e.prompt = () => { window.__prompted = true; return Promise.resolve(); };
        e.userChoice = Promise.resolve({ outcome: "accepted" });
        dispatchEvent(e);
      });
      await page.click("[data-act=installMac]");
      await page.click("[data-act=installNow]");
      expect(await page.evaluate(() => window.__prompted)).toBe(true);
      expect(problems).toEqual([]);
    });
  });
});

test.describe("once installed", () => {
  test.use({ viewport: { width: 1440, height: 900 }, userAgent: SAFARI_17 });
  test("the install button is hidden in the app's own window", async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) => q.includes("display-mode: standalone") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q);
    });
    await openApp(page, { seed: true });
    await expect(page.locator("[data-act=shortcuts]")).toBeVisible();
    await expect(page.locator("[data-act=installMac]")).toHaveCount(0);
  });
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("keeps the bottom tab bar, with no sidebar extras", async ({ page, problems }) => {
    await openApp(page, { seed: true });
    const nav = await page.locator("nav.tabbar").boundingBox();
    expect(nav.y).toBeGreaterThan(700);
    await expect(page.locator(".side-foot")).toBeHidden();
    await expect(page.locator("nav.tabbar .tl").first()).toBeHidden();
    expect(problems).toEqual([]);
  });
});
