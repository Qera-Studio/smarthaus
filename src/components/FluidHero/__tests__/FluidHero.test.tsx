import { render, screen } from "@testing-library/react";

import { FluidHero } from "../FluidHero";

/**
 * The server half. The canvas is stubbed to nothing: its behaviour has its
 * own file, and here the question is what the section promises the page and
 * the e2e suite: one h1, two CTAs by text, the data-hero hook, and a canvas
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

  test("keeps the two CTAs the e2e suite finds by text, with their routes", () => {
    render(<FluidHero />);
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByRole("link", { name: "Explore Villa" })).toHaveAttribute(
      "href",
      "/solutions",
    );
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

  test("the CTAs opt out of the site's custom cursor, like every other button", () => {
    render(<FluidHero />);
    for (const name of ["Book a site visit", "Explore Villa"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("data-cursor", "none");
    }
  });

  test("renders as a section landmark with an accessible name", () => {
    render(<FluidHero />);
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toBeInTheDocument();
  });
});
