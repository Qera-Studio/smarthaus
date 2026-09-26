import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

/**
 * The hardware carousel on the homepage.
 *
 * What matters: one slide visible at a time, the tablist drives it from the
 * pointer and the keyboard, the timer can be stopped, and under
 * prefers-reduced-motion it never runs at all.
 */

// Panels are asserted by name, never by the bare role: for one frame after a
// switch the outgoing slide can still count as visible (the reduced-motion
// reset turns its `visibility` change into a 0.01ms transition), and a
// strict-mode locator that resolves to two elements does not retry.
const section = (page: import("@playwright/test").Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "One stop, full house" }) });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await section(page).scrollIntoViewIfNeeded();
});

test("shows one slide at a time and titles the section with an h2", async ({ page }) => {
  const s = section(page);
  await expect(s.getByRole("heading", { level: 2, name: "One stop, full house" })).toBeVisible();
  await expect(s.getByRole("tab")).toHaveCount(8);
  await expect(s.getByRole("tabpanel")).toHaveCount(1);
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
});

test("a tab click switches the slide", async ({ page }) => {
  const s = section(page);
  await s.getByRole("tab", { name: "Lighting" }).click();
  await expect(s.getByRole("tab", { name: "Lighting" })).toHaveAttribute("aria-selected", "true");
  await expect(s.getByRole("tabpanel", { name: "Lighting" })).toBeVisible();
});

test("arrow keys, Home and End move the selection", async ({ page }) => {
  const s = section(page);
  await s.getByRole("tab", { name: "Cameras" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(s.getByRole("tab", { name: "Smart lock" })).toBeFocused();
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(s.getByRole("tabpanel", { name: "TV and audio" })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
});

test("the pause button stops the timer, and a second click restarts it", async ({ page }) => {
  const s = section(page);
  const pause = s.getByRole("button", { name: "Pause automatic advance" });
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(6000);
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
  // Focus is still on the button after the click. That must not hold it.
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await expect(pause.locator("svg").nth(0)).toBeVisible();
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible({ timeout: 8000 });
});

test("the timer runs under a resting pointer and advances on its own", async ({ page }) => {
  const s = section(page);
  await s.getByRole("button", { name: "Pause automatic advance" }).hover();
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible({ timeout: 8000 });
});

test("focus inside the bar pauses it and shows the play glyph", async ({ page }) => {
  const s = section(page);
  const pause = s.getByRole("button", { name: "Pause automatic advance" });
  // Keyboard focus, so :focus-visible is set; locator.focus() alone is not
  // enough for Chromium to treat it as keyboard-originated.
  await page.keyboard.press("Tab");
  await s.getByRole("tab", { name: "Cameras" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(pause.locator("svg").nth(0)).toBeHidden();
  await expect(pause.locator("svg").nth(1)).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
});

test("passes axe", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include("section:has(#hardware)").analyze();
  expect(results.violations).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("never autoplays, and the tabs still switch", async ({ page }) => {
    const s = section(page);
    await expect(s.getByRole("button", { name: "Pause automatic advance" })).toHaveCount(0);
    await page.waitForTimeout(6000);
    await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
    await s.getByRole("tab", { name: "Curtains" }).click();
    await expect(s.getByRole("tabpanel", { name: "Curtains" })).toBeVisible();
  });
});
