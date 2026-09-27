import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Solutions",
  description: "Solutions at Smarthaus. This page is being built.",
  path: "/solutions",
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  index: false,
});

export default function SolutionsPage() {
  return (
    <ComingSoon blurb="The full range of what we install, room by room. Until this page lands, tell us about your property and we will talk you through it." />
  );
}
