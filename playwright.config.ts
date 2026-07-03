import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.STUDIO_E2E_BASE_URL || "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "studio-chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "corepack pnpm dev:studio",
    url: "http://localhost:3001/login",
    reuseExistingServer: true,
    timeout: 120_000
  }
});
