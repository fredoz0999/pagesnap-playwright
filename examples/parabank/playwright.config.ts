import { defineConfig } from "@playwright/test";

// The public Parabank demo is shared and slow at times: one worker, one retry, traces on retry.
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/artifacts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.PARABANK_HOST || "https://parabank.parasoft.com",
    trace: "on-first-retry",
    // Behind an egress proxy (sandboxes, corporate CI) the API client needs it explicitly;
    // the browser already follows the environment.
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, ignoreHTTPSErrors: true } : {}),
    launchOptions: process.env.PS_CHROMIUM ? { executablePath: process.env.PS_CHROMIUM, args: ["--no-sandbox"] } : {},
    channel: process.env.PS_CHROMIUM || process.env.PS_BROWSER === "bundled" ? undefined : "chrome",
  },
});
