"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Nav.module.scss";

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
  // From lg up the links are always on show in the bar, so the panel is never
  // a disclosure and must never be inert. Below lg it starts closed.
  const [isDesktop, setIsDesktop] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Desktop capsule trigger. A sentinel plus IntersectionObserver rather than a
  // scroll listener, which AGENTS.md rules out — this fires twice per crossing
  // instead of on every frame of every scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setStuck(!entry?.isIntersecting);
    });
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

  return (
    <>
      {/* Marks the top of the page. Once it scrolls out, the nav is "stuck". */}
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <header className={styles.nav} data-open={open || undefined} data-stuck={stuck || undefined}>
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

          <span className={styles.ctaSlot}>{cta}</span>
        </div>

        {/*
          `inert` when closed, not just visually clipped: overflow alone would
          leave the links tabbable and in the accessibility tree, giving
          keyboard and screen-reader users phantom stops on a hidden menu.
          React needs `undefined` rather than `false` to drop the attribute.
        */}
        <div id={panelId} className={styles.panel} inert={(!isDesktop && !open) || undefined}>
          <div className={styles.panelInner}>
            <nav className={styles.panelLinks} aria-label="Primary">
              {links}
            </nav>
            <div className={styles.panelFooter}>{footer}</div>
          </div>
        </div>
      </header>
    </>
  );
}
