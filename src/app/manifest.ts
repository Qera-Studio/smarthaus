import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smarthaus — Premium Smart Home Automation",
    short_name: "Smarthaus",
    description:
      "Smarthaus delivers premium smart home automation solutions in Dubai. Seamless control of lighting, climate, security, and entertainment.",
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
