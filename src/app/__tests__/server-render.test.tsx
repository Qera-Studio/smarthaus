/**
 * @jest-environment node
 */

/**
 * What the server sends for the pages whose head and structured data Phase 5
 * changed, rendered to static HTML as the server renders them: no effects, no
 * browser. e2e/metadata.spec.ts and e2e/consent-boot.spec.ts check the same
 * things in a real browser; this pins them where a regression shows in seconds.
 */
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

type Node = { "@type": string; url?: string };
type Graph = Partial<Node> & { "@graph"?: Node[] };

/** Every JSON-LD block in a chunk of HTML, parsed. */
function jsonLd(html: string): Graph[] {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as Graph,
  );
}
const nodes = (html: string): Node[] =>
  jsonLd(html).flatMap((block): Node[] => block["@graph"] ?? [block as Node]);

describe("the homepage", () => {
  it("carries its own WebPage node at the bare host, and one h1", async () => {
    const { default: Home } = await import("../page");
    const html = renderToStaticMarkup(<Home />);
    const pages = nodes(html).filter((node) => node["@type"] === "WebPage");
    expect(pages).toEqual([expect.objectContaining({ url: "https://smarthaus.ae" })]);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    // The fluid hero has no poster: the h1 is the LCP element, and it is in
    // the server HTML. The villa poster's own check is in
    // src/components/Hero/__tests__/Hero.test.tsx, where the villa hero lives
    // unmounted.
    expect(html).toMatch(/<h1[^>]*id="hero-title"/);
    expect(html).not.toContain("/hero/grid/");
  });
});

describe("the contact page", () => {
  it("leads with what the visitor came to do, and names itself in its schema", async () => {
    const { default: ContactPage } = await import("../contact/page");
    const html = renderToStaticMarkup(<ContactPage />);
    expect(html).toMatch(/<h1[^>]*>Book a site visit<\/h1>/);
    const page = nodes(html).find((node) => node["@type"] === "WebPage");
    expect(page).toMatchObject({ url: "https://smarthaus.ae/contact" });
    const crumbs = nodes(html).find((node) => node["@type"] === "BreadcrumbList");
    expect(crumbs).toBeDefined();
  });

  it("carries no FAQPage while the assessment fee is unconfirmed", async () => {
    const { default: ContactPage } = await import("../contact/page");
    const html = renderToStaticMarkup(<ContactPage />);
    expect(nodes(html).map((node) => node["@type"])).not.toContain("FAQPage");
  });
});

describe("the root layout", () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
    jest.resetModules();
  });

  async function renderLayout(
    nodeEnv: "development" | "production",
    extra: { VERCEL?: string } = {},
  ) {
    jest.resetModules();
    process.env = { ...env, ...extra, NODE_ENV: nodeEnv };
    // The renderer from the same fresh registry as the layout, or the two hold
    // different copies of React and every hook sees no dispatcher.
    const { renderToStaticMarkup: render } = await import("react-dom/server");
    const { default: RootLayout } = await import("../layout");
    return render(
      <RootLayout params={Promise.resolve({})}>
        <p>page</p>
      </RootLayout>,
    );
  }

  it("runs the consent boot script in <head>, before the body paints", async () => {
    const { CONSENT_BOOT_SCRIPT } = await import("../../lib/consent-boot");
    const html = await renderLayout("production");
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    expect(head).toContain(CONSENT_BOOT_SCRIPT);
    expect(html.indexOf(CONSENT_BOOT_SCRIPT)).toBeLessThan(html.indexOf("<body"));
  });

  it("leaves it out of development, where the banner is forced open", async () => {
    const { CONSENT_BOOT_SCRIPT } = await import("../../lib/consent-boot");
    const html = await renderLayout("development");
    expect(html).not.toContain(CONSENT_BOOT_SCRIPT);
    expect(html).toContain('aria-label="Cookie preferences"');
  });

  it.each(["production", "development"] as const)(
    "runs the splash boot script in <head> in %s, before the body paints",
    async (nodeEnv) => {
      const { SPLASH_BOOT_SCRIPT } = await import("../../lib/splash-boot");
      const html = await renderLayout(nodeEnv);
      const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
      expect(head).toContain(SPLASH_BOOT_SCRIPT);
    },
  );

  it("renders the splash as the first thing in <body>, hidden until the boot script shows it", async () => {
    const html = await renderLayout("production");
    const body = html.slice(html.indexOf("<body"));
    expect(body).toMatch(/^<body[^>]*><div id="splash"[^>]*aria-hidden="true"/);
    // The script string lives in <head> only; the splash renders none of its own.
    expect(body.slice(0, body.indexOf("Skip to main content"))).not.toContain("<script");
  });

  it("mounts Vercel's analytics only on a Vercel build", async () => {
    // Both render nothing on the server, so each is stood in for by a marker.
    // A mock factory outlives the module reset inside renderLayout.
    const stub = (name: string) => () => ({ [name]: () => <i data-vercel={name} /> });
    jest.doMock("@vercel/analytics/next", stub("Analytics"));
    jest.doMock("@vercel/speed-insights/next", stub("SpeedInsights"));
    const on = await renderLayout("production", { VERCEL: "1" });
    expect(on).toContain('data-vercel="Analytics"');
    expect(on).toContain('data-vercel="SpeedInsights"');
    const off = await renderLayout("production");
    expect(off).not.toContain("data-vercel");
  });

  it("puts the cookie banner in the server HTML, where the boot script can gate it", async () => {
    const html = await renderLayout("production");
    expect(html).toContain('aria-label="Cookie preferences"');
  });

  it("describes the business once, after the page, keeping the skip link first", async () => {
    const html = await renderLayout("production");
    const business = nodes(html).filter((node) => node["@type"] === "LocalBusiness");
    expect(business).toHaveLength(1);
    const body = html.slice(html.indexOf("<body"));
    expect(body.indexOf("Skip to main content")).toBeLessThan(body.indexOf("application/ld+json"));
  });
});

describe("FaqSchema", () => {
  it("renders the FAQPage through the shared, escaped JSON-LD block", async () => {
    const { FaqSchema } = await import("../../components/Faq/FaqSchema");
    const html = renderToStaticMarkup(<FaqSchema />);
    const [schema] = jsonLd(html) as { "@type": string; mainEntity: unknown[] }[];
    expect(schema!["@type"]).toBe("FAQPage");
    expect(schema!.mainEntity.length).toBeGreaterThan(0);
    // No raw "<" can reach the script body.
    expect(html.replace(/^<script[^>]*>|<\/script>$/g, "")).not.toContain("<");
  });
});
