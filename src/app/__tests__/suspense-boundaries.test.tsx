/**
 * @jest-environment node
 */

/**
 * Every page region is its own Suspense boundary (layout.tsx, page.tsx,
 * contact/page.tsx), so React hydrates them one at a time and yields to the
 * browser between them. That split is the fix for 350-400ms of Total Blocking
 * Time on a mid-range phone (CI Lighthouse, 2026-09-28), and nothing else
 * would notice it being removed: the page looks and behaves the same either
 * way. So this counts the boundaries in the server HTML.
 *
 * renderToString marks each completed boundary as <!--$-->...<!--/$-->. A
 * boundary that fell back on the server would be <!--$!--> or <!--$?-->, which
 * would mean a region missing from the first paint: never allowed here.
 */
import { renderToString } from "react-dom/server";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/** Completed boundaries, and any that fell back or are still pending. */
function boundaries(html: string) {
  return {
    completed: html.match(/<!--\$-->/g)?.length ?? 0,
    fallback: html.match(/<!--\$[!?]-->/g)?.length ?? 0,
    closed: html.match(/<!--\/\$-->/g)?.length ?? 0,
  };
}

/** The boundary's opening marker sits directly before this text's element. */
const opensBefore = (html: string, marker: string) => {
  const at = html.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  return html.lastIndexOf("<!--$-->", at) > html.lastIndexOf("<!--/$-->", at);
};

describe("the homepage", () => {
  let html = "";
  beforeAll(async () => {
    const { default: Home } = await import("../page");
    html = renderToString(<Home />);
  });

  it("is six boundaries, one per section, none fallen back", () => {
    expect(boundaries(html)).toEqual({ completed: 6, fallback: 0, closed: 6 });
  });

  it.each([
    ["the hero", "data-hero"],
    ["hardware", 'id="hardware"'],
    ["the process rail", "data-process"],
    ["the enquiry", 'aria-labelledby="home-enquiry"'],
  ])("puts %s inside a boundary", (_, marker) => {
    expect(opensBefore(html, marker)).toBe(true);
  });

  it("keeps the page's structured data outside every boundary, first", () => {
    expect(html.indexOf("application/ld+json")).toBeLessThan(html.indexOf("<!--$-->"));
  });

  it("adds no element: the process rail's section still follows the one before it directly", () => {
    // main > :has(+ .process) holds the previous section still during the
    // zoom (Process.module.scss). Boundaries are comments, not elements, so
    // the sibling relationship the selector needs survives them.
    const process = html.indexOf("data-process");
    const openTag = html.lastIndexOf("<section", process);
    const between = html.slice(html.lastIndexOf("</section>", openTag), openTag);
    expect(between.replace(/<!--\/?\$-->/g, "").trim()).toBe("</section>");
  });
});

describe("the contact page", () => {
  let html = "";
  beforeAll(async () => {
    const { default: ContactPage } = await import("../contact/page");
    html = renderToString(<ContactPage />);
  });

  it("is four boundaries, one per section, none fallen back", () => {
    expect(boundaries(html)).toEqual({ completed: 4, fallback: 0, closed: 4 });
  });

  it.each(["book-a-visit", "get-in-touch", "location", "faqs"])(
    "puts the %s section inside a boundary",
    (id) => {
      expect(opensBefore(html, `aria-labelledby="${id}"`)).toBe(true);
    },
  );

  it("keeps the h1 outside them, so the heading is never deferred", () => {
    expect(opensBefore(html, "<h1")).toBe(false);
  });
});

describe("the root layout", () => {
  const env = process.env;
  let html = "";
  beforeAll(async () => {
    jest.resetModules();
    process.env = { ...env, NODE_ENV: "production" };
    const { renderToString: render } = await import("react-dom/server");
    const { default: RootLayout } = await import("../layout");
    html = render(
      <RootLayout params={Promise.resolve({})}>
        <p>page</p>
      </RootLayout>,
    );
  });
  afterAll(() => {
    process.env = env;
  });

  it("wraps nav, page, footer, back-to-top and consent, and none falls back", () => {
    const { completed, fallback } = boundaries(html);
    expect(completed).toBeGreaterThanOrEqual(5);
    expect(fallback).toBe(0);
  });

  it("keeps the skip link outside every boundary, as the first thing in <body>", () => {
    expect(opensBefore(html, "Skip to main content")).toBe(false);
  });

  it("puts the page inside <main> and inside a boundary", () => {
    expect(opensBefore(html, "<p>page</p>")).toBe(true);
    const main = html.indexOf('<main id="main-content">');
    expect(html.indexOf("<!--$-->", main)).toBeLessThan(html.indexOf("<p>page</p>"));
  });

  it("puts the consent banner inside a boundary of its own", () => {
    expect(opensBefore(html, 'aria-label="Cookie preferences"')).toBe(true);
  });
});
