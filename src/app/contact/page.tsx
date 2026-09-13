import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact at Smarthaus. This page is being built.",
  alternates: { canonical: "/contact" },
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  robots: { index: false, follow: true },
};

export default function ContactPage() {
  return (
    <ComingSoon blurb="The enquiry form is on its way. Until then, call or message us and you will reach a person who can help." />
  );
}
