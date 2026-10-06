import { createHash } from "node:crypto";

import { SPLASH_MAX_MS, SPLASH_SEEN_KEY } from "../src/lib/splash-boot";
import { expect, test, type Page } from "./fixtures";

/**
 * The loading splash, on the first full load in a tab (src/lib/splash-boot.ts).
 *
 * Every other spec starts with the splash marked as seen (e2e/fixtures.ts);
 * this one opts back in, so each test here is a visitor's first load.
 */
test.use({ splash: true });

const html = (page: Page) => page.locator("html");
const splash = (page: Page) => page.locator("#splash");

// The cap, plus the fade, plus room for a loaded runner.
const GONE_WITHIN = SPLASH_MAX_MS + 2000;

test("covers the page from the first paint on a first load, then gets out of the way", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(html(page)).toHaveAttribute("data-splash", "show");
  await expect(splash(page)).toBeVisible();

  await expect(html(page)).toHaveAttribute("data-splash", "done", { timeout: GONE_WITHIN });
  await expect(splash(page)).toBeHidden();
  await expect(page.locator("#splash-pct")).toHaveText("100");
  // Nothing left over the page: the hero's call to action takes the click.
  await page.getByRole("link", { name: "Book a site visit" }).first().click({ trial: true });
});

test("never shows twice in a tab: not on a reload", async ({ page }) => {
  await page.goto("/");
  await expect(html(page)).toHaveAttribute("data-splash", "done", { timeout: GONE_WITHIN });
  await page.reload({ waitUntil: "commit" });
  await expect(html(page)).toHaveAttribute("data-splash", "skip");
  await expect(splash(page)).toBeHidden();
});

test("never shows twice in a tab: not on a soft navigation", async ({ page }) => {
  await page.goto("/contact");
  await expect(html(page)).toHaveAttribute("data-splash", "done", { timeout: GONE_WITHIN });
  await page.getByRole("contentinfo").getByRole("link", { name: "Pricing" }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(html(page)).toHaveAttribute("data-splash", "done");
  await expect(splash(page)).toBeHidden();
});

test("shows again in a new tab, which is a new session", async ({ context }) => {
  const first = await context.newPage();
  await first.goto("/");
  await expect(html(first)).toHaveAttribute("data-splash", "done", { timeout: GONE_WITHIN });
  const second = await context.newPage();
  await second.goto("/", { waitUntil: "commit" });
  await expect(html(second)).toHaveAttribute("data-splash", "show");
  expect(await second.evaluate((key) => sessionStorage.getItem(key), SPLASH_SEEN_KEY)).toBe("1");
});

test("the strict policy's hash is the hash of the splash script the page serves", async ({
  page,
}) => {
  const response = await page.goto("/");
  const policy = response!.headers()["content-security-policy-report-only"]!;
  const script = await page
    .locator("head script:not([src])")
    .evaluateAll((els) =>
      els.map((el) => el.textContent ?? "").find((t) => t.includes("data-splash"))!,
    );
  const digest = createHash("sha256").update(script).digest("base64");
  expect(policy).toContain(`'sha256-${digest}'`);
  expect(response!.headers()["content-security-policy"]).not.toContain("'sha256-");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("still shows and leaves, with the bar complete rather than moving", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await expect(html(page)).toHaveAttribute("data-splash", "show");
    await expect(page.locator("#splash-pct")).toHaveText("100");
    await expect(html(page)).toHaveAttribute("data-splash", "done", { timeout: GONE_WITHIN });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("never covers the page, since nothing could take it down", async ({ page }) => {
    await page.goto("/");
    await expect(html(page)).not.toHaveAttribute("data-splash", /.*/);
    await expect(splash(page)).toBeHidden();
  });
});

test("sits above the cookie banner, the nav and back to top", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(html(page)).toHaveAttribute("data-splash", "show");
  // Compared by layer rather than by what is on top at one instant, so the
  // answer does not depend on catching the splash before it leaves.
  const layers = await page.evaluate(() => {
    const z = (el: Element | null) => Number(el ? getComputedStyle(el).zIndex : NaN);
    const fixed = [...document.querySelectorAll("body *")].filter(
      (el) => el.id !== "splash" && getComputedStyle(el).position === "fixed",
    );
    return {
      splash: z(document.getElementById("splash")),
      others: fixed.map(z).filter(Number.isFinite),
    };
  });
  expect(layers.others.length).toBeGreaterThan(0);
  layers.others.forEach((other) => expect(layers.splash).toBeGreaterThan(other));
});
