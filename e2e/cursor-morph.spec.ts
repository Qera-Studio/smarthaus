import { test, expect } from "@playwright/test";

/**
 * The frame must grab on contact and let go on contact — no magnetic radius
 * either way. Desktop only: the phone profiles have no fine pointer, and the
 * component must stay inert there.
 */

test("morphs on a button and releases the moment the pointer leaves", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "fine pointer only");
  await page.goto("/");

  const ring = page.locator("[class*='ring'][aria-hidden='true']");
  const button = page.locator("a[data-cursor-morph]").first();
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;

  // Just outside the box: nothing yet. This is the "not magnetic" half.
  await page.mouse.move(box.x - 4, box.y + box.height / 2);
  await expect(ring).not.toHaveAttribute("data-active");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(ring).toHaveAttribute("data-active", "");
  await expect(button).toHaveAttribute("data-cursor-morphed", "");
  expect(await button.evaluate((el) => getComputedStyle(el).cursor)).toBe("none");

  // One pixel out is enough to let go.
  await page.mouse.move(box.x - 1, box.y + box.height / 2);
  await expect(ring).not.toHaveAttribute("data-active");
  await expect(button).not.toHaveAttribute("data-cursor-morphed");
});

test("stays inert without a fine pointer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "Desktop Chrome", "touch profiles only");
  await page.goto("/");
  await page.locator("a[data-cursor-morph]").first().tap();
  await expect(page.locator("[data-cursor-morphed]")).toHaveCount(0);
});
