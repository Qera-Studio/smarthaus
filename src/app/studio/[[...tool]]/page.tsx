import type { Metadata } from "next";
import { metadata as studioMetadata } from "next-sanity/studio";
// Not "next-sanity/studio"'s NextStudio: that one adds Sanity's bridge, a
// remote script from core.sanity-cdn.com that only ties the Studio into
// Sanity's own dashboard. Editing does not need it, and it would be the one
// third-party script on this origin.
import { NextStudio } from "next-sanity/studio/client-component";
import config from "../../../sanity/config";

// The Sanity Studio, for editors only: noindex, out of the sitemap, and its
// own CSP in next.config.ts. `data-studio` hides the site's chrome around it
// (globals.scss).
export const dynamic = "force-static";

export const metadata: Metadata = { ...studioMetadata, title: "Studio" };
export { viewport } from "next-sanity/studio";

export default function StudioPage() {
  return (
    <div data-studio>
      <NextStudio config={config} />
    </div>
  );
}
