// Accessibility: axe-core scans of the main screens, light and dark. Fails on "critical" and "serious" issues;
// smaller issues are written to the report (test-results/a11y-*.json) so they can be tracked.
import { test, expect, openApp } from "./fixtures/app.mjs";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const screens = {
  welcome: async () => {},
  home: async (p) => { await p.evaluate(() => { UI.tab = "home"; render(); }); },
  shifts: async (p) => { await p.evaluate(() => { UI.tab = "shifts"; render(); }); },
  insights: async (p) => { await p.evaluate(() => { UI.tab = "insights"; render(); }); },
  profile: async (p) => { await p.evaluate(() => { UI.tab = "profile"; render(); }); },
  "shift-sheet": async (p) => { await p.evaluate(() => A.newShift()); },
  paywall: async (p) => { await p.evaluate(() => { UI.billing = { ready: true, trialDays: 7, live: false, plans: [{ id: "monthly", amount: 299, currency: "gbp", interval: "month" }, { id: "yearly", amount: 1999, currency: "gbp", interval: "year" }] }; openPro("rota"); }); },
};

for (const scheme of ["light", "dark"]) {
  for (const [name, go] of Object.entries(screens)) {
    test(`a11y ${name} (${scheme})`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await openApp(page, { seed: name !== "welcome" });
      await go(page);
      await page.waitForTimeout(700);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const out = r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
      mkdirSync("test-results", { recursive: true });
      writeFileSync(`test-results/a11y-${info.project.name}-${scheme}-${name}.json`, JSON.stringify(out, null, 1));
      const blocking = out.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(blocking, JSON.stringify(blocking, null, 1)).toEqual([]);
    });
  }
}

// Colour contrast in every theme people can pick in settings (Auto is covered above by light/dark).
for (const theme of ["light", "dark", "white", "lightpink", "pink", "darkpink"]) {
  for (const tab of ["home", "shifts", "insights", "profile"]) {
    test(`contrast ${tab} (theme ${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openApp(page, { seed: true });
      await page.evaluate(([th, t]) => { S.settings.appearance = th; save(); applyTheme(); UI.tab = t; render(); }, [theme, tab]);
      await page.waitForTimeout(500);
      const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      const bad = r.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")}: ${(n.any[0] || {}).message || ""}`.slice(0, 200)));
      expect(bad, bad.join("\n")).toEqual([]);
    });
  }
}
