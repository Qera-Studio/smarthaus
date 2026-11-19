import type { Metadata } from "next";
import { screen } from "@testing-library/react";

import { FAQ_PAGE } from "../../../../sanity/seed/faq-page";
import FaqPage, { generateMetadata } from "../page";
import { isFaqPublishable } from "../../../sanity/content";
import { renderServer } from "../../../__tests__/helpers/server";

// The page's metadata is built from its document in Sanity; the seed stands in.
let metadata: Metadata;
beforeAll(async () => {
  metadata = await generateMetadata();
});

const FAQ_CATEGORIES = FAQ_PAGE.categories;

/**
 * /faq was a launch-gate page: it shipped noindex and without FAQPage schema
 * while any answer held a `pending` note. Every answer was confirmed on
 * 2026-11-19 (Shivanshu), so it is in search with its schema; a pending note
 * would still take both away (isFaqPublishable). This suite holds the page to
 * that, and to its rail and headings reading one array. The answers
 * themselves are FaqAccordion's and faq.test.ts's.
 */

// The `mock` prefix is what jest allows a hoisted factory to reference.
const mockSchema = jest.fn(() => <template data-testid="faq-schema" />);
jest.mock("../../../components/Faq", () => {
  const actual = jest.requireActual("../../../components/Faq");
  return { ...actual, FaqSchema: () => mockSchema() };
});

// The ToC rail tracks the active section with an IntersectionObserver, which
// jsdom lacks. The rail's behaviour is LegalToc's own suite; it only has to
// mount here.
beforeAll(async () => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("/faq", () => {
  beforeEach(() => mockSchema.mockClear());

  it("is in search now that every answer is confirmed", async () => {
    expect(FAQ_CATEGORIES.flatMap((c) => c.entries).filter((e) => e.pending)).toEqual([]);
    expect(metadata.robots).toMatchObject({ index: true });
  });

  it("would leave search again if a pending note came back, or the switch went off", () => {
    const [first, ...rest] = FAQ_CATEGORIES;
    const noted = {
      ...FAQ_PAGE,
      categories: [
        { ...first!, entries: [{ ...first!.entries[0]!, pending: "to confirm" }] },
        ...rest,
      ],
    };
    expect(isFaqPublishable(FAQ_PAGE)).toBe(true);
    expect(isFaqPublishable(noted)).toBe(false);
    expect(isFaqPublishable({ ...FAQ_PAGE, seo: { ...FAQ_PAGE.seo, index: false } })).toBe(false);
  });

  /**
   * In search, so it carries its page and breadcrumb schema. Not its FAQPage:
   * forty questions are about 11.5 KB against SEO System §9's 4 KB, and which
   * ones it carries is for 2.1.0 (docs/updates/2.1.0.md).
   */
  it("emits its page schema, and no FAQPage until a set within 4 KB is chosen", async () => {
    const { container } = await renderServer(<FaqPage />);
    expect(mockSchema).not.toHaveBeenCalled();
    const json = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((el) => el.textContent)
      .join("");
    expect(json).toContain('"WebPage"');
    expect(json).toContain('"BreadcrumbList"');
    expect(json).not.toContain('"FAQPage"');
    expect(json.length).toBeLessThan(4096);
  });

  it("has one h1, the page title", async () => {
    await renderServer(<FaqPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Frequently Asked Questions",
    );
  });

  it("titles a section for every category, from the same array as the rail", async () => {
    await renderServer(<FaqPage />);
    for (const category of FAQ_CATEGORIES) {
      expect(screen.getAllByText(category.title).length).toBeGreaterThan(0);
      expect(document.getElementById(category.id)).not.toBeNull();
    }
  });

  it("renders every question in the content", async () => {
    await renderServer(<FaqPage />);
    const questions = FAQ_CATEGORIES.flatMap((c) => c.entries);
    expect(document.querySelectorAll("details")).toHaveLength(questions.length);
  });

  it("sends anyone whose question is missing to the contact page, twice", async () => {
    await renderServer(<FaqPage />);
    expect(screen.getByRole("link", { name: "ask it directly" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
  });
});
