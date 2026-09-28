import type { MetadataRoute } from "next";
import { LAST_MODIFIED } from "../content/last-modified";

// The dates and the rules for them live in src/content/last-modified.ts: a
// metadata route may export only what Next allows.
const BASE_URL = "https://smarthaus.ae";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(LAST_MODIFIED).map(([path, date]) => ({
    url: path === "/" ? BASE_URL : `${BASE_URL}${path}`,
    lastModified: date,
  }));
}
