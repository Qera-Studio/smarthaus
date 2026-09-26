"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Nav.module.scss";
import { latestEntry } from "@/lib/observer";
import { trackNavWidths } from "./measure";

/**
 * How much of the viewport the footer must cover before the nav hides. The
 * footer carries the same links, so the bar has nothing to offer at that point.
 */
const FOOTER_HIDE_RATIO = 0.7;

type NavShellProps = {
  /** Mark-only lockup, shown below lg where there is no room for the wordmark. */
  brandMark: ReactNode;
  /** Full horizontal lockup, shown from lg up. */
  brandFull: ReactNode;
  /** The <ul> of primary links, server-rendered. */
  links: ReactNode;
  cta: ReactNode;
  /** Wordmark + parent-company line, pinned under the links when open. */
  footer: ReactNode;
};

/**
 * The nav's only client component — it exists purely to hold two booleans.
 *
 * Everything visible is passed in as already-rendered server nodes, so Link,
 * Logo and RollingText never enter the client bundle. They arrive as named
 * slots rather than one `children` because the three breakpoint bands lay the
 * same pieces out differently, and a single opaque node could not be
 * repositioned.
 *
 * State reaches CSS as data attributes on <header>; all the choreography lives
 * in Nav.module.scss.
 */
export function NavShell({ brandMark, brandFull, links, cta, footer }: NavShellProps) {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  // True once the footer covers FOOTER_HIDE_RATIO of the viewport.
  const [atFooter, setAtFooter] = useState(false);
  // From lg up the links are always on show in the bar, so the panel is never
  // a disclosure and must never be inert. Below lg it starts closed.
  const [isDesktop, setIsDesktop] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Bounds the "outside" of an outside-tap. The whole <header>, not just the
  // panel: the bar is part of the open nav, and a tap on the hamburger must
  // reach its own onClick rather than being closed out from under it.
  const headerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLSpanElement>(null);

  // Desktop capsule trigger. A sentinel plus IntersectionObserver rather than a
  // scroll listener, which AGENTS.md rules out — this fires twice per crossing
  // instead of on every frame of every scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setStuck(!latestEntry(entries)?.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Hide the nav once the footer covers most of the screen. The footer carries
  // its own navigation, so a floating bar over it is redundant — and on mobile
  // it physically covers the links underneath it.
  //
  // The trigger is how much of the VIEWPORT the footer fills, not how much of
  // the footer is visible. intersectionRatio is the latter and is useless
  // here: the footer is min-block-size 100svh at lg and taller than the
  // viewport on mobile, so its ratio never approaches 0.7. The observer's root
  // is shrunk instead, turning "covers 70% of the screen" into a plain
  // intersection — see the options below. No scroll listener, which AGENTS.md
  // rules out, and no measuring of our own.
  //
  // The footer is a sibling of this component's tree, so it is found by
  // selector rather than a ref. The effect runs after paint, so it is mounted.
  useEffect(() => {
    const el = document.querySelector("footer");
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = latestEntry(entries);
        if (!entry) return;
        // Intersecting the shortened root means the footer's top has passed
        // the trigger line — i.e. it now covers at least FOOTER_HIDE_RATIO of
        // the real viewport.
        const hide = entry.isIntersecting;
        setAtFooter(hide);
        // A menu left open would be stranded off-screen with the bar.
        if (hide) setOpen(false);
      },
      // rootMargin, not thresholds.
      //
      // Thresholds are fractions of the TARGET, and the footer is far taller
      // than the viewport — 3211px against 664px on a phone — so its ratio
      // tops out near 0.2 and crosses almost none of them. WebKit fired twice
      // across the whole scroll and never again while coverage climbed from
      // 0.2 to 0.99, leaving the bar visible over a footer that filled the
      // screen. Chromium happened to fire often enough to hide the bug.
      //
      // Shrinking the root from the bottom by (1 - ratio) of the viewport
      // makes the intersection itself the event: the footer enters this
      // shortened root exactly when its top passes FOOTER_HIDE_RATIO of the
      // real viewport. That is a boolean crossing, so a 0 threshold is enough
      // and it does not depend on the target's size at all.
      {
        rootMargin: `0px 0px -${Math.round(FOOTER_HIDE_RATIO * 100)}% 0px`,
        threshold: 0,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tracks the lg breakpoint so `inert` can be skipped on desktop, where the
  // links are permanently visible. $bp-lg in _variables.scss — keep in step.
  // Closes the menu on the way up so a panel opened on mobile does not persist
  // into the desktop layout after a resize or rotate.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Escape closes and hands focus back to the toggle, so keyboard users are not
  // left focused on a panel that has gone.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // A tap anywhere outside the nav closes it, which is what every other
  // disclosure on a phone does — requiring a second, accurate tap on the
  // hamburger is the thing that feels broken.
  //
  // `pointerdown` rather than `click`: it fires before focus moves and before
  // any link underneath activates, so the panel is already closing as the
  // finger lands. Focus is NOT returned to the toggle here — unlike Escape,
  // the user is pointing at something else, and stealing focus back would
  // scroll the page to the bar.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (headerRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    // Capture phase, so this still runs if something inside the page stops
    // propagation on its own pointer handlers.
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [open]);

  // The capsule's geometry uses the widths this platform renders: measure.ts.
  useEffect(() => trackNavWidths(headerRef.current!, linksRef.current!, ctaRef.current!), []);

  return (
    <>
      {/* Marks the top of the page. Once it scrolls out, the nav is "stuck". */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <header
        ref={headerRef}
        className={styles.nav}
        data-open={open || undefined}
        data-stuck={stuck || undefined}
        data-at-footer={atFooter || undefined}
        // A faded-out bar is still focusable and still in the accessibility
        // tree, so Tab would stop on controls nobody can see. `visibility:
        // hidden` in the CSS handles that too, but only after the fade — this
        // flips with the state, and covers the reduced-motion path where there
        // is no transition to wait for.
        inert={atFooter || undefined}
      >
        {/*
          The panel comes FIRST so that below lg — where <header> is a flex
          column pinned to the bottom of the screen — it grows upward while the
          bar stays welded to the bottom edge. This is source order doing the
          work; an `order` property cannot, and previously did not.

          `inert` when closed, not just visually clipped: overflow alone would
          leave the links tabbable and in the accessibility tree, giving
          keyboard and screen-reader users phantom stops on a hidden menu.
          React needs `undefined` rather than `false` to drop the attribute.
        */}
        <div id={panelId} className={styles.panel} inert={(!isDesktop && !open) || undefined}>
          <div className={styles.panelInner}>
            <nav ref={linksRef} className={styles.panelLinks} aria-label="Primary">
              {links}
            </nav>
            <div className={styles.panelFooter}>{footer}</div>
          </div>
        </div>

        <div className={styles.bar}>
          <span className={styles.brandMark}>{brandMark}</span>
          <span className={styles.brandFull}>{brandFull}</span>

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((isOpen) => !isOpen)}
          >
            {/* Three lines that rotate into an X — see Nav.module.scss. */}
            <svg className={styles.burger} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <line className={styles.burgerTop} x1="4" y1="8" x2="20" y2="8" />
              <line className={styles.burgerMid} x1="4" y1="12" x2="20" y2="12" />
              <line className={styles.burgerBot} x1="4" y1="16" x2="20" y2="16" />
            </svg>
          </button>

          <span ref={ctaRef} className={styles.ctaSlot}>
            {cta}
          </span>
        </div>
      </header>
    </>
  );
}
