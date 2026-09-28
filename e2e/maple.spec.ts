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

test("paints the card in the nav's glass and the logo panel in a faint canvas wash", async ({
  page,
}) => {
  // The hardware carousel's bar wears the same glass() as the stuck nav
  // capsule, and is always glass (the capsule only once scrolled), so it is
  // the reference. Compared as computed values, so a change to the glass
  // tokens moves all three together and this still passes.
  const { card, bar, panel } = await page.evaluate(() => {
    const surface = (el: Element) => {
      const s = getComputedStyle(el);
      return {
        background: s.backgroundColor,
        backdrop: s.backdropFilter || s.getPropertyValue("-webkit-backdrop-filter"),
        border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
        shadow: s.boxShadow,
        radius: s.borderTopLeftRadius,
      };
    };
    const logo = document.querySelector('img[alt="Maple Technologies"]')!;
    const logoPanel = logo.closest("div")!;
    const tabs = document.querySelector('[role="tablist"][aria-label="Components"]')!;
    return {
      card: surface(logoPanel.parentElement!),
      bar: surface(tabs.parentElement!),
      panel: getComputedStyle(logoPanel).backgroundColor,
    };
  });
  expect(card).toEqual(bar);
  // The glass, not a flat tint: the frosted backdrop is what makes it glass
  // wherever the engine supports it (all three device profiles do).
  expect(card.backdrop).toContain("blur(");
  // brown-100 (240, 233, 221) at 30%: a faint lift over the glass, not the
  // opaque cut-out it was. Engines serialise color-mix as rgba() or as
  // color(srgb ...) in 0-1 channels, so compare the numbers.
  const nums = panel.match(/[\d.]+/g)?.map(Number) ?? [];
  expect(nums, panel).toHaveLength(4);
  const [r = 0, g = 0, b = 0, a = 0] = nums;
  const scale = r > 1 || g > 1 || b > 1 ? 1 : 255;
  expect([r, g, b].map((c) => Math.round(c * scale))).toEqual([240, 233, 221]);
  expect(a).toBeCloseTo(0.3, 2);
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
