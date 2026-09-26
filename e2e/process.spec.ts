import { test, expect } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

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

test("insets every page, and never lets the copy reach the screen edge", async ({ page }) => {
  // This regressed twice. The inset is spread across a base rule plus several
  // per-layout overrides, so a layout that sets its own padding silently drops
  // it and nothing else notices. Asserted on the COMPUTED value of every page
  // rather than on the stylesheet, which is the only way to catch an override.
  //
  // The 64px figure is DESKTOP only. Below lg it is the page gutter: two 64px
  // insets on a 390px screen left the body text 47px wide, a word or two per
  // line. So the assertion is expressed as "at least a gutter, and the outer
  // edges are flush only where flush means the section rather than the screen".
  const wide = page.viewportSize()!.width >= 1024;
  const padding = await rail(page)
    .locator("li")
    .evaluateAll((pages) =>
      pages.map((el) => {
        const styles = getComputedStyle(el);
        return {
          start: parseFloat(styles.paddingInlineStart),
          end: parseFloat(styles.paddingInlineEnd),
        };
      }),
    );

  expect(padding).toHaveLength(6);
  padding.forEach(({ start, end }, index) => {
    const first = index === 0;
    const last = index === padding.length - 1;

    if (wide) {
      // Flush with the section at the two outer edges, 64px everywhere else.
      expect(start).toBe(first ? 0 : 64);
      expect(end).toBe(last ? 0 : 64);
      return;
    }

    // Below lg the pin is full-bleed, so every edge including the outer two
    // must keep a gutter or the copy runs into the screen edge.
    expect(start, `page ${index} leading inset`).toBeGreaterThanOrEqual(16);
    expect(end, `page ${index} trailing inset`).toBeGreaterThanOrEqual(16);
  });
});

test("passes axe accessibility checks", async ({ page }) => {
  await expectAccessible(page);
});

test("no em dashes in the copy", async ({ page }) => {
  await expectNoEmDash(rail(page));
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
  await expectNoHorizontalOverflow(page);
});

test("reaches the last page by the end of the pin window", async ({ page }) => {
  const box = await rail(page).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
  await page.evaluate(({ top, height }) => window.scrollTo(0, top + height), box);
  await page.waitForTimeout(400);

  // Six pages, so the track travels five of them and a little more: the
  // computed translate is a calc() of a percentage and the overrun, so the
  // RENDERED offset is read rather than the string parsed.
  const offset = await rail(page)
    .locator("ol")
    .evaluate(
      (el) => el.getBoundingClientRect().left - el.parentElement!.getBoundingClientRect().left,
    );
  expect(offset).toBeLessThan(0);
});

/**
 * The portal: the section opens as a small square near the TOP of the viewport
 * and grows downward to fill it BEFORE the rail moves at all.
 *
 * The two phases share one timeline, split at --process-portal-end, so the
 * thing worth guarding is the handover. If that boundary ever drifts, the rail
 * starts sliding underneath a half-grown portal and the section reads as
 * broken while every existing assertion still passes.
 */
test.describe("the portal", () => {
  // Percentage of the pin window to scroll to, as a fraction of its travel.
  //
  // Converges rather than scrolling once. The target is measured from layout,
  // and right after load the layout above the rail is still settling: on
  // WebKit the first jump from the top landed 5 to 8px short of where the rail
  // then sat (measured, 40 runs: y=1080 to 1083 against 1088.5), while every
  // later jump landed exactly. At the start of the pin the section above
  // still moves 1:1 with scroll, so that shortfall read as the "hold" moving
  // and failed the test on iPhone about one run in fifteen. Re-measuring after
  // each scroll removes the dependency on when the page happened to settle.
  const at = async (page: import("@playwright/test").Page, fraction: number) => {
    let miss = Infinity;
    for (let attempt = 0; attempt < 5 && miss > 1; attempt += 1) {
      miss = await rail(page).evaluate(
        (el, f) =>
          new Promise<number>((resolve) => {
            const rect = el.getBoundingClientRect();
            const target = rect.top + window.scrollY + (rect.height - window.innerHeight) * f;
            window.scrollTo(0, target);
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const now = el.getBoundingClientRect();
                const settled = now.top + window.scrollY + (now.height - window.innerHeight) * f;
                resolve(Math.abs(window.scrollY - settled));
              }),
            );
          }),
        fraction,
      );
    }
    expect(miss, `could not land at ${fraction} of the pin window`).toBeLessThanOrEqual(1);
    await page.waitForTimeout(300);
  };

  const portal = (page: import("@playwright/test").Page) =>
    rail(page).locator("[class*='portal']").first();

  // The RENDERED block-axis scale: painted height over layout height. Not the
  // computed `scale`, because the zoom is now two scales composed — .grow's
  // timed half around .portal's scroll-driven half — and neither alone is the
  // size the reader sees. The block axis because below lg only it zooms.
  const scaleOf = (page: import("@playwright/test").Page) =>
    portal(page).evaluate(
      (el) => el.getBoundingClientRect().height / (el as HTMLElement).offsetHeight,
    );

  test("rises out of the bottom edge and grows upward to fill the stage", async ({ page }) => {
    await at(page, 0);

    // Small: a tenth of the stage, so it reads as an object rather than as a
    // page that happens to be slightly inset.
    expect(await scaleOf(page)).toBeLessThan(0.2);

    // Its BOTTOM is welded to the bottom of the stage and its top climbs, so
    // the slab appears to rise out of the screen edge rather than to sit in a
    // reserved box. That is what the overlay buys: the space it has not
    // covered yet belongs to the section above, so there is no empty stage to
    // sit in.
    //
    // Asserted against the viewport's midpoint rather than an exact offset, so
    // the anchor token can be retuned without rewriting the test.
    const small = await portal(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: window.innerHeight };
    });
    expect(small.top).toBeGreaterThan(small.height / 2);
    expect(small.bottom).toBeGreaterThan(small.height - 8);

    // By the end of the portal's slice it fills the stage, having grown upward
    // while its bottom stayed put.
    await at(page, 0.25);
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(0.99);
    const grown = await portal(page).evaluate((el) => el.getBoundingClientRect().top);
    expect(grown).toBeLessThan(small.top);
  });

  // Where the zoom ends, as a fraction of the pin window, read from the CSS
  // rather than hardcoded.
  //
  // It used to be a literal 0.08 for "mid-zoom", which was fine while both
  // phases shared one ratio and the boundary sat at 17%. They now have their
  // own — the zoom quick, the rail slow — and the split moved to about 6%, so
  // 0.08 landed AFTER the zoom and both tests read the wrong moment. Reading
  // the token means the pacing can be retuned without touching the assertions.
  // Reading the property directly is no good: a custom property computes to its
  // TOKEN value, so this came back as the literal string
  // "calc(100% * (1 * .6) / (1 * .6 + 5 * 2))" and parseFloat took the 100 off
  // the front. It only resolves once something uses it, so this borrows a real
  // property on a throwaway element and reads the pixels back out.
  const portalEnd = (page: import("@playwright/test").Page) =>
    rail(page).evaluate((el) => {
      const probe = document.createElement("div");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.inlineSize = "var(--process-portal-end)";
      el.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      const parent = el.getBoundingClientRect().width;
      probe.remove();
      return width / parent;
    });

  test("holds the section above still while the slab climbs over it", async ({ page }) => {
    // The overlay only reads as covering if the thing being covered stays put.
    // Without the hold the hero slides up behind the rising slab, two things
    // move at once, and it looks like the slab is merely scrolling into view.
    // Measured before the fix: the hero ran from y-293 to y-844 across the zoom.
    const previous = page.locator("[data-process]").locator("xpath=preceding-sibling::*[1]");
    const end = await portalEnd(page);

    await at(page, 0);
    const start = await previous.evaluate((el) => el.getBoundingClientRect().top);

    // Half way through the zoom, whatever the pacing makes that.
    await at(page, end / 2);
    const during = await previous.evaluate((el) => el.getBoundingClientRect().top);

    expect(
      Math.abs(during - start),
      "the section above should not move during the zoom",
    ).toBeLessThan(4);
  });

  test("releases the section above once the slab has covered it", async ({ page }) => {
    // The other half of the hold, and the bug it replaced. `position: sticky`
    // pins for the whole of its containing block, so the hero stayed frozen
    // behind every later section and its buttons went on taking clicks over
    // content the reader was actually looking at: measured at scroll 4700, well
    // past the rail, the hero still reported y0..833.
    const previous = page.locator("[data-process]").locator("xpath=preceding-sibling::*[1]");

    await at(page, 1);
    const bottom = await previous.evaluate((el) => el.getBoundingClientRect().bottom);

    expect(bottom, "the section above should have scrolled away").toBeLessThan(0);
  });

  test("holds the rail still until the portal has finished growing", async ({ page }) => {
    const track = rail(page).locator("ol");
    const end = await portalEnd(page);

    // Mid-zoom: the portal is partly grown and the track has NOT started.
    await at(page, end / 2);
    const scale = await scaleOf(page);
    expect(scale).toBeGreaterThan(0.1);
    expect(scale).toBeLessThan(1);

    // The rendered offset of the track in its viewport, not the computed
    // translate: that is a calc() of a percentage and the overrun.
    const offsetOf = () =>
      track.evaluate(
        (el) => el.getBoundingClientRect().left - el.parentElement!.getBoundingClientRect().left,
      );
    expect(Math.abs(await offsetOf())).toBeLessThan(1);

    // Past the boundary the rail is moving and the portal is done.
    await at(page, 0.5);
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(0.99);
    expect(await offsetOf()).toBeLessThan(0);
  });

  test("finishes growing on its own past the handoff, and shrinks back above it", async ({
    page,
  }) => {
    // Scroll drives the zoom only to --process-portal-handoff (0.5). Just past
    // the end of that scroll the reader has stopped, and the slab must still
    // reach full size without another pixel of scrolling.
    //
    // Save-Data keeps the hero's three.js canvas off. ProcessHandoff's observer
    // runs on rendering frames, and headless Chrome draws that canvas in
    // software: under parallel workers a frame took seconds, so the observer
    // fired after the poll gave up. Measured, not guessed. It is the hero's
    // cost, not this section's, and a GPU renders it in a few milliseconds.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", { value: { saveData: true } });
    });
    await page.goto("/");
    const end = await portalEnd(page);

    await at(page, end / 2);
    expect(await scaleOf(page), "scroll alone stops short of full size").toBeLessThan(0.5);

    await at(page, end * 1.05);
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(0.99);

    // Back above the handoff it runs back down to scroll's share, smoothly
    // rather than holding at full size.
    await at(page, end * 0.9);
    await expect.poll(() => scaleOf(page)).toBeLessThan(0.5);
  });

  test("leaves the hero's buttons clickable while the slab is still small", async ({ page }) => {
    // The overlay pulls this section up over the hero, so its box covers the
    // hero's CTAs from the moment the page loads — while the slab inside it is
    // a tenth of a stage and nothing is painted over them at all. Measured
    // before the fix: both "Book a site visit" and "Explore Villa" reported the
    // process SECTION as the hit target, and neither button worked.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise(requestAnimationFrame));

    const blocked = await page.evaluate(() => {
      const process = document.querySelector("[data-process]");
      return [...document.querySelectorAll("a, button")]
        .filter((el) => /explore villa|book a site visit/i.test(el.textContent || ""))
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          // On screen only: the footer carries its own copy of the CTA.
          if (!rect.width || rect.top > window.innerHeight || rect.bottom < 0) return false;
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          return !(el === hit || el.contains(hit)) && !!process?.contains(hit);
        })
        .map((el) => (el.textContent || "").trim());
    });

    expect(blocked, "the process section should not swallow the hero's clicks").toEqual([]);
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
    // Polled: the last half of the grow is a timed transition, not scroll.
    await at(page, 0.3);
    expect(await darkAt(middle.x, middle.y), "centre should be dark once grown").toBe(true);
    await expect
      .poll(() => darkAt(edge.x, edge.y), { message: "viewport edge should be dark once grown" })
      .toBe(true);
  });

  test("the growing stage never makes the document scroll sideways", async ({ page }) => {
    // scale() paints outside the border box, so a portal that scaled about the
    // wrong origin, or a stage wider than its container, would push the
    // document width out. The pin clips it; this asserts the clip holds
    // throughout the grow rather than only at the two ends.
    //
    // Measured once and stepped in a single evaluate rather than through at(),
    // which re-measures the section and settles for 300ms on every call. Five
    // of those ran to 13.5s against a 30s limit and timed out under load.
    const box = await rail(page).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });

    for (const f of [0, 0.05, 0.1, 0.16, 0.25]) {
      await page.evaluate(
        ({ top, height, f }) => window.scrollTo(0, top + (height - window.innerHeight) * f),
        { ...box, f },
      );
      // One frame is enough: the assertion reads layout, not an animated value.
      await page.evaluate(() => new Promise(requestAnimationFrame));
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
