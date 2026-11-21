import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screen, within } from "@testing-library/react";

import { HOME_PAGE } from "../../../../sanity/seed/home-page";
import { GROUND, HomeHero, LEAD_CARDS } from "../HomeHero";
import { BRAND_RUNS, BRANDS, BRANDS_LABEL } from "../brands";
import { HERO_LEDE_WORDS, HERO_TITLE_WORDS } from "../../../sanity/schema/home-page";
import { renderMarkup, renderServer } from "../../../__tests__/helpers/server";

const HERO_CAROUSEL_ITEMS = HOME_PAGE.hero.cards;
// The copy is the homepage document in Sanity; the seed is what the ci dataset
// and the first publication carry, and what these pin.
const { title: TITLE, lede: LEDE } = HOME_PAGE.hero;
const RATING = HOME_PAGE.hero.proof[0]!.split(" ")[0];
const PROJECTS = HOME_PAGE.hero.proof[1];

/**
 * The homepage hero's markup. The strip's movement, hover pause and overlay
 * are CSS, which jsdom does not apply; e2e/home-hero.spec.ts covers them in a
 * browser. This pins what the server sends and what AT reads.
 */

const strip = () => document.querySelector("[data-hero-strip]") as HTMLElement;
const lists = () => Array.from(strip().querySelectorAll("ul:not([data-lead])"));
const lead = () => strip().querySelector("ul[data-lead]") as HTMLElement;

// The email field imports the server action, which imports Resend, which
// wants a TextEncoder jsdom does not have. HeroLead.test.tsx tests the field.
jest.mock("../../../app/contact/actions", () => ({ submitHeroLead: jest.fn() }));

// The glass draws on WebGL after an image decodes, neither of which jsdom
// has. A stand-in with the same element; GlassCanvas.test.tsx tests the real one.
jest.mock("../GlassCanvas", () => ({
  GlassCanvas: ({ src }: { src: string }) => (
    <canvas className="glass" aria-hidden="true" data-src={src} />
  ),
}));

// jsdom has no IntersectionObserver, which StripControls watches the strip
// with, nor matchMedia, which the glass reads (GlassCanvas.test.tsx); its
// scroll is tested in StripControls.test.tsx.
beforeAll(async () => {
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
});

describe("HomeHero", () => {
  it("is a section named by its h1", async () => {
    await renderServer(<HomeHero />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Home at your fingertips" });
    expect(screen.getByRole("region", { name: "Home at your fingertips" })).toContainElement(h1);
  });

  it("carries the hook other suites find it by", async () => {
    await renderServer(<HomeHero />);
    expect(document.querySelector("section[data-hero]")).not.toBeNull();
  });

  it("states the verified rating", async () => {
    await renderServer(<HomeHero />);
    expect(RATING).toBe("4.8");
    expect(screen.getByText(/4\.8 on Google reviews/)).toBeInTheDocument();
  });

  it("keeps the published lede word for word", async () => {
    const { container } = await renderServer(<HomeHero />);
    expect(LEDE).toBe(
      "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.",
    );
    expect(container.querySelector("h1 + p")?.textContent).toBe(LEDE);
  });

  describe("word by word", () => {
    const words = (selector: string) =>
      Array.from(document.querySelectorAll(`${selector} > span`)).map((el) => el.textContent);

    it("gives each word of the title and the lede its own span", async () => {
      await renderServer(<HomeHero />);
      expect(words("h1")).toEqual(TITLE.split(" "));
      expect(words("h1 + p")).toEqual(LEDE.split(" "));
    });

    it("is still one sentence to a screen reader: the spaces stay as text", async () => {
      await renderServer(<HomeHero />);
      expect(screen.getByRole("heading", { level: 1, name: TITLE })).toBeInTheDocument();
      expect(document.querySelector("h1")?.textContent).toBe(TITLE);
    });

    it("stays inside the counts the stylesheet gives a delay", async () => {
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

    it("is the limit the Studio enforces, so an editor cannot outrun the stylesheet", () => {
      const scss = readFileSync(join(__dirname, "../HomeHero.module.scss"), "utf8");
      expect(HERO_TITLE_WORDS).toBe(Number(scss.match(/\$hero-title-words:\s*(\d+)/)?.[1]));
      expect(HERO_LEDE_WORDS).toBe(Number(scss.match(/\$hero-lede-words:\s*(\d+)/)?.[1]));
    });
  });

  it("asks for an email, sent with the site visit button", async () => {
    // 2026-11-14: one field that sends a lead at once, in place of a link to
    // /contact and a WhatsApp button.
    await renderServer(<HomeHero />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toHaveAttribute("type", "email");
    const button = screen.getByRole("button", { name: HOME_PAGE.hero.visitCta });
    expect(button).toHaveAttribute("type", "submit");
    expect(field.closest("form")).toBe(button.closest("form"));
  });

  it("offers no WhatsApp button and no link away from the hero's own field", async () => {
    // WhatsApp stays in the contact bar and the footer (2026-11-14).
    const { container } = await renderServer(<HomeHero />);
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
    const copy = container.querySelector("section[data-hero] > div")!;
    expect(within(copy as HTMLElement).queryAllByRole("link")).toEqual([]);
  });

  it("draws the glass first, behind everything, from the small ground picture", async () => {
    const { container } = await renderServer(<HomeHero />);
    const hero = container.querySelector("section[data-hero]")!;
    const canvas = hero.firstElementChild!;
    expect(canvas.tagName).toBe("CANVAS");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-src", GROUND);
  });

  describe("the strip", () => {
    it("renders the list twice, for a seamless loop", async () => {
      await renderServer(<HomeHero />);
      expect(lists()).toHaveLength(2);
      for (const list of lists()) {
        expect(list.querySelectorAll("li")).toHaveLength(HERO_CAROUSEL_ITEMS.length);
      }
    });

    it("hides the second copy from AT and from the tab order", async () => {
      await renderServer(<HomeHero />);
      const [, copy] = lists();
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy).toHaveAttribute("data-copy");
      const links = Array.from(copy!.querySelectorAll("a"));
      expect(links).toHaveLength(HERO_CAROUSEL_ITEMS.length);
      for (const link of links) expect(link).toHaveAttribute("tabindex", "-1");
    });

    it("leaves the second copy able to take the pointer: inert took its hover and links", async () => {
      await renderServer(<HomeHero />);
      const [, copy] = lists();
      expect(copy).not.toHaveAttribute("inert");
    });

    it("leaves the first copy's links in the tab order", async () => {
      await renderServer(<HomeHero />);
      const [first] = lists();
      for (const link of Array.from(first!.querySelectorAll("a"))) {
        expect(link).not.toHaveAttribute("tabindex");
      }
    });

    it("names the first copy as a list", async () => {
      await renderServer(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      expect(within(list).getAllByRole("listitem")).toHaveLength(HERO_CAROUSEL_ITEMS.length);
    });

    it("reads each card once: its image, title, line and link", async () => {
      await renderServer(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      for (const item of HERO_CAROUSEL_ITEMS) {
        expect(screen.getAllByRole("img", { name: item.image.alt })).toHaveLength(1);
        expect(within(list).getAllByText(item.title, { selector: "p" })).toHaveLength(1);
        expect(within(list).getAllByText(item.line)).toHaveLength(1);
        const link = screen.getByRole("link", { name: item.cta });
        expect(link).toHaveAttribute("href", "/solutions");
      }
    });

    it("keeps the cards in content order", async () => {
      await renderServer(<HomeHero />);
      const list = screen.getByRole("list", { name: "What we install" });
      const titles = within(list)
        .getAllByRole("listitem")
        .map((li) => li.querySelector("p")?.textContent);
      expect(titles).toEqual(HERO_CAROUSEL_ITEMS.map((item) => item.title));
    });

    it("exposes each card link once to AT, though the DOM holds two copies", async () => {
      await renderServer(<HomeHero />);
      for (const { cta } of HERO_CAROUSEL_ITEMS) {
        expect(screen.getAllByRole("link", { name: cta })).toHaveLength(1);
      }
    });

    describe("the lead cards, which the rail runs past on its way in", () => {
      it("are the last cards of the list, the ones that come before the first in the loop", async () => {
        await renderServer(<HomeHero />);
        const titles = Array.from(lead().querySelectorAll("li")).map(
          (li) => li.querySelector("p")?.textContent,
        );
        expect(titles).toEqual(HERO_CAROUSEL_ITEMS.slice(-LEAD_CARDS).map((item) => item.title));
      });

      it("are hidden from AT and the tab order, and go when the second copy does", async () => {
        await renderServer(<HomeHero />);
        expect(lead()).toHaveAttribute("aria-hidden", "true");
        expect(lead()).toHaveAttribute("inert");
        expect(lead()).toHaveAttribute("data-copy");
      });

      it("match the distance in the stylesheet: two cards of the track's sixteen", async () => {
        const scss = readFileSync(join(__dirname, "../HomeHero.module.scss"), "utf8");
        const share = (100 * LEAD_CARDS) / (2 * HERO_CAROUSEL_ITEMS.length);
        expect(scss).toContain(`translate: calc(100vw + ${share}%) 0`);
      });
    });

    it("has its pause button above it, outside the moving track, and no arrows", async () => {
      await renderServer(<HomeHero />);
      const pause = screen.getByRole("button", { name: "Pause the images" });
      expect(strip()).not.toContainElement(pause);
      expect(
        pause.compareDocumentPosition(strip()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Previous image|Next image/ })).toBeNull();
    });

    // Lazy cards stayed blank once the GPU carried them on screen (2026-10-28).
    it("loads no card lazily, the copy included", async () => {
      const markup = await renderMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs).toHaveLength(HERO_CAROUSEL_ITEMS.length * 2 + LEAD_CARDS);
      expect(imgs.some((img) => /loading="lazy"/.test(img))).toBe(false);
    });

    it("fetches the cards past the fourth, and the copy, behind the rest", async () => {
      const markup = await renderMarkup(<HomeHero />);
      const imgs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map((m) => m[0]);
      expect(imgs.slice(1, 4).some((img) => /fetchPriority|fetchpriority/i.test(img))).toBe(false);
      expect(imgs.slice(4).every((img) => /fetchpriority="low"/i.test(img))).toBe(true);
    });

    it("the copy asks for exactly the first copy's files, so it costs nothing more", async () => {
      const markup = await renderMarkup(<HomeHero />);
      const srcs = [...markup.matchAll(/<img[^>]*hero_carousel[^>]*>/g)].map(
        (m) => m[0].match(/srcSet="([^"]*)"/i)?.[1],
      );
      const half = HERO_CAROUSEL_ITEMS.length;
      expect(srcs.slice(half, half * 2)).toEqual(srcs.slice(0, half));
      expect(srcs.slice(half * 2)).toEqual(srcs.slice(half - LEAD_CARDS, half));
    });

    it("fetches the first card at high priority, since it is the largest paint", async () => {
      const markup = await renderMarkup(<HomeHero />);
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

    it("reserves every image's box with its width and height", async () => {
      const markup = await renderMarkup(<HomeHero />);
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

    it("states the four proofs, in order, in the approved words", async () => {
      await renderServer(<HomeHero />);
      expect(PROJECTS).toBe("180+ Dubai projects");
      expect(lines()).toEqual([
        "4.8 on Google reviews",
        "180+ Dubai projects",
        "SIRA Licence",
        "by Maple Technologies",
      ]);
    });

    it("marks only the rating, with its star, hidden from AT", async () => {
      await renderServer(<HomeHero />);
      const marks = Array.from(proof().querySelectorAll("li > span"));
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveAttribute("aria-hidden", "true");
      expect(marks[0]?.textContent).toBe("");
      expect(proof().firstElementChild).toContainElement(marks[0] as HTMLElement);
      expect(await renderMarkup(<HomeHero />)).not.toMatch(/Logo|mapletech/i);
    });

    it("types no vertical bar: the rules between them are drawn", async () => {
      await renderServer(<HomeHero />);
      expect(proof().textContent).not.toContain("|");
    });

    it("names one SIRA licence, not several", async () => {
      await renderServer(<HomeHero />);
      expect(document.body.textContent).not.toMatch(/Licences/);
    });

    it("no longer names Smarthaus in the Maple line", async () => {
      await renderServer(<HomeHero />);
      expect(proof().textContent).not.toMatch(/Smarthaus/);
    });

    it("comes after the email field in reading order, then the marks, then the strip", async () => {
      await renderServer(<HomeHero />);
      const form = screen.getByRole("textbox", { name: "Email" }).closest("form")!;
      const marks = document.querySelector("[data-hero-brands]")!;
      const following = (a: Node, b: Node) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(following(form, proof())).toBe(true);
      expect(following(proof(), marks)).toBe(true);
      expect(following(marks, strip())).toBe(true);
    });

    it("shows no faces any more", async () => {
      const markup = await renderMarkup(<HomeHero />);
      expect(markup).not.toMatch(/hero(?:\/|%2F)s[1-5]\.png/);
    });

    it("leaves nothing after the strip", async () => {
      await renderServer(<HomeHero />);
      const hero = document.querySelector("section[data-hero]") as HTMLElement;
      expect(hero.lastElementChild).toBe(strip());
    });
  });

  it("contains no em dash", async () => {
    expect(await renderMarkup(<HomeHero />)).not.toContain("—");
  });
});

describe("HomeHero, the makers' marks", () => {
  const rail = () => document.querySelector("[data-hero-brands]") as HTMLElement;
  const runs = () => Array.from(rail().querySelectorAll(".brandList"));

  it("lays the list end to end, enough times for the loop to have no seam", async () => {
    await renderServer(<HomeHero />);
    expect(runs()).toHaveLength(BRAND_RUNS);
    for (const run of runs()) expect(run.querySelectorAll("img")).toHaveLength(BRANDS.length);
  });

  it("makes only the first run a list; the copies are bare images, for the element budget", async () => {
    await renderServer(<HomeHero />);
    const [first, ...copies] = runs();
    expect(first!.tagName).toBe("UL");
    for (const copy of copies) {
      expect(copy.tagName).toBe("DIV");
      expect(copy.querySelectorAll("li")).toHaveLength(0);
    }
  });

  it("names the first run as a list, and reads each maker once", async () => {
    await renderServer(<HomeHero />);
    const list = screen.getByRole("list", { name: BRANDS_LABEL });
    expect(
      within(list)
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt")),
    ).toEqual(BRANDS.map((b) => b.name));
    for (const brand of BRANDS)
      expect(screen.getAllByRole("img", { name: brand.name })).toHaveLength(1);
  });

  it("hides every other run from AT, with no words on its marks", async () => {
    await renderServer(<HomeHero />);
    const [, ...copies] = runs();
    for (const copy of copies) {
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy).toHaveAttribute("data-copy", "");
      for (const img of copy.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
    }
  });

  it("reserves every mark's box at its own size", async () => {
    await renderServer(<HomeHero />);
    const [first] = runs();
    Array.from(first!.querySelectorAll("img")).forEach((img, i) => {
      expect(img).toHaveAttribute("src", `/hero/brands/${BRANDS[i]!.logo}`);
      expect(img).toHaveAttribute("width", String(BRANDS[i]!.width));
      expect(img).toHaveAttribute("height", String(BRANDS[i]!.height));
    });
  });

  it("sits between the proofs and the pause button, outside the strip", async () => {
    await renderServer(<HomeHero />);
    expect(strip().contains(rail())).toBe(false);
    const pause = screen.getByRole("button", { name: "Pause the images" });
    expect(rail().compareDocumentPosition(pause) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts no link and nothing focusable in the rail", async () => {
    await renderServer(<HomeHero />);
    expect(rail().querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
  });
});
