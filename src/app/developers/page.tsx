import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "For Developers",
  description: "For Developers at Smarthaus. This page is being built.",
  path: "/developers",
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  index: false,
});

export default function DevelopersPage() {
  return (
    <ComingSoon blurb="Multi-villa and development pricing, project scale, and the numbers behind it. Talk to us about your pipeline while this page is being built." />
  );
}
