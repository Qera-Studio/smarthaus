import type { MetadataRoute } from "next";
import { ROUTES } from "../sanity/content";

const BASE_URL = "https://smarthaus.ae";

/**
 * The indexable pages, exactly: each route's document says whether it is in
 * search ("Show in search" in the Studio), and its last edit is the date. A
 * noindex page in a sitemap is a contradictory signal, so turning a page's
 * search switch on is also what puts it here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await Promise.all(ROUTES.map(async (r) => ({ ...r, doc: await r.load() })));
  return pages
    .filter(({ doc }) => doc.seo.index)
    .map(({ path, doc }) => ({
      url: path === "/" ? BASE_URL : `${BASE_URL}${path}`,
      ...(doc.updatedAt ? { lastModified: doc.updatedAt } : {}),
    }));
}
