import { render, screen } from "@testing-library/react";

import { Hero } from "../Hero";
import { POSTER } from "../frames";

/**
 * The hero's server-rendered shell: the page's h1, the copy, the two CTAs and
 * the LCP preload. HeroStage, the client island that owns the villa, is
 * stubbed: three.js and the canvas are not what this file tests.
 */

jest.mock("../HeroStage", () => ({ HeroStage: () => <div data-testid="stage" /> }));

const preload = jest.fn();
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  preload: (...args: unknown[]) => preload(...args),
}));

beforeEach(() => preload.mockClear());

describe("Hero", () => {
  it("carries the page's one h1 and names its section with it", () => {
    render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Home at your fingertips" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toContainElement(h1);
  });

  it("marks the section as the hook VillaCanvas publishes the tour state to", () => {
    render(<Hero />);
    expect(screen.getByRole("region")).toHaveAttribute("data-hero");
  });

  it("links the primary CTA to the contact page", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("links Explore Villa to the solutions page until the explorer is built", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: "Explore Villa" })).toHaveAttribute(
      "href",
      "/solutions",
    );
  });

  it("keeps the two CTAs, in that order", () => {
    // The landing composition is designed around two; see the note in Hero.tsx.
    render(<Hero />);
    const names = screen.getAllByRole("link").map((a) => a.textContent?.trim());
    expect(names).toEqual(["Book a site visit", "Explore Villa"]);
  });

  it("opts no element out of the cursor", () => {
    // The CTAs carried data-cursor="none", which hid the pointer over them.
    // That behaviour was removed at the client's request; the attribute
    // coming back would be the first sign of it returning.
    const { container } = render(<Hero />);
    expect(container.querySelector("[data-cursor]")).toBeNull();
  });

  it("renders the villa stage between the copy and the CTAs", () => {
    const { container } = render(<Hero />);
    const all = Array.from(container.querySelectorAll("*"));
    const stage = screen.getByTestId("stage");
    expect(all.indexOf(screen.getByRole("heading"))).toBeLessThan(all.indexOf(stage));
    expect(all.indexOf(stage)).toBeLessThan(all.indexOf(screen.getAllByRole("link")[0]!));
  });

  it("preloads the poster at high priority, since it is the LCP element", () => {
    render(<Hero />);
    expect(preload).toHaveBeenCalledWith(POSTER, { as: "image", fetchPriority: "high" });
  });

  it("signs the hero as by Maple Technologies", () => {
    render(<Hero />);
    expect(screen.getByText("Smarthaus by Maple Technologies.")).toBeInTheDocument();
  });
});
