import { expect, test, type Page } from "./fixtures";
import { expectHydrated, withConsentDecided } from "./checks";

/**
 * The standards section under the figures (Figma 4914:839, 2026-11-16), drawn.
 * Its ground is Figma's export, baked to ground.webp and painted by the
 * stylesheet, so what can
 * only be seen in a real engine is held here, on every device: the picture
 * paints, and the copy holds its contrast on it, which axe cannot measure
 * through a picture.
 */

const section = (page: Page) => page.locator('section[aria-labelledby="connectivity"]');

/** The section fully on screen, still, with everything fixed or sticky out of the way. */
async function frame(page: Page) {
  await withConsentDecided(page);
  await page.goto("/");
  await expectHydrated(page);
  await page.evaluate(() => {
    const el = document.querySelector('section[aria-labelledby="connectivity"]')!;
    scrollTo({ top: scrollY + el.getBoundingClientRect().top - 40, behavior: "instant" });
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (["fixed", "sticky"].includes(getComputedStyle(el).position))
        el.style.visibility = "hidden";
    }
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const img = new Image();
        img.src = "/landing/connectivity/ground.webp";
        return img.decode().then(
          () => true,
          () => false,
        );
      }),
    )
    .toBe(true);
  await page.waitForTimeout(300);
}

/** A region of the screenshot, in device pixels from the section's corner. */
type Region = { x0: number; y0: number; x1: number; y1: number };

type Measure = {
  /** How far the red channel runs across the section, 0 to 255. */
  spread: number;
  /** Each region's mean colour in linear light. */
  regions: [number, number, number][];
};

/**
 * The section as painted, measured in the page (no image library in the
 * specs): only the sums come back, since a 3x phone's pixels are millions.
 */
async function measure(page: Page, regions: Region[] = []): Promise<Measure> {
  const box = (await section(page).boundingBox())!;
  const png = await page.screenshot({ clip: box, scale: "device" });
  return page.evaluate(
    async ({ b64, regions }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const { data, width } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const linear = new Float64Array(256).map((_, v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      let low = 255;
      let high = 0;
      for (let i = 0; i < data.length; i += 4) {
        low = Math.min(low, data[i]!);
        high = Math.max(high, data[i]!);
      }
      const means = regions.map(({ x0, y0, x1, y1 }) => {
        const sum = [0, 0, 0];
        let n = 0;
        for (let y = Math.max(0, Math.floor(y0)); y < Math.min(bitmap.height, y1); y++) {
          for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, x1); x++) {
            const i = (y * width + x) * 4;
            for (let k = 0; k < 3; k++) sum[k]! += linear[data[i + k]!]!;
            n++;
          }
        }
        return sum.map((v) => v / n);
      });
      return { spread: high - low, regions: means } as Measure;
    },
    { b64: png.toString("base64"), regions },
  );
}

/** Hides the copy and the marks, leaving the ground alone on screen. */
const groundOnly = (page: Page) =>
  page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>(
      'section[aria-labelledby="connectivity"] > *',
    )) {
      el.style.visibility = "hidden";
    }
  });

const linear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

test.describe("the connectivity section", () => {
  test("sits between the figures and the hardware", async ({ page }) => {
    await withConsentDecided(page);
    await page.goto("/");
    const order = await page.evaluate(() => {
      const stats = document.querySelector("[data-stats]")!;
      const own = document.querySelector('section[aria-labelledby="connectivity"]')!;
      const process = document.querySelector("[data-process-stack]")!;
      const follows = (a: Element, b: Element) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [follows(stats, own), follows(own, process)];
    });
    expect(order).toEqual([true, true]);
  });

  test("shows its six marks, each loaded and named", async ({ page }) => {
    await frame(page);
    const marks = section(page)
      .getByRole("list", { name: "Standards we install" })
      .getByRole("img");
    await expect(marks).toHaveCount(6);
    for (const mark of await marks.all()) {
      await expect
        .poll(() => mark.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      await expect(mark).toHaveAttribute("alt", /\S/);
      expect(await mark.evaluate((img) => img.getBoundingClientRect().height)).toBeGreaterThan(0);
    }
  });

  test("sends its button to the contact page", async ({ page }) => {
    await frame(page);
    await expect(section(page).getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  test("is the frame's 1200 by 594, centred, on a desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "the desktop's block");
    await page.setViewportSize({ width: 1440, height: 900 });
    await frame(page);
    const box = (await section(page).boundingBox())!;
    expect(Math.round(box.width)).toBe(1200);
    expect(Math.round(box.height)).toBe(594);
    expect(Math.round(box.x)).toBe((1440 - 1200) / 2);
  });

  test("runs edge to edge on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the phone's block");
    await frame(page);
    const box = (await section(page).boundingBox())!;
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(width);
  });

  test("paints Figma's ground, not only the flat brown under it", async ({ page }) => {
    await frame(page);
    await groundOnly(page);
    // The blurred lights run from near black to a warm brown; the fallback
    // alone is one flat colour.
    expect((await measure(page)).spread).toBeGreaterThan(30);
  });

  test("holds its copy's contrast on its ground", async ({ page }) => {
    await frame(page);
    const scale = await page.evaluate(() => devicePixelRatio);
    const boxes = await page.evaluate(() => {
      const own = document.querySelector('section[aria-labelledby="connectivity"]')!;
      const origin = own.getBoundingClientRect();
      return ["h2", "p"].map((tag) => {
        const el = own.querySelector(tag)!;
        const r = el.getBoundingClientRect();
        const ink = getComputedStyle(el).color.match(/\d+/g)!.slice(0, 3).map(Number);
        return { tag, x: r.x - origin.x, y: r.y - origin.y, w: r.width, h: r.height, ink };
      });
    });
    await groundOnly(page);
    const { regions } = await measure(
      page,
      boxes.map(({ x, y, w, h }) => ({
        x0: x * scale,
        y0: y * scale,
        x1: (x + w) * scale,
        y1: (y + h) * scale,
      })),
    );
    for (const [i, { tag, ink }] of boxes.entries()) {
      const ground = luminance(...regions[i]!);
      const text = luminance(linear(ink[0]!), linear(ink[1]!), linear(ink[2]!));
      const ratio = (text + 0.05) / (ground + 0.05);
      // The heading is large text (3:1); the line under it is not (4.5:1).
      expect(ratio, `${tag} at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        tag === "h2" ? 3 : 4.5,
      );
    }
  });
});

// Runs only in the forced-colors project.
test.describe("forced colours @forced-colors", () => {
  test("keeps the section's own colours over its picture", async ({ page }) => {
    await withConsentDecided(page);
    await page.goto("/");
    const heading = section(page).getByRole("heading", { level: 2 });
    await expect(heading).toHaveCSS("color", "rgb(240, 233, 221)");
    await expect(section(page)).toHaveCSS("forced-color-adjust", "none");
  });
});
