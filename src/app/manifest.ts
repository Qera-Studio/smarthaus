import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // The site's own title and description, so an installed app says what the
    // search result does.
    name: "Smarthaus | Home Automation and Security in Dubai",
    short_name: "Smarthaus",
    description:
      "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
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
