/**
 * @jest-environment node
 */

/**
 * The villa hero as the server renders it, stage included. Hero.test.tsx
 * stubs HeroStage; this renders the real one, because the villa hero is not
 * mounted anywhere since the fluid hero took the homepage (2026-09-28) and
 * nothing else runs it. The poster assertions were
 * src/app/__tests__/server-render.test.tsx's while the villa was the homepage.
 */
import { renderToStaticMarkup } from "react-dom/server";

import { Hero } from "../Hero";
import { POSTER_SIZE } from "../frames";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const html = () => renderToStaticMarkup(<Hero />);

describe("the villa hero's server HTML, unmounted", () => {
  it("still renders one h1 and its two CTAs", () => {
    const markup = html();
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    expect(markup).toMatch(/href="\/contact"[^>]*>Book a site visit</);
    expect(markup).toMatch(/Explore Villa/);
  });

  it("keeps the poster as its LCP element, at its intrinsic size", () => {
    const markup = html();
    expect(markup).toContain('src="/hero/grid/r4_c4.webp"');
    expect(markup).toContain(`width="${POSTER_SIZE.width}"`);
    expect(markup).toContain(`height="${POSTER_SIZE.height}"`);
    expect(markup).toMatch(/fetchpriority="high"/i);
  });

  it("preloads the poster from the head at high priority, once", () => {
    const links = html().match(/<link rel="preload"[^>]*\/hero\/grid\/r4_c4\.webp[^>]*>/g) ?? [];
    expect(links).toHaveLength(1);
    expect(links[0]).toMatch(/as="image"/);
    expect(links[0]).toMatch(/fetchpriority="high"/i);
  });

  it("sends no canvas in the server HTML: the villa is a client island", () => {
    // VillaCanvas is dynamically imported; the server sends only the poster
    // and the copy, so a device the gates keep on the poster loads nothing.
    expect(html()).not.toMatch(/<canvas/);
  });

  it("names the parent company in the byline, without an invented heritage", () => {
    const markup = html();
    expect(markup).toContain("Smarthaus by Maple Technologies.");
    expect(markup).not.toMatch(/\b(19|20)\d\d\b|TIS|Fibaro/);
  });
});
