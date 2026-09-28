import { LAST_MODIFIED } from "../../content/last-modified";
import { EMAIL, PHONE_E164 } from "../../lib/contact";
import { fullTitle, SITE_NAME, type PageMetadataInput } from "../../lib/metadata";

/**
 * The structured data, as plain objects so it is testable without rendering.
 * SEO System §9. Every value is a confirmed fact already published on the
 * site: the address, phone and email from src/lib/contact.ts, the licence
 * numbers from the legal identity tables. Left out on purpose, because schema
 * must match what the page shows: sameAs (the social profiles are
 * placeholders), geo and openingHours (blocked on Sunil), a SearchAction (the
 * site has no search), and any rating or price.
 */

/** The canonical host. @id values are built on it so they persist across deploys. */
export const SITE_URL = "https://smarthaus.ae";

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** The street part of the registered address: everything before the city. */
export const STREET_ADDRESS = "The Iridium, 2nd Floor, Office 225, Umm Suqeim St, Al Barsha First";

const pageUrl = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);

/**
 * The business and the site, rendered once in the layout. LocalBusiness is an
 * Organization, so one node serves both, under one persistent @id (§9: no
 * duplicate types, a consistent Organization @id).
 */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": ORG_ID,
        name: SITE_NAME,
        legalName: "Maple Technologies Security Systems LLC",
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        image: `${SITE_URL}/og-image.png`,
        telephone: PHONE_E164,
        email: EMAIL,
        address: {
          "@type": "PostalAddress",
          streetAddress: STREET_ADDRESS,
          addressLocality: "Dubai",
          addressRegion: "Dubai",
          addressCountry: "AE",
        },
        areaServed: { "@type": "City", name: "Dubai" },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: PHONE_E164,
          email: EMAIL,
          contactType: "customer service",
          areaServed: "AE",
          availableLanguage: "English",
        },
        // State-issued and checkable: the strongest evidence the business is
        // real and regulated (AGENTS.md, claims audit). Not an endorsement.
        identifier: [
          { "@type": "PropertyValue", propertyID: "Dubai trade licence", value: "897839" },
          { "@type": "PropertyValue", propertyID: "SIRA licence", value: "SSP202210037219" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/** A page's own node and its breadcrumb. Indexable pages only. */
export function pageGraph(input: PageMetadataInput) {
  const url = pageUrl(input.path);
  const dateModified = LAST_MODIFIED[input.path];
  if (!input.index) throw new Error(`pageGraph: ${input.path} is noindex and gets no page schema`);
  if (!dateModified) throw new Error(`pageGraph: ${input.path} has no date in LAST_MODIFIED`);
  const crumbs = [{ name: "Home", url: SITE_URL }];
  if (input.path !== "/") crumbs.push({ name: input.title.split(" | ")[0]!, url });
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: fullTitle(input),
        description: input.description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORG_ID },
        dateModified,
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      },
    ],
  };
}
