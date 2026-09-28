import { renderToStaticMarkup } from "react-dom/server";

import Home from "../page";

/**
 * The homepage rendered to the HTML the server sends. The hero swap of
 * 2026-09-28 is what this pins: the fluid hero is mounted, the villa is not,
 * the page still has exactly one h1, and the other sections are where they were. Rendering the whole tree also runs every server component the
 * page composes, so a section that throws at render fails here, not in CI's
 * production build.
 */

jest.mock("../../components/FluidHero/FluidCanvas", () => ({
  FluidCanvas: () => <canvas data-testid="fluid" aria-hidden="true" />,
}));

// The enquiry form imports the server action, which imports Resend, which
// wants a TextEncoder jsdom does not have. The action is not under test here.
jest.mock("../contact/actions", () => ({
  submitEnquiry: jest.fn(),
  submitShortEnquiry: jest.fn(),
}));

const html = () => renderToStaticMarkup(<Home />);

describe("the homepage", () => {
  test("renders the fluid hero as the first section, with its data-hero hook", () => {
    const markup = html();
    const heroAt = markup.indexOf("data-hero");
    expect(heroAt).toBeGreaterThan(-1);
    // Preload links may precede it; no content does.
    const before = markup.slice(0, markup.lastIndexOf("<section", heroAt));
    expect(before).not.toMatch(/<section|<h[1-6]|<p\b/);
  });

  test("mounts the fluid canvas and not the villa", () => {
    const markup = html();
    expect(markup).toContain('data-testid="fluid"');
    expect(markup).not.toContain("/hero/grid/");
    expect(markup).not.toContain("villa.glb");
    expect(markup).not.toContain("Explore the villa");
  });

  test("has exactly one h1, the hero's", () => {
    const markup = html();
    const h1s = markup.match(/<h1\b/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(markup).toMatch(/<h1[^>]*id="hero-title"[^>]*>Home at your fingertips<\/h1>/);
  });

  test("keeps the hero CTA and its route, and no longer offers Explore Villa", () => {
    const markup = html();
    expect(markup).toMatch(/href="\/contact"[^>]*>Book a site visit</);
    expect(markup).not.toMatch(/Explore Villa/);
  });

  test("still composes every other section in order", () => {
    const markup = html();
    const order = ["data-hero", "data-process"].map((hook) => markup.indexOf(hook));
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("the canvas precedes the copy inside the hero, so it paints underneath", () => {
    const markup = html();
    const canvasAt = markup.indexOf('data-testid="fluid"');
    const titleAt = markup.indexOf('id="hero-title"');
    expect(canvasAt).toBeGreaterThan(-1);
    expect(canvasAt).toBeLessThan(titleAt);
  });

  test("the hero is a labelled section, once", () => {
    const markup = html();
    expect(markup.match(/aria-labelledby="hero-title"/g)).toHaveLength(1);
  });

  test("marks the hero's copy, CTAs and closing paragraph as quiet zones for the glyph layer", () => {
    const markup = html();
    expect(markup.match(/data-hero-quiet/g)).toHaveLength(3);
  });

  test("contains no em dash", () => {
    expect(html()).not.toContain("—");
  });
});
