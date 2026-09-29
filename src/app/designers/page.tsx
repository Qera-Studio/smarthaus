import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "For Designers",
  description: "For Designers at Smarthaus. This page is being built.",
  path: "/designers",
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  index: false,
});

export default function DesignersPage() {
  return (
    <ComingSoon blurb="A partnership page for interior designers and specifiers, with the documentation you can hand to your own client. Get in touch and we will send it directly." />
  );
}
