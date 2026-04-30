import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const READER_STATE = "tests/e2e/.auth/reader.json";
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 1. Anonymous specs run first (no auth needed).
    {
      name: "anon",
      testMatch: /(smoke|discovery|auth)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // 2. Auth setup writes storage-state files for reader + admin.
    {
      name: "setup-auth",
      testMatch: /auth-setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    // 3. Reader-only specs reuse the cached storage state.
    {
      name: "reader",
      testMatch: /signed-in\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: READER_STATE,
      },
      dependencies: ["setup-auth"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
