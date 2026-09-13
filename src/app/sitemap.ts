import type { MetadataRoute } from "next";

const BASE_URL = "https://smarthaus.ae";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      // The only conversion event on the site, so it ranks just below home.
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // /privacy, /terms and /cookie-preferences are deliberately absent while
    // they carry `robots: noindex` as unreviewed drafts — listing a noindex URL
    // in the sitemap asks a crawler to index a page the page itself refuses,
    // which is a contradictory signal rather than a neutral one. Uncomment all
    // three in the same change that clears their placeholders, records counsel
    // sign-off, and drops the noindex from each route's metadata.
    //
    // /cookie-preferences is a real page rather than a placeholder, but its
    // copy comes from consent-content-deck.md, which counsel reviews together
    // with the privacy policy as one review. So it waits on the same sign-off
    // as the other two.
    // {
    //   url: `${BASE_URL}/privacy`,
    //   lastModified: new Date(),
    //   changeFrequency: "yearly",
    //   priority: 0.3,
    // },
    // {
    //   url: `${BASE_URL}/terms`,
    //   lastModified: new Date(),
    //   changeFrequency: "yearly",
    //   priority: 0.3,
    // },
  ];
}
