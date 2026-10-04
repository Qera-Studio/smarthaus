import { test, expect, type Locator } from "./fixtures";
import { withConsentDecided } from "./checks";

/**
 * Two layers. The native cursor is the brown dot everywhere, controls
 * included, and it is what a visitor has until the mouse moves (and always
 * without JavaScript or in forced colours). Once it moves, Cursor.tsx draws
 * an inverting dot that turns square over anything clickable, and the native
 * one steps aside.
 *
 * The native checks read computed styles without moving the mouse, because a
 * move is what hands over.
 */

test.skip(({ isMobile }) => isMobile, "the cursor is a mouse concern");

test.beforeEach(async ({ page }) => {
  await withConsentDecided(page);
  await page.goto("/");
});

const DARK_DOT = "%2314110E";
const LIGHT_DOT = "%23F8F5F0";

async function cursorOf(control: Locator) {
  return control.evaluate((el) => getComputedStyle(el).cursor);
}

test("html carries the dark dot", async ({ page }) => {
  const root = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
  expect(root).toContain(DARK_DOT);
});

test("the nav and hero CTAs show the dot, not a hand and not nothing", async ({ page }) => {
  for (const link of [
    page.locator("header").getByRole("link", { name: "Book a site visit" }),
    // The hero's one CTA; Explore Villa left with the fluid hero (2026-09-28).
    page.locator("section[data-hero]").getByRole("link", { name: "Book a site visit" }),
  ]) {
    expect(await cursorOf(link)).toContain(DARK_DOT);
  }
});

test("a Button link and everything inside it show the dot", async ({ page }) => {
  const link = page.getByRole("link", { name: "View detailed pricing" });
  expect(await cursorOf(link)).toContain(DARK_DOT);
  const inner = await link.evaluate((el) =>
    Array.from(el.querySelectorAll("*")).map((c) => getComputedStyle(c).cursor),
  );
  for (const c of inner) expect(c).toContain(DARK_DOT);
});

test("the carousel's tabs and pause button show the dot", async ({ page }) => {
  expect(await cursorOf(page.getByRole("tab").first())).toContain(DARK_DOT);
  expect(await cursorOf(page.getByRole("button", { name: "Pause automatic advance" }))).toContain(
    DARK_DOT,
  );
});

test("a control on a dark ground shows the light dot", async ({ page }) => {
  const link = page.locator("footer").getByRole("link").first();
  expect(await cursorOf(link)).toContain(LIGHT_DOT);
});

test("form fields and their labels show the dot on the contact page", async ({ page }) => {
  await page.goto("/contact");
  const field = page.getByRole("textbox").first();
  expect(await cursorOf(field)).toContain("data:image/svg+xml");
  const label = page.locator("label").first();
  expect(await cursorOf(label)).toContain("data:image/svg+xml");
});

test("no element on the homepage uses any cursor but a dot", async ({ page }) => {
  const others = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .map((el) => ({ el: el.outerHTML.slice(0, 80), cursor: getComputedStyle(el).cursor }))
      .filter(({ cursor }) => !cursor.includes("data:image/svg+xml")),
  );
  expect(others).toEqual([]);
});

const box = (page: import("@playwright/test").Page) =>
  page.locator('[aria-hidden="true"][data-shape]');

/** Moves until the cursor answers: a move before hydration has no listener. */
async function takeOver(page: import("@playwright/test").Page, x = 200, y = 200) {
  let nudge = 0;
  await expect(async () => {
    await page.mouse.move(x + (nudge++ % 2), y);
    await expect(box(page)).toHaveAttribute("data-visible", "true", { timeout: 200 });
  }).toPass();
}

test.describe("the inverting cursor", () => {
  test("stays out of the way until the mouse moves", async ({ page }) => {
    await expect(box(page)).toHaveAttribute("data-visible", "false");
    expect(await page.evaluate(() => document.documentElement.dataset.cursor)).toBeUndefined();
  });

  test("takes over from the native dot everywhere once the mouse moves", async ({ page }) => {
    await takeOver(page);
    const cursors = await page.evaluate(() =>
      Array.from(document.querySelectorAll("html, body *"), (el) => getComputedStyle(el).cursor),
    );
    expect(new Set(cursors)).toEqual(new Set(["none"]));
  });

  test("turns square over a link and back to a dot off it", async ({ page }) => {
    const link = page.getByRole("link", { name: "View detailed pricing" });
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect(box(page)).toHaveAttribute("data-shape", "square");
    // One size for both shapes (2026-10-03): only the corners change.
    const size = async () => {
      const b = (await box(page).boundingBox())!;
      return [Math.round(b.width), Math.round(b.height)];
    };
    await expect.poll(size).toEqual([24, 24]);
    await page.getByRole("heading", { level: 2 }).first().hover();
    await expect(box(page)).toHaveAttribute("data-shape", "dot");
    await expect.poll(size).toEqual([24, 24]);
  });

  test("turns square over the carousel's tabs and arrows", async ({ page }) => {
    for (const control of [
      page.getByRole("tab").first(),
      page.getByRole("button", { name: "Next component" }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await control.hover();
      await expect(box(page)).toHaveAttribute("data-shape", "square");
    }
  });

  test("inverts what is behind it, keeping the hue warm", async ({ page }) => {
    // A plain stretch of bone page: the left gutter of a text page.
    await page.goto("/accessibility");
    const at = { x: 6, y: 400 };
    // Decoded in a blank page: no PNG library in the repo, and the site's CSP
    // is not in the way there.
    const scratch = await page.context().newPage();
    const pixel = async () => {
      const png = await page.screenshot({ clip: { ...at, width: 1, height: 1 } });
      return scratch.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const ctx = new OffscreenCanvas(1, 1).getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return { r: r!, g: g!, b: b! };
      }, png.toString("base64"));
    };
    const before = await pixel();
    expect(before.r).toBeGreaterThan(200);

    await takeOver(page, at.x, at.y);
    await expect.poll(async () => (await pixel()).r).toBeLessThan(60);
    // Inverted bone, hue turned back: still red over blue, a brown not a navy.
    const after = await pixel();
    expect(after.r).toBeGreaterThan(after.b);
    await scratch.close();
  });

  test("hides when the mouse leaves the window", async ({ page }) => {
    await takeOver(page);
    await page.dispatchEvent("body", "pointerout", { relatedTarget: null });
    await expect(box(page)).toHaveAttribute("data-visible", "false");
  });
});

test.describe("forced colours @forced-colors", () => {
  test("keeps the system's own cursor and draws no box", async ({ page }) => {
    // Hydrated first, or "no box" would pass before the component could run.
    await page.waitForLoadState("networkidle");
    await page.mouse.move(200, 200);
    await page.mouse.move(210, 200);
    await expect(box(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.dataset.cursor)).toBeUndefined();
  });
});
