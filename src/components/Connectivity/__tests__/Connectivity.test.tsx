import { screen, within } from "@testing-library/react";

import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { renderServer } from "../../../__tests__/helpers/server";
import { Connectivity } from "../Connectivity";
import { PROTOCOLS, PROTOCOLS_LABEL } from "../protocols";

/**
 * The standards section under the figures (Figma 4914:839, 2026-11-16). What
 * fails silently: the copy not reaching the page, a mark dropped or renamed
 * for a screen reader, and the button going anywhere but the contact page.
 * The ground is the stylesheet's (styles.test.ts).
 */

const COPY = HOME_PAGE.connectivity;
const section = () => screen.getByRole("region", { name: COPY.heading });

beforeAll(() => {
  // ScrollReveal is not mounted here; nothing reads these, but Words and the
  // reveal attributes must render without them.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

describe("Connectivity", () => {
  it("is a region named by its h2, on a dark ground", async () => {
    await renderServer(<Connectivity />);
    expect(section().tagName).toBe("SECTION");
    expect(section()).toHaveAttribute("data-ground", "dark");
    const heading = within(section()).getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(COPY.heading);
    expect(heading).toHaveAttribute("id", "connectivity");
  });

  it("reads the copy from the homepage document", async () => {
    await renderServer(<Connectivity />);
    expect(within(section()).getByText(COPY.lead).tagName).toBe("P");
  });

  it("sends the button to the contact page", async () => {
    await renderServer(<Connectivity />);
    const button = within(section()).getByRole("link", { name: COPY.cta });
    expect(button).toHaveAttribute("href", "/contact");
    // The light button over the dark ground, as the solution pages' box has it.
    expect(button).toHaveAttribute("data-variant", "inverse");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("reveals the heading word by word and the rest with it, as the homepage's do", async () => {
    await renderServer(<Connectivity />);
    const heading = within(section()).getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("data-reveal-words");
    expect(heading.querySelectorAll("span")).toHaveLength(COPY.heading.split(" ").length);
    expect(within(section()).getByText(COPY.lead)).toHaveAttribute("data-reveal");
  });

  describe("the marks", () => {
    const marks = () => within(section()).getByRole("list", { name: PROTOCOLS_LABEL });

    it("are one named list, in the drawn order", async () => {
      await renderServer(<Connectivity />);
      expect(
        within(marks())
          .getAllByRole("img")
          .map((img) => img.getAttribute("alt")),
      ).toEqual(PROTOCOLS.map((p) => p.name));
    });

    it("are each file at its own size, loaded as it comes near", async () => {
      await renderServer(<Connectivity />);
      within(marks())
        .getAllByRole("img")
        .forEach((img, i) => {
          const protocol = PROTOCOLS[i]!;
          expect(img).toHaveAttribute("src", `/landing/connectivity/${protocol.logo}`);
          expect(img).toHaveAttribute("width", String(protocol.width));
          expect(img).toHaveAttribute("height", String(protocol.height));
          expect(img).toHaveAttribute("loading", "lazy");
        });
    });

    it("are not hidden from a screen reader", async () => {
      await renderServer(<Connectivity />);
      expect(marks().closest("[aria-hidden]")).toBeNull();
    });
  });
});
