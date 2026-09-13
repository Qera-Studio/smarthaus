import type { Metadata } from "next";
import { Consent } from "../../components/Consent";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Cookie Preferences",
  description:
    "Turn analytics cookies on or off, and see exactly what each category does. Analytics is off until you turn it on.",
  alternates: { canonical: "/cookie-preferences" },
  // STILL noindex, and for a different reason than the placeholder was.
  //
  // The placeholder's own comment said to flip this to indexable in the change
  // that replaced <ComingSoon />, on the grounds that an empty route is a
  // thin-content signal. That reasoning is spent — this is a real page now —
  // but a second one has taken over: the consent copy is counsel-pending, and
  // consent-content-deck.md is explicit that it is reviewed alongside the
  // privacy policy as ONE review rather than two.
  //
  // /privacy and /terms both ship `noindex` for exactly that reason, and
  // sitemap.ts records why they are absent from it. Indexing this page while
  // the two documents it depends on are unreviewed drafts would be
  // inconsistent with them and would index copy a lawyer has not seen.
  //
  // TO PUBLISH: drop this and add /cookie-preferences to src/app/sitemap.ts, in
  // the same change that clears the noindex from /privacy and /terms. All three
  // move together.
  robots: { index: false, follow: true },
};

/**
 * The permanent home of the cookie controls.
 *
 * This page is the reason withdrawal is as easy as consent, which Legal
 * System §6 requires: the banner appears once and then never again, so a
 * visitor who declined in January and changes their mind in March needs a
 * route back in that does not depend on clearing cookies. The footer links
 * here from every page.
 *
 * It renders the SAME component the banner expands into, with the banner stage
 * skipped. One implementation, two placements — otherwise the page and the
 * banner's panel drift into two versions of one set of controls, and the copy
 * that is counsel-pending would have to be reviewed twice.
 */
export default function CookiePreferencesPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cookie preferences</h1>
      </header>

      {/*
        `standalone` renders the panel in flow with no banner and no dismiss:
        there is nothing to dismiss on a page the visitor navigated to
        deliberately.
      */}
      <Consent standalone />
    </div>
  );
}
