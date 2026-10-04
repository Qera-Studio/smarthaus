import { test, expect } from "./fixtures";

/**
 * Every homepage section after the hero sits 96px clear of its neighbours,
 * above and below, at every width (2026-10-04, at Shivanshu's call: the
 * process stack was touching the carousel).
 *
 * The enquiry is the one section whose top is a rule, so its 96px above is a
 * margin outside the rule and its padding above is the gap under the rule.
 */

test("pads every section after the hero by 96px above and below", async ({ page }) => {
  await page.goto("/");
  const sections = await page.locator("main > section:not([data-hero])").evaluateAll((all) =>
    all.map((el) => {
      const style = getComputedStyle(el);
      const ruled = parseFloat(style.borderTopWidth) > 0;
      return {
        label: el.getAttribute("aria-labelledby") ?? el.className,
        above: parseFloat(ruled ? style.marginTop : style.paddingTop),
        below: parseFloat(style.paddingBottom),
      };
    }),
  );
  expect(sections.length).toBeGreaterThanOrEqual(4);
  for (const section of sections) {
    expect(section, section.label).toMatchObject({ above: 96, below: 96 });
  }
});

test("draws the process sheets square, as every surface on the site is", async ({ page }) => {
  await page.goto("/");
  const radii = await page
    .locator("[data-process] ol > li")
    .evaluateAll((all) =>
      all.map((el) => [
        getComputedStyle(el).borderTopLeftRadius,
        getComputedStyle(el).borderTopRightRadius,
      ]),
    );
  expect(radii).toHaveLength(6);
  radii.flat().forEach((radius) => expect(radius).toBe("0px"));
});
