import { render, screen } from "@testing-library/react";

import { FluidHero, RATING } from "../FluidHero";

/**
 * The server half. The canvas is stubbed to nothing: its behaviour has its
 * own file, and here the question is what the section promises the page and
 * the e2e suite: one h1, one CTA by text, the data-hero hook, and a canvas
 * the accessibility tree never sees.
 */

jest.mock("../FluidCanvas", () => ({
  FluidCanvas: () => <canvas data-testid="canvas" aria-hidden="true" />,
}));

describe("FluidHero", () => {
  test("renders the page's one h1 and is labelled by it", () => {
    const { container } = render(<FluidHero />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAttribute("id", "hero-title");
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-labelledby", "hero-title");
    expect(section).toHaveAttribute("data-hero");
  });

  test("keeps the one CTA the e2e suite finds by text, with its route", () => {
    render(<FluidHero />);
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  test("has a WhatsApp CTA after the booking, pre-filled, and no Explore Villa", () => {
    render(<FluidHero />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Book a site visit",
      "Message on WhatsApp",
    ]);
    const href = screen.getByRole("link", { name: "Message on WhatsApp" }).getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(href?.split("?text=")[1] ?? "")).toBe(
      "Hi, I'm interested in home automation for my villa.",
    );
    expect(screen.queryByRole("link", { name: /explore/i })).toBeNull();
  });

  test("the rating pill sits above the title and names Google", () => {
    render(<FluidHero />);
    const pill = screen.getByText(/on\s+Google reviews/);
    expect(pill.tagName).toBe("P");
    expect(pill.textContent).toBe(`★ ${RATING} on Google reviews`);
    // Before the h1 in document order, inside the quiet copy block.
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(pill.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pill.closest("[data-hero-quiet]")).not.toBeNull();
    // The star is decoration; the text says what it is.
    const star = pill.querySelector('[aria-hidden="true"]');
    expect(star?.textContent).toBe("★");
  });

  test("the rating is verified: it renders as plain text, with no placeholder marker", () => {
    // Confirmed 2026-09-28. The homepage must never ship a review marker.
    expect(RATING).toBe("4.8");
    const { container } = render(<FluidHero />);
    expect(container.querySelector("[data-placeholder]")).toBeNull();
  });

  test("the closing paragraph sits between the CTAs and the byline", () => {
    render(<FluidHero />);
    const note = screen.getByText(/A good system is one you stop noticing\./);
    expect(note.textContent).toBe(
      "A good system is one you stop noticing. The lights are already right when you walk in, " +
        "the gate is already open, the house is already cool. Nothing to set up, nothing to " +
        "remember.",
    );
    const byline = screen.getByText(/Smarthaus by Maple Technologies\./);
    const cta = screen.getByRole("link", { name: "Message on WhatsApp" });
    expect(cta.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.compareDocumentPosition(byline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("the canvas is the first child of the section and hidden from AT", () => {
    const { container } = render(<FluidHero />);
    const section = container.querySelector("section");
    expect(section?.firstElementChild?.tagName).toBe("CANVAS");
    expect(section?.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  test("carries the lede and the byline as real text", () => {
    render(<FluidHero />);
    expect(screen.getByText(/Dubai villas/)).toBeInTheDocument();
    expect(
      screen.getByText("SIRA licensed · Smarthaus by Maple Technologies."),
    ).toBeInTheDocument();
  });

  test("contains no em dash", () => {
    const { container } = render(<FluidHero />);
    expect(container.textContent).not.toContain("—");
  });
});

describe("the copy keeps the brand's tone", () => {
  const text = () => render(<FluidHero />).container.textContent ?? "";

  test("no exclamation marks", () => {
    expect(text()).not.toContain("!");
  });

  test("no superlatives or hype", () => {
    expect(text()).not.toMatch(
      /cutting-edge|revolutionary|world-class|best-in-class|trusted by|years of experience/i,
    );
  });

  test("no invented heritage or partner names", () => {
    expect(text()).not.toMatch(/\b(19|20)\d\d\b|TIS|Fibaro|Lutron|KNX/);
  });

  test("opts nothing out of the site's dot cursor (src/styles/__tests__/cursor.test.ts)", () => {
    // data-cursor="none" hid the pointer over buttons; removed at the client's
    // request in the same week this hero landed.
    const { container } = render(<FluidHero />);
    expect(container.querySelector("[data-cursor]")).toBeNull();
  });

  test("renders as a section landmark with an accessible name", () => {
    render(<FluidHero />);
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toBeInTheDocument();
  });
});

describe("the quiet zones", () => {
  test("mark the copy, the CTAs and the closing paragraph, and nothing else", () => {
    const { container } = render(<FluidHero />);
    const quiet = container.querySelectorAll("[data-hero-quiet]");
    expect(quiet).toHaveLength(3);
    expect(quiet[0]?.querySelector("h1")).not.toBeNull();
    expect(quiet[1]?.querySelectorAll("a")).toHaveLength(2);
    expect(quiet[2]?.textContent).toMatch(/^A good system/);
  });

  test("the byline is not quiet: it is small and sits where the pool rarely reaches", () => {
    render(<FluidHero />);
    const byline = screen.getByText("SIRA licensed · Smarthaus by Maple Technologies.");
    expect(byline.closest("[data-hero-quiet]")).toBeNull();
  });
});
