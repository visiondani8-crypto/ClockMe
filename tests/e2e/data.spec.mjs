// Official figures the app relies on, checked against their sources on 2026-11-27. If a test here fails after an
// edit, the app is no longer using the published figure. Sources are next to each check.
import { test, expect, openApp } from "./fixtures/app.mjs";

const lines = (page, settings, emp, self = 0) => page.evaluate(([st, e, s]) => {
  Object.assign(S.settings, { loan: "none", postgrad: false, pensionPct: 0, statePct: 0, filing: "single" }, st);
  return Object.fromEntries(taxLines(e, s).map(([k, v]) => [k, Math.round(v * 100) / 100]));
}, [settings, emp, self]);

test.describe("2026 figures (today: 27 Nov 2026)", () => {
  test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date("2026-11-27T12:00:00Z")); await openApp(page); });

  test("UK 2026/27: £12,570 allowance, 20% basic rate, 8% Class 1 NI (GOV.UK rates and thresholds 2026 to 2027)", async ({ page }) => {
    expect(await lines(page, { region: "uk" }, 30000)).toEqual({ "Income tax": 3486, "National Insurance": 1394.4 });
  });
  test("Scotland 2026/27 bands: starter to £16,537, basic to £29,526, intermediate 21% (gov.scot rate resolution)", async ({ page }) => {
    expect((await lines(page, { region: "scotland" }, 30000))["Income tax"]).toBe(3451.07);
  });
  test("Student loan Plan 1, 2026/27: 9% over £26,900 (GOV.UK / LITRG)", async ({ page }) => {
    expect((await lines(page, { region: "uk", loan: "plan1" }, 30000))["Student loan"]).toBe(279);
  });
  test("US 2026: $16,100 standard deduction, 10%/12% brackets (IRS Rev. Proc. 2025-32), FICA 6.2% + 1.45% (SSA)", async ({ page }) => {
    expect(await lines(page, { region: "us" }, 50000)).toEqual({ "Federal income tax": 3820, "Social Security": 3100, Medicare: 725 });
  });
  test("Bank holidays include Scotland's World Cup holiday and OPM's 31 Dec 2027 New Year observance", async ({ page }) => {
    const h = await page.evaluate(() => ({ sco: BANK_HOLS.sco.d["2026-06-15"], us: BANK_HOLS.us.d["2027-12-31"], ew: BANK_HOLS.ew.d["2027-12-28"], ni: BANK_HOLS.ni.d["2027-07-12"] }));
    expect(h).toEqual({ sco: "World Cup bank holiday", us: "New Year's Day 2028 (observed)", ew: "Boxing Day (substitute)", ni: "Battle of the Boyne" });
  });
});

test.describe("2027 figures (clock moved forward)", () => {
  test("Ireland Budget 2027: €46,500 band, €2,125 + €2,125 credits, USC 2% to €30,300, PRSI 4.35% (gov.ie, Budget 2027)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2027-02-01T12:00:00Z")); await openApp(page);
    expect(await lines(page, { region: "ireland" }, 50000)).toEqual({ "Income tax": 6450, USC: 1016.82, PRSI: 2175 });
  });
  test("Student loan Plan 1 from 6 April 2027: 9% over £28,005 (GOV.UK, 10 Aug 2026)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2027-05-01T12:00:00Z")); await openApp(page);
    expect((await lines(page, { region: "uk", loan: "plan1" }, 30000))["Student loan"]).toBe(179.55);
  });
  test("UK minimum wage from 1 April 2027: £13.21 / £11.27 / £8.31 (GOV.UK LPC press release, Oct 2026)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2027-04-02T12:00:00Z")); await openApp(page);
    const r = await page.evaluate(() => ["21+", "18-20", "u18", "app"].map((b) => { S.settings.region = "uk"; S.settings.ageBand = b; return minWage().rate; }));
    expect(r).toEqual([13.21, 11.27, 8.31, 8.31]);
  });
});
