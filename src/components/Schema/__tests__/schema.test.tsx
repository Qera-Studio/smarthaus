import { existsSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { JsonLd, serializeJsonLd } from "../JsonLd";
import { pageGraph, siteGraph, SITE_URL, streetAddress } from "../schema";
import { SITE_SETTINGS } from "../../../../sanity/seed/site-settings";

const { email: EMAIL, phoneE164: PHONE_E164 } = SITE_SETTINGS.contact;
const ADDRESS = SITE_SETTINGS.contact.addressLines.join(" ");
const STREET_ADDRESS = streetAddress(SITE_SETTINGS.contact.addressLines);
const EDITED = "2026-11-11T09:00:00Z";

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
  const graph = siteGraph(SITE_SETTINGS);
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

  it("takes the street from every address line but the city, without its trailing comma", () => {
    expect(STREET_ADDRESS).toBe(
      "The Iridium, 2nd Floor, Office 225, Umm Suqeim St, Al Barsha First",
    );
    expect(streetAddress(["One St,", "Dubai"])).toBe("One St");
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

  it("lists only the live profiles as sameAs, never WhatsApp or a placeholder", () => {
    // Instagram, Facebook and LinkedIn are live (2026-11-20); X is still a
    // placeholder, and WhatsApp is a chat link, not a profile.
    expect(business).toHaveProperty("sameAs", [
      "https://www.instagram.com/smarthaus.dxb/",
      "https://www.facebook.com/profile.php?id=61596663210810",
      "https://www.linkedin.com/company/smarthaus-smart-home-automation",
    ]);
  });

  it("gives the opening hours the footer shows, from the same field", () => {
    expect(business).toHaveProperty("openingHoursSpecification", {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    });
  });

  it("leaves out sameAs while no profile is live", () => {
    const socials = SITE_SETTINGS.socials.map((s) =>
      s.id === "whatsapp" ? s : { ...s, pending: true },
    );
    const node = byType(siteGraph({ ...SITE_SETTINGS, socials }), "LocalBusiness");
    expect(node).not.toHaveProperty("sameAs");
  });

  // openingHours, the string form, is left out because the specification
  // above says the same thing in the structured form.
  it.each(["geo", "openingHours", "aggregateRating", "priceRange"])(
    "leaves out %s, which the site cannot yet back with a visible fact",
    (key) => {
      expect(business).not.toHaveProperty(key);
    },
  );

  it("has no SearchAction, because the site has no search", () => {
    expect(website).not.toHaveProperty("potentialAction");
  });
});

describe("pageGraph", () => {
  it("names the page, its URL and when its document was last edited, as the sitemap does", () => {
    const page = byType(pageGraph(contact, EDITED), "WebPage");
    expect(page).toMatchObject({
      "@id": `${SITE_URL}/contact#webpage`,
      url: `${SITE_URL}/contact`,
      name: contact.title,
      description: contact.description,
      dateModified: EDITED,
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

  it("leaves dateModified out when the edit date is unknown, rather than inventing one", () => {
    expect(byType(pageGraph(contact), "WebPage")).not.toHaveProperty("dateModified");
  });

  it("keeps the site and page blocks together under 4KB, SEO System §9", () => {
    const bytes =
      serializeJsonLd(siteGraph(SITE_SETTINGS)).length +
      serializeJsonLd(pageGraph(contact, EDITED)).length;
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
