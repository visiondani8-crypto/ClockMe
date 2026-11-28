// XSS fuzz: append an HTML payload to every free-text value the app stores (names, notes, clients, goals,
// business details, invoice lines, rota results…), then open every screen, page and window. Any element the
// payload manages to create, or any script it manages to run, fails the test. The Content-Security-Policy
// would also block the script itself; this test checks the escaping underneath it.
import { test, expect, openApp, cspViolations } from "./fixtures/app.mjs";

const MARK = `<b data-xss="1">x</b>"'><i data-xss="2"></i><img src=x data-xss="3" onerror="window.__xss=1"><svg data-xss="4" onload="window.__xss=2">`;

test.use({ viewport: { width: 1280, height: 900 } });

test("every stored text field is escaped on every screen and window", async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, { seed: true });
  const touched = await page.evaluate((m) => {
    let n = 0;
    // Free text, not ids, enums, dates, colours or numbers stored as text.
    const isFree = (v) => typeof v === "string" && v.length > 0 && !/^[a-z0-9_.:-]{1,40}$/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v) && !/^#[0-9a-f]{3,8}$/i.test(v);
    const walk = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (isFree(v)) { o[k] = v + m; n++; } else if (v && typeof v === "object") walk(v); } };
    walk(S);
    // fields that are often empty in the sample data
    S.settings.name = "Sam" + m; S.settings.email = "sam@example.com";
    Object.assign(S.business, { name: "Biz" + m, address: "1 Road" + m, bank: "Bank" + m, vat: "GB1" + m });
    S.goals.forEach((g) => { g.title = "Goal" + m; g.subtitle = "Sub" + m; });
    save(); render();
    return n;
  }, MARK);
  expect(touched).toBeGreaterThan(10);

  const opened = [];
  const look = async (what) => {
    await page.waitForTimeout(120);
    const hit = await page.evaluate(() => ({ els: document.querySelectorAll("[data-xss]").length, ran: window.__xss || 0 }));
    opened.push(what);
    expect(hit, `HTML injected on: ${what}`).toEqual({ els: 0, ran: 0 });
  };

  for (const tab of ["home", "insights", "shifts", "profile"]) { await page.evaluate((t) => { UI.sheet = null; UI.stack = []; UI.tab = t; render(); }, tab); await look(`tab ${tab}`); }
  await page.evaluate(() => { UI.tab = "shifts"; UI.shiftView = "calendar"; render(); }); await look("shifts calendar");
  await page.evaluate(() => { UI.shiftView = "list"; UI.tab = "profile"; UI.stack = [{ page: "jobs" }]; render(); }); await look("page jobs");
  for (const g of await page.evaluate(() => S.goals.map((x) => x.id))) { await page.evaluate((id) => { UI.stack = [{ page: "goal", id }]; render(); }, g); await look("page goal"); }
  for (const i of await page.evaluate(() => S.invoices.map((x) => x.id))) { await page.evaluate((id) => { UI.stack = [{ page: "invoice", id }]; render(); }, i); await look("page invoice"); }
  await page.evaluate(() => { UI.stack = []; render(); });

  const sheets = [
    ["shift edit", () => A.editShift({ dataset: { id: S.shifts[0].id } })],
    ["shift new", () => A.newShift()],
    ["job edit", () => A.editJob({ dataset: { id: S.jobs[0].id } })],
    ["job new", () => A.newJob()],
    ["goal new", () => A.newGoal()],
    ["name", () => A.editName()],
    ["roster", () => A.openRoster()],
    ["business", () => A.openBusiness()],
    ["pay", () => A.openPay()],
    ["invoice new", () => A.newInvoice()],
    ["week", () => A.openWeek({ dataset: { ws: String(weekStart(Date.now())), v: String(weekStart(Date.now())) } })],
    ["help", () => { UI.sheet = { kind: "help", data: {} }; render(); }],
    ["install", () => A.installMac()],
    ["keys", () => A.shortcuts()],
    ["pro paywall", () => openPro("profile")],
  ];
  for (const [name, fn] of sheets) {
    await page.evaluate(() => { UI.sheet = null; UI.dialog = null; render(); });
    const ok = await page.evaluate((src) => { try { (0, eval)(`(${src})`)(); return true; } catch (e) { return String(e); } }, fn.toString());
    expect(ok, `opening ${name}`).toBe(true);
    await look(`sheet ${name}`);
  }

  // Rota results come from the AI: the warning, notes and dates it returns must be shown as text too.
  await page.evaluate((m) => {
    S.settings.pro = { pass: "p", sub: { pro: true, status: "active", until: Date.now() / 1000 + 86400 * 30 } };
    A.openImport();
    Object.assign(UI.sheet.data, { status: "done", warning: "Unsure" + m, results: [{ on: true, date: "2026-11-30", start: "09:00", end: "17:00", breakMin: 30, note: "Bar" + m }] });
    render();
  }, MARK);
  await look("rota results");

  expect(await cspViolations(page)).toEqual([]);
  expect(opened.length).toBeGreaterThan(20);
});

// A backup file is data from outside the app (someone could share a "template"). Fields that normally come from
// the app itself (ids, colours, icons, numbers, photo) must not be able to inject anything either.
test("a crafted backup file can't inject HTML through ids, colours, icons, numbers or the photo", async ({ page }, info) => {
  test.setTimeout(120_000);
  await openApp(page, { seed: true });
  const evil = await page.evaluate(() => {
    const d = JSON.parse(JSON.stringify(S));
    const A = `x"><b data-xss="id">`, C = `red;}</style><b data-xss="color">`, I = `"><b data-xss="icon">`, N = `<b data-xss="num">`;
    d.jobs.forEach((j) => { j.id = A + j.id; j.color = C; j.icon = I; j.rate = N; });
    d.shifts.forEach((s) => { s.id = A + s.id; s.jobId = A + s.jobId; s.rate = N; s.breakMin = N; });
    d.goals.forEach((g) => { g.id = A + g.id; g.color = C; g.icon = I; g.target = N; });
    d.invoices.forEach((v) => { v.id = A + v.id; v.jobId = A + v.jobId; v.number = `<b data-xss="number">`; v.total = N; v.status = `"><b data-xss="status">`; });
    d.settings.photo = `x" onerror="window.__xss=9" data-xss="photo`;
    d.settings.region = `"><b data-xss="region">`; d.settings.currency = `"><b data-xss="cur">`;
    return JSON.stringify(d);
  });
  const file = info.outputPath("evil-backup.json");
  await (await import("node:fs/promises")).writeFile(file, evil);
  await page.evaluate(() => { UI.tab = "profile"; render(); });
  await page.setInputFiles("#restore-file", file);
  const before = await page.evaluate(() => ({ jobs: S.jobs.length, shifts: S.shifts.length, goals: S.goals.length }));
  await page.click(".dlg button[data-act=dlg][data-i='0']");
  await page.waitForTimeout(300);
  // The restore really happened, the bad values were replaced, and links between shifts and jobs survived.
  const after = await page.evaluate(() => ({
    jobs: S.jobs.length, shifts: S.shifts.length, goals: S.goals.length,
    safeIds: [...S.jobs, ...S.shifts, ...S.goals, ...S.invoices].every((x) => /^[A-Za-z0-9_-]+$/.test(x.id)),
    linked: S.shifts.every((s) => S.jobs.some((j) => j.id === s.jobId)),
    colours: [...S.jobs, ...S.goals].every((x) => /^#[0-9a-f]+$/i.test(x.color)),
    numbers: S.shifts.every((s) => typeof s.rate === "number" && typeof s.breakMin === "number"),
    region: S.settings.region, photo: S.settings.photo,
  }));
  expect(after).toEqual({ ...before, safeIds: true, linked: true, colours: true, numbers: true, region: "uk", photo: "" });
  const seen = [];
  const rendered = [];
  for (const tab of ["home", "insights", "shifts", "profile"]) {
    await page.evaluate((t) => { UI.sheet = null; UI.stack = []; UI.tab = t; try { render(); } catch (e) {} }, tab);
    await page.waitForTimeout(150);
    seen.push(...(await page.evaluate(() => [...document.querySelectorAll("[data-xss]")].map((e) => e.getAttribute("data-xss")))));
    rendered.push(await page.evaluate(() => !!document.querySelector("nav.tabbar") && !!document.querySelector("main.app > .stack") && !document.querySelector("main.app .empty .art")));
  }
  expect(rendered, "every tab rendered normally after the restore").toEqual([true, true, true, true]);
  for (const open of ["A.editShift({ dataset: { id: S.shifts[0].id } })", "A.editJob({ dataset: { id: S.jobs[0].id } })", "UI.stack = [{ page: 'jobs' }], UI.tab = 'profile', render()", "UI.stack = [{ page: 'goal', id: S.goals[0].id }], render()", "UI.stack = [{ page: 'invoice', id: S.invoices[0].id }], render()"]) {
    await page.evaluate((src) => { UI.sheet = null; try { (0, eval)(src); } catch (e) {} }, open);
    await page.waitForTimeout(150);
    seen.push(...(await page.evaluate(() => [...document.querySelectorAll("[data-xss]")].map((e) => e.getAttribute("data-xss")))));
  }
  expect([...new Set(seen)], "injected through a backup").toEqual([]);
  expect(await page.evaluate(() => window.__xss || 0)).toBe(0);
});
