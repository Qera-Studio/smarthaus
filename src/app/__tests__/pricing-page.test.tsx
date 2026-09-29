// The /pricing page's own composition. The tiers, the comparison and the FAQ
// content have their own suites.
import { render, screen, within } from "@testing-library/react";
import PricingPage, { metadata } from "../pricing/page";
import { PRICING_FAQS } from "../../content/pricing";

const faqs = () => screen.getByRole("region", { name: "Frequently Asked Questions" });

describe("the pricing page", () => {
  it("has one h1, and the cards and sections sit under it as h2", () => {
    render(<PricingPage />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Pricing");
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(2);
  });

  it("says the figure is where the conversation starts", () => {
    render(<PricingPage />);
    expect(screen.getByText(/quoted against your own drawings/)).toBeInTheDocument();
  });

  it("renders every pricing FAQ as a native details, in one exclusive group", () => {
    render(<PricingPage />);
    const details = faqs().querySelectorAll("details");
    expect(details).toHaveLength(PRICING_FAQS.length);
    for (const item of details) expect(item).toHaveAttribute("name", "pricing-faq");
    // Closed by default: a native accordion, no client component. (The
    // comparison's own sections above are open; they are not these.)
    expect(faqs().querySelectorAll("details[open]")).toHaveLength(0);
  });

  it("shows each question in its summary and every paragraph of its answer", () => {
    render(<PricingPage />);
    const summaries = [...faqs().querySelectorAll("summary")];
    expect(summaries.map((summary) => summary.textContent)).toEqual(
      PRICING_FAQS.map(({ question }) => question),
    );
    for (const { answer } of PRICING_FAQS) {
      for (const paragraph of answer) expect(faqs().textContent).toContain(paragraph);
    }
  });

  it("gives every summary a chevron that assistive tech never meets", () => {
    render(<PricingPage />);
    const chevrons = faqs().querySelectorAll("summary svg");
    expect(chevrons).toHaveLength(PRICING_FAQS.length);
    for (const svg of chevrons) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });

  it("closes on a site visit, with the full FAQ as the quieter second action", () => {
    render(<PricingPage />);
    const closing = screen.getByRole("heading", { level: 2, name: "Not sure which level?" });
    const section = closing.closest("section");
    if (!section) throw new Error("the closing prompt is not in a section");
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Book a site visit", "/contact"],
      ["Read the full FAQ", "/faq"],
    ]);
  });

  it("is noindex until its figures are confirmed (the launch gate)", () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("contains no em dash", () => {
    const { container } = render(<PricingPage />);
    expect(container.textContent).not.toContain("—");
  });
});
