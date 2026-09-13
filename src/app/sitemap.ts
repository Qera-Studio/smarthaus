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
    // /privacy and /terms are deliberately absent while they carry
    // `robots: noindex` as unreviewed drafts — listing a noindex URL in the
    // sitemap asks a crawler to index a page the page itself refuses, which is
    // a contradictory signal rather than a neutral one. Uncomment both in the
    // same change that clears their placeholders, records counsel sign-off, and
    // drops the noindex from each route's metadata.
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
