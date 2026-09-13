"use client";

import { useEffect, useRef, useState } from "react";
import type { LegalSection } from "./sections";
import styles from "./LegalPage.module.scss";

type LegalTocProps = {
  sections: readonly LegalSection[];
  /** Accessible name for the <nav>, e.g. "Privacy Policy sections". */
  label: string;
};

/**
 * The table of contents. The page's only client component, and it holds one
 * piece of state: which section id is currently active.
 *
 * Scroll tracking is an IntersectionObserver, not a scroll listener — AGENTS.md
 * rules scroll listeners out, and this fires only when a heading crosses the
 * detection line rather than on every frame.
 *
 * How the active section is chosen: a rootMargin collapses the viewport to a
 * band just above its vertical centre, and the active section is the last
 * heading to have crossed it. Tracking "which heading is nearest the top" would
 * flicker between neighbours mid-scroll; tracking crossings of a single line
 * cannot, because the line is crossed once per heading per direction.
 */
export function LegalToc({ sections, label }: LegalTocProps) {
  // Seeded with the first section so the rail is never rendered with nothing
  // marked while the observer waits for its first callback.
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const headings = sections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // The reading line: the active section is the last heading to have passed
    // above it. A fraction of the viewport rather than a fixed offset, so it
    // sits in the same visual place on a laptop and a tall monitor.
    const LINE = 0.35;

    // Read positions rather than accumulate observer state.
    //
    // The earlier version tracked which headings had reported crossing and kept
    // the deepest — which is wrong, because an IntersectionObserver only fires
    // on a *crossing*. Headings well above the viewport stop reporting
    // entirely, so nothing arrives to mark them passed and the rail stuck on
    // section 1 no matter how far the reader scrolled. getBoundingClientRect
    // asks where things actually are, which cannot go stale.
    const sync = () => {
      const line = window.innerHeight * LINE;
      let current = sections[0]?.id ?? "";
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) {
          current = heading.id;
        } else {
          // Headings are in document order, so the first one below the line
          // means every later one is too.
          break;
        }
      }
      setActiveId(current);
    };

    // The observer is the trigger, not the source of truth: it wakes us only
    // when a heading is somewhere near the viewport, which is far cheaper than
    // a scroll listener (ruled out by AGENTS.md) while still being reliable,
    // because `sync` re-reads every position each time it runs.
    const io = new IntersectionObserver(sync, {
      // A tall band around the viewport, so scrolling through a long section
      // keeps producing callbacks rather than going quiet between headings.
      rootMargin: "100% 0px 100% 0px",
      threshold: [0, 0.5, 1],
    });
    for (const heading of headings) io.observe(heading);

    // A heading taller than that band, or a jump landing between two of them,
    // can leave the observer silent. resize covers viewport changes, which move
    // the line itself.
    window.addEventListener("resize", sync, { passive: true });
    // Hash navigation and back/forward do not always produce a crossing.
    window.addEventListener("hashchange", sync);

    sync();

    return () => {
      io.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [sections]);

  // Keep the active entry in view when the rail itself has to scroll — on short
  // viewports the list overflows, and the active item can otherwise sit outside
  // it. `nearest` so it never scrolls when the item is already visible, and the
  // rail never yanks under a reader.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    // Only when the rail is actually scrollable, so this cannot nudge the page.
    if (list.scrollHeight <= list.clientHeight) return;
    active.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <nav className={styles.toc} aria-label={label}>
      <p className={styles.tocHeading}>On this page</p>
      <ol className={styles.tocList} ref={listRef}>
        {sections.map(({ id, title, short }) => {
          const isActive = id === activeId;
          return (
            <li key={id} className={styles.tocItem}>
              <a
                href={`#${id}`}
                className={styles.tocLink}
                // The string, not a boolean: React serialises `true` on a
                // data-* attribute as an empty value, which reads as
                // data-active="" in the DOM and is awkward to assert on.
                data-active={isActive ? "true" : undefined}
                // The rail is a secondary navigation aid duplicating the
                // document's own headings, so only the active entry is
                // announced as current — announcing every link's state would
                // add noise without adding information.
                aria-current={isActive ? "true" : undefined}
              >
                {short ?? title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
