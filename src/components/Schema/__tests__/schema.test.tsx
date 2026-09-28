import { existsSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { JsonLd, serializeJsonLd } from "../JsonLd";
import { pageGraph, siteGraph, SITE_URL, STREET_ADDRESS } from "../schema";
import { ADDRESS, EMAIL, PHONE_E164 } from "../../../lib/contact";
import { LAST_MODIFIED } from "../../../content/last-modified";

type Node = Record<string, unknown>;
const nodes = (graph: { "@graph": Node[] }) => graph["@graph"];
const byType = (graph: { "@graph": Node[] }, type: string) =>
  nodes(graph).find((node) => node["@type"] === type)!;
const publicFile = (url: string) => join(__dirname, "../../../../public", new URL(url).pathname);

const contact = {
  path: "/contact",
  title: "Book a site visit in Dubai | Smarthaus",
  absolute: true,
  description: "x".repeat(140),
  index: true,
};

describe("siteGraph", () => {
  const graph = siteGraph();
  const business = byType(graph, "LocalBusiness");
  const website = byType(graph, "WebSite");

  it("is one business node and one website, not duplicate Organization types", () => {
    expect(graph["@context"]).toBe("https://schema.org");
    expect(nodes(graph).map((node) => node["@type"])).toEqual(["LocalBusiness", "WebSite"]);
  });

  it("gives both persistent @ids on the canonical host, and links them", () => {
    expect(business["@id"]).toBe(`${SITE_URL}/#organization`);
    expect(website["@id"]).toBe(`${SITE_URL}/#website`);
    expect(website.publisher).toEqual({ "@id": business["@id"] });
  });

  it("publishes the same phone, email and address the site prints", () => {
    expect(business.telephone).toBe(PHONE_E164);
    expect(business.email).toBe(EMAIL);
    expect(ADDRESS).toContain(STREET_ADDRESS);
    expect(business.address).toMatchObject({
      streetAddress: STREET_ADDRESS,
      addressLocality: "Dubai",
      addressCountry: "AE",
    });
    expect(business.contactPoint).toMatchObject({ telephone: PHONE_E164, email: EMAIL });
  });

  it("names the legal entity and both licences the legal pages publish", () => {
    expect(business.legalName).toBe("Maple Technologies Security Systems LLC");
    expect(business.identifier).toEqual([
      { "@type": "PropertyValue", propertyID: "Dubai trade licence", value: "897839" },
      { "@type": "PropertyValue", propertyID: "SIRA licence", value: "SSP202210037219" },
    ]);
  });

  it("points logo and image at files that exist", () => {
    for (const url of [business.logo, business.image] as string[]) {
      expect(url.startsWith(SITE_URL)).toBe(true);
      expect(existsSync(publicFile(url))).toBe(true);
    }
  });

  it.each([
    "sameAs",
    "geo",
    "openingHours",
    "openingHoursSpecification",
    "aggregateRating",
    "priceRange",
  ])("leaves out %s, which the site cannot yet back with a visible fact", (key) => {
    expect(business).not.toHaveProperty(key);
  });

  it("has no SearchAction, because the site has no search", () => {
    expect(website).not.toHaveProperty("potentialAction");
  });
});

describe("pageGraph", () => {
  it("names the page, its URL and when it last changed, from the same table as the sitemap", () => {
    const page = byType(pageGraph(contact), "WebPage");
    expect(page).toMatchObject({
      "@id": `${SITE_URL}/contact#webpage`,
      url: `${SITE_URL}/contact`,
      name: contact.title,
      description: contact.description,
      dateModified: LAST_MODIFIED["/contact"],
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      breadcrumb: { "@id": `${SITE_URL}/contact#breadcrumb` },
    });
  });

  it("puts an inner page two deep in its breadcrumb, with positions from 1", () => {
    const crumbs = byType(pageGraph(contact), "BreadcrumbList").itemListElement as Node[];
    expect(crumbs).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Book a site visit in Dubai",
        item: `${SITE_URL}/contact`,
      },
    ]);
  });

  it("gives the homepage a one-step breadcrumb at the bare host", () => {
    const home = pageGraph({ ...contact, path: "/", title: "Smarthaus | Home" });
    expect(byType(home, "WebPage").url).toBe(SITE_URL);
    expect((byType(home, "BreadcrumbList").itemListElement as Node[]).length).toBe(1);
  });

  it("uses the template title when the page title is not absolute", () => {
    const page = pageGraph({
      ...contact,
      path: "/accessibility",
      title: "Accessibility statement",
      absolute: false,
    });
    expect(byType(page, "WebPage").name).toBe("Accessibility statement | Smarthaus");
  });

  it("refuses a noindex page: schema on a page that refuses indexing is a contradiction", () => {
    expect(() => pageGraph({ ...contact, index: false })).toThrow("noindex");
  });

  it("refuses a page with no date, rather than inventing one", () => {
    expect(() => pageGraph({ ...contact, path: "/nowhere" })).toThrow("LAST_MODIFIED");
  });

  it("keeps the site and page blocks together under 4KB, SEO System §9", () => {
    const bytes = serializeJsonLd(siteGraph()).length + serializeJsonLd(pageGraph(contact)).length;
    expect(bytes).toBeLessThan(4096);
  });
});

describe("JsonLd", () => {
  it("escapes < so a string can never close the script early, and still parses back", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const out = serializeJsonLd(data);
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual(data);
  });

  it("renders one ld+json script holding the serialised data", () => {
    const { container } = render(<JsonLd data={{ a: 1 }} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.innerHTML)).toEqual({ a: 1 });
  });
});
