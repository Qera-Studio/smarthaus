/**
 * The newest IntersectionObserver entry, for an observer that watches one
 * target.
 *
 * A callback can receive several queued entries for the same target at once,
 * oldest first. It happens whenever the target crosses twice before the
 * browser delivers: most often when the page scrolls just as the observer
 * starts, so "visible at start" and "scrolled away" arrive together. Reading
 * the first entry applies the stale state and drops the current one, and no
 * later crossing comes to correct it. Measured on the nav: scrolled to 80px
 * with the sentinel 80px above the viewport, the capsule never formed.
 *
 * For an observer with several targets, entries hold one per changed target
 * and this is the wrong tool: fold over them by target instead.
 */
export function latestEntry(
  entries: readonly IntersectionObserverEntry[],
): IntersectionObserverEntry | undefined {
  return entries[entries.length - 1];
}
