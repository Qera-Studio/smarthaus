import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The "Our Process" rail.
 *
 * What matters here is the part a DOM assertion cannot see: that vertical
 * scrolling actually moves the track sideways, that the page itself never gains
 * a horizontal scrollbar while it does, and that the whole mechanism steps
 * aside under prefers-reduced-motion rather than trapping the reader in a
 * section that will not move.
 */

const rail = (page: import("@playwright/test").Page) => page.locator("[data-process]");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders six steps with headings in the accessibility tree", async ({ page }) => {
  const items = rail(page).locator("ol > li");
  await expect(items).toHaveCount(6);

  // Every heading is present at all times, whatever the track's offset. This is
  // what gives a screen-reader user the whole section linearly, without ever
  // scrolling sideways.
  for (const name of [
    "Complete home automation cycle",
    "Site Assessment",
    "Proposal",
    "Installation",
    "Handover",
    "Care",
  ]) {
    await expect(rail(page).getByRole("heading", { level: 3, name })).toBeAttached();
  }
});

test("keeps the homepage to one h1 and titles the section with an h2", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(rail(page).getByRole("heading", { level: 2, name: "Our Process" })).toBeVisible();
});

test("exposes the rail as a focusable, labelled scroll region", async ({ page }) => {
  // axe's scrollable-region-focusable. Without this the section fails the
  // accessibility gate, which is set to 1.0 with no slack. Same treatment as
  // LegalTable, where it first failed on the Pixel 7 profile.
  const region = rail(page).getByRole("group");
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region).toHaveAttribute("aria-label", /process/i);
});

test("insets every page by 64px, except the two outer edges", async ({ page }) => {
  // This regressed twice. The inset is spread across a base rule plus several
  // per-layout overrides, so a layout that sets its own padding silently drops
  // it and nothing else notices. Asserted on the COMPUTED value of every page
  // rather than on the stylesheet, which is the only way to catch an override.
  const padding = await rail(page)
    .locator("li")
    .evaluateAll((pages) =>
      pages.map((el) => {
        const styles = getComputedStyle(el);
        return { start: styles.paddingInlineStart, end: styles.paddingInlineEnd };
      }),
    );

  expect(padding).toHaveLength(6);
  padding.forEach(({ start, end }, index) => {
    // The rail starts and ends flush with the section, so the first page has no
    // leading inset and the last no trailing one.
    expect(start).toBe(index === 0 ? "0px" : "64px");
    expect(end).toBe(index === padding.length - 1 ? "0px" : "64px");
  });
});

test("passes axe accessibility checks", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("no em dashes in the copy", async ({ page }) => {
  const copy = await rail(page).textContent();
  expect(copy).not.toContain("—");
});

test("vertical scrolling drives the track sideways, and the page never scrolls sideways", async ({
  page,
}) => {
  const track = rail(page).locator("ol");
  const before = await track.evaluate((el) => getComputedStyle(el).translate);

  const box = await rail(page).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  // Halfway through the pin window.
  await page.evaluate(
    ({ top, height }) => window.scrollTo(0, top + (height - window.innerHeight) / 2),
    box,
  );
  await page.waitForTimeout(400);

  const after = await track.evaluate((el) => getComputedStyle(el).translate);
  expect(after).not.toBe(before);

  // The whole point of the clipped viewport: the rail moves, the document does
  // not. A horizontal scrollbar here would mean the track escaped its box.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test("reaches the last page by the end of the pin window", async ({ page }) => {
  const box = await rail(page).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  await page.evaluate(({ top, height }) => window.scrollTo(0, top + height), box);
  await page.waitForTimeout(400);

  // Six pages, so the track travels five of them: -83.33% of its own width.
  // Asserted as a range rather than a string because the browser rounds.
  const percent = await rail(page)
    .locator("ol")
    .evaluate((el) => parseFloat(getComputedStyle(el).translate));
  expect(percent).toBeLessThan(0);
});

/**
 * The portal: the section opens as a small square near the bottom of the
 * viewport and grows to fill it BEFORE the rail moves at all.
 *
 * The two phases share one timeline, split at --process-portal-end, so the
 * thing worth guarding is the handover. If that boundary ever drifts, the rail
 * starts sliding underneath a half-grown portal and the section reads as
 * broken while every existing assertion still passes.
 */
test.describe("the portal", () => {
  // Percentage of the pin window to scroll to, as a fraction of its travel.
  const at = async (page: import("@playwright/test").Page, fraction: number) => {
    const box = await rail(page).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });
    await page.evaluate(
      ({ top, height, fraction }) =>
        window.scrollTo(0, top + (height - window.innerHeight) * fraction),
      { ...box, fraction },
    );
    await page.waitForTimeout(300);
  };

  const portal = (page: import("@playwright/test").Page) =>
    rail(page).locator("[class*='portal']").first();

  const scaleOf = (page: import("@playwright/test").Page) =>
    portal(page).evaluate((el) => parseFloat(getComputedStyle(el).scale) || 1);

  test("starts small and high, then grows down to fill the stage", async ({ page }) => {
    await at(page, 0);

    // Small: a tenth of the stage, so it reads as an object rather than as a
    // page that happens to be slightly inset.
    expect(await scaleOf(page)).toBeLessThan(0.2);

    // And HIGH. The square sits in the top portion of the viewport so it is
    // visible the moment the section is, and the growth opens downward into
    // the space the reader is still revealing. Anchored low it arrived at the
    // bottom edge, which meant scrolling past most of an empty screen first.
    //
    // Asserted against the viewport's midpoint rather than an exact offset, so
    // the anchor token can be retuned without rewriting the test.
    const { top, height } = await portal(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: window.innerHeight };
    });
    expect(top).toBeLessThan(height / 2);

    // By the end of the portal's slice it fills the stage.
    await at(page, 0.25);
    expect(await scaleOf(page)).toBeGreaterThan(0.99);
  });

  test("holds the rail still until the portal has finished growing", async ({ page }) => {
    const track = rail(page).locator("ol");

    // Mid-zoom: the portal is partly grown and the track has NOT started.
    await at(page, 0.08);
    const scale = await scaleOf(page);
    expect(scale).toBeGreaterThan(0.1);
    expect(scale).toBeLessThan(1);

    // parseFloat("0%") is 0, and so is parseFloat("none") via the || 0 below.
    const during = await track.evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
    expect(during).toBe(0);

    // Past the boundary the rail is moving and the portal is done.
    await at(page, 0.5);
    expect(await scaleOf(page)).toBeGreaterThan(0.99);
    const after = await track.evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
    expect(after).toBeLessThan(0);
  });

  test("keeps the title and its progress rule inside the page gutter", async ({ page }) => {
    // The pin bleeds past body's padding so the dark ground can reach the
    // viewport edge, and that carried the header out with it: the heading sat
    // flush against the screen edge and the progress rule ran off both sides.
    // The ground still bleeds; only the contents are inset again.
    await at(page, 0.3);

    const { width } = page.viewportSize()!;
    const bounds = await page.locator("[data-process] header").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const rule = el.querySelector("div")!.getBoundingClientRect();
      return { headerLeft: r.left, ruleLeft: rule.left, ruleRight: rule.right };
    });

    expect(bounds.ruleLeft, "progress rule should not touch the left edge").toBeGreaterThan(8);
    expect(bounds.ruleRight, "progress rule should not run off the right edge").toBeLessThan(
      width - 8,
    );
  });

  test("the dark ground grows with the slab instead of being there all along", async ({ page }) => {
    // The whole point of the portal: the brown-950 panel is the THING that
    // grows. It shipped first with the ground painted on the tall spacer, so
    // the dark field was already full-bleed and stationary and the reader saw
    // text scaling up on a background that never moved.
    //
    // Asserted on the painted page rather than on a class, because both
    // versions look identical in the DOM.
    const darkAt = (x: number, y: number) =>
      page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          // Walk up for the first element that actually paints something.
          let node: Element | null = el;
          while (node) {
            const bg = getComputedStyle(node).backgroundColor;
            const m = bg.match(/\d+/g);
            if (m && bg !== "rgba(0, 0, 0, 0)") return Number(m[0]) < 60;
            node = node.parentElement;
          }
          return false;
        },
        { x, y },
      );

    const { width, height } = page.viewportSize()!;
    const edge = { x: 2, y: Math.round(height / 2) };
    const middle = { x: Math.round(width / 2), y: Math.round(height / 2) };

    // While the slab is small the page shows around it: the viewport edge is
    // still the light canvas.
    await at(page, 0);
    expect(await darkAt(edge.x, edge.y), "viewport edge should be light at the start").toBe(false);

    // Once it has grown it covers the screen, edge included. A 24px light
    // border down every side is what a clip at the wrong level looks like, and
    // that is exactly what this catches.
    await at(page, 0.3);
    expect(await darkAt(middle.x, middle.y), "centre should be dark once grown").toBe(true);
    expect(await darkAt(edge.x, edge.y), "viewport edge should be dark once grown").toBe(true);
  });

  test("the growing stage never makes the document scroll sideways", async ({ page }) => {
    // scale() paints outside the border box, so a portal that scaled about the
    // wrong origin, or a stage wider than its container, would push the
    // document width out. The pin clips it; this asserts the clip holds
    // throughout the grow rather than only at the two ends.
    for (const f of [0, 0.05, 0.1, 0.16, 0.25]) {
      await at(page, f);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows, `horizontal overflow at ${f * 100}% of the pin window`).toBe(false);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("drops the pin and hands the rail back to the reader", async ({ page }) => {
    await page.goto("/");

    // The spacer collapses: no pin means no scroll distance to absorb, and
    // leaving five viewports of empty height behind would strand the reader.
    const height = await rail(page).evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(height).toBeLessThan(2000);

    // The track holds still and the region becomes a real scroll container, so
    // every page is still reachable by hand and by keyboard.
    const track = rail(page).locator("ol");
    await expect(track).toHaveCSS("translate", "none");
    await expect(rail(page).getByRole("group")).toHaveCSS("overflow-x", "auto");
  });

  test("shows the section at full size rather than as a tenth-scale square", async ({ page }) => {
    await page.goto("/");

    // The portal carries `scale: 0.1` as a STATIC declaration so the square is
    // correct before the animation attaches. Killing the animation does not
    // undo that, so reduced motion has to reset it explicitly. Without that
    // reset the entire section renders as an unreadable square in the corner
    // and every other assertion here still passes.
    const portal = rail(page).locator("[class*='portal']").first();
    await expect(portal).toHaveCSS("scale", "none");

    // And it actually occupies the section, rather than merely reporting no
    // scale while collapsed by something else.
    const ratio = await portal.evaluate((el) => {
      const own = el.getBoundingClientRect().width;
      const parent = (el.parentElement as HTMLElement).getBoundingClientRect().width;
      return own / parent;
    });
    expect(ratio).toBeGreaterThan(0.9);
  });
});
