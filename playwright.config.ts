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

const CI = Boolean(process.env["CI"]);

// Specs for the two extra projects carry a tag in their title. The device
// projects skip them; the extra projects run nothing else.
const EXTRA_TAGS = /@forced-colors|@zoom/;

export default defineConfig({
  testDir: "./e2e",
  // " 2." is macOS Finder's duplicate suffix; a copied spec would run twice.
  testIgnore: /.* 2\./,
  fullyParallel: true,
  forbidOnly: CI,
  // Retries are for infrastructure noise. A test that only passes on retry is
  // reported as flaky in the summary, never quietly green.
  retries: CI ? 2 : 0,
  // Three, measured: at the default worker count WebKit (iPhone 14) timed out
  // 61 tests under load on a full run and passed all of them at three.
  workers: 3,
  reporter: CI
    ? [
        ["list"],
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: EXTRA_TAGS,
    },
    {
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
      grepInvert: EXTRA_TAGS,
    },
    {
      name: "Pixel 7",
      use: { ...devices["Pixel 7"] },
      grepInvert: EXTRA_TAGS,
    },
    // Windows High Contrast and its successors. Launch-gate Security item and
    // Accessibility §4: nothing may disappear when the OS takes over colour.
    {
      name: "forced-colors",
      use: { ...devices["Desktop Chrome"], forcedColors: "active" },
      grep: /@forced-colors/,
    },
    // 200% browser zoom on a 1440px laptop: a 720 CSS px layout viewport at
    // twice the pixel density. Architecture spec §8.3.
    {
      name: "zoom-200",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 720, height: 900 },
        deviceScaleFactor: 2,
      },
      grep: /@zoom/,
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
    // A cold `next build` takes well over Playwright's 60s default.
    timeout: 240_000,
  },
});
