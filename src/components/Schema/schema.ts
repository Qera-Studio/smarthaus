import type { SiteSettings } from "../../sanity/types";
import { fullTitle, SITE_NAME, type PageMetadataInput } from "../../lib/metadata";

/**
 * The structured data, as plain objects so it is testable without rendering.
 * SEO System §9. Every value is a confirmed fact already published on the
 * site: the address, phone, email and licence numbers from the site settings
 * in Sanity, the same document the footer and the legal pages read. sameAs
 * lists only the profiles that are live (not pending in the Studio), and never
 * WhatsApp, a chat link rather than a profile. The opening hours are the
 * footer's (2026-11-20). Left out on purpose, because schema must match what
 * the page shows: geo (not wanted, Shivanshu 2026-11-20), a SearchAction (the site has no
 * search), and any rating or price.
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
export function siteGraph({
  contact,
  identity,
  socials,
}: Pick<SiteSettings, "contact" | "identity" | "socials">) {
  const sameAs = socials.filter((s) => !s.pending && s.id !== "whatsapp").map((s) => s.href);
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
        // As the footer shows them, from the same field (src/lib/hours.ts).
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: contact.hours.days,
          opens: contact.hours.opens,
          closes: contact.hours.closes,
        },
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
        ...(sameAs.length > 0 ? { sameAs } : {}),
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

/**
 * An article: its page, the article itself and a three-step breadcrumb through
 * the articles page. Indexable articles only. The author is the byline the
 * page prints and the publisher is the business node the layout renders.
 */
export function articleGraph(
  input: PageMetadataInput,
  post: {
    title: string;
    author: string;
    date: string;
    updatedAt?: string;
    image: { src: string };
  },
  blog: { path: string; name: string },
) {
  const url = pageUrl(input.path);
  if (!input.index) throw new Error(`articleGraph: ${input.path} is noindex and gets no schema`);
  const crumbs = [
    { name: "Home", url: SITE_URL },
    { name: blog.name, url: pageUrl(blog.path) },
    { name: post.title, url },
  ];
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
        ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: { "@id": `${url}#webpage` },
        headline: post.title,
        description: input.description,
        image: post.image.src,
        datePublished: post.date,
        ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
        author: { "@type": "Person", name: post.author },
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
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
