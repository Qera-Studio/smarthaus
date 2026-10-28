import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { HERO_CAROUSEL_ITEMS } from "../../../content/hero-carousel";
import { HomeHero, PROJECTS, RATING } from "../HomeHero";

/**
 * The homepage hero's markup. The strip's movement, hover pause and overlay
 * are CSS, which jsdom does not apply; e2e/home-hero.spec.ts covers them in a
 * browser. This pins what the server sends and what AT reads.
 */

const strip = () => document.querySelector("[data-hero-strip]") as HTMLElement;
const lists = () => Array.from(strip().querySelectorAll("ul"));

describe("HomeHero", () => {
  it("is a section named by its h1", () => {
    render(<HomeHero />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Home at your fingertips" });
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toContainElement(h1);
  });

  it("carries the hook other suites find it by", () => {
    render(<HomeHero />);
    expect(document.querySelector("section[data-hero]")).not.toBeNull();
  });

  it("states the verified rating", () => {
    render(<HomeHero />);
    expect(RATING).toBe("4.8");
    expect(screen.getByText(/4\.8 on Google reviews/)).toBeInTheDocument();
  });

  it("keeps the published lede word for word", () => {
    render(<HomeHero />);
    expect(
      screen.getByText(
        "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a site visit and WhatsApp, in that order", () => {
    render(<HomeHero />);
    const visit = screen.getByRole("link", { name: "Book a site visit" });
    const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
    expect(visit).toHaveAttribute("href", "/contact");
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(visit.compareDocumentPosition(whatsapp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("pre-fills the WhatsApp message with the topic and the project", () => {
    render(<HomeHero />);
    const href = screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href") ?? "";
    expect(decodeURIComponent(href.split("text=")[1] ?? "")).toBe(
      "Hi, I'm interested in home automation for my villa.",
    );
  });

  describe("the strip", () => {
    it("renders the list twice, for a seamless loop", () => {
      render(<HomeHero />);
      expect(lists()).toHaveLength(2);
      for (const list of lists()) {
        expect(list.querySelectorAll("li")).toHaveLength(HERO_CAROUSEL_ITEMS.length);
      }
    });

    it("hides the second copy from AT and from the tab order", () => {
      render(<HomeHero />);
      const [, copy] = lists();
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy).toHaveAttribute("inert");
      expect(copy).toHaveAttribute("data-copy");
    });

    it("names the first copy as a list", () => {
      render(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      expect(within(list).getAllByRole("listitem")).toHaveLength(HERO_CAROUSEL_ITEMS.length);
    });

    it("reads each card once: its image, title, line and link", () => {
      render(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      for (const item of HERO_CAROUSEL_ITEMS) {
        expect(screen.getAllByRole("img", { name: item.image.alt })).toHaveLength(1);
        expect(within(list).getAllByText(item.title, { selector: "p" })).toHaveLength(1);
        expect(within(list).getAllByText(item.line)).toHaveLength(1);
        const link = screen.getByRole("link", { name: item.cta });
        expect(link).toHaveAttribute("href", "/solutions");
      }
    });

    it("keeps the cards in content order", () => {
      render(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      const titles = within(list)
        .getAllByRole("listitem")
        .map((li) => li.querySelector("p")?.textContent);
      expect(titles).toEqual(HERO_CAROUSEL_ITEMS.map((item) => item.title));
    });

    it("exposes each card link once to AT, though the DOM holds two copies", () => {
      render(<HomeHero />);
      for (const { cta } of HERO_CAROUSEL_ITEMS) {
        expect(screen.getAllByRole("link", { name: cta })).toHaveLength(1);
        expect(screen.getAllByRole("link", { name: cta, hidden: true })).toHaveLength(2);
      }
    });

    it("has its pause button above it, outside the moving track, and no arrows", () => {
      render(<HomeHero />);
      const pause = screen.getByRole("button", { name: "Pause the images" });
      expect(strip()).not.toContainElement(pause);
      expect(
        pause.compareDocumentPosition(strip()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Previous image|Next image/ })).toBeNull();
    });

    it("loads the first cards eagerly and the rest lazily", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs).toHaveLength(HERO_CAROUSEL_ITEMS.length * 2);
      expect(imgs.slice(0, 4).every((img) => !/loading="lazy"/.test(img))).toBe(true);
      expect(imgs.slice(4).every((img) => /loading="lazy"/.test(img))).toBe(true);
    });

    it("fetches the first card at high priority, since it is the largest paint", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs[0]).toMatch(/fetchpriority="high"/i);
      for (const img of imgs.slice(1, HERO_CAROUSEL_ITEMS.length)) {
        expect(img).not.toMatch(/fetchpriority="high"/i);
      }
      // The inert copy never competes for bandwidth with the first.
      for (const img of imgs.slice(HERO_CAROUSEL_ITEMS.length)) {
        expect(img).not.toMatch(/fetchpriority="high"/i);
      }
    });

    it("reserves every image's box with its width and height", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      for (const { image } of HERO_CAROUSEL_ITEMS) {
        expect(markup).toMatch(
          new RegExp(`<img[^>]*width="${image.width}"[^>]*height="${image.height}"`),
        );
      }
    });
  });

  describe("the proof", () => {
    const proof = () => screen.getByText(/on Google reviews/).closest("p") as HTMLElement;

    it("states the approved project count", () => {
      render(<HomeHero />);
      expect(PROJECTS).toBe("180+ projects completed across Dubai");
      expect(screen.getByText(PROJECTS)).toBeInTheDocument();
    });

    it("puts the rating and the project count on one line, rating first", () => {
      render(<HomeHero />);
      const count = screen.getByText(PROJECTS);
      expect(proof()).toContainElement(count);
      expect(proof().textContent).toMatch(/^★ 4\.8 on Google reviews.*180\+ projects/);
    });

    it("splits them with a drawn rule that AT does not read", () => {
      render(<HomeHero />);
      const spans = Array.from(proof().children);
      expect(spans).toHaveLength(3);
      expect(spans[1]).toHaveAttribute("aria-hidden", "true");
      expect(spans[1]?.textContent).toBe("");
    });

    it("sits above the title", () => {
      render(<HomeHero />);
      const title = screen.getByRole("heading", { level: 1 });
      expect(
        proof().compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows no faces any more", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      expect(markup).not.toMatch(/hero(?:\/|%2F)s[1-5]\.png/);
    });

    it("names one SIRA licence, not several", () => {
      render(<HomeHero />);
      const sira = screen.getByText(/^SIRA Licence/).closest("p") as HTMLElement;
      // Read aloud with a comma where the rule is drawn.
      expect(sira.textContent).toBe("SIRA Licence,Smarthaus by Maple Technologies.");
      expect(document.body.textContent).not.toMatch(/Licences/);
    });

    it("draws the SIRA line exactly as the rating line: same parts, same classes", () => {
      render(<HomeHero />);
      const sira = screen.getByText(/^SIRA Licence/).closest("p") as HTMLElement;
      expect(sira.className).toBe(proof().className);
      const shape = (p: HTMLElement) => Array.from(p.children).map((el) => el.className);
      expect(shape(sira)).toEqual(shape(proof()));
    });

    it("types no vertical bar anywhere: the rules are drawn", () => {
      render(<HomeHero />);
      const hero = document.querySelector("section[data-hero]") as HTMLElement;
      expect(hero.textContent).not.toContain("|");
    });

    it("keeps each half apart for a screen reader with a hidden comma", () => {
      render(<HomeHero />);
      for (const p of [proof(), screen.getByText(/^SIRA Licence/).closest("p") as HTMLElement]) {
        const hidden = p.querySelector(".visually-hidden");
        expect(hidden?.textContent).toBe(",");
      }
    });

    it("puts the SIRA line under the two CTAs, above the strip", () => {
      render(<HomeHero />);
      const sira = screen.getByText(/^SIRA Licence/);
      const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
      expect(
        whatsapp.compareDocumentPosition(sira) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(sira.compareDocumentPosition(strip()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("leaves nothing after the strip", () => {
      render(<HomeHero />);
      const hero = document.querySelector("section[data-hero]") as HTMLElement;
      expect(hero.lastElementChild).toBe(strip());
    });
  });

  it("contains no em dash", () => {
    expect(renderToStaticMarkup(<HomeHero />)).not.toContain("—");
  });
});
