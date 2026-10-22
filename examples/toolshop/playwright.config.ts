import { defineConfig } from "@playwright/test";

// Public shared demo: one worker, one retry, traces on retry.
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/artifacts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.TOOLSHOP_URL || "https://practicesoftwaretesting.com",
    testIdAttribute: "data-test", // from `pack pom`: the app uses data-test, not data-testid
    trace: "on-first-retry",
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, ignoreHTTPSErrors: true } : {}),
    launchOptions: process.env.PS_CHROMIUM ? { executablePath: process.env.PS_CHROMIUM, args: ["--no-sandbox"] } : {},
    channel: process.env.PS_CHROMIUM || process.env.PS_BROWSER === "bundled" ? undefined : "chrome",
  },
});
