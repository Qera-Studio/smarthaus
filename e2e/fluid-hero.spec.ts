import { expect, test } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";

/**
 * The fluid hero in a real browser, on all three device profiles. The unit
 * suite proves the wiring against a fake context; this proves the chunk
 * loads, the context compiles the shaders, the first frame lands, and input
 * reaches it without a console error, on a GPU the CI runner emulates in
 * software. Touch is opted in by the product, so the two phone profiles run
 * the live path too.
 */

const hero = (page: import("@playwright/test").Page) => page.locator("[data-hero]");

// Errors that are not the hero's, measured on 2026-09-28 with the hero OFF
// (the default fixture) on the iPhone 17 profile, where each still fires:
//
// - WebKit logs Report-Only CSP violations at error level, then logs the
//   report endpoint's 400 for each one it posts. Both are the strict policy's
//   business (headers.spec.ts and the csp-report route), not this section's.
// - WebKit raises "ResizeObserver loop completed with undelivered
//   notifications" as an uncaught page error about 350ms after load, hero or
//   no hero, and not under reduced motion. Another observer on the page owns
//   it; it is reported as a finding, and this spec does not hide it elsewhere.
//
// A fluid chunk that failed to load is caught by the data-ready assertion,
// not by this list.
const IGNORED =
  /^\[Report Only\]|^Failed to load resource|^ResizeObserver loop completed with undelivered notifications/;

test.describe("static ground (the default, Save-Data reported)", () => {
  test("the section paints from CSS and the copy is on top of nothing", async ({ page }) => {
    await page.goto("/");
    await expect(hero(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero(page)).not.toHaveAttribute("data-ready", "");
    // The canvas element is in the HTML regardless: it is the island's mount
    // point, hidden from AT, and transparent until a frame is drawn.
    const canvas = hero(page).locator("canvas");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(canvas).toHaveCSS("opacity", "0");
    const background = await hero(page).evaluate(
      (el) => getComputedStyle(el, "::before").backgroundImage,
    );
    expect(background).toContain("radial-gradient");
  });

  test("a vertical swipe still scrolls and a pinch still zooms over the hero", async ({ page }) => {
    await page.goto("/");
    await expect(hero(page)).toHaveCSS("touch-action", "pan-y pinch-zoom");
  });

  test("passes axe, does not overflow, and has no em dash", async ({ page }) => {
    await page.goto("/");
    await expectAccessible(page, { include: "[data-hero]" });
    await expectNoHorizontalOverflow(page);
    await expectNoEmDash(hero(page));
  });
});

test.describe("live field", () => {
  test.use({ villa: true });

  test("draws a first frame and fades the canvas in", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !IGNORED.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (!IGNORED.test(error.message)) errors.push(error.message);
    });

    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready] canvas")).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(hero(page).locator("canvas")).toHaveCSS("opacity", "1");
    // The canvas backing store follows the section, at device pixels.
    const size = await hero(page)
      .locator("canvas")
      .evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        return { width: canvas.width, height: canvas.height, client: canvas.clientWidth };
      });
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(size.width).toBeGreaterThanOrEqual(size.client);
    expect(errors).toEqual([]);
  });

  test("pointer and touch input reach the field without a console error", async ({
    page,
    isMobile,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !IGNORED.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (!IGNORED.test(error.message)) errors.push(error.message);
    });

    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    const canvas = hero(page).locator("canvas");
    await expect(canvas).toHaveCSS("opacity", "1");
    const before = await canvas.screenshot();
    const box = await hero(page).boundingBox();
    if (!box) throw new Error("hero has no box");
    const y = box.y + box.height * 0.3;
    if (isMobile) {
      // A sideways drag: the axis the effect keeps under touch-action: pan-y.
      await hero(page).dispatchEvent("pointerdown", { clientX: box.x + 40, clientY: y });
      for (let i = 1; i <= 10; i += 1) {
        await hero(page).dispatchEvent("pointermove", {
          clientX: box.x + 40 + (box.width - 80) * (i / 10),
          clientY: y,
        });
      }
      await hero(page).dispatchEvent("pointercancel", {});
    } else {
      await page.mouse.move(box.x + 40, y);
      await page.mouse.move(box.x + box.width - 40, y + 60, { steps: 20 });
    }
    // The field changed under the drag. The drawing buffer is not preserved
    // between frames, so readPixels sees nothing; the compositor's output is
    // the honest witness.
    await page.waitForTimeout(100);
    const after = await canvas.screenshot();
    expect(after.equals(before)).toBe(false);
    expect(errors).toEqual([]);
  });

  test("passes axe with the field live", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await expectAccessible(page, { include: "[data-hero]" });
    await expectNoHorizontalOverflow(page);
  });

  test("the simulation is not in the initial scripts", async ({ page }) => {
    await page.goto("/");
    // Whatever the chunk is named, it is not in the document's own <script>
    // tags: it arrives by import() after hydration, past the gates.
    const html = await page.content();
    expect(html).not.toMatch(/<script[^>]+FluidHero_fluid/);
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
  });

  test("the h1 is the largest contentful paint, not an image", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    const lcp = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const entries = performance.getEntriesByType("largest-contentful-paint");
          const last = entries.at(-1) as (PerformanceEntry & { element?: Element }) | undefined;
          resolve(last?.element?.tagName ?? "none");
        }),
    );
    // WebKit has no LCP API; Chromium reports the element.
    expect(["H1", "none"]).toContain(lcp);
  });

  test("keyboard focus reaches the CTA over the canvas, and leaves the hero after it", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Tab does not move focus in the mobile WebKit and Chromium profiles");
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    const primary = hero(page).getByRole("link", { name: "Book a site visit" });
    await primary.focus();
    await expect(primary).toBeFocused();
    // The only link in the section: the next Tab stop is outside it, and the
    // canvas, which sits between, never takes focus.
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("[data-hero]"))).toBeNull();
    await expect(hero(page).getByRole("link")).toHaveCount(1);
  });
});

test.describe("reduced motion", () => {
  test.use({ villa: true });

  test("keeps the static ground and never fetches the simulation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const chunks: string[] = [];
    page.on("request", (request) => {
      if (/FluidHero_fluid/.test(request.url())) chunks.push(request.url());
    });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Cookie preferences" })).toBeVisible();
    await page.waitForTimeout(1_500);
    await expect(hero(page)).not.toHaveAttribute("data-ready", "");
    expect(chunks).toEqual([]);
    await expect(hero(page).locator("canvas")).toHaveCSS("opacity", "0");
  });
});

test.describe("with the field live, the page still works", () => {
  test.use({ villa: true });

  test("the primary CTA is clickable through to /contact", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await hero(page).getByRole("link", { name: "Book a site visit" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("a viewport change resizes the backing store", async ({ page, isMobile }) => {
    test.skip(isMobile, "setViewportSize does not apply reliably with isMobile set");
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    const canvas = hero(page).locator("canvas");
    const before = await canvas.evaluate((el) => (el as HTMLCanvasElement).width);
    await page.setViewportSize({ width: 900, height: 700 });
    await expect
      .poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width))
      .not.toBe(before);
    await expect(hero(page)).toHaveAttribute("data-ready", "");
  });

  test("scrolling the hero away and back leaves it ready", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(hero(page)).toHaveAttribute("data-ready", "");
    await expect(hero(page).locator("canvas")).toHaveCSS("opacity", "1");
  });
});

// Runs only in the forced-colors project (playwright.config.ts).
test.describe("forced colours @forced-colors", () => {
  test("the copy and the CTA survive the OS palette", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await expect(hero(page).getByRole("heading", { level: 1 })).toBeVisible();
    const cta = hero(page).getByRole("link", { name: "Book a site visit" });
    await expect(cta).toBeVisible();
    expect(await cta.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe("solid");
  });
});

// Runs only in the zoom-200 project: a 1440px laptop at 200% zoom.
test.describe("200% zoom @zoom", () => {
  test("the hero fits the width and keeps the CTA on screen", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalOverflow(page);
    await expect(hero(page).getByRole("link", { name: "Book a site visit" })).toBeInViewport();
  });
});

test.describe("layout stability", () => {
  test.use({ villa: true });

  test("the section does not change height when the field arrives", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const before = await hero(page).boundingBox();
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await page.waitForTimeout(400);
    const after = await hero(page).boundingBox();
    expect(after?.height).toBe(before?.height);
    expect(after?.y).toBe(before?.y);
    const h1 = await hero(page).getByRole("heading", { level: 1 }).boundingBox();
    expect(h1?.y).toBeGreaterThan(before?.y ?? 0);
  });

  test("the hero requests no image of its own", async ({ page }) => {
    const images: string[] = [];
    page.on("request", (request) => {
      if (/\/hero\/(grid|landing|approach|explorer)\//.test(request.url())) {
        images.push(request.url());
      }
    });
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    expect(images).toEqual([]);
  });

  test("the canvas runs edge to edge and past the section above and below", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    const section = await hero(page).boundingBox();
    const canvas = await hero(page).locator("canvas").boundingBox();
    const viewport = page.viewportSize();
    if (!section || !canvas || !viewport) throw new Error("no boxes");
    expect(canvas.x).toBeLessThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeGreaterThanOrEqual(viewport.width);
    expect(canvas.y).toBeLessThan(section.y);
    expect(canvas.y + canvas.height).toBeGreaterThan(section.y + section.height);
    // And none of that overhang became sideways scroll.
    await expectNoHorizontalOverflow(page);
  });

  test("the overhang paints under the next section, not over it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.6));
    const under = await hero(page)
      .locator("canvas")
      .evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const section = canvas.closest("[data-hero]") as HTMLElement;
        // A point inside the canvas's bottom overhang, past the section's end.
        const y = section.getBoundingClientRect().bottom + 20;
        if (y > canvas.getBoundingClientRect().bottom || y > window.innerHeight)
          return "out of view";
        const hit = document.elementFromPoint(window.innerWidth / 2, y);
        return hit === canvas ? "canvas on top" : "something else on top";
      });
    expect(under).not.toBe("canvas on top");
  });
});

test.describe("the glyph layer", () => {
  test("the copy and the CTA are marked quiet, and the h1 sits inside one", async ({ page }) => {
    await page.goto("/");
    const quiet = hero(page).locator("[data-hero-quiet]");
    await expect(quiet).toHaveCount(2);
    await expect(quiet.first().getByRole("heading", { level: 1 })).toBeVisible();
    await expect(quiet.nth(1).getByRole("link")).toHaveCount(1);
  });

  test.describe("live", () => {
    test.use({ villa: true });

    test("every hardware icon the layer asks for is served", async ({ page }) => {
      const statuses = new Map<string, number>();
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.pathname.startsWith("/hero/hardware/icons/")) {
          statuses.set(url.pathname, response.status());
        }
      });
      await page.goto("/");
      await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
      await expect.poll(() => statuses.size, { timeout: 10_000 }).toBeGreaterThanOrEqual(8);
      for (const [path, status] of statuses) expect(status, path).toBe(200);
    });

    test("a drag through the field changes pixels away from the copy", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "the desktop drag covers this; the touch path is in the input test");
      await page.goto("/");
      await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
      await page.waitForTimeout(1500);
      const canvas = hero(page).locator("canvas");
      const before = await canvas.screenshot();
      const box = await hero(page).boundingBox();
      if (!box) throw new Error("no box");
      // Along the top band, where the icons can be and the copy is not.
      const y = box.y + box.height * 0.12;
      await page.mouse.move(box.x + 60, y);
      await page.mouse.move(box.x + box.width - 60, y, { steps: 40 });
      await page.waitForTimeout(300);
      const after = await canvas.screenshot();
      expect(after.equals(before)).toBe(false);
    });
  });
});

// Runs only in the zoom-200 project.
test.describe("quiet zones at 200% zoom @zoom", () => {
  test("the h1 is still inside a quiet box, and the boxes are inside the section", async ({
    page,
  }) => {
    await page.goto("/");
    const section = await hero(page).boundingBox();
    const quiet = hero(page).locator("[data-hero-quiet]");
    await expect(quiet).toHaveCount(2);
    for (const box of await quiet.all()) {
      const rect = await box.boundingBox();
      if (!rect || !section) throw new Error("no box");
      expect(rect.y).toBeGreaterThanOrEqual(section.y);
      expect(rect.y + rect.height).toBeLessThanOrEqual(section.y + section.height + 1);
    }
    await expect(quiet.first().getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("the field is not clipped to the section", () => {
  test.use({ villa: true });

  test("a drag along the top edge changes pixels above the section", async ({ page, isMobile }) => {
    test.skip(isMobile, "the desktop pointer drag covers this");
    await page.goto("/");
    await expect(page.locator("[data-hero][data-ready]")).toHaveCount(1, { timeout: 20_000 });
    await page.waitForTimeout(1500);
    const section = await hero(page).boundingBox();
    if (!section) throw new Error("no box");
    // The strip between the top of the viewport and the section: nav space.
    const clip = { x: 0, y: 0, width: 400, height: Math.max(8, Math.floor(section.y)) };
    const before = await page.screenshot({ clip });
    await page.mouse.move(40, section.y + 4);
    await page.mouse.move(360, section.y + 4, { steps: 30 });
    await page.waitForTimeout(250);
    const after = await page.screenshot({ clip });
    expect(after.equals(before)).toBe(false);
  });
});
