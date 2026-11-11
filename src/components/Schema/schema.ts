import type { SiteSettings } from "../../sanity/types";
import { fullTitle, SITE_NAME, type PageMetadataInput } from "../../lib/metadata";

/**
 * The structured data, as plain objects so it is testable without rendering.
 * SEO System §9. Every value is a confirmed fact already published on the
 * site: the address, phone, email and licence numbers from the site settings
 * in Sanity, the same document the footer and the legal pages read. Left out on purpose, because schema
 * must match what the page shows: sameAs (the social profiles are
 * placeholders), geo and openingHours (blocked on Sunil), a SearchAction (the
 * site has no search), and any rating or price.
 */

/** The canonical host. @id values are built on it so they persist across deploys. */
export const SITE_URL = "https://smarthaus.ae";

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** The street part of the registered address: every line before the city. */
export function streetAddress(lines: readonly string[]): string {
  return lines.slice(0, -1).join(" ").replace(/,\s*$/, "");
}

const pageUrl = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);

/**
 * The business and the site, rendered once in the layout. LocalBusiness is an
 * Organization, so one node serves both, under one persistent @id (§9: no
 * duplicate types, a consistent Organization @id).
 */
export function siteGraph({ contact, identity }: Pick<SiteSettings, "contact" | "identity">) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": ORG_ID,
        name: SITE_NAME,
        legalName: identity.legalName,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        image: `${SITE_URL}/og-image.png`,
        telephone: contact.phoneE164,
        email: contact.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: streetAddress(contact.addressLines),
          addressLocality: "Dubai",
          addressRegion: "Dubai",
          addressCountry: "AE",
        },
        areaServed: { "@type": "City", name: "Dubai" },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: contact.phoneE164,
          email: contact.email,
          contactType: "customer service",
          areaServed: "AE",
          availableLanguage: "English",
        },
        // State-issued and checkable: the strongest evidence the business is
        // real and regulated (AGENTS.md, claims audit). Not an endorsement.
        identifier: [
          {
            "@type": "PropertyValue",
            propertyID: "Dubai trade licence",
            value: identity.tradeLicence,
          },
          { "@type": "PropertyValue", propertyID: "SIRA licence", value: identity.siraLicence },
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

/**
 * A page's own node and its breadcrumb. Indexable pages only. `dateModified`
 * is the page document's last edit in Sanity, when known.
 */
export function pageGraph(input: PageMetadataInput, dateModified?: string) {
  const url = pageUrl(input.path);
  if (!input.index) throw new Error(`pageGraph: ${input.path} is noindex and gets no page schema`);
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
        ...(dateModified ? { dateModified } : {}),
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
