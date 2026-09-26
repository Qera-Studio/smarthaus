import { defineConfig, devices } from "@playwright/test";
import { MAIL_SINK } from "./e2e/mail-sink";

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
const EXTRA_TAGS = /@forced-colors|@zoom|@delivery/;

// The mail sink: every form test's email is written here instead of sent (see
// src/app/contact/actions.ts). E2E_REAL_MAIL=1 turns it off for the one job that
// proves real delivery through Resend, the delivery project below.
const REAL_MAIL = process.env.E2E_REAL_MAIL === "1";
const SINK_ENV = REAL_MAIL ? "" : `E2E_MAIL_SINK=${MAIL_SINK} `;

export default defineConfig({
  testDir: "./e2e",
  // " 2." is macOS Finder's duplicate suffix; a copied spec would run twice.
  testIgnore: /.* 2\./,
  fullyParallel: true,
  forbidOnly: CI,
  // Retries tell a reproducible failure from an intermittent one. Neither is
  // green: see failOnFlakyTests below.
  retries: CI ? 2 : 0,
  // A test that fails and then passes on retry is flaky, and flaky is a
  // failure (AGENTS.md "When a test fails"). Retries still run, so the report
  // shows whether a failure reproduces; the build goes red either way.
  failOnFlakyTests: CI,
  // Measured both ways. Locally, at the default count WebKit (then the iPhone 14 profile) timed
  // out 61 tests under load and passed all of them at three. In CI the runner
  // is smaller: at three, one consent test took 37.5s of a 30s budget with
  // every step completing, and passed alone in 9.5s. Two there.
  workers: CI ? 2 : 3,
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
    // The current base iPhone (402 CSS px, WebKit) and the narrow Android
    // width (360 CSS px, Chromium) that Samsung's Galaxy S line ships. The name
    // sets only screen, density, user agent and touch; the engine is always
    // Playwright's current build. Renaming a project renames its CI check, and
    // the required checks in the "protect latest and main" ruleset must change
    // in the same sitting (AGENTS.md "Branch protection").
    {
      name: "iPhone 17",
      use: { ...devices["iPhone 17"] },
      grepInvert: EXTRA_TAGS,
    },
    {
      name: "Galaxy S24",
      use: { ...devices["Galaxy S24"] },
      grepInvert: EXTRA_TAGS,
    },
    // Windows High Contrast and its successors. Launch-gate Security item and
    // Accessibility §4: nothing may disappear when the OS takes over colour.
    {
      name: "forced-colors",
      use: { ...devices["Desktop Chrome"], forcedColors: "active" },
      grep: /@forced-colors/,
    },
    // One real email through Resend per run, proving delivery end to end. The
    // project exists only with E2E_REAL_MAIL=1, as the CI delivery job sets it
    // with the Resend secrets: in a plain run the server is in sink mode, where
    // this test would rightly fail. Every other project skips @delivery.
    ...(REAL_MAIL
      ? [
          {
            name: "delivery",
            use: { ...devices["Desktop Chrome"] },
            grep: /@delivery/,
          },
        ]
      : []),
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
    command: `rm -rf ${MAIL_SINK} && PLAYWRIGHT=1 pnpm build && PLAYWRIGHT=1 ${SINK_ENV}pnpm start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    // A cold `next build` takes well over Playwright's 60s default.
    timeout: 240_000,
  },
});
