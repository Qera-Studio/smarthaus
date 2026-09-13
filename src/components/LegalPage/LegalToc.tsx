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
  // Bumped on resize to rebuild the observers, whose rootMargin is computed
  // from the viewport height. Not rendered — it exists only as an effect key.
  const [viewportEpoch, setViewportEpoch] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const headings = sections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // The reading line: the active section is the last heading to have passed
    // above it.
    //
    // Just below the sticky nav, NOT a fraction of the viewport. It was 35% of
    // the viewport height, which put the line ~344px down a 982px screen — so a
    // heading had to travel a third of the way up before the rail admitted it,
    // and the rail read a section behind what was plainly on screen. Measured
    // at 1512x982: with "Cost" sitting 22px below the top of the viewport, the
    // rail still said "Getting started".
    //
    // The nav capsule is what a heading disappears under, so that is the line
    // that matters: a heading is "current" the moment it reaches the first row
    // of readable pixels. The offset is read from --legal-anchor-offset, the
    // same token that keeps an anchored heading clear of the nav, so the
    // detection line and the scroll target cannot drift apart.
    // Read from a heading, not from documentElement: the token is declared on
    // the page container (.page in LegalPage.module.scss), so it does not
    // inherit up to <html> and reading it there returns an empty string.
    const styleLine = Number.parseFloat(
      getComputedStyle(headings[0]!).getPropertyValue("--legal-anchor-offset"),
    );
    // Well below the anchor offset, so a section becomes current while its
    // heading is still comfortably on screen rather than at the moment it slides
    // under the nav. A reader treats a section as "the one I am in" as soon as
    // it is the thing they are looking at, not once its title has gone.
    //
    // 96 + 160 = 256px: roughly a quarter of a laptop viewport, and the point at
    // which the previous section's last answer has left the reading area.
    const LINE = (Number.isFinite(styleLine) ? styleLine : 96) + 160;

    // Read positions rather than accumulate observer state.
    //
    // The earlier version tracked which headings had reported crossing and kept
    // the deepest — which is wrong, because an IntersectionObserver only fires
    // on a *crossing*. Headings well above the viewport stop reporting
    // entirely, so nothing arrives to mark them passed and the rail stuck on
    // section 1 no matter how far the reader scrolled. getBoundingClientRect
    // asks where things actually are, which cannot go stale.
    const sync = () => {
      // At the very bottom of the page the line stops being reachable: the last
      // sections are short, so the document runs out of scroll before their
      // headings ever climb to it, and the rail strands on whichever section
      // was last to make it. Measured on /faq: scrolled fully to the end, past
      // the final section's questions, the rail still read the section before
      // it. When there is no scroll left, the last heading is the one being
      // read, so say so.
      const scrollBottom = window.scrollY + window.innerHeight;
      // A small tolerance, because the browser's scroll maximum is fractional
      // at non-integer zoom levels and an exact comparison never matches.
      if (scrollBottom >= document.documentElement.scrollHeight - 2) {
        setActiveId(headings[headings.length - 1]!.id);
        return;
      }

      let current = sections[0]?.id ?? "";
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= LINE) {
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

    // A second observer whose root is collapsed to a thin band AT the reading
    // line, so every heading reports as it crosses the line itself rather than
    // only as it nears the viewport.
    //
    // This is what keeps the rail correct on Safari, which has no `scrollend`:
    // there the observers are the only triggers, and the wide band above can
    // stay silent through a long section. The two are cheap for the same
    // reason — an observer fires on crossings, not on frames.
    const lineIo = new IntersectionObserver(sync, {
      // Bottom margin pulls the root's bottom edge up to just under the line;
      // the top margin pulls its top edge down to just above it. What is left
      // is a ~2px band that a heading can only be inside while crossing.
      rootMargin: `-${LINE}px 0px -${Math.max(0, window.innerHeight - LINE - 2)}px 0px`,
      threshold: [0, 1],
    });
    for (const heading of headings) lineIo.observe(heading);

    // A heading taller than that band, or a jump landing between two of them,
    // can leave the observer silent. resize covers viewport changes, which move
    // the line itself.
    //
    // It re-runs the whole effect rather than just `sync`, because lineIo's
    // rootMargin is computed from innerHeight at construction time: after a
    // resize its band would sit at the old line. Bumping the state rebuilds
    // both observers against the new viewport.
    const onResize = () => {
      sync();
      setViewportEpoch((n) => n + 1);
    };
    window.addEventListener("resize", onResize, { passive: true });
    // Hash navigation and back/forward do not always produce a crossing.
    window.addEventListener("hashchange", sync);

    // `scrollend`, which is what makes this reliable rather than nearly
    // reliable. The observer alone leaves the rail stale whenever a scroll
    // stops without crossing a heading — measured on /faq: jumping so that a
    // heading sat 80px from the top left the rail reading the PREVIOUS section,
    // and it stayed there no matter how much further the jump went.
    //
    // This is not the scroll listener AGENTS.md rules out. That rule is about
    // per-frame handlers: `scroll` fires continuously through a gesture and
    // costs main-thread time on every frame of it. `scrollend` fires ONCE, when
    // scrolling has actually stopped, so it is the same order of cost as the
    // observer callbacks already here.
    //
    // Chrome/Edge 114+, Firefox 109+. Safari has not shipped it, which is why
    // the IntersectionObserver above stays: there it remains the only trigger,
    // and the behaviour is what it was before this line existed.
    window.addEventListener("scrollend", sync, { passive: true });

    sync();

    return () => {
      io.disconnect();
      lineIo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("scrollend", sync);
    };
  }, [sections, viewportEpoch]);

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
