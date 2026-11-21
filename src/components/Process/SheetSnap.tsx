"use client";

import { useEffect } from "react";

/** The stack's own gate (Process.module.scss): no stack, nothing to do. */
export const STACK_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 32rem)";

/**
 * How far up the screen the first sheet's top edge has to come before it
 * grows to fill it: four fifths of the screen covered, one fifth to go.
 */
export const SNAP_AT = 0.2;

/**
 * The Process stack's one piece of script (Shivanshu, 2026-11-14). Renders
 * nothing, and does two small things for the stylesheet:
 *
 * 1. Tells it how tall the held section is (--held-block), so that section
 *    can pin by its foot. CSS can only pin a box by its bottom edge if it
 *    knows the box's height.
 * 2. Marks the first sheet "waiting" while its top edge is below SNAP_AT of
 *    the screen and "in" once it is above. The stylesheet draws a waiting
 *    sheet at 80% and eases the change, so the sheet rises small and then
 *    grows to fill the screen, and shrinks again on the way back down.
 *
 * Everything stands in the server HTML at full size. If this never runs, the
 * section before the stack simply scrolls away and the first sheet is whole.
 * One ResizeObserver, one IntersectionObserver, no scroll listener.
 */
export function SheetSnap() {
  useEffect(() => {
    const stack = document.querySelector<HTMLElement>("[data-process-stack]");
    const sheet = stack?.querySelector<HTMLElement>("[data-process] li");
    if (!stack || !sheet) return;
    if (!window.matchMedia(STACK_QUERY).matches) return;

    const held = stack.querySelector<HTMLElement>("[data-process-held]");
    const measured = new ResizeObserver(() => {
      if (held) stack.style.setProperty("--held-block", `${held.offsetHeight}px`);
    });
    if (held) measured.observe(held);

    // The sheet grows from its top edge, so that edge is where the layout
    // put it at either size, and the root's margin leaves only the screen's
    // top fifth to cross into.
    const crossed = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          sheet.setAttribute("data-snap", entry.isIntersecting ? "in" : "waiting");
      },
      { rootMargin: `0px 0px -${(1 - SNAP_AT) * 100}% 0px` },
    );
    crossed.observe(sheet);

    return () => {
      measured.disconnect();
      crossed.disconnect();
      stack.style.removeProperty("--held-block");
      sheet.removeAttribute("data-snap");
    };
  }, []);

  return null;
}
