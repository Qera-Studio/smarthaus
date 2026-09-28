import { test, expect } from "./fixtures";
import {
  expectAccessible,
  expectNoEmDash,
  expectNoHorizontalOverflow,
  withConsentDecided,
} from "./checks";

/**
 * The parent-company banner on the homepage, between the Hero and Hardware.
 *
 * What matters: it sits in that slot, the logo actually loads (a 404'd SVG is
 * an empty box every unit test still passes), the two grounds are the ones the
 * design asked for, and the link leaves safely.
 */

const TITLE = "A brand by Maple Technologies";

const section = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: TITLE });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await section(page).scrollIntoViewIfNeeded();
});

test("sits directly after the hero and before the hardware section", async ({ page }) => {
  const order = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main > *")).map(
      (el) => el.querySelector("h1, h2")?.textContent?.trim() ?? "",
    ),
  );
  const maple = order.indexOf("A brand by Maple Technologies");
  const hardware = order.findIndex((t) => t === "One stop, full house");
  expect(maple).toBeGreaterThan(-1);
  expect(hardware).toBe(maple + 1);
});

test("loads the logo at its intrinsic ratio", async ({ page }) => {
  const logo = section(page).getByRole("img", { name: "Maple Technologies" });
  await expect(logo).toBeVisible();
  const { natural, box } = await logo.evaluate((img: HTMLImageElement) => ({
    natural: img.naturalWidth,
    box: img.getBoundingClientRect(),
  }));
  // naturalWidth is 0 for an image that failed to load.
  expect(natural).toBeGreaterThan(0);
  expect(box.width / box.height).toBeCloseTo(10261 / 3654, 1);
});

test("paints the card at brown-800 5% and the logo panel on the page ground", async ({ page }) => {
  const logo = section(page).getByRole("img", { name: "Maple Technologies" });
  const [card, panel] = await logo.evaluate((img) => {
    const panel = img.closest("div")!;
    const card = panel.parentElement!;
    const bg = (el: Element) => getComputedStyle(el).backgroundColor;
    return [bg(card), bg(panel)];
  });
  // brown-800 is #2b241d; color-mix at 5% resolves to it at alpha 0.05.
  // Engines serialise it as rgba() or as color(srgb ...) in 0-1 channels, so
  // compare the numbers rather than the string.
  const nums = card.match(/[\d.]+/g)?.map(Number) ?? [];
  expect(nums, card).toHaveLength(4);
  const [r = 0, g = 0, b = 0, a = 0] = nums;
  const scale = r > 1 || g > 1 || b > 1 ? 1 : 255;
  expect(Math.round(r * scale)).toBe(43);
  expect(Math.round(g * scale)).toBe(36);
  expect(Math.round(b * scale)).toBe(29);
  expect(a).toBeCloseTo(0.05, 2);
  // brown-100, the page's canvas. Asserted as the value rather than compared
  // with body: body is transparent and the ground is painted on <html>.
  expect(panel).toBe("rgb(240, 233, 221)");
});

test("sets the title and CTA in brown-800, one step lighter than the site default", async ({
  page,
}) => {
  const s = section(page);
  const title = await s
    .getByRole("heading", { level: 2 })
    .evaluate((el) => getComputedStyle(el).color);
  const cta = await s
    .getByRole("link", { name: /Visit Maple Technologies/ })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(title).toBe("rgb(43, 36, 29)");
  expect(cta).toBe("rgb(43, 36, 29)");
});

test("the link opens Maple's site in a new tab without the opener", async ({ page }) => {
  const link = section(page).getByRole("link", { name: /Visit Maple Technologies/ });
  await expect(link).toHaveAttribute("href", "https://www.mapletech.ae");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("rel", /noreferrer/);
});

test("the link is reachable by keyboard and shows a focus ring", async ({ page }) => {
  const link = section(page).getByRole("link", { name: /Visit Maple Technologies/ });
  await link.focus();
  await expect(link).toBeFocused();
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("pins the CTA to the bottom left of the copy column", async ({ page }) => {
  const link = section(page).getByRole("link", { name: /Visit Maple Technologies/ });
  const { cta, column, description } = await link.evaluate((el) => {
    const box = (e: Element) => e.getBoundingClientRect();
    const column = el.parentElement!.parentElement!;
    const pad = getComputedStyle(column);
    const inner = box(column);
    return {
      cta: box(el),
      description: box(column.querySelector("p")!),
      column: {
        left: inner.left + parseFloat(pad.paddingLeft),
        bottom: inner.bottom - parseFloat(pad.paddingBottom),
      },
    };
  });
  // Flush with the column's content box at the inline start and the foot.
  expect(Math.abs(cta.left - column.left)).toBeLessThan(1);
  expect(Math.abs(cta.bottom - column.bottom)).toBeLessThan(1);
  // Aligned with the text above it, and below it, never beside or over it.
  expect(Math.abs(cta.left - description.left)).toBeLessThan(1);
  expect(cta.top).toBeGreaterThan(description.bottom);
});

test("pads the section equally above and below", async ({ page }) => {
  const [top, bottom] = await section(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return [parseFloat(s.paddingTop), parseFloat(s.paddingBottom)];
  });
  expect(top).toBeGreaterThan(0);
  expect(bottom).toBe(top);
});

test("pads the section 48px a side and the logo panel 96px a side on desktop", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop spacing; phones keep the tighter values");
  const logo = section(page).getByRole("img", { name: "Maple Technologies" });
  const pads = await logo.evaluate((img) => {
    const inline = (el: Element) => {
      const s = getComputedStyle(el);
      return [parseFloat(s.paddingLeft), parseFloat(s.paddingRight)];
    };
    return { section: inline(img.closest("section")!), panel: inline(img.closest("div")!) };
  });
  expect(pads.section).toEqual([48, 48]);
  expect(pads.panel).toEqual([96, 96]);
});

test("caps the card at 1200px and centres it on a wide screen", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone is narrower than the cap");
  const logo = section(page).getByRole("img", { name: "Maple Technologies" });
  const { card, viewport } = await logo.evaluate((img) => {
    const r = img.closest("div")!.parentElement!.getBoundingClientRect();
    return { card: { left: r.left, right: r.right, width: r.width }, viewport: innerWidth };
  });
  expect(card.width).toBeLessThanOrEqual(1200);
  // Centred: equal space either side, within a pixel of rounding.
  expect(Math.abs(card.left - (viewport - card.right))).toBeLessThan(2);
});

test("sizes the logo panel to the logo and its padding on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "the panel spans the card when the columns stack");
  const logo = section(page).getByRole("img", { name: "Maple Technologies" });
  const { panel, image, padding } = await logo.evaluate((img) => {
    const panel = img.closest("div")!;
    const s = getComputedStyle(panel);
    return {
      panel: panel.getBoundingClientRect().width,
      image: img.getBoundingClientRect().width,
      padding: parseFloat(s.paddingLeft) + parseFloat(s.paddingRight),
    };
  });
  // 384px, 1.5x the original 256px, on the client's call.
  expect(image).toBe(384);
  // The panel is exactly the logo plus its padding: no spare space either side.
  expect(Math.abs(panel - (image + padding))).toBeLessThan(1);
});

test("keeps a 44px tap area on phones although the band is smaller", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch targets are a phone concern");
  // The consent banner covers the lower half of a phone and the bottom nav
  // the foot, so decide consent and centre the link: this measures the
  // control, not what happens to be on top of it.
  await withConsentDecided(page);
  await page.reload();
  const link = section(page).getByRole("link", { name: /Visit Maple Technologies/ });
  await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
  // Same probe as touch-targets.spec.ts: 21px out from the centre each way
  // must still land on the link, its ::before included.
  const hits = await link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    return [
      [cx - 21, cy],
      [cx + 21, cy],
      [cx, cy - 21],
      [cx, cy + 21],
    ].map(([x, y]) => {
      const hit = document.elementFromPoint(x!, y!);
      return hit !== null && (hit === el || el.contains(hit));
    });
  });
  expect(hits).toEqual([true, true, true, true]);
  // The visible band itself is the smaller size.
  const height = await link.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(44);
});

test("stacks without overflow and keeps the copy clean", async ({ page }) => {
  await expectNoHorizontalOverflow(page);
  await expectNoEmDash(section(page));
});

// Scoped to the section, as hardware.spec.ts and pricing.spec.ts are: scrolled
// here, the hero's text has faded out of view and axe measures it mid-fade.
// The whole page, this section included, is scanned at the top in smoke.spec.ts.
test("passes axe", async ({ page }) => {
  await expectAccessible(page, { include: "section:has(#maple)" });
});
