import { expectAccessible, expectHydrated, expectNoHorizontalOverflow } from "./checks";
import { expect, test, type Page } from "./fixtures";
import { SITE_SETTINGS } from "../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../sanity/seed/solutions";

/**
 * "Works with", under every solution page's hero (Shivanshu, 2026-11-16),
 * drawn. The geometry is CSS, so where things land can only be checked in a
 * real engine: the middle square at the left edge, only the pairs as tabs in
 * a column beside it, each wire square-cornered with one turn at most, the
 * whole symmetrical about the middle, the link at each card's bottom left,
 * nothing wider than a 360px screen. Then what a keyboard and the pause
 * button do, and what reduced motion leaves out.
 */

const SECTION = 'section[aria-labelledby="works-with"]';
const section = (page: Page) => page.locator(SECTION);
const label = (id: string) => SITE_SETTINGS.solutionsMenu.items.find((i) => i.id === id)!.label;

const BRONZE = "rgb(176, 128, 79)"; // brown-400, the lit wire
const WALNUT = "rgb(82, 60, 42)"; // brown-700, the track
const LINEN = "rgb(240, 233, 221)"; // brown-100

/** The middle, the tabs, the wires and the column, as drawn. */
async function drawing(page: Page) {
  return section(page).evaluate((el) => {
    const box = (n: Element) => {
      const r = n.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        w: r.width,
        h: r.height,
      };
    };
    const centre = el.querySelector("[data-node]")!;
    const tabs = [...el.querySelectorAll("li [data-node]")];
    const wires = [...el.querySelectorAll("[aria-hidden='true'] > [data-slot]")].map((w) => {
      const style = getComputedStyle(w);
      return {
        slot: w.getAttribute("data-slot"),
        ...box(w),
        sides: (["Top", "Right", "Bottom", "Left"] as const).filter(
          (side) => style[`border${side}Width`] !== "0px",
        ),
        scale: style.scale,
      };
    });
    return {
      centre: { ...box(centre), radius: getComputedStyle(centre).borderRadius },
      tabs: tabs.map((t) => ({
        ...box(t),
        radius: getComputedStyle(t).borderRadius,
        label: box(t.lastElementChild!),
      })),
      column: box(tabs[0]!.closest("ul")!),
      wires,
      headerLeft: box(el.firstElementChild!).left,
    };
  });
}

for (const [slug, page] of Object.entries(SOLUTION_PAGES)) {
  const pairs = page.worksWith.pairs;

  test.describe(`works with: /solutions/${slug}`, () => {
    test.beforeEach(async ({ page: browser }) => {
      await browser.goto(`/solutions/${slug}`);
    });

    test("sits directly under the hero, its heading the page's, with nothing above it", async ({
      page: browser,
    }) => {
      const order = await browser.evaluate((selector) => {
        const hero = document.querySelector('section[aria-labelledby="solution-title"]')!;
        const own = document.querySelector(selector)!;
        const next = [...document.querySelectorAll("main section")];
        return {
          after: next[next.indexOf(hero) + 1] === own,
          below: own.getBoundingClientRect().top >= hero.getBoundingClientRect().bottom,
          first: own.querySelector("h2")!.previousElementSibling === null,
        };
      }, SECTION);
      expect(order).toEqual({ after: true, below: true, first: true });
      await expect(section(browser).locator("h2")).toHaveText(page.worksWith.heading);
    });

    test("draws its own solution as a square at the left edge, and only its pairs as tabs", async ({
      page: browser,
    }) => {
      await expect(section(browser).locator("[data-node]").first()).toHaveText(label(slug));
      await expect(section(browser).locator("li [data-node]")).toHaveText(
        pairs.map((p) => label(p.with)),
      );
      const { centre, headerLeft } = await drawing(browser);
      expect(Math.abs(centre.w - centre.h)).toBeLessThan(0.5);
      expect(centre.radius).toBe("0px");
      expect(Math.abs(centre.left - headerLeft)).toBeLessThan(1);
    });

    test("stacks the tabs in one column, sharp, equal and evenly spaced, centred on the middle", async ({
      page: browser,
    }) => {
      const { centre, tabs, column } = await drawing(browser);
      for (const t of tabs) {
        expect(t.radius).toBe("0px");
        expect(Math.abs(t.left - tabs[0]!.left)).toBeLessThan(0.5);
        expect(Math.abs(t.w - tabs[0]!.w)).toBeLessThan(0.5);
        expect(Math.abs(t.h - tabs[0]!.h)).toBeLessThan(0.5);
        expect(t.w).toBeGreaterThan(t.h);
        // The name fits its tab.
        expect(t.label.right).toBeLessThanOrEqual(t.right + 0.5);
      }
      const mid = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;
      expect(Math.abs(mid(centre) - mid(column))).toBeLessThan(0.5);
      // Symmetrical: the first and last as far above and below the middle.
      expect(
        Math.abs(mid(centre) - mid(tabs[0]!) - (mid(tabs.at(-1)!) - mid(centre))),
      ).toBeLessThan(0.5);
      expect(tabs[0]!.left).toBeGreaterThan(centre.right);
    });

    test("wires each tab to the middle with one turn at most, the two outer wires mirror images", async ({
      page: browser,
    }) => {
      const { centre, tabs, wires } = await drawing(browser);
      expect(wires.map((w) => w.slot)).toEqual(["top", "middle", "bottom"].slice(0, pairs.length));
      const midX = (centre.left + centre.right) / 2;
      const midY = (centre.top + centre.bottom) / 2;
      const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1);
      for (const [i, wire] of wires.entries()) {
        const tab = tabs[i]!;
        const tabMid = (tab.top + tab.bottom) / 2;
        // Every wire ends at its tab's edge.
        near(wire.right, tab.left);
        if (wire.slot === "middle") {
          // Straight across: no turn.
          expect(wire.sides).toEqual(["Top"]);
          near(wire.left, centre.right);
          near((wire.top + wire.bottom) / 2, midY);
          near((wire.top + wire.bottom) / 2, tabMid);
        } else {
          // Up or down out of the middle's centre, then one turn across.
          expect(wire.sides).toEqual(["Top", "Left"]);
          near(wire.left + 1, midX);
          if (wire.slot === "top") {
            near(wire.top + 1, tabMid);
            near(wire.bottom, centre.top);
            expect(wire.scale).toBe("none");
          } else {
            near(wire.bottom - 1, tabMid);
            near(wire.top, centre.bottom);
            expect(wire.scale).toBe("1 -1");
          }
        }
      }
      const [top, , bottom] = wires;
      near(top!.left, bottom!.left);
      near(top!.w, bottom!.w);
      near(top!.h, bottom!.h);
      near(midY - top!.top, bottom!.bottom - midY);
    });

    test("keeps the page inside the screen", async ({ page: browser }) => {
      await expectNoHorizontalOverflow(browser);
    });

    test("opens on its first pair, and a pick changes the card without moving the page", async ({
      page: browser,
    }) => {
      await expectHydrated(browser);
      const shown = section(browser).locator("[data-shown]");
      await expect(shown.locator("h3")).toHaveText(pairs[0]!.title);
      const panel = shown.locator("..");
      const before = (await panel.boundingBox())!.height;
      const other = pairs.at(-1)!;
      await section(browser)
        .getByRole("button", { name: `${label(other.with)}, works with ${label(slug)}` })
        .click();
      await expect(shown.locator("h3")).toHaveText(other.title);
      expect((await panel.boundingBox())!.height).toBe(before);
    });

    // Shivanshu, 2026-11-16: "the cta always stays pinned to the bottom left
    // of the card, irrespective of the content".
    test("pins each card's link to the card's bottom left, clear of the pause button", async ({
      page: browser,
    }) => {
      await expectHydrated(browser);
      const places = [];
      for (const pair of pairs) {
        await section(browser)
          .getByRole("button", { name: `${label(pair.with)}, works with ${label(slug)}` })
          .click();
        await expect(section(browser).locator("[data-shown]")).toHaveAttribute(
          "data-panel",
          pair.with,
        );
        places.push(
          await section(browser).evaluate((el) => {
            const card = el.querySelector("[data-shown]")!;
            const panel = card.parentElement!;
            const style = getComputedStyle(panel);
            const p = panel.getBoundingClientRect();
            const link = card.querySelector("a")!.getBoundingClientRect();
            const hold = el
              .querySelector('[aria-label="Pause the animation"]')
              ?.getBoundingClientRect();
            return {
              left: Math.round(
                link.left -
                  p.left -
                  parseFloat(style.borderLeftWidth) -
                  parseFloat(style.paddingLeft),
              ),
              bottom: Math.round(
                p.bottom -
                  parseFloat(style.borderBottomWidth) -
                  parseFloat(style.paddingBottom) -
                  link.bottom,
              ),
              // On the page, not the screen: each click scrolls its tab into view.
              x: Math.round(link.left + scrollX),
              y: Math.round(link.bottom + scrollY),
              clear: !hold || hold.left >= link.right || hold.top >= link.bottom,
            };
          }),
        );
      }
      for (const place of places) {
        expect(place).toMatchObject({ left: 0, bottom: 0, clear: true });
        expect([place.x, place.y]).toEqual([places[0]!.x, places[0]!.y]);
      }
    });
  });
}

test.describe("works with: the keyboard", () => {
  test("Tab reaches the middle, the arrows walk down the tabs, Enter picks", async ({ page }) => {
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    await section(page)
      .locator("h2")
      .evaluate((h2: HTMLElement) => {
        h2.tabIndex = -1;
        h2.focus();
      });
    await page.keyboard.press("Tab");
    await expect(section(page).getByRole("button", { name: "Cameras", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const first = section(page).getByRole("button", { name: "Smart lock, works with Cameras" });
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(section(page).locator("[data-shown] h3")).toHaveText(
      SOLUTION_PAGES.cameras!.worksWith.pairs[0]!.title,
    );
  });
});

test.describe("works with: motion", () => {
  const bars = (page: Page) =>
    section(page).evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .map((a) => ({
          name: ((a as CSSAnimation).animationName ?? "").replace(/^.*works-/, ""),
          state: a.playState,
          slot: ((a.effect as KeyframeEffect).target as Element)
            .closest("[data-slot]")
            ?.getAttribute("data-slot"),
        }))
        .filter((a) => ["rise", "run", "fill", "glow"].includes(a.name))
        .sort((x, y) => x.name.localeCompare(y.name)),
    );

  // Shivanshu, 2026-11-16: the line itself a glowing progress bar, its glow
  // growing as it reaches the tab.
  test("fills the picked tab's wire with a glowing bar, up and across, and the pause button holds it", async ({
    page,
  }) => {
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    await section(page).scrollIntoViewIfNeeded();
    const on = (state: string) => [
      { name: "glow", state, slot: "top" },
      { name: "rise", state, slot: "top" },
      { name: "run", state, slot: "top" },
    ];
    await expect.poll(() => bars(page)).toEqual(on("running"));
    await section(page).getByRole("button", { name: "Pause the animation" }).click();
    await expect.poll(() => bars(page)).toEqual(on("paused"));
  });

  test("moves the bar down the column with the card, straight across the middle wire", async ({
    page,
  }) => {
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    await section(page).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bars(page)).length).toBe(3);
    // Run the timer out rather than wait for it.
    await section(page).evaluate((el) => {
      for (const a of el.getAnimations({ subtree: true })) {
        if ((a as CSSAnimation).animationName.endsWith("works-timer")) a.finish();
      }
    });
    await expect(section(page).locator("[data-shown]")).toHaveAttribute("data-panel", "garage");
    await expect
      .poll(() => bars(page))
      .toEqual([
        { name: "fill", state: "running", slot: "middle" },
        { name: "glow", state: "running", slot: "middle" },
      ]);
  });

  test("lights the picked wire end to end once a tab is picked, and moves nothing", async ({
    page,
  }) => {
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    await section(page).getByRole("button", { name: "Lighting, works with Cameras" }).click();
    const colours = await section(page).evaluate((el) =>
      [...el.querySelectorAll("[aria-hidden='true'] > [data-slot]")].map(
        (w) => getComputedStyle(w).borderTopColor,
      ),
    );
    expect(colours).toEqual([WALNUT, WALNUT, BRONZE]);
    expect(await bars(page)).toEqual([]);
  });

  test("moves no dot and lights no halo any more", async ({ page }) => {
    await page.goto("/solutions/cameras");
    const old = await section(page).evaluate(
      (el) =>
        el
          .getAnimations({ subtree: true })
          .filter((a) => /pulse|arrive/.test((a as CSSAnimation).animationName ?? "")).length,
    );
    expect(old).toBe(0);
  });

  test("starts nothing under reduced motion, shows no pause button, and lights the first pair's wire", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page).getByRole("button", { name: "Pause the animation" })).toHaveCount(0);
    const running = await section(page).evaluate(
      (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
    );
    expect(running).toBe(0);
    await expect(section(page).locator("[data-slot='top'][data-lit]")).toHaveCSS(
      "border-top-color",
      BRONZE,
    );
  });
});

// Shivanshu, 2026-11-16: the section dark, every box lit as the middle is,
// square, with no ring, glow or dot, and a card of its own for the middle.
test.describe("works with: the dark section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/solutions/cameras");
  });

  test("runs dark from one edge of the screen to the other, its content in the column", async ({
    page,
  }) => {
    const box = await section(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        width: document.documentElement.clientWidth,
        ground: getComputedStyle(el).backgroundColor,
        headerLeft: el.firstElementChild!.getBoundingClientRect().left,
        columnLeft: document
          .querySelector('section[aria-labelledby="solution-features"] h2')!
          .getBoundingClientRect().left,
      };
    });
    expect(box.left).toBe(0);
    expect(Math.round(box.right)).toBe(box.width);
    expect(box.ground).toBe("rgb(10, 8, 7)");
    expect(Math.round(box.headerLeft)).toBe(Math.round(box.columnLeft));
  });

  test("lights every tab exactly as the middle, and puts no ring, glow or dot on any, picked or not", async ({
    page,
  }) => {
    await expectHydrated(page);
    // A tab picked by hand, and the middle not.
    await section(page).getByRole("button", { name: "Garage, works with Cameras" }).click();
    await section(page).locator("h2").click();
    await page.mouse.move(0, 0);
    const looks = await section(page).evaluate((el) =>
      [...el.querySelectorAll("[data-node]")].map((n) => {
        const style = getComputedStyle(n);
        return {
          ground: style.backgroundColor,
          ink: style.color,
          shadow: style.boxShadow,
          border: style.borderTopWidth,
          before: getComputedStyle(n, "::before").content,
          after: getComputedStyle(n, "::after").content,
          children: [...n.children].map((c) => getComputedStyle(c).boxShadow),
        };
      }),
    );
    expect(looks).toHaveLength(4);
    for (const look of looks) {
      expect(look).toEqual({
        ground: LINEN,
        ink: looks[0]!.ink,
        shadow: "none",
        border: "0px",
        before: "none",
        after: "none",
        children: ["none", "none"],
      });
    }
  });

  test("gives the middle a card of its own, not the section's heading again", async ({ page }) => {
    await expectHydrated(page);
    await section(page).getByRole("button", { name: "Cameras", exact: true }).click();
    const card = section(page).locator("[data-shown]");
    const own = SOLUTION_PAGES.cameras!.worksWith;
    await expect(card.locator("h3")).toHaveText(own.line);
    await expect(card).toContainText(
      "Works with Smart lock, Garage and Lighting, in the same app.",
    );
    await expect(card).not.toContainText(own.heading);
    await expect(card).not.toContainText(own.subtext);
    // No wire is the middle's own.
    await expect(section(page).locator("[data-lit]")).toHaveCount(0);
  });
});

test.describe("works with: what a reader can see", () => {
  test("draws every icon at 3:1 or better on its box (WCAG 1.4.11)", async ({ page }) => {
    await page.goto("/solutions/cameras");
    const ratios = await section(page).evaluate((el) => {
      const luminance = (rgb: string) => {
        const [r, g, b] = rgb
          .match(/\d+/g)!
          .slice(0, 3)
          .map((v) => {
            const c = Number(v) / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      return [...el.querySelectorAll("[data-icon]")].map((icon) => {
        const ink = luminance(getComputedStyle(icon).backgroundColor);
        const ground = luminance(getComputedStyle(icon.parentElement!).backgroundColor);
        const [hi, lo] = ink > ground ? [ink, ground] : [ground, ink];
        return (hi + 0.05) / (lo + 0.05);
      });
    });
    expect(ratios).toHaveLength(4);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test("passes axe with a pair, the pause, and the middle picked", async ({ page }) => {
    await page.goto("/solutions/cameras");
    await expectHydrated(page);
    const include = { include: SECTION };
    await expectAccessible(page, include);
    await section(page).getByRole("button", { name: "Pause the animation" }).click();
    await expectAccessible(page, include);
    await section(page).getByRole("button", { name: "Garage, works with Cameras" }).click();
    await expectAccessible(page, include);
    await section(page).getByRole("button", { name: "Cameras", exact: true }).click();
    await expectAccessible(page, include);
  });

  test("puts no inline style in the server's HTML: the strict CSP twin would report it", async ({
    request,
  }) => {
    const html = await (await request.get("/solutions/cameras")).text();
    const own = html.slice(html.indexOf('aria-labelledby="works-with"'));
    const block = own.slice(0, own.indexOf("</section>"));
    expect(block).not.toMatch(/\sstyle="/);
  });
});
