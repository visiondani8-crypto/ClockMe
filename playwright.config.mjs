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
  // The offline helper (sw.js) is blocked by default so the fake services in the tests always see requests;
  // tests/e2e/offline.spec.mjs turns it back on.
  use: { baseURL: "http://localhost:8787", trace: "retain-on-failure", serviceWorkers: "block", ...local },
  webServer: { command: "node scripts/serve.mjs", url: "http://localhost:8787/", reuseExistingServer: !process.env.CI, env: { PORT: "8787" } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], ...local } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, ...local } },
    // Safari's engine (WebKit): Mac Safari and iPhone. Run in CI (PW_WEBKIT=1), where WebKit can be installed.
    ...(process.env.PW_WEBKIT ? [
      { name: "mac-safari", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 }, launchOptions: {} } },
      { name: "iphone-safari", use: { ...devices["iPhone 15"], launchOptions: {} } },
    ] : []),
  ],
});
