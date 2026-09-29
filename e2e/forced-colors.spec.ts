import { test, expect, type Locator } from "./fixtures";

/**
 * Forced colours @forced-colors: the OS replaces every author colour (Windows
 * High Contrast and its successors). Anything that shows state or shape by
 * background colour alone disappears. Launch-gate Security item and
 * Accessibility §4. Runs only in the forced-colors project.
 */

/**
 * The colour channels without alpha. Forced colours keeps an author's alpha,
 * so white at 45% and solid white are different strings and the same thing
 * to the eye on a white canvas: that is exactly how the knob used to vanish.
 */
const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).slice(0, 3).join(",");

const style = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate(
    (el, [prop, pseudoElement]) =>
      getComputedStyle(el, pseudoElement ?? null).getPropertyValue(prop!),
    [property, pseudo] as const,
  );

test.describe("forced colours @forced-colors", () => {
  test("the consent switch's knob looks different on and off", async ({ page }) => {
    await page.goto("/cookie-preferences");
    const analytics = page.getByRole("switch", { name: "Analytics" });
    await expect(analytics).not.toBeChecked();
    const off = await style(analytics, "background-color", "::after");
    await analytics.check();
    // The knob transitions its colour, so wait for it to arrive.
    await expect.poll(() => style(analytics, "background-color", "::after")).not.toBe(off);
    const on = await style(analytics, "background-color", "::after");
    // Compared by channel, not string: see rgb() above. Different from each
    // other, and neither the canvas colour, which would make it invisible.
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgb(off)).not.toBe(rgb(on));
    expect(rgb(off)).not.toBe(rgb(canvas));
    expect(rgb(on)).not.toBe(rgb(canvas));
  });

  test("the switch's frame changes colour when it is on", async ({ page }) => {
    await page.goto("/cookie-preferences");
    const analytics = page.getByRole("switch", { name: "Analytics" });
    const off = await style(analytics, "border-top-color");
    await analytics.check();
    await expect.poll(() => style(analytics, "border-top-color")).not.toBe(off);
  });

  test("a button keeps a visible edge, since its background is replaced", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("main").getByRole("link", { name: "Book a site visit" }).first();
    expect(await style(cta, "border-top-style")).toBe("solid");
    expect(await style(cta, "border-top-width")).toBe("1px");
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgb(await style(cta, "border-top-color"))).not.toBe(rgb(canvas));
  });

  test("keyboard focus still draws a ring", async ({ page }) => {
    await page.goto("/cookie-preferences");
    const analytics = page.getByRole("switch", { name: "Analytics" });
    await analytics.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(analytics).toBeFocused();
    expect(await style(analytics, "outline-style")).toBe("solid");
    expect(parseFloat(await style(analytics, "outline-width"))).toBeGreaterThanOrEqual(2);
  });

  test("form fields keep their underline", async ({ page }) => {
    await page.goto("/contact");
    const control = page.locator("main").getByLabel("Name").locator("..");
    expect(await style(control, "border-bottom-style")).toBe("solid");
    expect(await style(control, "border-bottom-width")).toBe("1px");
  });
});
