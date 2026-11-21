"use client";

import { useRef, type ReactNode } from "react";

import styles from "./AnnouncementBar.module.scss";

/**
 * The bar's arrows. Swiping is the browser's own: below md the list is a
 * scroll-snap row one item wide, so a finger moves it with no script. The
 * arrows step it by one item and wrap at both ends. From md up every item is
 * on screen and the stylesheet hides them.
 */
export function AnnouncementScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function step(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const width = el.clientWidth;
    const last = el.scrollWidth - width;
    let next = el.scrollLeft + direction * width;
    // Half an item of slack: scrollLeft lands on fractions at some zooms.
    if (next > last + width / 2) next = 0;
    else if (next < -width / 2) next = last;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className={styles.scroller}>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Previous contact"
        onClick={() => step(-1)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div ref={ref} className={styles.viewport}>
        {children}
      </div>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Next contact"
        onClick={() => step(1)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}
