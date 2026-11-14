import Home from "../page";
import { renderMarkup } from "../../__tests__/helpers/server";

/**
 * The homepage rendered to the HTML the server sends. The hero swap of
 * 2026-10-28 is what this pins: HomeHero is mounted, the fluid hero and the
 * villa are not, the page still has exactly one h1, and the other sections are
 * where they were. Rendering the whole tree also runs every server component the
 * page composes, so a section that throws at render fails here, not in CI's
 * production build.
 */

// The enquiry form imports the server action, which imports Resend, which
// wants a TextEncoder jsdom does not have. The action is not under test here.
jest.mock("../contact/actions", () => ({
  submitEnquiry: jest.fn(),
  submitShortEnquiry: jest.fn(),
  submitHeroLead: jest.fn(),
}));

const html = () => renderMarkup(<Home />);

// ScrollReveal reads these, which jsdom does not have; its own tests cover it.
beforeAll(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
});

describe("the homepage", () => {
  test("renders the hero as the first section, with its data-hero hook", async () => {
    const markup = await html();
    const heroAt = markup.indexOf("data-hero");
    expect(heroAt).toBeGreaterThan(-1);
    // Preload links may precede it; no content does.
    const before = markup.slice(0, markup.lastIndexOf("<section", heroAt));
    expect(before).not.toMatch(/<section|<h[1-6]|<p\b/);
  });

  test("mounts HomeHero, not the fluid canvas or the villa", async () => {
    const markup = await html();
    expect(markup).toContain("data-hero-strip");
    // One canvas since 2026-11-14: the hero's glass, hidden from AT. Not the
    // fluid hero's, which marked the copy data-hero-quiet.
    expect(markup.match(/<canvas\b[^>]*>/g)).toEqual([
      expect.stringMatching(
        /class="glass"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="glass"/,
      ),
    ]);
    expect(markup).not.toContain("data-hero-quiet");
    expect(markup).not.toContain("/hero/grid/");
    expect(markup).not.toContain("villa.glb");
    expect(markup).not.toContain("Explore the villa");
  });

  test("has exactly one h1, the hero's", async () => {
    const markup = await html();
    const h1s = markup.match(/<h1\b/g) ?? [];
    expect(h1s).toHaveLength(1);
    // One span to a word, for the opening.
    const title = markup.match(/<h1[^>]*id="hero-title"[^>]*>(.*?)<\/h1>/)?.[1];
    expect(title?.replace(/<[^>]+>/g, "")).toBe("Home at your fingertips");
  });

  test("asks for an email in the hero, sent with the site visit button", async () => {
    // 2026-11-14: the hero's link to /contact became one field that sends a
    // lead at once (HeroLead).
    const markup = await html();
    expect(markup).toMatch(/<input[^>]*id="hero-email"[^>]*type="email"/);
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*>Book a site visit<\/button>/);
    expect(markup).not.toMatch(/Explore Villa/);
  });

  test("still composes every other section in order", async () => {
    const markup = await html();
    // data-process="", the section itself: the stack around it and the held
    // hardware (data-process-stack) come first.
    const order = ["data-hero", "data-stats", 'aria-labelledby="hardware', 'data-process=""'].map(
      (hook) => markup.indexOf(hook),
    );
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("the hero is a labelled section, once", async () => {
    const markup = await html();
    expect(markup.match(/aria-labelledby="hero-title"/g)).toHaveLength(1);
  });

  test("contains no em dash", async () => {
    expect(await html()).not.toContain("—");
  });
});

describe("the makers' marks, where the partner cards were", () => {
  // The partner cards were unmounted on 2026-11-14 at Shivanshu's call; TIS
  // and Fibaro are in the hero's rail with the other makers.
  test("leave the partner cards off the page", async () => {
    const markup = await html();
    expect(markup).not.toContain("data-partners");
    expect(markup).not.toContain('aria-labelledby="partners"');
  });

  test("leave the Maple banner off the page", async () => {
    expect(await html()).not.toContain("A brand by Maple Technologies");
  });

  test("name TIS and Fibaro in the hero's rail, once each for a screen reader", async () => {
    const markup = await html();
    for (const [name, file] of [
      ["TIS", "tis.png"],
      ["Fibaro", "fibaro.png"],
    ] as const) {
      const named = markup.match(new RegExp(`<img[^>]*alt="${name}"[^>]*>`, "g")) ?? [];
      expect(named).toHaveLength(1);
      expect(named[0]).toContain(`src="/hero/brands/${file}"`);
    }
  });

  test("reserve every mark's box with its width and height, so nothing shifts", async () => {
    const markup = await html();
    const rail = markup.slice(
      markup.indexOf("data-hero-brands"),
      markup.indexOf("data-hero-strip"),
    );
    const marks = rail.match(/<img[^>]*>/g) ?? [];
    expect(marks.length).toBeGreaterThan(0);
    for (const img of marks) {
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
    }
  });
});
