// Seed for the three comingSoonPage documents, from the placeholder routes on
// 2026-11-11. Each is noindex until its real page lands.
import type { ComingSoonPage } from "../../src/sanity/types";

export const COMING_SOON: Readonly<
  Record<"solutions" | "designers" | "developers", ComingSoonPage>
> = {
  solutions: {
    seo: {
      title: "Solutions",
      description: "Solutions at Smarthaus. This page is being built.",
      index: false,
    },
    blurb:
      "The full range of what we install, room by room. Until this page lands, tell us about your property and we will talk you through it.",
  },
  designers: {
    seo: {
      title: "For Designers",
      description: "For Designers at Smarthaus. This page is being built.",
      index: false,
    },
    blurb:
      "A partnership page for interior designers and specifiers, with the documentation you can hand to your own client. Get in touch and we will send it directly.",
  },
  developers: {
    seo: {
      title: "For Developers",
      description: "For Developers at Smarthaus. This page is being built.",
      index: false,
    },
    blurb:
      "Multi-villa and development pricing, project scale, and the numbers behind it. Talk to us about your pipeline while this page is being built.",
  },
};
