import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They expect:
 *  - the app running at E2E_BASE_URL (default http://127.0.0.1:3100), and
 *  - an empty database (migrations applied) with three dashboard users:
 *    owner@izone.test / manager@izone.test / staff@izone.test (password E2E_PASSWORD).
 * See README → "Testing".
 */
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "off",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
