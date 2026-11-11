import type { MetadataRoute } from "next";
import { getSettings } from "../sanity/content";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { seo } = await getSettings();
  return {
    // The site's own title and description, so an installed app says what the
    // search result does.
    name: seo.defaultTitle,
    short_name: "Smarthaus",
    description: seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    // Matches --color-bg-canvas ($brown-100) so the splash screen does not
    // flash a different ground before first paint.
    background_color: "#f0e9dd",
    theme_color: "#f0e9dd",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
