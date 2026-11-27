// End-to-end tests run against the local server (scripts/serve.mjs), which serves the built site and the
// real api/ functions with no secrets set. External services are blocked or faked inside each test.
import { defineConfig, devices } from "@playwright/test";

const local = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {};
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["json", { outputFile: "test-results/results.json" }]] : [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: { baseURL: "http://localhost:8787", trace: "retain-on-failure", ...local },
  webServer: { command: "node scripts/serve.mjs", url: "http://localhost:8787/", reuseExistingServer: !process.env.CI, env: { PORT: "8787" } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], ...local } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, ...local } },
  ],
});
