import { render, screen } from "@testing-library/react";
import { ClosingCta } from "../ClosingCta";

const PROPS = {
  heading: "Not sure which level?",
  body: "Tell us about the property.",
  href: "/contact",
  label: "Book a site visit",
};

describe("ClosingCta", () => {
  it("asks its question as an h2, the level under a page's h1", () => {
    render(<ClosingCta {...PROPS} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(PROPS.heading);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("carries the caller's line of copy", () => {
    render(<ClosingCta {...PROPS} />);
    expect(screen.getByText(PROPS.body)).toBeInTheDocument();
  });

  it("offers one action by default", () => {
    render(<ClosingCta {...PROPS} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(PROPS.label);
    expect(links[0]).toHaveAttribute("href", PROPS.href);
  });

  it("adds the secondary action after the primary, as the outline variant", () => {
    render(<ClosingCta {...PROPS} secondary={{ href: "/faq", label: "Read the full FAQ" }} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([PROPS.label, "Read the full FAQ"]);
    expect(links[1]).toHaveAttribute("href", "/faq");
    // The primary stays the primary: the two are not the same variant.
    expect(links[1]).toHaveAttribute("data-variant", "outline");
    expect(links[0]?.getAttribute("data-variant")).not.toBe("outline");
  });

  it("is a section of its own, a sibling of the page's content", () => {
    const { container } = render(<ClosingCta {...PROPS} />);
    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });
});
