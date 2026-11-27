// Layout at real phone, tablet and desktop sizes: nothing spills sideways, the tab bar stays on screen,
// and buttons are big enough to tap: 44px for the tab bar and quick actions (Apple's guideline),
// 24px for every other button (WCAG 2.2 target size, 2.5.8).
import { test, expect, openApp } from "./fixtures/app.mjs";

const sizes = [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1280, 800]];
for (const [w, h] of sizes) {
  test(`layout ${w}x${h}`, async ({ page, problems }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, { seed: true });
    for (const tab of ["home", "shifts", "insights", "profile"]) {
      await page.evaluate((t) => { UI.tab = t; UI.stack = []; render(); window.scrollTo(0, 0); }, tab);
      await page.waitForTimeout(250);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, tab: (() => { const r = document.querySelector(".tabbar, nav.tabs, .tabs")?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom } : null; })() }));
      expect(m.sw, `${tab} spills sideways`).toBeLessThanOrEqual(m.iw + 1);
      if (m.tab) expect(m.tab.bottom, `${tab} tab bar off screen`).toBeLessThanOrEqual(h + 1);
    }
    await page.evaluate(() => { UI.tab = "home"; render(); });
    const sizes = await page.evaluate(() => [...document.querySelectorAll("button, a[href], [role=button], label.toggle")].filter((e) => e.offsetParent && !e.closest(".dstrip")).map((e) => { const r = e.getBoundingClientRect(); return { a: (e.dataset.act || e.className || e.tagName) + (e.dataset.tab ? ":" + e.dataset.tab : ""), main: !!e.closest(".tabbar, .acts"), w: Math.round(r.width), h: Math.round(r.height) }; }));
    expect(sizes.filter((b) => b.main && (b.w < 44 || b.h < 44)), "tab bar / quick actions under 44px").toEqual([]);
    expect(sizes.filter((b) => !b.main && (b.w < 24 || b.h < 24)), "buttons under 24px").toEqual([]);
    expect(problems).toEqual([]);
  });
}
