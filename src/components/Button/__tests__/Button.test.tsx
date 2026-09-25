import { render, screen } from "@testing-library/react";

import { Button } from "../Button";

/**
 * The element choice is the only thing here worth guarding.
 *
 * A link that renders as a <button> loses middle-click, open-in-new-tab and the
 * href in the status bar; a submit that renders as an <a> silently stops
 * submitting the form. Both are invisible in a screenshot and neither shows up
 * in a typecheck, because the failure is in what the component decided to
 * render rather than in what it was handed.
 *
 * Appearance is not asserted: jsdom applies no CSS Modules, so a test that
 * checked the variant's colours would pass against an empty stylesheet.
 */
describe("Button", () => {
  it("renders a link when given an href", () => {
    render(<Button href="/contact">Book a site visit</Button>);

    const link = screen.getByRole("link", { name: "Book a site visit" });
    expect(link).toHaveAttribute("href", "/contact");
    expect(link.tagName).toBe("A");
  });

  it("renders a button when given no href", () => {
    render(<Button>Send</Button>);

    const button = screen.getByRole("button", { name: "Send" });
    expect(button.tagName).toBe("BUTTON");
    // Defaulted, so a button inside a form cannot submit it by accident.
    expect(button).toHaveAttribute("type", "button");
  });

  it("carries an explicit type through to the button", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("disables the button form", () => {
    render(<Button disabled>Sending</Button>);
    expect(screen.getByRole("button", { name: "Sending" })).toBeDisabled();
  });

  it("never emits an href attribute on the button form", () => {
    // React warns and the DOM keeps a stray attribute if `href: undefined` is
    // spread onto a <button>, so the component destructures it out.
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).not.toHaveAttribute("href");
  });

  it("marks the variant on the element so one stylesheet can dress all three", () => {
    const { rerender } = render(<Button href="/a">Go</Button>);
    // Defaulted rather than required: every pre-existing call site was solid.
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("data-variant", "solid");

    rerender(
      <Button href="/a" variant="outline">
        Go
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("data-variant", "outline");
  });
});
