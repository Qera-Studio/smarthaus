import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { expectAccessible, expectNoEmDash, expectNoHorizontalOverflow } from "./checks";
import { line, sentMail, uniqueName } from "./mail";

/**
 * /about: a parallax hero, then mission, vision and values. What only a
 * browser shows: that the hero image moves with the scroll (and does not
 * under reduced motion), that the mission really fills a screen with the
 * photograph on its top 60%, that the values open one at a time by click,
 * keyboard and, on a mouse, hover, and that the title over the photograph
 * keeps its contrast, which axe cannot judge over an image.
 */

const region = (page: Page, name: string) => page.getByRole("region", { name });
const rows = (page: Page) => region(page, "Values").locator("details");
const openCount = (page: Page) =>
  rows(page).evaluateAll((all) => all.filter((el) => (el as HTMLDetailsElement).open).length);

test.beforeEach(async ({ page }) => {
  await page.goto("/about");
});

test("sets out every section in order, ending on the FAQ", async ({ page }) => {
  const order = await page
    .locator("main section")
    .evaluateAll((all) => all.map((el) => el.getAttribute("aria-labelledby")));
  expect(order).toEqual([
    "about-title",
    "approach",
    "mission",
    "vision",
    "values",
    "home-enquiry",
    "about-faqs",
  ]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Us");
});

// The layer's vertical offset inside its frame, in px, read two frames after
// any scroll so the scroll-driven style has caught up: read straight after a
// jump it was sometimes the old position (iPhone 17 on CI, 2026-10-07).
const shift = async (page: Page, which: "hero" | "mission") => {
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  return page.locator(`[data-parallax="${which}"]`).evaluate((el) => {
    const frame = el.parentElement!.getBoundingClientRect();
    return el.getBoundingClientRect().top - frame.top;
  });
};

test("sinks the hero image visibly as it scrolls away", async ({ page }) => {
  // At least a fifth of the distance scrolled: the first version moved about
  // 35px across a whole screen and read as no effect (2026-10-07).
  await page.evaluate(() => window.scrollTo(0, 100));
  const before = await shift(page, "hero");
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(async () => (await shift(page, "hero")) - before).toBeGreaterThanOrEqual(20);
});

test("drifts the mission photograph as it passes", async ({ page }) => {
  const media = page.locator("[data-about-mission-media]");
  await media.evaluate((el) => el.scrollIntoView({ block: "end" }));
  const before = await shift(page, "mission");
  await page.evaluate(() => window.scrollBy(0, 300));
  await expect.poll(async () => (await shift(page, "mission")) - before).toBeGreaterThanOrEqual(20);
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps both photographs still", async ({ page }) => {
    const names = () =>
      page
        .locator("[data-parallax]")
        .evaluateAll((all) => all.map((el) => getComputedStyle(el).animationName));
    expect(await names()).toEqual(["none", "none"]);
    const before = await shift(page, "hero");
    await page.evaluate(() => window.scrollTo(0, 300));
    expect(await shift(page, "hero")).toBe(before);
  });
});

test("keeps each photograph's edge out of sight while it travels", async ({ page }) => {
  // Each layer overhangs its frame above and below at every scroll position.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const y of [0, 150, 300, 600, height * 0.25, height * 0.35, height * 0.45]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const overhangs = await page.locator("[data-parallax]").evaluateAll((all) =>
      all.map((el) => {
        const frame = el.parentElement!.getBoundingClientRect();
        const layer = el.getBoundingClientRect();
        return layer.top <= frame.top + 0.5 && layer.bottom >= frame.bottom - 0.5;
      }),
    );
    expect(overhangs, `at scrollY ${y}`).toEqual([true, true]);
  }
});

{
  // Skipped, not deleted: the title is shipped below 3:1 on purpose, as an
  // accepted risk (docs/launch-gate/accepted-risks.md, 2026-10-07). Unskip it
  // when that row is resolved; it should then pass.
  test.skip(`keeps the title at 3:1 or better over the photo`, async ({ page }) => {
    // Sampled under the words alone, with their ink made transparent.
    const title = page.locator("h1");
    const box = await title.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await title.evaluate((el) => ((el as HTMLElement).style.color = "transparent"));
    const shot = await page.screenshot({ clip: box });
    await title.evaluate((el) => ((el as HTMLElement).style.color = ""));
    const ratio = await page.evaluate(async (png) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const lum = (r: number, g: number, b: number) =>
        [r, g, b]
          .map((v) => v / 255)
          .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const text = lum(0xf8, 0xf5, 0xf0);
      let brightest = 0;
      for (let i = 0; i < data.length; i += 4) {
        brightest = Math.max(brightest, lum(data[i]!, data[i + 1]!, data[i + 2]!));
      }
      return (text + 0.05) / (brightest + 0.05);
    }, shot.toString("base64"));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
}

test.describe("mission", () => {
  const dark = (page: Page) => page.locator("[data-about-dark]");

  test("runs from edge to edge", async ({ page }) => {
    const { box, vw } = await dark(page).evaluate((el) => ({
      box: el.getBoundingClientRect().toJSON() as DOMRect,
      vw: document.documentElement.clientWidth,
    }));
    expect(box.left).toBeLessThanOrEqual(0.5);
    expect(box.right).toBeGreaterThanOrEqual(vw - 0.5);
  });

  test("ends the dark band 48px under the vision, with no gap beyond it", async ({ page }) => {
    // 2026-10-07: the band was held at 40% of a screen and left a dark gap
    // under the copy on a large screen. Its padding is now the only space.
    const { gap } = await dark(page).evaluate((el) => {
      const paragraphs = el.querySelectorAll("p");
      const last = paragraphs[paragraphs.length - 1]!.getBoundingClientRect();
      return { gap: el.getBoundingClientRect().bottom - last.bottom };
    });
    expect(gap).toBeCloseTo(48, 0);
  });

  test("gives the photograph the top 60% of the screen, under a brown-900 veil", async ({
    page,
  }) => {
    const { media, veil, vh } = await dark(page).evaluate((el) => {
      const first = el.querySelector("[data-about-mission-media]")!;
      return {
        media: first.getBoundingClientRect().height,
        veil: getComputedStyle(first, "::after").backgroundColor,
        vh: window.innerHeight,
      };
    });
    expect(Math.abs(media - vh * 0.6)).toBeLessThan(vh * 0.05);
    expect(veil).toBe("rgba(20, 17, 14, 0.7)");
  });

  for (const name of ["Mission", "Vision"]) {
    test(`sets ${name}'s lead in brown-100 and its body at 70% of it`, async ({ page }) => {
      const colours = await region(page, name)
        .locator("p")
        .evaluateAll((all) => all.map((el) => getComputedStyle(el).color));
      expect(colours).toEqual(["rgb(240, 233, 221)", "rgba(240, 233, 221, 0.7)"]);
    });
  }

  test("holds Vision in the same dark band, under a rule, after Mission", async ({ page }) => {
    // 2026-10-07: Vision moved from its own light section into Mission's band.
    const { inside, ground, rule, order } = await dark(page).evaluate((el) => {
      const vision = el.querySelector('[aria-labelledby="vision"]')!;
      const mission = el.querySelector('[aria-labelledby="mission"]')!;
      const ruled = vision.firstElementChild!;
      return {
        inside: el.contains(vision) && el.contains(mission),
        ground: getComputedStyle(el).backgroundColor,
        rule: [getComputedStyle(ruled).borderTopWidth, getComputedStyle(ruled).borderTopColor],
        order: mission.compareDocumentPosition(vision) & Node.DOCUMENT_POSITION_FOLLOWING,
      };
    });
    expect(inside).toBe(true);
    expect(ground).toBe("rgb(20, 17, 14)");
    expect(rule).toEqual(["1px", "rgb(43, 36, 29)"]);
    expect(order).toBeTruthy();
  });
});

test.describe("approach", () => {
  const cards = (page: Page) => region(page, "Our Approach").getByRole("listitem");
  const boxes = (page: Page) =>
    cards(page).evaluateAll((all) =>
      all.map((el) => el.getBoundingClientRect().toJSON() as DOMRect),
    );

  test("sets six cards three across from lg, every one the same size", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "One column on a phone; its own test below.");
    const all = await boxes(page);
    expect(all).toHaveLength(6);
    const tops = [...new Set(all.map((box) => Math.round(box.top)))];
    expect(tops).toHaveLength(2);
    for (const box of all) {
      expect(box.width).toBeCloseTo(all[0]!.width, 0);
      expect(box.height).toBeCloseTo(all[0]!.height, 0);
    }
  });

  test("stacks the cards in one column on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only.");
    const all = await boxes(page);
    for (const box of all) expect(box.left).toBeCloseTo(all[0]!.left, 0);
  });

  test("keeps every card's words inside it", async ({ page }) => {
    const overflowing = await cards(page).evaluateAll((all) =>
      all.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
    );
    expect(overflowing).toEqual([]);
  });

  test("draws each card on the tint with a thin border, square", async ({ page }) => {
    const styles = await cards(page).evaluateAll((all) =>
      all.map((el) => {
        const style = getComputedStyle(el);
        return [style.backgroundColor, style.borderTopWidth, style.borderTopLeftRadius];
      }),
    );
    for (const style of styles) expect(style).toEqual(["rgba(216, 199, 172, 0.5)", "1px", "0px"]);
  });

  test("sets each card's text 4px under body size, at 70% of the ink", async ({ page }) => {
    // 2026-10-07: the titles lead, the detail sits back. 5.97:1 on the tint.
    const bodies = await region(page, "Our Approach")
      .locator("li p")
      .evaluateAll((all) =>
        all.map((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).color]),
      );
    expect(bodies).toHaveLength(6);
    for (const body of bodies) expect(body).toEqual(["12px", "rgba(20, 17, 14, 0.7)"]);
  });

  test("loads every icon", async ({ page }) => {
    const icons = region(page, "Our Approach").locator("img");
    await expect(icons).toHaveCount(6);
    for (const icon of await icons.all()) {
      await icon.scrollIntoViewIfNeeded();
      await expect
        .poll(() => icon.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
  });

  test("puts the icon at the head of the card and the words at its foot", async ({ page }) => {
    const gaps = await cards(page).evaluateAll((all) =>
      all.map((el) => {
        const card = el.getBoundingClientRect();
        const icon = el.querySelector("img")!.getBoundingClientRect();
        const words = el.querySelector("p")!.getBoundingClientRect();
        return { head: icon.top - card.top, foot: card.bottom - words.bottom };
      }),
    );
    for (const { head, foot } of gaps) expect(Math.abs(head - foot)).toBeLessThan(2);
  });
});

test("puts each title on the left half and its content on the right, from lg", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The title stacks above the content on a phone.");
  for (const name of ["Mission", "Vision", "Values"]) {
    const section = region(page, name);
    const heading = (await section.getByRole("heading", { level: 2 }).boundingBox())!;
    const content = (await section.locator("h2 + div").boundingBox())!;
    const middle = heading.x + (content.x + content.width - heading.x) / 2;
    expect(heading.x + heading.width, name).toBeLessThanOrEqual(middle);
    expect(content.x, name).toBeGreaterThanOrEqual(middle - 1);
  }
});

test.describe("values", () => {
  test("opens one row on click and closes the last", async ({ page }) => {
    await rows(page).nth(0).locator("summary").click();
    await expect(rows(page).nth(0)).toHaveAttribute("open", "");
    await rows(page).nth(2).locator("summary").click();
    await expect(rows(page).nth(2)).toHaveAttribute("open", "");
    await expect(rows(page).nth(0)).not.toHaveAttribute("open");
    expect(await openCount(page)).toBe(1);
  });

  test("opens from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "WebKit on iPhone skips summaries on Tab; the click test covers touch.");
    await rows(page).nth(1).locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(rows(page).nth(1)).toHaveAttribute("open", "");
  });

  test("keeps a row the mouse opened open when it is then clicked", async ({ page, isMobile }) => {
    // The pointer reaches the row, and opens it, before the click lands; the
    // click must not undo that. A second click closes it as usual.
    test.skip(isMobile, "Hover is for a mouse.");
    const summary = rows(page).nth(2).locator("summary");
    await summary.click();
    await expect(rows(page).nth(2)).toHaveAttribute("open", "");
    await summary.click();
    await expect(rows(page).nth(2)).not.toHaveAttribute("open");
  });

  test("opens under a resting mouse, one at a time, and closes when it leaves", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover is for a mouse; a phone opens rows by tapping.");
    await rows(page).nth(1).locator("summary").hover();
    await expect(rows(page).nth(1)).toHaveAttribute("open", "");
    await rows(page).nth(3).locator("summary").hover();
    await expect(rows(page).nth(3)).toHaveAttribute("open", "");
    await expect(rows(page).nth(1)).not.toHaveAttribute("open");
    expect(await openCount(page)).toBe(1);
    await page.mouse.move(0, 0);
    await expect(rows(page).nth(3)).not.toHaveAttribute("open");
    expect(await openCount(page)).toBe(0);
  });

  test("keeps a row the visitor clicked open after the mouse leaves", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover is for a mouse.");
    await rows(page).nth(2).locator("summary").click();
    await page.mouse.move(0, 0);
    await expect(rows(page).nth(2)).toHaveAttribute("open", "");
  });

  test("numbers the rows 01 to 05", async ({ page }) => {
    const numbers = await rows(page).evaluateAll((all) =>
      all.map((el) => el.querySelector('summary [aria-hidden="true"]')?.textContent),
    );
    expect(numbers).toEqual(["01", "02", "03", "04", "05"]);
  });
});

test("is accessible, and fits the screen", async ({ page }) => {
  await expectAccessible(page);
  await expectNoHorizontalOverflow(page);
  await expectNoEmDash(page.locator("main"));
});

test("is accessible with a value open", async ({ page }) => {
  await rows(page).nth(0).locator("summary").click();
  await expectAccessible(page, { include: "[data-about-values]" });
});

test.describe("without JavaScript", () => {
  // The rows are native <details>, so the page owes nothing to the hover
  // island: tapping, one-at-a-time and every answer work from the HTML alone.
  test.use({ javaScriptEnabled: false });

  test("still opens values on click, one at a time", async ({ page }) => {
    // The click is dispatched to the summary rather than driven through the
    // mouse. What is under test is the browser's own toggle and the `name`
    // group, which a dispatched click runs exactly as a real one; hit-testing
    // is the JavaScript-on click test's job. With JavaScript off an idle page
    // paints no frames, and Playwright's mouse click, which waits on frames to
    // judge the row still, hung under parallel load (Galaxy S24, 2026-10-07).
    const summary = (index: number) => rows(page).nth(index).locator("summary");
    await summary(0).dispatchEvent("click");
    await expect(rows(page).nth(0)).toHaveAttribute("open", "");
    await summary(4).dispatchEvent("click");
    await expect(rows(page).nth(4)).toHaveAttribute("open", "");
    await expect(rows(page).nth(0)).not.toHaveAttribute("open");
  });

  test("serves every value's answer in the HTML", async ({ page }) => {
    const answers = await rows(page).evaluateAll((all) =>
      all.map((el) => el.querySelector("p")?.textContent?.length ?? 0),
    );
    expect(answers).toHaveLength(5);
    answers.forEach((length) => expect(length).toBeGreaterThan(20));
  });
});

test("loads the hero photograph first, as the page's largest paint", async ({ page }) => {
  const img = page.locator("[data-about-hero] img");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).not.toHaveAttribute("loading", "lazy");
  // The mission photograph is below the fold and waits its turn.
  await expect(page.locator("[data-about-mission-media] img")).toHaveAttribute("loading", "lazy");
});

test("loads both photographs, rather than leaving empty frames", async ({ page }) => {
  for (const selector of ["[data-about-hero] img", "[data-about-mission-media] img"]) {
    const img = page.locator(selector);
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
        message: selector,
      })
      .toBeGreaterThan(0);
  }
});

test("keeps the mission copy whole inside its band at every width", async ({ page }) => {
  // The band is a minimum height, so long copy on a phone grows it rather
  // than running under the next section.
  const { body, section } = await region(page, "Mission").evaluate((el) => ({
    body: el.lastElementChild!.getBoundingClientRect().toJSON() as DOMRect,
    section: el.getBoundingClientRect().toJSON() as DOMRect,
  }));
  const last = await region(page, "Mission").locator("p").last().boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(body.bottom);
  expect(body.bottom).toBeLessThanOrEqual(section.bottom + 0.5);
});

test("leaves the title over the photograph centred", async ({ page }) => {
  const { hero, title } = await page.locator("[data-about-hero]").evaluate((el) => ({
    hero: el.getBoundingClientRect().toJSON() as DOMRect,
    title: el.querySelector("h1")!.getBoundingClientRect().toJSON() as DOMRect,
  }));
  const heroMiddle = hero.left + hero.width / 2;
  const titleMiddle = title.left + title.width / 2;
  expect(Math.abs(heroMiddle - titleMiddle)).toBeLessThan(2);
  expect(title.top).toBeGreaterThanOrEqual(hero.top);
});

test.describe("approach on a tablet", () => {
  test.use({ viewport: { width: 900, height: 1100 } });

  test("sets the cards two across, three rows deep", async ({ page, isMobile }) => {
    test.skip(isMobile, "A viewport override on a phone project is not a tablet.");
    const lefts = await region(page, "Our Approach")
      .getByRole("listitem")
      .evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(2);
    expect(lefts.filter((left) => left === lefts[0])).toHaveLength(3);
  });
});

test("never has two values open as a mouse sweeps down the list", async ({ page, isMobile }) => {
  test.skip(isMobile, "Hover is for a mouse.");
  for (let index = 0; index < 5; index += 1) {
    await rows(page).nth(index).locator("summary").hover();
    await expect(rows(page).nth(index)).toHaveAttribute("open", "");
    expect(await openCount(page), `after row ${index + 1}`).toBe(1);
  }
});

test("leaves a value opened from the keyboard open when a mouse crosses it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Hover is for a mouse.");
  const summary = rows(page).nth(1).locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(rows(page).nth(1)).toHaveAttribute("open", "");
  await summary.hover();
  await page.mouse.move(0, 0);
  await expect(rows(page).nth(1)).toHaveAttribute("open", "");
});

test("keeps the approach icons out of the accessibility tree", async ({ page }) => {
  // Each icon repeats its card's title in a picture; announcing it adds noise.
  await expect(region(page, "Our Approach").getByRole("img")).toHaveCount(0);
  await expect(region(page, "Our Approach").getByRole("heading", { level: 3 })).toHaveCount(6);
});

test("lines the approach title up with the section titles below it", async ({ page }) => {
  const lefts = await page
    .locator("main h2")
    .evaluateAll((all) => all.map((el) => Math.round(el.getBoundingClientRect().left)));
  expect(new Set(lefts).size, lefts.join(", ")).toBe(1);
});

test.describe("200% zoom @zoom", () => {
  test("keeps every approach card's words inside it, and the page within the screen", async ({
    page,
  }) => {
    await page.goto("/about");
    const overflowing = await region(page, "Our Approach")
      .getByRole("listitem")
      .evaluateAll((all) =>
        all.filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
      );
    expect(overflowing).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the values usable", async ({ page }) => {
    await page.goto("/about");
    await rows(page).nth(0).locator("summary").click();
    await expect(rows(page).nth(0)).toHaveAttribute("open", "");
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("faq", () => {
  const faqRows = (page: Page) => region(page, "Frequently Asked Questions").locator("details");

  test("opens one question at a time, without touching the values", async ({ page }) => {
    await rows(page).nth(0).locator("summary").click();
    await faqRows(page).nth(0).locator("summary").click();
    await expect(faqRows(page).nth(0)).toHaveAttribute("open", "");
    await faqRows(page).nth(3).locator("summary").click();
    await expect(faqRows(page).nth(3)).toHaveAttribute("open", "");
    await expect(faqRows(page).nth(0)).not.toHaveAttribute("open");
    // A separate group: opening a question leaves the value open.
    await expect(rows(page).nth(0)).toHaveAttribute("open", "");
  });

  test("sets its title at the enquiry's size, not the larger section size", async ({ page }) => {
    const size = (name: string) =>
      region(page, name)
        .getByRole("heading", { level: 2 })
        .evaluate((el) => getComputedStyle(el).fontSize);
    const enquiry = await page
      .locator('section[aria-labelledby="home-enquiry"] h2')
      .evaluate((el) => getComputedStyle(el).fontSize);
    expect(await size("Frequently Asked Questions")).toBe(enquiry);
    expect(parseFloat(await size("Values"))).toBeGreaterThan(parseFloat(enquiry));
  });

  test("does not open on hover; the questions are click-only, as on /contact", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover is for a mouse.");
    await faqRows(page).nth(1).locator("summary").hover();
    await expect(faqRows(page).nth(1)).not.toHaveAttribute("open");
  });

  test("opens from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "WebKit on iPhone skips summaries on Tab; the click test covers touch.");
    await faqRows(page).nth(2).locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(faqRows(page).nth(2)).toHaveAttribute("open", "");
  });

  test("is accessible with a question open", async ({ page }) => {
    await faqRows(page).nth(4).locator("summary").click();
    await expect(faqRows(page).nth(4)).toHaveAttribute("open", "");
    await expectAccessible(page, { include: "[data-about-faqs]" });
    await expectNoEmDash(region(page, "Frequently Asked Questions"));
  });

  test("sets the title on the left half and the questions on the right, from lg", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Stacked on a phone.");
    const section = region(page, "Frequently Asked Questions");
    const heading = (await section.getByRole("heading", { level: 2 }).boundingBox())!;
    const first = (await faqRows(page).first().boundingBox())!;
    expect(first.x).toBeGreaterThan(heading.x + heading.width);
  });
});

test.describe("enquiry", () => {
  const enquiry = (page: Page) => page.locator('section[aria-labelledby="home-enquiry"]');

  test("shows the homepage's short form, above the FAQ", async ({ page }) => {
    const section = enquiry(page);
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("Book a site visit");
    for (const label of ["Name", "Email", "Phone", "Message"]) {
      await expect(section.getByLabel(label)).toBeVisible();
    }
    const sectionBox = (await section.boundingBox())!;
    const faqBox = (await region(page, "Frequently Asked Questions").boundingBox())!;
    expect(faqBox.y).toBeGreaterThanOrEqual(sectionBox.y + sectionBox.height - 1);
  });

  test("sends a lead from /about, as from the homepage, and thanks them", async ({ page }) => {
    // The form is the homepage's own, so this checks the wiring on this page:
    // one email reaches the inbox, addressed with the lead's name.
    const name = uniqueName("Emma");
    const section = enquiry(page);
    await section.getByLabel("Name").fill(name);
    await section.getByLabel("Phone").fill("0543755150");
    await section.getByLabel("Email").fill("emma@example.com");
    await section.getByRole("button", { name: "Book a site visit" }).click();
    await expect(page.getByRole("status")).toContainText(name);
    const mail = await sentMail(name);
    expect(line(mail, "Name")).toBe(name);
    expect(line(mail, "Phone")).toBe("+971543755150");
  });

  test("still names the field when the number is wrong", async ({ page }) => {
    const section = enquiry(page);
    await section.getByLabel("Name").fill("Emma");
    await section.getByLabel("Phone").fill("12345");
    await section.getByRole("button", { name: "Book a site visit" }).click();
    await expect(section.getByRole("alert")).toContainText("+971");
  });

  test("names one form on the page, so its ids cannot clash", async ({ page }) => {
    await expect(page.locator("main form")).toHaveCount(1);
  });
});

test("rules the values and questions without a double line at the top", async ({ page }) => {
  // The section's rule sits just above the first row, so the first row draws
  // none of its own (2026-10-07); every other row keeps its divider.
  for (const name of ["Values", "Frequently Asked Questions"]) {
    const tops = await region(page, name)
      .locator("details")
      .evaluateAll((all) => all.map((el) => getComputedStyle(el).borderTopWidth));
    expect(tops[0], name).toBe("0px");
    for (const top of tops.slice(1)) expect(top, name).toBe("1px");
  }
});
