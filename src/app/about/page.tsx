import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";

export const metadata: Metadata = {
  title: "About",
  description: "About at Smarthaus. This page is being built.",
  alternates: { canonical: "/about" },
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  robots: { index: false, follow: true },
};

export default function AboutPage() {
  return (
    <ComingSoon blurb="Who we are, and the Maple Technologies track record behind us. In the meantime, ask us anything you would want to know first." />
  );
}
