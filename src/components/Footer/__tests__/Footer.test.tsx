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

  it("draws WhatsApp as its full-colour logo and the rest in the chip's ink", () => {
    // The official logo file (2026-10-03): its colours are the mark. The
    // placeholders stay currentColor paths until their real marks land.
    const icon = (label: string) =>
      screen.getByRole("link", { name: label }).querySelector("img, svg")!;
    expect(icon("Smarthaus on WhatsApp")).toHaveAttribute("src", "/whatsapp.svg");
    for (const social of SOCIALS.filter((s) => s.id !== "whatsapp")) {
      expect(icon(social.label).tagName.toLowerCase()).toBe("svg");
      expect(icon(social.label).querySelector("path")).toHaveAttribute("d", social.path);
    }
  });

  it("hides each social icon from assistive technology", () => {
    // An empty alt for the logo file, aria-hidden for the paths: the link's
    // own label names the platform either way.
    for (const social of SOCIALS) {
      const link = screen.getByRole("link", { name: social.label });
      const img = link.querySelector("img");
      if (img) {
        expect(img).toHaveAttribute("alt", "");
        continue;
      }
      const svg = link.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });
});

describe("the footer's hover roll", () => {
  // Per letter, at Shivanshu's request (2026-09-28): the whole-word roll that
  // briefly replaced it cut elements but read as the word flipping at once.
  // A roll is a label span followed by its aria-hidden animated copy; a
  // per-letter copy spells spaces as non-breaking ones.
  const text = (el: Element) => (el.textContent ?? "").replace(/\u00a0/g, " ");
  const rolls = () =>
    Array.from(screen.getByRole("contentinfo").querySelectorAll('span[aria-hidden="true"]')).filter(
      (el) => {
        const label = el.previousElementSibling;
        return label?.tagName === "SPAN" && text(label) !== "" && text(label) === text(el);
      },
    );

  it("rolls every link label one letter at a time", () => {
    const animated = rolls();
    expect(animated.length).toBeGreaterThan(10);
    for (const el of animated) {
      expect(el.children).toHaveLength([...text(el)].length);
    }
  });

  it("rolls the phone number and the address by letter too", () => {
    const labels = rolls().map(text);
    expect(labels).toEqual(expect.arrayContaining(["+971 54 375 5150", "contact@mapletech.ae"]));
    const phone = rolls().find((el) => text(el) === "+971 54 375 5150")!;
    expect(phone.children.length).toBeGreaterThan(1);
  });
});
