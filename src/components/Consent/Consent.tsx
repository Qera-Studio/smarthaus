import Link from "next/link";
import { CONSENT_COPY } from "../../content/consent";
import { ConsentShell } from "./ConsentShell";
import styles from "./Consent.module.scss";

type ConsentProps = {
  /**
   * Render the preferences panel on its own, with no banner stage.
   *
   * Used by /cookie-preferences. The same component serves both surfaces so
   * the panel cannot drift into two implementations, which is the failure the
   * design brief warns about when it says the panel may be "an expanded state
   * of the banner itself".
   */
  standalone?: boolean;
};

/**
 * Cookie consent: the banner, and the preferences panel it expands into.
 *
 * Server Component. It renders every visible node and hands them to
 * ConsentShell, which adds only the state — so `Link` and the copy never enter
 * the client bundle. Named slots rather than one `children` because the banner
 * and the panel lay their pieces out differently and a single opaque node could
 * not be repositioned.
 *
 * ## What this does not do
 *
 * It records a choice and honours it. It loads **nothing**: there is no Google
 * Analytics or Microsoft Clarity script here, and no CSP entry for either.
 *
 * That is deliberate, not unfinished. `consent-content-deck.md` §13 lists six
 * items as blocking before the tags may fire, and five are not engineering
 * work — regime confirmation (client), a DPIA screen for session recording
 * (counsel), the cross-border transfer basis for Google and Microsoft
 * (counsel), counsel review of the deck alongside the privacy policy, and the
 * new-tool intake gate (Qera). The sixth is engineering but cannot be done from
 * here: "a replay must be watched, and the person who watched it named", which
 * needs a real Clarity account.
 *
 * **The seam for adding them later:** a loader that reads the consent record
 * (src/lib/consent.ts already exposes everything it needs) and injects the two
 * scripts when `analytics` is true and the measurement IDs are present in the
 * environment. It goes in the same PR as the CSP entries from deck §8 and the
 * §7.2 provider-table move, per AGENTS.md's rule that a CSP update ships with
 * the dependency that needs it.
 */
export function Consent({ standalone = false }: ConsentProps) {
  // Heading level for the category labels.
  //
  // Standalone, the page supplies an <h1> and the panel adds no heading of its
  // own, so the rows are the next level down: h2. Inside the banner the chain
  // is h2 "Cookies" -> h3 "Cookie preferences" -> h4 rows. Derived rather than
  // hardcoded so the two placements cannot skip a level, which is an axe
  // failure and a real problem for anyone navigating by headings.
  const RowHeading = standalone ? "h2" : "h4";

  // Id namespace for this instance.
  //
  // There are only ever two on a page — the layout's banner and, on
  // /cookie-preferences, the panel — and `standalone` is exactly what
  // distinguishes them, so it makes a stable prefix with no hook needed. A
  // literal rather than useId() because these ids must be baked into the copy
  // nodes below, which are rendered here on the server.
  const idPrefix = standalone ? "consent-page" : "consent-banner";
  const ids = {
    essentialLabel: `${idPrefix}-essential-label`,
    essentialBody: `${idPrefix}-essential-body`,
    analyticsLabel: `${idPrefix}-analytics-label`,
    analyticsBody: `${idPrefix}-analytics-body`,
  };

  return (
    <ConsentShell
      standalone={standalone}
      idPrefix={idPrefix}
      intro={
        <>
          <h2 className={styles.heading}>{CONSENT_COPY.banner.heading}</h2>
          <p className={styles.body}>{CONSENT_COPY.banner.body}</p>
          <Link className={styles.link} href={CONSENT_COPY.banner.linkHref}>
            {CONSENT_COPY.banner.link}
          </Link>
        </>
      }
      panelIntro={
        <>
          {/*
            No heading when standalone: /cookie-preferences carries "Cookie
            preferences" as its own <h1>, and repeating it here would announce
            the same words twice in a row and give the page two competing
            titles.

            Inside the banner it needs one, because the banner opened at h2 with
            "Cookies" and this panel is a subsection of it.
          */}
          {!standalone && <h3 className={styles.panelHeading}>{CONSENT_COPY.prefs.heading}</h3>}
          <p className={styles.body}>{CONSENT_COPY.prefs.intro}</p>
        </>
      }
      essential={
        <>
          <RowHeading id={ids.essentialLabel} className={styles.rowLabel}>
            {CONSENT_COPY.prefs.essential.label}
          </RowHeading>
          <p id={ids.essentialBody} className={styles.rowText}>
            {CONSENT_COPY.prefs.essential.body}
          </p>
        </>
      }
      analytics={
        <>
          <RowHeading id={ids.analyticsLabel} className={styles.rowLabel}>
            {CONSENT_COPY.prefs.analytics.label}
          </RowHeading>
          {/*
            Three paragraphs, and they stay three. The brief is explicit that a
            designer's instinct is to merge them, and that the middle one — the
            Clarity session-recording disclosure — is the one a careful reader
            would object to if they found it buried. It gets its own visual
            treatment rather than being folded into the body.
          */}
          <p id={ids.analyticsBody} className={styles.rowText}>
            {CONSENT_COPY.prefs.analytics.body}
          </p>
          <p className={styles.disclosure}>{CONSENT_COPY.prefs.analytics.clarity}</p>
          <p className={styles.rowMeta}>{CONSENT_COPY.prefs.analytics.retention}</p>
        </>
      }
      withdraw={<p className={styles.withdraw}>{CONSENT_COPY.prefs.withdraw}</p>}
    />
  );
}
