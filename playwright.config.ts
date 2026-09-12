import { defineConfig, devices } from "@playwright/test";

// Port 3000 is a shared default — another project's dev server squatting on it
// would silently be tested instead of this one. Use a project-specific port and
// never adopt a foreign server that happens to be listening.
const PORT = Number(process.env["PLAYWRIGHT_PORT"] ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
  },
});
