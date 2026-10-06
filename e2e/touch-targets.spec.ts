import { test, expect, type Locator } from "./fixtures";
import { withConsentDecided } from "./checks";

/**
 * Touch targets on phones: 44x44 CSS px (Accessibility System §9, best
 * practice over WCAG 2.5.8's 24px floor). Measured by hit testing, not by box
 * size: 21px out from a control's centre in each direction, the control is
 * still what a finger lands on. That counts an invisible ::before that grows
 * the tap area, which is how the smaller controls reach it.
 */
test.skip(({ isMobile }) => !isMobile, "touch targets are a phone concern");

async function tapArea(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  return control.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const reach = 21;
    const probes = [
      [cx - reach, cy],
      [cx + reach, cy],
      [cx, cy - reach],
      [cx, cy + reach],
    ];
    return probes.map(([x, y]) => {
      const hit = document.elementFromPoint(x!, y!);
      return hit !== null && (hit === el || el.contains(hit));
    });
  });
}

test.beforeEach(async ({ page }) => {
  // The banner covers the lower half of a phone; these measure the controls.
  await withConsentDecided(page);
});

test("the menu toggle is a 44px target", async ({ page }) => {
  await page.goto("/");
  expect(await tapArea(page.getByRole("button", { name: "Open menu" }))).toEqual([
    true,
    true,
    true,
    true,
  ]);
});

test("each footer social chip is a 44px target that does not overlap its neighbour", async ({
  page,
}) => {
  await page.goto("/contact");
  const chips = page.locator("footer").getByRole("link", { name: /^Smarthaus on / });
  await expect(chips).toHaveCount(5);
  for (const chip of await chips.all()) {
    const label = await chip.getAttribute("aria-label");
    expect(await tapArea(chip), label!).toEqual([true, true, true, true]);
  }
  // Neighbours meet rather than overlap: 44px centre to centre, or more.
  const centres = await chips.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return (r.left + r.right) / 2;
    }),
  );
  for (let i = 1; i < centres.length; i += 1) {
    expect(centres[i]! - centres[i - 1]!).toBeGreaterThanOrEqual(43.5);
  }
});

test("each partner tab is a 44px target", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Partners" }).getByRole("tab");
  await expect(tabs).toHaveCount(2);
  for (const tab of await tabs.all()) {
    expect(await tapArea(tab), (await tab.textContent()) ?? "tab").toEqual([
      true,
      true,
      true,
      true,
    ]);
  }
});

test("each hardware tab is a 44px target", async ({ page }) => {
  await page.goto("/");
  // Scoped to the carousel: the partner cards above it have a tablist too.
  const tabs = page.getByRole("tablist", { name: "Components" }).getByRole("tab");
  expect(await tabs.count()).toBeGreaterThan(3);
  for (const tab of (await tabs.all()).slice(0, 4)) {
    expect(await tapArea(tab), (await tab.getAttribute("aria-label")) ?? "tab").toEqual([
      true,
      true,
      true,
      true,
    ]);
  }
});
