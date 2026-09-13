import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real deployment (production by default). They never stub the
 * backend: public tests use the live site, and the signed-in journey only runs when real test
 * credentials and a real Google review URL are provided through the environment.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "https://removalwork.online",
    serviceWorkers: "block",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      use: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
    },
    { name: "laptop", use: { viewport: { width: 1366, height: 900 } } },
    { name: "desktop", use: { viewport: { width: 1920, height: 1080 } } },
  ],
});
