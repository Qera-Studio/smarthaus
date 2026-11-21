import { screen } from "@testing-library/react";

import { SITE_SETTINGS } from "../../../sanity/seed/site-settings";
import { SOLUTION_PAGES } from "../../../sanity/seed/solutions";
import { stubBrowser } from "../../__tests__/helpers/browser";
import { renderMarkup, renderServer } from "../../__tests__/helpers/server";
import { INDEXABLE_ROBOTS, NOINDEX_ROBOTS } from "../../lib/metadata";
import { getDoc } from "../../sanity/fetch";
import { SOLUTION_SLUGS } from "../../sanity/content";
import SolutionRoute, { generateMetadata, generateStaticParams } from "../solutions/[slug]/page";

/**
 * /solutions/<id>: one page per solution with a document (2026-11-15), all
 * eight in the menu since that afternoon. What
 * is tested is the route's own part: one page per solution with a document
 * and a 404 for the rest, metadata from the document, the picture taken from
 * the Solutions menu, and structured data only for a page in search.
 */

// The "Works with" ring asks for matchMedia and IntersectionObserver on mount.
beforeEach(() => {
  stubBrowser();
});

// The enquiry form imports the server action, which imports Resend, which
// wants a TextEncoder jsdom does not have. The action is not under test here.
jest.mock("../contact/actions", () => ({
  submitEnquiry: jest.fn(),
  submitShortEnquiry: jest.fn(),
  submitHeroLead: jest.fn(),
}));

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const CAMERAS = SOLUTION_PAGES.cameras!;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const jsonLd = (html: string) =>
  Array.from(html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g), (m) =>
    JSON.parse(m[1]!),
  ) as { "@graph": Record<string, unknown>[] }[];

/** The seed, with one document swapped for the duration of a test. */
function withDoc(id: string, value: unknown) {
  const actual = jest.requireActual<typeof import("../../../sanity/seed")>("../../../sanity/seed");
  mockedGetDoc.mockImplementation(
    async (wanted: string) => (wanted === id ? value : actual.seedDoc(wanted)) as never,
  );
}

afterEach(() => {
  const actual = jest.requireActual<typeof import("../../../sanity/seed")>("../../../sanity/seed");
  mockedGetDoc.mockImplementation(async (id: string) => actual.seedDoc(id) as never);
});

describe("/solutions/[slug]", () => {
  it("is built for every solution with a document, and only those", () => {
    expect(generateStaticParams()).toEqual(SOLUTION_SLUGS.map((slug) => ({ slug })));
    expect(SOLUTION_SLUGS).toEqual(Object.keys(SOLUTION_PAGES));
  });

  // Shivanshu, 2026-11-15: every solution in the menu has a page.
  it("is every solution in the menu", () => {
    expect(SOLUTION_SLUGS).toEqual(SITE_SETTINGS.solutionsMenu.items.map((item) => item.id));
  });

  it.each(Object.entries(SOLUTION_PAGES))(
    "takes %s's title, description and address from its own document",
    async (slug, page) => {
      const meta = await generateMetadata(params(slug));
      expect(meta.title).toBe(page.seo.title);
      expect(meta.description).toBe(page.seo.description);
      expect(meta.alternates).toEqual({ canonical: `/solutions/${slug}` });
      expect(meta.robots).toEqual(INDEXABLE_ROBOTS);
    },
  );

  it.each(Object.entries(SOLUTION_PAGES))(
    "renders %s under one h1, its title, on its own menu picture",
    async (slug, page) => {
      const { container } = await renderServer(await SolutionRoute(params(slug)));
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(page.title);
      const item = SITE_SETTINGS.solutionsMenu.items.find((entry) => entry.id === slug)!;
      const picture = container.querySelector(`[data-solution-picture="${slug}"] img`)!;
      expect(decodeURIComponent(picture.getAttribute("src")!)).toContain(item.image.src);
    },
  );

  it("takes its title and description from the document", async () => {
    const meta = await generateMetadata(params("cameras"));
    expect(meta.title).toBe(CAMERAS.seo.title);
    expect(meta.description).toBe(CAMERAS.seo.description);
  });

  it("names itself as canonical and og:url", async () => {
    const meta = await generateMetadata(params("cameras"));
    expect(meta.alternates).toEqual({ canonical: "/solutions/cameras" });
    expect(meta.openGraph).toMatchObject({ url: "/solutions/cameras" });
  });

  it("is in search while its switch is on", async () => {
    expect(CAMERAS.seo.index).toBe(true);
    expect((await generateMetadata(params("cameras"))).robots).toEqual(INDEXABLE_ROBOTS);
  });

  it("leaves search once the switch is off", async () => {
    withDoc("solution-cameras", { ...CAMERAS, seo: { ...CAMERAS.seo, index: false } });
    expect((await generateMetadata(params("cameras"))).robots).toEqual(NOINDEX_ROBOTS);
  });

  it("gives no metadata for a solution with no page", async () => {
    expect(await generateMetadata(params("sauna"))).toEqual({});
    expect(await generateMetadata(params("no-such-solution"))).toEqual({});
  });

  it("answers a solution with no page with a 404", async () => {
    await expect(SolutionRoute(params("sauna"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("answers an address that is no solution's with a 404, without asking Sanity", async () => {
    mockedGetDoc.mockClear();
    await expect(SolutionRoute(params("no-such-solution"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(mockedGetDoc).not.toHaveBeenCalled();
  });

  it("renders the solution under one h1, its title", async () => {
    await renderServer(await SolutionRoute(params("cameras")));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(CAMERAS.title);
  });

  it("draws the menu item's picture, the one the menu grows into it", async () => {
    const { container } = await renderServer(await SolutionRoute(params("cameras")));
    const item = SITE_SETTINGS.solutionsMenu.items.find((entry) => entry.id === "cameras")!;
    const picture = container.querySelector('[data-solution-picture="cameras"] img')!;
    expect(decodeURIComponent(picture.getAttribute("src")!)).toContain(item.image.src);
  });

  it("fails the build when its item has gone from the menu", async () => {
    withDoc("siteSettings", {
      ...SITE_SETTINGS,
      solutionsMenu: {
        ...SITE_SETTINGS.solutionsMenu,
        items: SITE_SETTINGS.solutionsMenu.items.filter((entry) => entry.id !== "cameras"),
      },
    });
    await expect(renderMarkup(await SolutionRoute(params("cameras")))).rejects.toThrow(
      /Solution page "cameras": no item with that id/,
    );
  });

  it("gives a page not in search no structured data to be quoted from", async () => {
    withDoc("solution-cameras", { ...CAMERAS, seo: { ...CAMERAS.seo, index: false } });
    const html = await renderMarkup(await SolutionRoute(params("cameras")));
    expect(jsonLd(html)).toEqual([]);
    expect(html.replaceAll("&amp;", "&")).toContain(CAMERAS.title);
  });

  it("describes a page in search as a page of the site, with a breadcrumb", async () => {
    const [graph] = jsonLd(await renderMarkup(await SolutionRoute(params("cameras"))));
    expect(graph!["@graph"].map((node) => node["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    expect(graph!["@graph"][0]).toMatchObject({
      url: "https://smarthaus.ae/solutions/cameras",
    });
  });
});
