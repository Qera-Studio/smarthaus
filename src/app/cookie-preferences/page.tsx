import type { Metadata } from "next";
import { ComingSoon } from "../../components/ComingSoon";

export const metadata: Metadata = {
  title: "Cookie Preferences",
  description: "Cookie Preferences at Smarthaus. This page is being built.",
  alternates: { canonical: "/cookie-preferences" },
  // A placeholder must not be indexed: an empty route is a thin-content signal,
  // and an indexed stub competes with the real page once it ships. Flip this to
  // indexable in the same change that replaces <ComingSoon /> with the page,
  // and add the route to src/app/sitemap.ts at the same time.
  robots: { index: false, follow: true },
};

export default function CookiePreferencesPage() {
  return (
    <ComingSoon blurb="Controls for the analytics cookies on this site. None are active yet, so there is nothing to change here today." />
  );
}
