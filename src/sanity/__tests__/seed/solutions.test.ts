import { existsSync } from "node:fs";
import { join } from "node:path";

import { POSTS } from "../../../../sanity/seed/blog";
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../../../../sanity/seed/solutions";
import { pixelSize } from "../../../__tests__/helpers/pixel-size";
import { DESCRIPTION_RANGE, fullTitle, TITLE_RANGE } from "../../../lib/metadata";
import { claimProblem } from "../../claims";
import { BLOG_TAGS } from "../../schema/blog";
import { FEATURE_COUNT, PROCESS_STEP_COUNT, SOLUTION_ICONS } from "../../schema/solution";
import type { SolutionPage } from "../../types";

/**
 * The solution pages' seeded copy (2026-11-15). All eight were drafted for
 * Shivanshu's review, so what is pinned is what drafting can get wrong: a
 * claim beyond the confirmed facts, a maker's name, a price, a picture that
 * does not resolve, and a page in search before he has read it.
 */

const PUBLIC = join(process.cwd(), "public");
const PAGES = Object.entries(SOLUTION_PAGES);

/** Every piece of copy on a page, as a visitor reads it. */
function copy(page: SolutionPage): string[] {
  return [
    page.title,
    page.lede,
    page.worksWith.heading,
    page.worksWith.subtext,
    page.worksWith.line,
    ...page.worksWith.pairs.flatMap((pair) => [pair.title, pair.trigger, pair.action, pair.body]),
    page.features.heading,
    page.features.standfirst,
    ...page.features.items.flatMap((item) => [item.title, item.text]),
    page.features.ctaText,
    page.features.ctaLabel,
    page.process.heading,
    page.process.subtext,
    ...page.process.steps.flatMap((step) => [step.title, step.text]),
    page.faqHeading,
    ...page.faqs.flatMap((entry) => [entry.question, ...entry.answer]),
    page.enquiry.title,
    page.enquiry.standfirst,
    page.articlesHeading,
    page.seo.title,
    page.seo.description,
  ];
}

/** The pages that are security work, the only ones the SIRA licence speaks for. */
const SECURITY = ["cameras", "smart-lock"];

/**
 * Makers and platforms no page may name: the copy says what the system does,
 * not whose it is. The hero's rail confirms its makers as marks only.
 */
const MAKERS =
  /\b(?:Lutron|Shelly|Control4|KNX|LifeSmart|Aqara|Loxone|Crestron|TIS|Fibaro|Sonos|Somfy|Google|Nest|Alexa|Amazon|Apple|HomeKit|Siri|eufy|Hikvision|Dahua)\b/i;

describe("the seeded solution pages", () => {
  // Shivanshu, 2026-11-15: cameras first, then the other seven the same day.
  it("are every solution in the menu, in the menu's order", () => {
    expect(Object.keys(SOLUTION_PAGES)).toEqual(
      SITE_SETTINGS.solutionsMenu.items.map((item) => item.id),
    );
  });

  it.each(PAGES)("%s has an item in the Solutions menu, whose picture it opens on", (id) => {
    expect(SITE_SETTINGS.solutionsMenu.items.map((item) => item.id)).toContain(id);
  });

  describe.each(PAGES)("%s", (id, page) => {
    it("passes the claims audit, every line of it", () => {
      for (const line of copy(page)) expect([line, claimProblem(line)]).toEqual([line, null]);
    });

    it("has no em dash, and no exclamation mark", () => {
      for (const line of copy(page)) {
        expect(line).not.toContain("—");
        expect(line).not.toContain("!");
      }
    });

    it("names no price: the site discloses none for now", () => {
      for (const line of copy(page)) {
        expect(line).not.toMatch(/\bAED\b|\bdirhams?\b|\d[\d,]*\s*(?:AED|dhs?)\b/i);
        expect(line).not.toMatch(/\b(?:price|cost)s?\s+(?:from|starting)\b/i);
      }
    });

    it("leaves nothing pending: no {braced} fact and no note", () => {
      for (const entry of page.faqs) {
        expect(entry.pending).toBeUndefined();
        for (const paragraph of entry.answer) expect(paragraph).not.toMatch(/[{}]/);
      }
    });

    it("gives each question its own anchor", () => {
      const ids = page.faqs.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    });

    it(`has exactly ${FEATURE_COUNT} features, each with an icon the Studio offers`, () => {
      expect(page.features.items).toHaveLength(FEATURE_COUNT);
      for (const item of page.features.items) {
        expect(SOLUTION_ICONS as readonly string[]).toContain(item.icon);
      }
    });

    it("names each feature once, short enough for its box", () => {
      const titles = page.features.items.map((item) => item.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const { title, text } of page.features.items) {
        expect(title.length).toBeLessThanOrEqual(20);
        // A one-liner, two lines at most in a box 237px wide at 1440.
        expect(text.length).toBeLessThanOrEqual(50);
      }
    });

    it("keeps the hero's line to one line beside the picture", () => {
      expect(page.lede.split(/\s+/).length).toBeLessThanOrEqual(10);
    });

    it("draws its features' picture from a file that exists, at its own size", () => {
      const { src, width, height } = page.features.image;
      const file = join(PUBLIC, src);
      expect(existsSync(file)).toBe(true);
      expect(pixelSize(file)).toEqual({ width, height });
    });

    it("keeps that picture in its own directory, public/solutions/<id>/", () => {
      expect(page.features.image.src).toMatch(
        new RegExp(`^/solutions/${id}/features\\.(?:png|jpg)$`),
      );
    });

    it("wears each icon once", () => {
      const icons = page.features.items.map((item) => item.icon);
      expect(new Set(icons).size).toBe(icons.length);
    });

    it("names no maker or platform", () => {
      for (const line of copy(page)) expect([line, MAKERS.test(line)]).toEqual([line, false]);
    });

    it("stays out of search until Shivanshu has read the draft", () => {
      // Turning this on is the review: say so in the change that does it.
      expect(page.seo.index).toBe(false);
    });

    it("describes the visit only as confirmed: a technician and a technical lead, a fixed and itemised price", () => {
      const visit = page.faqs
        .map((entry) => entry.answer.join(" "))
        .find((answer) => answer.includes("technician and a technical lead"));
      expect(visit).toBeDefined();
      expect(visit).toContain("fixed and itemised");
    });

    it("names the SIRA licence only for security work, and as nothing more than a licence", () => {
      const sira = copy(page).filter((line) => line.includes("SIRA"));
      if (!SECURITY.includes(id)) {
        expect(sira).toEqual([]);
        return;
      }
      expect(sira.length).toBeGreaterThan(0);
      for (const line of sira) {
        expect(line).not.toMatch(/endorse|approved by SIRA|SIRA[- ]certified/i);
      }
    });

    it("asks for a site visit about this solution, by name", () => {
      expect(page.features.ctaText).toMatch(
        /^Every home is different\. We (?:plan|choose) the .+ with you at a site visit\.$/,
      );
      expect(page.enquiry.title).toMatch(/^Plan your .+ with us$/);
    });

    it("leaves that picture as decoration", () => {
      expect(page.features.image.alt).toBe("");
    });

    it("marks it temporary stock until its replacement is uploaded", () => {
      // Licensed stock, standing in (AGENTS.md, photography). This fails once
      // the mark is cleared, so replacing it is a deliberate act.
      expect(page.features.image.stock).toBe(true);
    });

    it("sends its dark box to a site visit", () => {
      expect(page.features.ctaLabel).toBe("Book a site visit");
    });

    it("picks its articles' tag from the blog's list, one an article carries", () => {
      expect(BLOG_TAGS as readonly string[]).toContain(page.articlesTag);
      expect(POSTS.some((post) => post.tags.includes(page.articlesTag))).toBe(true);
    });

    it("has a title and description inside SEO System §2's ranges", () => {
      const title = fullTitle({ title: page.seo.title, absolute: page.seo.absolute });
      expect(title.length).toBeGreaterThanOrEqual(TITLE_RANGE[0]);
      expect(title.length).toBeLessThanOrEqual(TITLE_RANGE[1]);
      expect(page.seo.description.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE[0]);
      expect(page.seo.description.length).toBeLessThanOrEqual(DESCRIPTION_RANGE[1]);
    });
  });

  describe("the seven drafted after cameras", () => {
    const LATER = PAGES.filter(([id]) => id !== "cameras");

    it.each(LATER)("%s ends its questions on how it is priced", (_id, page) => {
      expect(page.faqs.at(-1)!.id).toBe("how-is-it-priced");
    });

    it.each(LATER.filter(([id]) => !SECURITY.includes(id)))(
      "%s ends its features on the one team, the confirmed promise, word for word",
      (_id, page) => {
        expect(page.features.items.at(-1)).toEqual({
          icon: "wrench",
          title: "One team",
          text: "Designed, installed and looked after by us.",
        });
      },
    );

    it("gives the smart lock the SIRA licence in place of the one team: access control is security work", () => {
      const lock = SOLUTION_PAGES["smart-lock"]!;
      expect(lock.features.items.at(-1)).toMatchObject({ title: "SIRA licensed" });
      expect(lock.articlesTag).toBe("Security");
    });

    it("tells no one the bill will fall by a figure", () => {
      const bill = SOLUTION_PAGES.ac!.faqs.find((entry) => entry.id === "electricity")!;
      expect(bill.answer.join(" ")).toContain("we do not promise a figure");
      for (const [, page] of LATER) {
        for (const line of copy(page)) expect(line).not.toMatch(/\d+\s*%|per ?cent/i);
      }
    });
  });

  // Shivanshu, 2026-11-16: visit, install, maintain, under the features.
  describe("the process", () => {
    it.each(PAGES)(`%s has exactly ${PROCESS_STEP_COUNT} steps, one per drawing`, (_id, page) => {
      expect(page.process.steps).toHaveLength(PROCESS_STEP_COUNT);
    });

    it("is the same on every page: one process, whatever is installed", () => {
      const first = PAGES[0]![1].process;
      for (const [, page] of PAGES) expect(page.process).toEqual(first);
    });

    const { process } = SOLUTION_PAGES.cameras!;

    it("goes visit, install, maintain, the order its drawings are in", () => {
      expect(process.steps.map((step) => step.title)).toEqual([
        "Site visit",
        "Installation",
        "Maintenance",
      ]);
    });

    it("names each step once, short enough for one line on a card", () => {
      const titles = process.steps.map((step) => step.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const title of titles) expect(title.length).toBeLessThanOrEqual(16);
    });

    it("keeps each step to two or three lines on a card at 1440", () => {
      for (const { text } of process.steps) expect(text.length).toBeLessThanOrEqual(120);
    });

    it("keeps the line under its heading to two lines, centred", () => {
      expect(process.subtext.length).toBeLessThanOrEqual(120);
    });

    it("describes the visit only as confirmed: a technician and a technical lead, about 90 minutes, a fixed and itemised price", () => {
      const visit = process.steps[0]!.text;
      expect(visit).toContain("technician and a technical lead");
      expect(visit).toContain("about 90 minutes");
      expect(visit).toContain("fixed and itemised");
    });

    it("promises at handover only the record the About page confirms", () => {
      expect(process.steps[1]!.text).toMatch(/record of what went in, where it sits/);
    });

    it("promises after it only maintenance, updates and one number to call", () => {
      expect(process.steps[2]!.text).toMatch(/^Maintenance, updates and one number to call/);
    });

    it("says nothing about response times, warranties or guarantees, none of them confirmed", () => {
      const lines = [process.heading, process.subtext, ...process.steps.map((s) => s.text)];
      for (const line of lines) {
        expect(line).not.toMatch(/\b(?:hours?|days?|guarantee|warrant(?:y|ies)|24\/7)\b/i);
      }
    });
  });

  describe("cameras", () => {
    const cameras = SOLUTION_PAGES.cameras!;

    it("keeps the design's title and line", () => {
      expect(cameras.title).toBe("Cameras & CCTV");
      expect(cameras.lede).toBe("See home from anywhere, without false alerts");
    });

    it("says footage stays in the house, a confirmed promise (AGENTS.md)", () => {
      expect(cameras.features.items[0]).toMatchObject({ title: "Recorded at home" });
      expect(cameras.faqs[0]!.answer.join(" ")).toContain("stays on equipment in your home");
    });

    it("draws the camera with the security articles first", () => {
      expect(cameras.articlesTag).toBe("Security");
    });
  });
});
