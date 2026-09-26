// The footer as rendered: the newsletter that must not accept an address, the
// published contact channels, and the social links' honest names.
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";
import { SOCIALS } from "../socials";

jest.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeEach(() => {
  render(<Footer />);
});

describe("Footer", () => {
  it("is the contentinfo landmark", () => {
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("disables the newsletter field and its button, because nothing would store the address", () => {
    const input = screen.getByLabelText("Email address");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("ties the newsletter's reason to the field for assistive technology", () => {
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAccessibleDescription("Newsletter opens soon.");
  });

  it("dials the E.164 number and writes to the published address", () => {
    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector('a[href="tel:+971543755150"]')).not.toBeNull();
    expect(footer.querySelector('a[href="mailto:contact@mapletech.ae"]')).not.toBeNull();
  });

  it("renders every social link with its honest accessible name", () => {
    for (const social of SOCIALS) {
      const link = screen.getByRole("link", { name: social.label });
      expect(link).toHaveAttribute("href", social.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("names the four placeholder profiles as coming soon", () => {
    const soon = screen.getAllByRole("link", { name: /\(profile coming soon\)$/ });
    expect(soon.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Smarthaus on Instagram (profile coming soon)",
      "Smarthaus on Facebook (profile coming soon)",
      "Smarthaus on X (profile coming soon)",
      "Smarthaus on LinkedIn (profile coming soon)",
    ]);
  });

  it("hides each social icon from assistive technology", () => {
    for (const social of SOCIALS) {
      const svg = screen.getByRole("link", { name: social.label }).querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });
});
