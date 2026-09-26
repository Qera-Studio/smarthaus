/**
 * The desktop capsule is built from two widths that depend on how the platform
 * renders Manrope: the link row and the CTA. The stylesheet falls back to the
 * macOS measurements (384px and 129px); Chrome on Linux renders the row about
 * 10px wider, which took 5px out of each gap beside it. CSS cannot read an
 * element's width into calc(), so this writes the rendered widths where the
 * stylesheet reads them, and again whenever either changes: a web font
 * landing, a zoom, a copy change.
 *
 * Border-box sizes from the observer, not getBoundingClientRect: layout size,
 * unaffected by any transform. Below lg both elements sit in the mobile panel
 * and the values written are meaningless, but nothing there reads them.
 */
export function trackNavWidths(
  header: HTMLElement,
  links: HTMLElement,
  cta: HTMLElement,
): () => void {
  const observer = new ResizeObserver((entries) => {
    // Every entry in order, so when one target reports twice the newest wins.
    for (const entry of entries) {
      const property = entry.target === links ? "--nav-links-row" : "--nav-cta-width";
      header.style.setProperty(property, `${entry.borderBoxSize[0]!.inlineSize}px`);
    }
  });
  observer.observe(links);
  observer.observe(cta);
  return () => observer.disconnect();
}
