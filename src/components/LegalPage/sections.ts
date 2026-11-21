/**
 * A section of a legal page or the FAQ. Each document lists its own sections
 * (the legal documents and the FAQ categories in Sanity), and the list is
 * consumed twice: the table of contents renders from it, and the page body's
 * <h2>s render from it, so a heading and its ToC entry cannot drift apart.
 *
 * `short` is the ToC label. Some headings are too long to sit in a 220px rail
 * without wrapping to three lines, so the rail gets an abbreviated label while
 * the heading itself stays complete for screen readers and search engines.
 */

export type LegalSection = {
  /** Scroll anchor and ToC target. Stable — these appear in shared URLs. */
  id: string;
  /** The full heading, rendered as the <h2>. */
  title: string;
  /** Optional shorter label for the ToC rail. Falls back to `title`. */
  short?: string;
};
