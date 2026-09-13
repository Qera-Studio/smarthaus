import type { ReactNode } from "react";
import { LegalToc } from "./LegalToc";
import type { LegalSection } from "./sections";
import styles from "./LegalPage.module.scss";

type LegalPageProps = {
  title: string;
  /** One-line statement of what the document governs, above the fold. */
  standfirst: string;
  /** Rendered into the metadata strip under the standfirst. */
  lastUpdated: string;
  version: string;
  sections: readonly LegalSection[];
  /** The document body — a sequence of <LegalSection> elements. */
  children: ReactNode;
};

/**
 * Server Component. The shared shell for /privacy and /terms: header, the
 * fixed table-of-contents rail, and the prose column.
 *
 * Only the rail's active-section tracking is client-side (LegalToc); the
 * headings, prose and links all stay server-rendered, which keeps the whole
 * legal surface at one small observer's worth of JS. The text is also then
 * fully present in the HTML for crawlers and for a reader with JS disabled —
 * the rail still works as plain anchor links in that case.
 */
export function LegalPage({
  title,
  standfirst,
  lastUpdated,
  version,
  sections,
  children,
}: LegalPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.standfirst}>{standfirst}</p>
        <dl className={styles.meta}>
          <div className={styles.metaPair}>
            <dt className={styles.metaLabel}>Last updated</dt>
            <dd className={styles.metaValue}>{lastUpdated}</dd>
          </div>
          <div className={styles.metaPair}>
            <dt className={styles.metaLabel}>Version</dt>
            <dd className={styles.metaValue}>{version}</dd>
          </div>
        </dl>
      </header>

      <div className={styles.layout}>
        {/*
          The rail is a <div> wrapper around the nav so the fixed positioning
          and the grid placement are separate concerns: the wrapper holds the
          column, the inner nav is what gets fixed to the viewport centre.
        */}
        <div className={styles.rail}>
          <LegalToc sections={sections} label={`${title} sections`} />
        </div>

        <article className={styles.prose}>{children}</article>
      </div>
    </div>
  );
}

type LegalSectionBlockProps = {
  section: LegalSection;
  children: ReactNode;
};

/**
 * One numbered section of a legal document.
 *
 * The id sits on the <h2>, not on the <section>: the IntersectionObserver in
 * LegalToc tracks the heading crossing the viewport's reading line, and
 * observing the whole section would mean tracking an element taller than the
 * viewport, where "is it visible" stops meaning "are we reading it".
 *
 * scroll-margin-block-start on the heading (see the SCSS) keeps the anchor
 * target clear of the fixed nav when the ToC is used or a #hash URL is opened.
 */
export function LegalSectionBlock({ section, children }: LegalSectionBlockProps) {
  return (
    <section className={styles.section} aria-labelledby={section.id}>
      <h2 className={styles.sectionTitle} id={section.id}>
        {section.title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A callout for the clauses that carry the most weight for a reader — the
 * "nothing here is a quotation" clause, the deletion-versus-retention note.
 * Presentational, but it earns its place: these are the paragraphs a careful
 * buyer is looking for, and burying them in body copy reads as hiding them.
 */
export function LegalNote({ children }: { children: ReactNode }) {
  return <div className={styles.note}>{children}</div>;
}

/**
 * The placeholder marker. Every unresolved fact in the source markdown renders
 * through this, so an unfilled value is visually obvious in review and
 * greppable in the built HTML — rather than silently reading as real.
 *
 * REMOVE EVERY USAGE BEFORE PUBLICATION. The pages are drafts pending the
 * counsel review these documents require; this component is the mechanism that
 * stops a placeholder shipping unnoticed.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className={styles.placeholder} data-placeholder="true">
      {children}
    </mark>
  );
}
