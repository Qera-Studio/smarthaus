import { test, expect } from "./fixtures";
import { expectAccessible } from "./checks";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Smarthaus/);
});

test("homepage passes axe accessibility checks", async ({ page }) => {
  await page.goto("/");
  await expectAccessible(page);
});
