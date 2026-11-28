// Passcode lock: stored only as a slow salted hash, guesses limited (and the limit survives a reload),
// old-style hashes still unlock and are upgraded, and backup files never carry the passcode.
import { test, expect, openApp } from "./fixtures/app.mjs";
import { createHash } from "node:crypto";

test.use({ viewport: { width: 1280, height: 900 } });

const tap = async (page, act, digits) => { for (const d of digits) await page.locator(`button[data-act="${act}"][data-v="${d}"]`).click(); };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("shiftpay")).settings);

test("setting a passcode stores only a PBKDF2 hash with its own random salt", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  await page.evaluate(() => { UI.tab = "profile"; render(); });
  await page.locator('[data-act="pinMenu"]').click();
  await tap(page, "setPinKey", "1357");
  await tap(page, "setPinKey", "1357");
  await expect.poll(async () => (await stored(page)).pinOn).toBe(true);
  const st = await stored(page);
  expect(st.pinHash).toMatch(/^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  expect(st.pinSalt).toBeUndefined();
  expect(JSON.stringify(st)).not.toContain("1357");
  // A second device with the same code gets a different hash (random salt).
  const again = await page.evaluate(() => makePinHash("1357"));
  expect(again).not.toBe(st.pinHash);
  expect(problems).toEqual([]);
});

test("wrong guesses: 5 free tries, then a wait that a reload doesn't clear; the right code resets the count", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  await page.evaluate(async () => { S.settings.pinHash = await makePinHash("2580"); S.settings.pinOn = true; save(); });
  await page.reload();
  await expect(page.locator(".lock")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await tap(page, "unlockKey", "1111");
    await expect.poll(async () => (await stored(page)).pinFails).toBe(i + 1);
  }
  await expect(page.locator("#lock-msg")).toContainText("Too many tries");
  await expect(page.locator('button[data-act="unlockKey"][data-v="2"]')).toBeDisabled();
  let st = await stored(page);
  expect(st.pinUntil - Date.now()).toBeGreaterThan(20_000);
  expect(st.pinUntil - Date.now()).toBeLessThanOrEqual(30_000);

  await page.reload();
  await expect(page.locator(".lock")).toBeVisible();
  await expect(page.locator("#lock-msg")).toContainText("Too many tries");
  await expect(page.locator('button[data-act="unlockKey"][data-v="2"]')).toBeDisabled();

  // Typing during the wait does nothing, even if the buttons are forced.
  await page.evaluate(() => A.unlockKey({ dataset: { v: "2" } }));
  expect(await page.evaluate(() => UI.pin)).toBe("");

  // The sixth wrong guess doubles the wait.
  await page.evaluate(() => { S.settings.pinUntil = Date.now() - 1; save(); render(); });
  await tap(page, "unlockKey", "9999");
  await expect.poll(async () => (await stored(page)).pinFails).toBe(6);
  st = await stored(page);
  expect(st.pinUntil - Date.now()).toBeGreaterThan(50_000);

  await page.evaluate(() => { S.settings.pinUntil = Date.now() - 1; save(); render(); });
  await tap(page, "unlockKey", "2580");
  await expect(page.locator(".lock")).toHaveCount(0);
  st = await stored(page);
  expect([st.pinFails, st.pinUntil]).toEqual([0, 0]);
  expect(problems).toEqual([]);
});

test("the wait is capped at 15 minutes, and moving the clock back doesn't skip it", async ({ page }) => {
  await openApp(page, { seed: true });
  expect(await page.evaluate(() => [4, 5, 6, 7, 20].map(pinDelay))).toEqual([0, 30_000, 60_000, 120_000, 900_000]);
  const left = await page.evaluate(() => { S.settings.pinFails = 5; S.settings.pinLast = Date.now() + 3600_000; S.settings.pinUntil = 0; return pinWait(); });
  expect(left).toBeGreaterThan(25_000);
});

test("a passcode saved by an older version still unlocks, and is upgraded to PBKDF2", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  const legacy = createHash("sha256").update("shiftpay|oldsalt123|4826").digest("hex");
  await page.evaluate((h) => { S.settings.pinSalt = "oldsalt123"; S.settings.pinHash = h; S.settings.pinOn = true; save(); }, legacy);
  await page.reload();
  await tap(page, "unlockKey", "4826");
  await expect(page.locator(".lock")).toHaveCount(0);
  const st = await stored(page);
  expect(st.pinHash).toMatch(/^pbkdf2\$600000\$/);
  expect(st.pinSalt).toBeUndefined();
  await page.reload();
  await tap(page, "unlockKey", "4826");
  await expect(page.locator(".lock")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("backups leave the passcode out, and restoring one keeps this device's passcode on", async ({ page, problems }) => {
  await openApp(page, { seed: true });
  await page.evaluate(async () => { S.settings.pinHash = await makePinHash("2580"); S.settings.pinOn = true; S.settings.pinFails = 2; save(); });
  await page.evaluate(() => { UI.locked = false; UI.tab = "profile"; render(); });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-act="backup"]').click()]);
  const file = await dl.path();
  const text = (await import("node:fs")).readFileSync(file, "utf8");
  const data = JSON.parse(text);
  for (const k of ["pinOn", "pinHash", "pinSalt", "pinFails", "pinUntil", "pinLast"]) expect(data.settings[k], k).toBeUndefined();
  expect(text).not.toContain("pbkdf2$");
  expect(data.shifts.length).toBeGreaterThan(0);

  const before = (await stored(page)).pinHash;
  await page.locator("#restore-file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await page.locator(".dlg button[data-act=dlg][data-i='0']").click();
  await expect.poll(async () => (await stored(page)).pinHash).toBe(before);
  expect((await stored(page)).pinOn).toBe(true);
  expect(problems).toEqual([]);
});
