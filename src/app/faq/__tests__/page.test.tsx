import type { Metadata } from "next";
import { screen } from "@testing-library/react";

import { FAQ_PAGE } from "../../../../sanity/seed/faq-page";
import FaqPage, { generateMetadata } from "../page";
import { renderServer } from "../../../__tests__/helpers/server";

// The page's metadata is built from its document in Sanity; the seed stands in.
let metadata: Metadata;
beforeAll(async () => {
  metadata = await generateMetadata();
});

const FAQ_CATEGORIES = FAQ_PAGE.categories;

/**
 * /faq is a launch-gate page: answers still hold unconfirmed figures, so it
 * ships noindex and without FAQPage schema until every `pending` note in
 * src/content/faq.ts is cleared (AGENTS.md, known tech debt). This suite holds
 * the page to that, and to its rail and headings reading one array. The
 * answers themselves are FaqAccordion's and faq.test.ts's.
 */

// The `mock` prefix is what jest allows a hoisted factory to reference.
const mockSchema = jest.fn(() => <script data-testid="faq-schema" />);
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

  it("stays out of search while answers are unconfirmed", async () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("emits no FAQPage schema while the page is noindex", async () => {
    // Structured data on a noindex page is a contradictory signal, and these
    // are exactly the figures an answer engine must not quote.
    await renderServer(<FaqPage />);
    expect(mockSchema).not.toHaveBeenCalled();
    expect(screen.queryByTestId("faq-schema")).toBeNull();
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
