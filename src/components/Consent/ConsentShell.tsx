"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CONSENT_COPY } from "../../content/consent";
import {
  OPEN_PREFERENCES_EVENT,
  PREFERENCES_ROUTE,
  buildConsentRecord,
  hasOptOutSignal,
  readConsentCookie,
  readConsentState,
  serialiseConsentCookie,
  type ConsentState,
} from "../../lib/consent";
import { Switch } from "./Switch";
import styles from "./Consent.module.scss";

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
 *
 * ## Two stages, not one growing card
 *
 * `expanded` switches BETWEEN the banner and the panel rather than revealing
 * the panel beneath the banner. Only one is mounted at a time, so the panel is
 * a second state of the same region rather than a taller version of the first.
 *
 * That is why there is no `inert` bookkeeping any more: the collapsed panel
 * used to stay in the DOM so its height could animate, which meant its switch
 * and buttons had to be explicitly removed from the tab order. Unmounting is
 * the simpler correctness story — a control that is not rendered cannot be
 * focused, cannot be read by a screen reader, and cannot be found by
 * find-in-page.
 *
 * Focus is moved into the panel on open and back to the control that opened it
 * on close. With the banner unmounted, the element that had focus disappears,
 * and focus would otherwise fall back to <body> — which strands a keyboard
 * visitor at the top of the document. This is the one place the stage switch
 * costs something the expansion did not.
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
  const panelRef = useRef<HTMLDivElement>(null);
  // Whatever had focus when the panel was opened from OUTSIDE the banner (the
  // footer link), so closing can hand focus back to it. The banner's own
  // button is covered by customiseRef; this is for the case where there is no
  // banner — a choice is already on file and the footer is the way back in.
  const openerRef = useRef<HTMLElement | null>(null);
  // The card itself, measured so ScrollToTop can sit above it. See the
  // ResizeObserver effect below.
  const cardRef = useRef<HTMLElement>(null);
  // False until the first stage change, so the focus effect below does not fire
  // on mount. See the effect for why that distinction matters.
  const stageSwitched = useRef(false);
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
    /**
     * `force` is the development gate: show the banner on every reload,
     * whatever is stored.
     *
     * Otherwise the banner is a one-shot surface — make a choice and it is gone
     * for twelve months, and the only way back is clearing the cookie by hand,
     * which makes the thing being worked on the hardest thing on the site to
     * look at.
     *
     * It overrides `ask` ONLY, and never clears the cookie or writes a record,
     * so this changes what is rendered and nothing about what is stored.
     * `analyticsOn` still comes from the real record, so the switch opens
     * reflecting the actual stored choice rather than lying about it.
     */
    const sync = (force = false) => {
      const next = readConsentState(readConsentCookie(document.cookie));
      setState(force ? { ...next, ask: true } : next);
      setAnalyticsOn(next.analytics);
    };

    // NODE_ENV is inlined by the bundler, so in a production build this is
    // `if (false)` and the branch is dropped: no runtime flag a visitor could
    // flip, and no path for it to reach a real deployment. Verified by grepping
    // the built client bundle for the dismiss button's label.
    if (process.env.NODE_ENV === "development") {
      sync(true);
      // No `focus` listener here. Re-syncing on tab focus would re-read the
      // stored record and close the forced-open banner mid-look, which is the
      // behaviour this gate exists to prevent.
      return;
    }

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
    //
    // Wrapped rather than passed directly. `sync` now takes a `force` flag, and
    // addEventListener would hand it the FocusEvent as that argument — an event
    // object is truthy, so every tab focus would force the banner open again
    // even in production, re-asking a visitor who had already chosen. Exactly
    // the nagging the deck prohibits.
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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

  /**
   * Open the panel from the footer's "Cookie Preferences" link.
   *
   * The banner is a one-shot surface: once a choice is on file it is gone for
   * twelve months, and this is the way back in that does not leave the page.
   * The link dispatches a window event (see PreferencesLink) and this opens
   * the same panel the banner expands into — the render gate below lets it
   * show even with no `ask` outstanding.
   *
   * Ignored on /cookie-preferences itself: the standalone panel is already on
   * screen there, and setting `expanded` on this suppressed instance would
   * make it pop open on the next client-side navigation away from the page.
   */
  useEffect(() => {
    if (standalone) return;
    const open = () => {
      if (pathname === PREFERENCES_ROUTE) return;
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setExpanded(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, [standalone, pathname]);

  /**
   * Publish the card's height as `--consent-block-size` on <html>.
   *
   * ScrollToTop reads it to sit above the banner. Below lg the banner spans the
   * full width and is anchored to the same bottom calc as that button, so
   * without this they land on the same line and the banner — at --z-overlay
   * against the button's --z-sticky — swallows every click on it.
   *
   * Measured rather than reserved as a literal, because the height is
   * content-driven: the body wraps to a different number of lines per viewport,
   * the action row wraps below md, and the re-ask line adds a paragraph when
   * present. A number hardcoded in either component would be correct on the
   * device it was measured on and quietly wrong on the rest.
   *
   * `anchor()` is the right tool for this and WebKit does not ship it.
   *
   * Skipped when standalone: the preferences page renders the card in flow, so
   * it is not overlapping anything and has no reason to push the button around.
   */
  useEffect(() => {
    if (standalone) return;
    const card = cardRef.current;
    const root = document.documentElement;
    if (!card) {
      // Nothing mounted — clear it, or a stale height from a previous render
      // keeps the button pushed up with no banner to clear.
      root.style.removeProperty("--consent-block-size");
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      root.style.setProperty("--consent-block-size", `${Math.ceil(entry.contentRect.height)}px`);
    });
    observer.observe(card);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-block-size");
    };
    // `expanded` is a dependency because the two stages have different heights
    // and the panel stage remounts the card's contents.
  }, [standalone, expanded, state?.ask]);

  /**
   * Move focus into the panel when it replaces the banner.
   *
   * Required by the stage switch rather than by taste. The button that was
   * focused ("Choose what to share") is unmounted the moment the panel opens,
   * and the browser's fallback for a focused element disappearing is <body> —
   * so a keyboard visitor who opens preferences would be silently returned to
   * the top of the document, with the panel they just asked for somewhere below
   * and no indication of where.
   *
   * The panel container takes focus, not the first switch: landing on a control
   * skips the intro sentence that says analytics is off by default, and a
   * screen reader would announce the toggle without the sentence that qualifies
   * it. `tabIndex={-1}` makes the container programmatically focusable without
   * adding a tab stop.
   *
   * Not wired when standalone: /cookie-preferences has no banner to replace, so
   * there is no lost focus to recover and stealing focus on page load would be
   * a 3.2.5 violation.
   */
  useEffect(() => {
    if (standalone) return;
    // Only when a stage actually replaced another one. On the very first
    // render `expanded` is false and nothing has been unmounted, so focusing
    // the banner's button here would steal focus from whatever the visitor was
    // doing when the banner appeared — a 3.2.5 change-on-request failure, and
    // far more disruptive than the problem being solved.
    if (!stageSwitched.current) {
      stageSwitched.current = true;
      return;
    }
    if (expanded) {
      panelRef.current?.focus();
      return;
    }
    // Back to whatever opened it. The footer link when that was the opener
    // (there may be no banner to return to at all); otherwise the banner's own
    // button, freshly mounted by the same state change.
    (openerRef.current ?? customiseRef.current)?.focus();
    openerRef.current = null;
  }, [standalone, expanded]);

  // Escape dismisses the banner without storing anything, and hands focus back
  // to the control that opened the panel. Not wired when standalone: there is
  // no banner to dismiss on the preferences page. Also wired while the panel
  // is open with no `ask` outstanding — opened from the footer after a choice
  // — where the first branch below simply closes it.
  //
  // A layout effect, so the listener is attached in the same commit that puts
  // the banner on screen. As a passive effect it attached after paint, and on
  // a slow device an Escape pressed the moment the banner appeared was lost:
  // the banner was visible and not listening. CI's iPhone project hit it.
  useLayoutEffect(() => {
    if (standalone || (state?.ask !== true && !expanded)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (expanded) {
        // Back to the banner, one stage at a time: Escape in the panel does
        // not also dismiss, because a visitor reading the detail has not
        // refused anything yet.
        //
        // The focus call is deliberately NOT on customiseRef here. That button
        // is unmounted while the panel is open, so the ref is null and the
        // focus would be lost to <body>. The effect below re-runs when
        // `expanded` goes false and restores focus once the banner is mounted
        // again.
        setExpanded(false);
        return;
      }
      // Dismiss only. No record: dismissal is not a decision.
      setState({ ask: false, analytics: false });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [standalone, state?.ask, expanded]);

  // Nothing to show until the cookie has been read, and nothing to show once a
  // choice is on file — unless the panel was opened from the footer, which is
  // the way back in after a choice. The preferences page always renders.
  if (!standalone && (state === null || (!state.ask && !expanded))) return null;

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
      ref={cardRef}
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
        {/*
          The banner stage.

          Rendered only while the panel is closed: opening preferences SWITCHES
          to it rather than growing the card, so the two never appear together.
          Also absent on the preferences page, where the panel is the point.
        */}
        {!standalone && !expanded && (
          <div className={styles.banner}>
            {/*
              Dismiss, and DEVELOPMENT ONLY.

              The design brief rules out a ✕ on the shipped banner, and the
              reasoning holds: dismissing without choosing is not consent, so a
              ✕ has to behave exactly like Decline — at which point it is a
              second, vaguer decline control, and two controls doing one job
              with one of them ambiguous is trick wording. e2e/consent.spec.ts
              asserts there is no close control, and that assertion stays.

              It exists here because the dev gate above forces the banner open
              on every reload, so without it the banner covers a corner of
              every page for the whole session with no way to move it aside.
              That is a development ergonomics problem, not a consent surface.

              Like the gate, `NODE_ENV` is inlined at build time, so this
              button does not exist in a production bundle.

              It stores NOTHING — same as Escape. The banner returns on the next
              reload, so dismissing it here cannot be mistaken for a decision.
            */}
            {process.env.NODE_ENV === "development" && (
              <button
                type="button"
                className={styles.dismiss}
                // Named for what it is, so it cannot be mistaken for a real
                // control if it ever leaks into a screenshot or a test run.
                aria-label="Dismiss (development only)"
                onClick={() => setState({ ask: false, analytics: false })}
              >
                {/* aria-hidden: the accessible name is on the button. */}
                <span aria-hidden="true">✕</span>
              </button>
            )}
            {reAsk && <p className={styles.reAsk}>{reAsk}</p>}
            {intro}

            <div className={styles.actions}>
              {/*
                Accept and Decline carry identical weight — same class, same
                fill, same padding and contrast. This is the single hardest
                constraint in the brief: a ghosted or shrunken Decline is
                interface interference, a named dark pattern, and a [Base]
                non-negotiable in the Design System.

                They are deliberately NOT differentiated. If these ever need to
                differ, reduce Accept; never promote Decline.

                "Choose what to share" sits in the same row but is styled as a
                quieter control, and that is permitted for a specific reason:
                it is not a third answer to the question. Accept and Decline
                both END the interaction and write a record; this one opens more
                detail and writes nothing. The dark-pattern rule governs
                equally-weighted CHOICES, and de-emphasising a navigation
                control alongside two decisions does not steer the decision —
                whereas making "more options" as loud as "Decline" pushes a
                visitor who wants to refuse toward a longer path.
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
                className={styles.customise}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpanded(true)}
              >
                {CONSENT_COPY.banner.customise}
              </button>
            </div>
          </div>
        )}

        {/*
          The preferences panel: the banner's second stage, not a drawer under
          it. Mounted only when open, which is why there is no `inert` here any
          more — an unrendered control cannot be tabbed to, announced, or found
          by find-in-page, so unmounting replaces the attribute bookkeeping the
          animated collapse used to need.

          `tabIndex={-1}` so the focus effect above can move focus here when the
          banner it replaced is unmounted. It adds no tab stop.
        */}
        {(standalone || expanded) && (
          <div id={panelId} ref={panelRef} tabIndex={-1} className={styles.panel}>
            {panelIntro}

            {/*
              Analytics FIRST, Essential second.

              The screenshots and the deck both put Essential first, and that is
              the conventional order — but it buries the one paragraph the brief
              says must not be buried. Measured on a Pixel 7: Essential's body
              runs to six lines at this measure, which pushed the Clarity
              session-recording disclosure 374px into a 389px scroll area, so it
              was below the fold on open and only found by scrolling.

              Analytics is also the row that matters: it is the only one with a
              choice in it, and the only one whose copy a visitor needs before
              deciding. Essential is informational and loses nothing by coming
              second — a row whose switch cannot be operated has nothing urgent
              to say.
            */}
            <div className={styles.rows}>
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
            </div>

            {/*
              Save, and a way back. No "Accept analytics" shortcut here.

              It was a third button, and it was redundant: with the switch on,
              Save does exactly what it did, and the switch is directly above
              it. Its real cost was height — five paragraphs plus three buttons
              does not fit a phone card, and the paragraph that lost the
              argument was the Clarity session-recording disclosure, which is
              the one the brief says must not be buried. A convenience shortcut
              is not worth pushing a disclosure below the fold.

              Removing it also removes the only asymmetry between the two
              stages: Accept now appears once, on the banner, where it is one of
              two equally-weighted answers.
            */}
            <div className={styles.panelActions}>
              <button type="button" className={styles.primary} onClick={() => commit(analyticsOn)}>
                {CONSENT_COPY.prefs.save}
              </button>
              {/*
                Back to the banner.

                Needed because the panel REPLACES the banner instead of
                expanding below it. Previously the banner's own "Choose what to
                share" stayed on screen with aria-expanded="true" and clicking
                it again collapsed the panel; now that control is unmounted, so
                without this a pointer user who opened preferences to look has
                no way out except making a choice. That is a cookie wall in
                miniature: the visitor asked for information and got a dead end.
                Escape already does this for keyboard users.

                Inside the action row rather than below it, so it reads as one
                of the ways out of this panel. Styled quiet, because it is the
                only one of the three that decides nothing.

                Not rendered standalone: on /cookie-preferences there is no
                banner to go back to, and it would be a control that does
                nothing.
              */}
              {!standalone && (
                <button type="button" className={styles.back} onClick={() => setExpanded(false)}>
                  {CONSENT_COPY.prefs.back}
                </button>
              )}
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
        )}
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
