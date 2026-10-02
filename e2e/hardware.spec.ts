import { test, expect } from "./fixtures";
import type { Locator } from "@playwright/test";
import { expectAccessible } from "./checks";

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
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
});

test("a tab click switches the slide", async ({ page }) => {
  const s = section(page);
  await s.getByRole("tab", { name: "Lighting" }).click();
  await expect(s.getByRole("tab", { name: "Lighting" })).toHaveAttribute("aria-selected", "true");
  await expect(s.getByRole("tabpanel", { name: "Lighting" })).toBeVisible();
});

test("arrow keys, Home and End move the selection", async ({ page }) => {
  const s = section(page);
  await s.getByRole("tab", { name: "Smart lock" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(s.getByRole("tab", { name: "Wall controller" })).toBeFocused();
  await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
});

test("the pause button stops the timer, and a second click restarts it", async ({ page }) => {
  const s = section(page);
  const pause = s.getByRole("button", { name: "Pause automatic advance" });
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(6000);
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
  // Focus is still on the button after the click. That must not hold it.
  await pause.click();
  await expect(pause).toHaveAttribute("aria-pressed", "false");
  await expect(pause.locator("svg").nth(0)).toBeVisible();
  await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible({ timeout: 8000 });
});

test("the timer runs under a resting pointer and advances on its own", async ({ page }) => {
  const s = section(page);
  await s.getByRole("button", { name: "Pause automatic advance" }).hover();
  await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible({ timeout: 8000 });
});

test("focus inside the bar pauses it and shows the play glyph", async ({ page }) => {
  const s = section(page);
  const pause = s.getByRole("button", { name: "Pause automatic advance" });
  // Keyboard focus, so :focus-visible is set; locator.focus() alone is not
  // enough for Chromium to treat it as keyboard-originated.
  await page.keyboard.press("Tab");
  await s.getByRole("tab", { name: "Smart lock" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(pause.locator("svg").nth(0)).toBeHidden();
  await expect(pause.locator("svg").nth(1)).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
});

test("passes axe", async ({ page }) => {
  await expectAccessible(page, { include: "section:has(#hardware)" });
});

// --- Arrows, swipe and the push -------------------------------------------

test("the bar reads previous, divider, tabs, pause, divider, next", async ({ page }) => {
  const s = section(page);
  const order = await s.evaluate((el) => {
    const bar = el.querySelector('[role="tablist"]')!.parentElement!;
    return Array.from(bar.children)
      .filter((c) => c.tagName === "BUTTON" || c.getAttribute("role") === "tablist")
      .map((c) => {
        const cs = getComputedStyle(c);
        return {
          name: c.getAttribute("aria-label") ?? c.getAttribute("role"),
          start: cs.borderInlineStartStyle,
          end: cs.borderInlineEndStyle,
          left: c.getBoundingClientRect().left,
        };
      });
  });
  expect(order.map((o) => o.name)).toEqual([
    "Previous component",
    "Components",
    "Pause automatic advance",
    "Next component",
  ]);
  // Laid out in that order left to right, not only in source order.
  const lefts = order.map((o) => o.left);
  expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
  // The dividers: after previous, before pause, before next.
  expect(order[0]!.end).toBe("solid");
  expect(order[2]!.start).toBe("solid");
  expect(order[3]!.start).toBe("solid");
});

test("the arrows step through the slides and wrap at both ends", async ({ page }) => {
  const s = section(page);
  const next = s.getByRole("button", { name: "Next component" });
  const prev = s.getByRole("button", { name: "Previous component" });
  await next.click();
  await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible();
  await expect(s.getByRole("tab", { name: "Wall controller" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await prev.click();
  await prev.click();
  await expect(s.getByRole("tabpanel", { name: "Cameras" })).toBeVisible();
  await next.click();
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
});

/**
 * Both slides' offsets from the stage, taken once the push is under way.
 *
 * A fixed 270ms sleep after the click was the flaky part: on a loaded CI
 * runner the leaving slide was still at 0 when sampled (2026-09-28, twice on
 * iPhone 17), because the click's frame had not landed yet. The push takes
 * 800ms, so this polls until both slides have left their start and returns
 * that sample, which is mid-flight by construction.
 */
async function midFlight(s: Locator) {
  type Offset = { dx: number; dy: number; h: number };
  const sample = () =>
    s.evaluate((el) =>
      ["active", "leaving"].map((state) => {
        const slide = el.querySelector(`[data-state="${state}"]`);
        if (!slide) return null;
        const stage = slide.parentElement!.getBoundingClientRect();
        const r = slide.getBoundingClientRect();
        return { dx: r.left - stage.left, dy: r.top - stage.top, h: stage.height };
      }),
    );
  let last: (Offset | null)[] = [];
  await expect
    .poll(
      async () => {
        last = await sample();
        const [incoming, outgoing] = last;
        return Boolean(incoming && outgoing && incoming.dy !== 0 && outgoing.dy !== 0);
      },
      { timeout: 700, intervals: [20] },
    )
    .toBe(true);
  return last as [Offset, Offset];
}

test("a switch moves both slides vertically, in opposite halves of the stage", async ({ page }) => {
  const s = section(page);
  await s.getByRole("button", { name: "Pause automatic advance" }).click();
  await s.getByRole("button", { name: "Next component" }).click();
  const [incoming, outgoing] = await midFlight(s);
  // Next: the incoming slide rises from below, the outgoing one leaves upward.
  expect(incoming!.dy).toBeGreaterThan(0);
  expect(outgoing!.dy).toBeLessThan(0);
  // Together, as one strip: the gap between them is one stage height. Within
  // 2px, not 0.5: WebKit snaps each transformed layer on its own and was
  // measured 1.2px apart mid-flight on iPhone 17. A real desync (a different
  // curve, or one slide starting a frame late) is tens of pixels here.
  expect(Math.abs(incoming!.dy - outgoing!.dy - incoming!.h)).toBeLessThan(2);
  // Vertical only, whatever the arrow's direction.
  expect(incoming!.dx).toBe(0);
  expect(outgoing!.dx).toBe(0);
  // And it lands.
  await expect(s.locator('[data-state="leaving"]')).toHaveCount(0);
});

test("previous runs the push the other way", async ({ page }) => {
  const s = section(page);
  await s.getByRole("button", { name: "Pause automatic advance" }).click();
  await s.getByRole("button", { name: "Previous component" }).click();
  const [incoming, outgoing] = await midFlight(s);
  expect(incoming.dy).toBeLessThan(0);
  expect(outgoing.dy).toBeGreaterThan(0);
});

test("a sideways swipe on a phone steps the carousel", async ({ page, isMobile }) => {
  test.skip(!isMobile, "swipe is a touch gesture");
  const s = section(page);
  const stage = s.locator('[role="tabpanel"]').first().locator("..");
  const swipe = async (dx: number) => {
    const box = (await stage.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const common = { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true };
    await stage.dispatchEvent("pointerdown", { ...common, clientX: x, clientY: y });
    await stage.dispatchEvent("pointerup", { ...common, clientX: x + dx, clientY: y + 4 });
  };
  await swipe(-120);
  await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible();
  await swipe(120);
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
  // A short drag is a tap, not a swipe.
  await swipe(-12);
  await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
});

test("the stage leaves vertical scrolling to the page", async ({ page }) => {
  const touchAction = await section(page)
    .locator('[role="tabpanel"]')
    .first()
    .locator("..")
    .evaluate((el) => getComputedStyle(el).touchAction);
  expect(touchAction).toBe("pan-y");
});

test("keeps the selected tab inside the strip's view on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the strip only scrolls when the bar is narrower than the tabs");
  const s = section(page);
  await s.getByRole("button", { name: "Pause automatic advance" }).click();
  await s.getByRole("tab", { name: "Cameras" }).evaluate((el) => el.scrollIntoView());
  await s.getByRole("tab", { name: "Cameras" }).click();
  await section(page).scrollIntoViewIfNeeded();
  await s.getByRole("button", { name: "Next component" }).click();
  // Wrapped to the first tab: the strip must come back to show it.
  await expect
    .poll(() =>
      s.evaluate((el) => {
        const strip = el.querySelector('[role="tablist"]')!.getBoundingClientRect();
        const tab = el.querySelector('[role="tab"][aria-selected="true"]')!.getBoundingClientRect();
        return tab.left >= strip.left - 1 && tab.right <= strip.right + 1;
      }),
    )
    .toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("never autoplays, and the tabs still switch", async ({ page }) => {
    const s = section(page);
    await expect(s.getByRole("button", { name: "Pause automatic advance" })).toHaveCount(0);
    await page.waitForTimeout(6000);
    await expect(s.getByRole("tabpanel", { name: "Smart lock" })).toBeVisible();
    await s.getByRole("tab", { name: "Curtains" }).click();
    await expect(s.getByRole("tabpanel", { name: "Curtains" })).toBeVisible();
  });

  test("the arrows still work, and the slides swap without travelling", async ({ page }) => {
    const s = section(page);
    await s.getByRole("button", { name: "Next component" }).click();
    await expect(s.getByRole("tabpanel", { name: "Wall controller" })).toBeVisible();
    await expect(s.locator('[data-state="leaving"]')).toHaveCount(0);
  });
});
