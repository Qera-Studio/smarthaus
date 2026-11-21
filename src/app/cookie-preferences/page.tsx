import type { Metadata } from "next";
import { Consent } from "../../components/Consent";
import styles from "./page.module.scss";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getConsentCopy } from "../../sanity/content";

const PATH = "/cookie-preferences";

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
// the sitemap leaves them out. Indexing this page while
// the two documents it depends on are unreviewed drafts would be
// inconsistent with them and would index copy a lawyer has not seen.
//
// TO PUBLISH: turn on "Show in search" for this page (the consent document in
// the Studio) in the same sitting as for /privacy and /terms, once counsel has
// reviewed them. All three move together; the sitemap follows on its own.
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getConsentCopy();
  return pageMetadata(seoInput(PATH, seo));
}

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
export default async function CookiePreferencesPage() {
  const { pageTitle } = await getConsentCopy();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{pageTitle}</h1>
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
