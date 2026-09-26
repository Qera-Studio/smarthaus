import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Smarthaus/);
});

test("homepage passes axe accessibility checks", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
