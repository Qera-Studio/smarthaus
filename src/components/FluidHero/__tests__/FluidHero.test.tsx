import { render, screen } from "@testing-library/react";

import { FluidHero } from "../FluidHero";

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

  test("has no secondary CTA: Explore Villa left with the villa hero (2026-09-28)", () => {
    render(<FluidHero />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /explore/i })).toBeNull();
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
    expect(screen.getByText("Smarthaus by Maple Technologies.")).toBeInTheDocument();
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

  test("the CTA opts out of the site's custom cursor, like every other button", () => {
    render(<FluidHero />);
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
      "data-cursor",
      "none",
    );
  });

  test("renders as a section landmark with an accessible name", () => {
    render(<FluidHero />);
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toBeInTheDocument();
  });
});

describe("the quiet zones", () => {
  test("mark the copy and the CTA, and nothing else", () => {
    const { container } = render(<FluidHero />);
    const quiet = container.querySelectorAll("[data-hero-quiet]");
    expect(quiet).toHaveLength(2);
    expect(quiet[0]?.querySelector("h1")).not.toBeNull();
    expect(quiet[1]?.querySelectorAll("a")).toHaveLength(1);
  });

  test("the byline is not quiet: it is small and sits where the pool rarely reaches", () => {
    render(<FluidHero />);
    const byline = screen.getByText("Smarthaus by Maple Technologies.");
    expect(byline.closest("[data-hero-quiet]")).toBeNull();
  });
});
