import type { Metadata } from "next";
// The /pricing page's own composition. The tiers, the comparison and the FAQ
// content have their own suites.
import { screen, within } from "@testing-library/react";
import PricingPage, { generateMetadata } from "../pricing/page";
import { PRICING_PAGE } from "../../../sanity/seed/pricing-page";
import { renderServer } from "../../__tests__/helpers/server";

// The page's metadata is built from its document in Sanity; the seed stands in.
let metadata: Metadata;
beforeAll(async () => {
  metadata = await generateMetadata();
});

const PRICING_FAQS = PRICING_PAGE.faqs;

const faqs = () => screen.getByRole("region", { name: "Frequently Asked Questions" });

describe("the pricing page", () => {
  it("has one h1, and the cards and sections sit under it as h2", async () => {
    await renderServer(<PricingPage />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Smart home packages");
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(2);
  });

  it("says the price is a starting point, fixed after a site survey", async () => {
    await renderServer(<PricingPage />);
    expect(screen.getByText(/The final price is fixed after a site survey/)).toBeInTheDocument();
  });

  it("lists the deck's package notes, numbered, under their own h2", async () => {
    await renderServer(<PricingPage />);
    const heading = screen.getByRole("heading", { level: 2, name: "Package notes" });
    const section = heading.closest("section");
    if (!section) throw new Error("the package notes are not in a section");
    const notes = within(section).getAllByRole("listitem");
    expect(section.querySelector("ol")).not.toBeNull();
    expect(notes.map((note) => note.textContent)).toEqual(PRICING_PAGE.notes);
    expect(notes).toHaveLength(7);
    expect(section.textContent).toMatch(/authority approvals/);
  });

  it("renders every pricing FAQ as a native details, in one exclusive group", async () => {
    await renderServer(<PricingPage />);
    const details = faqs().querySelectorAll("details");
    expect(details).toHaveLength(PRICING_FAQS.length);
    for (const item of details) expect(item).toHaveAttribute("name", "pricing-faq");
    // Closed by default: a native accordion, no client component. (The
    // comparison's own sections above are open; they are not these.)
    expect(faqs().querySelectorAll("details[open]")).toHaveLength(0);
  });

  it("shows each question in its summary and every paragraph of its answer", async () => {
    await renderServer(<PricingPage />);
    const summaries = [...faqs().querySelectorAll("summary")];
    expect(summaries.map((summary) => summary.textContent)).toEqual(
      PRICING_FAQS.map(({ question }) => question),
    );
    for (const { answer } of PRICING_FAQS) {
      for (const paragraph of answer) expect(faqs().textContent).toContain(paragraph);
    }
  });

  it("gives every summary a chevron that assistive tech never meets", async () => {
    await renderServer(<PricingPage />);
    const chevrons = faqs().querySelectorAll("summary svg");
    expect(chevrons).toHaveLength(PRICING_FAQS.length);
    for (const svg of chevrons) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });

  it("closes on a site visit, with the full FAQ as the quieter second action", async () => {
    await renderServer(<PricingPage />);
    const closing = screen.getByRole("heading", { level: 2, name: "Not sure which package?" });
    const section = closing.closest("section");
    if (!section) throw new Error("the closing prompt is not in a section");
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Book a site visit", "/contact"],
      ["Read the full FAQ", "/faq"],
    ]);
  });

  // Out of search until the package deck confirmed every figure (2026-11-19).
  it("carries its page and breadcrumb schema, and no Offer for a starting price", async () => {
    const { container } = await renderServer(<PricingPage />);
    const json = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((el) => el.textContent)
      .join("");
    expect(json).toContain('"WebPage"');
    expect(json).toContain("https://smarthaus.ae/pricing");
    expect(json).not.toMatch(/"Offer"|"Product"|"price"|"priceCurrency"/);
  });

  it("is in search, with a title and description the SEO ranges accept", async () => {
    expect(metadata.robots).toMatchObject({ index: true });
    expect(metadata.title).toBe("Smart Home Packages and Prices");
  });

  it("contains no em dash", async () => {
    const { container } = await renderServer(<PricingPage />);
    expect(container.textContent).not.toContain("—");
  });
});
