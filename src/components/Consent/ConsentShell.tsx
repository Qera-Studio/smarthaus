"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CONSENT_COPY } from "../../content/consent";
import {
  buildConsentRecord,
  hasOptOutSignal,
  readConsentCookie,
  readConsentState,
  serialiseConsentCookie,
  type ConsentState,
} from "../../lib/consent";
import { Switch } from "./Switch";
import styles from "./Consent.module.scss";

/**
 * The route that renders the panel itself, where the banner is suppressed.
 * Matches the href in src/lib/nav-links.ts.
 */
const PREFERENCES_ROUTE = "/cookie-preferences";

type ConsentShellProps = {
  /** The banner's heading, body and policy link, server-rendered. */
  intro: ReactNode;
  /** The preferences panel's heading and intro. */
  panelIntro: ReactNode;
  /** Essential row copy: label, body. Carries the ids listed in `idPrefix`. */
  essential: ReactNode;
  /** Analytics row copy: the three paragraphs. */
  analytics: ReactNode;
  /**
   * Namespace for every id in this instance.
   *
   * Supplied by the Server Component rather than generated here with useId,
   * because the copy slots arrive as already-rendered nodes and must already
   * carry the matching ids — and a function prop cannot cross the
   * Server -> Client boundary to receive them.
   *
   * Two instances can share a page: the layout mounts the banner on every
   * route, and /cookie-preferences mounts the panel too. Hardcoded ids collided
   * six ways and broke aria-labelledby on all four controls, so each instance
   * gets its own prefix.
   */
  idPrefix: string;
  /** The withdrawal note under the panel's buttons. */
  withdraw: ReactNode;
  /**
   * Render as the always-open preferences panel instead of the banner.
   *
   * This is what /cookie-preferences uses: the same component, with the banner
   * stage skipped, so the page and the banner's expanded state cannot drift
   * apart into two implementations of one panel.
   */
  standalone?: boolean;
};

/**
 * The consent mechanism's only client component.
 *
 * Follows NavShell: every visible node arrives as an already-rendered server
 * slot, so `Link` and the copy stay out of the client bundle and this file
 * holds nothing but state. State reaches CSS as data attributes; all the
 * choreography lives in Consent.module.scss.
 *
 * ## Why this is not a modal
 *
 * `<section>` with `aria-label`, never `role="alertdialog"`. No scrim, no focus
 * trap, no blocked scrolling. The design brief's reasoning: a visitor may read
 * the site and ignore this, and consent is not freely given if the content is
 * held hostage. A cookie wall is also a named dark pattern.
 *
 * `aria-live="polite"`, never `assertive`: announcing on appearance is right,
 * interrupting whatever the visitor is already hearing is not.
 *
 * ## Why there is no close button
 *
 * Dismissing without choosing is not consent, so a ✕ would have to behave
 * exactly like Decline — at which point it is a second, vaguer decline control,
 * and two controls doing one job with one of them ambiguous is trick wording.
 * Escape dismisses and deliberately stores NOTHING, so the banner returns on
 * the next visit; only an actual Decline writes the 12-month record.
 *
 * ## Hydration
 *
 * The first render is always "undecided", matching the server HTML, and the
 * real state resolves in an effect. Reading the cookie during render would
 * produce server/client markup that disagrees — the same discipline
 * ParticleText uses for its motion query.
 */
export function ConsentShell({
  intro,
  panelIntro,
  essential,
  analytics,
  withdraw,
  idPrefix,
  standalone = false,
}: ConsentShellProps) {
  // `null` means "not yet known". Distinct from a resolved state so the banner
  // cannot flash before the cookie has been read.
  const [state, setState] = useState<ConsentState | null>(null);
  const [expanded, setExpanded] = useState(standalone);
  // What the Analytics switch currently says, which is not yet a decision —
  // `Save preferences` is what commits it.
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ids, all namespaced by idPrefix so two instances cannot collide. Must stay
  // in step with the ids the Server Component puts on the copy.
  const panelId = `${idPrefix}-panel`;
  const ids = {
    essential: `${idPrefix}-essential`,
    essentialLabel: `${idPrefix}-essential-label`,
    essentialBody: `${idPrefix}-essential-body`,
    analytics: `${idPrefix}-analytics`,
    analyticsLabel: `${idPrefix}-analytics-label`,
    analyticsBody: `${idPrefix}-analytics-body`,
  };
  const customiseRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Resolve the stored choice after mount, and keep it resolved.
  //
  // The read is wrapped in `sync` rather than called straight from the effect
  // body, matching ParticleText's motion-query effect. That is what
  // react-hooks/set-state-in-effect asks for, and it earns something real: the
  // same function can re-run on `focus`, so a choice made in another tab is
  // picked up here instead of leaving two tabs disagreeing about whether
  // analytics is on.
  useEffect(() => {
    const sync = () => {
      const next = readConsentState(readConsentCookie(document.cookie));
      setState(next);
      setAnalyticsOn(next.analytics);
    };

    if (hasOptOutSignal()) {
      // Do Not Track or GPC. Recorded as a decline with basis "signal" so the
      // choice is on file with its real provenance, and the banner is never
      // shown: asking after someone has already said no is the nagging the deck
      // prohibits. Written before the first read, so `sync` then sees it.
      document.cookie = serialiseConsentCookie(buildConsentRecord(false, "signal"), {
        secure: window.location.protocol === "https:",
      });
    }

    sync();
    // `focus` rather than the `storage` event: `storage` fires for
    // localStorage, never for cookies, so it would never see this change.
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  const commit = useCallback(
    (allow: boolean) => {
      // `Secure` is dropped on plain HTTP. Safari refuses a Secure cookie on
      // loopback, which would silently discard every choice in local dev and in
      // the WebKit e2e project.
      document.cookie = serialiseConsentCookie(buildConsentRecord(allow, "explicit"), {
        secure: window.location.protocol === "https:",
      });
      setState({ ask: false, analytics: allow });
      setAnalyticsOn(allow);
      setSaved(true);
      setExpanded(standalone);
    },
    [standalone],
  );

  // Escape dismisses the banner without storing anything, and hands focus back
  // to the control that opened the panel. Not wired when standalone: there is
  // no banner to dismiss on the preferences page.
  useEffect(() => {
    if (standalone || state?.ask !== true) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (expanded) {
        setExpanded(false);
        customiseRef.current?.focus();
        return;
      }
      // Dismiss only. No record: dismissal is not a decision.
      setState({ ask: false, analytics: false });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [standalone, state?.ask, expanded]);

  // Nothing to show until the cookie has been read, and nothing to show once a
  // choice is on file. The preferences page always renders.
  if (!standalone && (state === null || !state.ask)) return null;

  // The banner does not appear on the preferences page.
  //
  // Two reasons, and the first is an accessibility failure rather than a
  // preference: the layout mounts this on every route, so on
  // /cookie-preferences the banner and the page's own panel were two regions
  // with the same accessible name, which axe flags as landmark-unique. The
  // second is that it is redundant — the controls are already on screen, and a
  // banner asking the same question above them is noise.
  //
  // usePathname, not window.location: reading location during render is a
  // hydration mismatch waiting to happen, and the hook is the supported way to
  // get the route in a client component without forcing the layout dynamic.
  if (!standalone && pathname === PREFERENCES_ROUTE) return null;

  const reAsk =
    state?.reason === "expired"
      ? CONSENT_COPY.state.expired
      : state?.reason === "version"
        ? CONSENT_COPY.state.changed
        : null;

  return (
    <section
      className={styles.consent}
      // Dark surface. Without this the custom cursor dot is brown-900 on
      // brown-950 at 1.06:1 and effectively invisible — see globals.scss.
      data-ground="dark"
      data-standalone={standalone || undefined}
      data-expanded={expanded || undefined}
      // A region, not a dialog. The label is what a screen reader announces
      // when it reaches this landmark.
      aria-label={CONSENT_COPY.prefs.heading}
      // Polite, so appearing does not interrupt. Only the banner announces;
      // the preferences page is navigated to deliberately.
      aria-live={standalone ? undefined : "polite"}
    >
      <div className={styles.inner}>
        {/* The banner stage. Hidden on the preferences page, where the panel
            is the whole point. */}
        {!standalone && (
          <div className={styles.banner}>
            {reAsk && <p className={styles.reAsk}>{reAsk}</p>}
            {intro}

            <div className={styles.actions}>
              {/*
                All three controls carry identical weight — same element, same
                class, same padding and contrast. This is the single hardest
                constraint in the brief: a ghosted or shrunken Decline is
                interface interference, a named dark pattern, and a [Base]
                non-negotiable in the Design System.

                They are deliberately NOT differentiated by variant. If these
                ever need to differ, reduce Accept; never promote Decline.
              */}
              <button type="button" className={styles.action} onClick={() => commit(true)}>
                {CONSENT_COPY.banner.accept}
              </button>
              <button type="button" className={styles.action} onClick={() => commit(false)}>
                {CONSENT_COPY.banner.decline}
              </button>
              <button
                ref={customiseRef}
                type="button"
                className={styles.action}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpanded((open) => !open)}
              >
                {CONSENT_COPY.banner.customise}
              </button>
            </div>
          </div>
        )}

        {/*
          The preferences panel.

          `inert` when collapsed rather than merely clipped: overflow alone
          leaves the switch and buttons tabbable and in the accessibility tree,
          which gives keyboard and screen-reader users phantom stops inside a
          panel nobody can see. React needs `undefined` rather than `false` to
          drop the attribute.
        */}
        <div id={panelId} className={styles.panel} inert={(!standalone && !expanded) || undefined}>
          <div className={styles.panelInner}>
            {panelIntro}

            <div className={styles.rows}>
              <Row
                control={
                  // Visibly on, genuinely disabled, and labelled so it reads as
                  // information rather than an offer.
                  <>
                    <Switch
                      id={ids.essential}
                      labelId={ids.essentialLabel}
                      describedBy={ids.essentialBody}
                      checked
                      disabled
                    />
                    <span className={styles.stateLabel}>{CONSENT_COPY.prefs.essential.state}</span>
                  </>
                }
              >
                {essential}
              </Row>

              <Row
                control={
                  <Switch
                    id={ids.analytics}
                    labelId={ids.analyticsLabel}
                    describedBy={ids.analyticsBody}
                    checked={analyticsOn}
                    onChange={setAnalyticsOn}
                  />
                }
              >
                {analytics}
              </Row>
            </div>

            {/*
              Two buttons, and here the hierarchy MAY differ: neither is a
              decline, so the interface-interference rule does not bite. Save is
              the panel's primary action; Accept is a shortcut.
            */}
            <div className={styles.panelActions}>
              <button type="button" className={styles.primary} onClick={() => commit(analyticsOn)}>
                {CONSENT_COPY.prefs.save}
              </button>
              <button type="button" className={styles.secondary} onClick={() => commit(true)}>
                {CONSENT_COPY.banner.accept}
              </button>
            </div>

            {/*
              Current state, announced politely after a save. This is the only
              post-choice feedback: the specified behaviour is that the banner
              disappears and nothing else is proclaimed, so there is no toast.
            */}
            <p className={styles.status} role="status">
              {saved || standalone
                ? analyticsOn
                  ? CONSENT_COPY.state.on
                  : CONSENT_COPY.state.off
                : ""}
            </p>

            {withdraw}
          </div>
        </div>
      </div>
    </section>
  );
}

/** One category row: copy on the start edge, control on the end edge. */
function Row({ control, children }: { control: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowBody}>{children}</div>
      <div className={styles.rowControl}>{control}</div>
    </div>
  );
}
