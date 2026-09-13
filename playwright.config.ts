import { defineConfig, devices } from "@playwright/test";

// Port 3000 is a shared default — another project's dev server squatting on it
// would silently be tested instead of this one. Use a project-specific port and
// never adopt a foreign server that happens to be listening.
const PORT = Number(process.env["PLAYWRIGHT_PORT"] ?? 3210);

// 127.0.0.1, not localhost. WebKit — which is what the iPhone project runs —
// upgrades http://localhost to https and then fails the handshake, so every
// script and stylesheet aborts with a TLS error and the page never hydrates.
// Server Components still render, so page-level assertions pass and the gap is
// invisible: any test of client behaviour silently checks a dead page. The
// loopback IP is not subject to that upgrade.
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
    // PLAYWRIGHT drops HSTS and upgrade-insecure-requests for this server only
    // — see next.config.ts. Both are correct in production and unchanged there;
    // on plain-HTTP loopback they make WebKit abort every asset, leaving a page
    // that renders but never hydrates.
    command: `PLAYWRIGHT=1 pnpm build && PLAYWRIGHT=1 pnpm start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
  },
});
