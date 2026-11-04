import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { HERO_CAROUSEL_ITEMS } from "../../../content/hero-carousel";
import { HomeHero, LEAD_CARDS, LEDE, PROJECTS, RATING, TITLE } from "../HomeHero";

/**
 * The homepage hero's markup. The strip's movement, hover pause and overlay
 * are CSS, which jsdom does not apply; e2e/home-hero.spec.ts covers them in a
 * browser. This pins what the server sends and what AT reads.
 */

const strip = () => document.querySelector("[data-hero-strip]") as HTMLElement;
const lists = () => Array.from(strip().querySelectorAll("ul:not([data-lead])"));
const lead = () => strip().querySelector("ul[data-lead]") as HTMLElement;

// jsdom has no IntersectionObserver, which StripControls watches the strip
// with; its scroll is tested in StripControls.test.tsx.
beforeAll(() => {
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
});

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
    const { container } = render(<HomeHero />);
    expect(LEDE).toBe(
      "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.",
    );
    expect(container.querySelector("h1 + p")?.textContent).toBe(LEDE);
  });

  describe("word by word", () => {
    const words = (selector: string) =>
      Array.from(document.querySelectorAll(`${selector} > span`)).map((el) => el.textContent);

    it("gives each word of the title and the lede its own span", () => {
      render(<HomeHero />);
      expect(words("h1")).toEqual(TITLE.split(" "));
      expect(words("h1 + p")).toEqual(LEDE.split(" "));
    });

    it("is still one sentence to a screen reader: the spaces stay as text", () => {
      render(<HomeHero />);
      expect(screen.getByRole("heading", { level: 1, name: TITLE })).toBeInTheDocument();
      expect(document.querySelector("h1")?.textContent).toBe(TITLE);
    });

    it("stays inside the counts the stylesheet gives a delay", () => {
      // A word past the last nth-of-type rule would start with no delay, ahead
      // of the sentence it belongs to.
      const scss = readFileSync(join(__dirname, "../HomeHero.module.scss"), "utf8");
      expect(TITLE.split(" ").length).toBeLessThanOrEqual(
        Number(scss.match(/\$hero-title-words:\s*(\d+)/)?.[1]),
      );
      expect(LEDE.split(" ").length).toBeLessThanOrEqual(
        Number(scss.match(/\$hero-lede-words:\s*(\d+)/)?.[1]),
      );
    });
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
      expect(copy).toHaveAttribute("data-copy");
      const links = Array.from(copy!.querySelectorAll("a"));
      expect(links).toHaveLength(HERO_CAROUSEL_ITEMS.length);
      for (const link of links) expect(link).toHaveAttribute("tabindex", "-1");
    });

    it("leaves the second copy able to take the pointer: inert took its hover and links", () => {
      render(<HomeHero />);
      const [, copy] = lists();
      expect(copy).not.toHaveAttribute("inert");
    });

    it("leaves the first copy's links in the tab order", () => {
      render(<HomeHero />);
      const [first] = lists();
      for (const link of Array.from(first!.querySelectorAll("a"))) {
        expect(link).not.toHaveAttribute("tabindex");
      }
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
      }
    });

    describe("the lead cards, which the rail runs past on its way in", () => {
      it("are the last cards of the list, the ones that come before the first in the loop", () => {
        render(<HomeHero />);
        const titles = Array.from(lead().querySelectorAll("li")).map(
          (li) => li.querySelector("p")?.textContent,
        );
        expect(titles).toEqual(HERO_CAROUSEL_ITEMS.slice(-LEAD_CARDS).map((item) => item.title));
      });

      it("are hidden from AT and the tab order, and go when the second copy does", () => {
        render(<HomeHero />);
        expect(lead()).toHaveAttribute("aria-hidden", "true");
        expect(lead()).toHaveAttribute("inert");
        expect(lead()).toHaveAttribute("data-copy");
      });

      it("match the distance in the stylesheet: two cards of the track's sixteen", () => {
        const scss = readFileSync(join(__dirname, "../HomeHero.module.scss"), "utf8");
        const share = (100 * LEAD_CARDS) / (2 * HERO_CAROUSEL_ITEMS.length);
        expect(scss).toContain(`translate: calc(100vw + ${share}%) 0`);
      });
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

    // Lazy cards stayed blank once the GPU carried them on screen (2026-10-28).
    it("loads no card lazily, the copy included", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs).toHaveLength(HERO_CAROUSEL_ITEMS.length * 2 + LEAD_CARDS);
      expect(imgs.some((img) => /loading="lazy"/.test(img))).toBe(false);
    });

    it("fetches the cards past the fourth, and the copy, behind the rest", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs.slice(1, 4).some((img) => /fetchPriority|fetchpriority/i.test(img))).toBe(false);
      expect(imgs.slice(4).every((img) => /fetchpriority="low"/i.test(img))).toBe(true);
    });

    it("the copy asks for exactly the first copy's files, so it costs nothing more", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      const srcs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map(
        (m) => m[0].match(/srcSet="([^"]*)"/i)?.[1],
      );
      const half = HERO_CAROUSEL_ITEMS.length;
      expect(srcs.slice(half, half * 2)).toEqual(srcs.slice(0, half));
      expect(srcs.slice(half * 2)).toEqual(srcs.slice(half - LEAD_CARDS, half));
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
    const proof = () => screen.getByText(/on Google reviews/).closest("ul") as HTMLElement;
    const lines = () => Array.from(proof().querySelectorAll("li")).map((li) => li.textContent);

    it("states the four proofs, in order, in the approved words", () => {
      render(<HomeHero />);
      expect(PROJECTS).toBe("180+ Dubai projects");
      expect(lines()).toEqual([
        "4.8 on Google reviews",
        "180+ Dubai projects",
        "SIRA Licence",
        "by Maple Technologies",
      ]);
    });

    it("marks only the rating, with its star, hidden from AT", () => {
      render(<HomeHero />);
      const marks = Array.from(proof().querySelectorAll("li > span"));
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveAttribute("aria-hidden", "true");
      expect(marks[0]?.textContent).toBe("");
      expect(proof().firstElementChild).toContainElement(marks[0] as HTMLElement);
      expect(renderToStaticMarkup(<HomeHero />)).not.toMatch(/Logo|mapletech/i);
    });

    it("types no vertical bar: the rules between them are drawn", () => {
      render(<HomeHero />);
      expect(proof().textContent).not.toContain("|");
    });

    it("names one SIRA licence, not several", () => {
      render(<HomeHero />);
      expect(document.body.textContent).not.toMatch(/Licences/);
    });

    it("no longer names Smarthaus in the Maple line", () => {
      render(<HomeHero />);
      expect(proof().textContent).not.toMatch(/Smarthaus/);
    });

    it("comes after the CTAs in reading order, and before the strip", () => {
      render(<HomeHero />);
      const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
      expect(
        whatsapp.compareDocumentPosition(proof()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        proof().compareDocumentPosition(strip()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows no faces any more", () => {
      const markup = renderToStaticMarkup(<HomeHero />);
      expect(markup).not.toMatch(/hero(?:\/|%2F)s[1-5]\.png/);
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
