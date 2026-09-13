import type { ReactNode } from "react";
import { LegalToc } from "./LegalToc";
import type { LegalSection } from "./sections";
import styles from "./LegalPage.module.scss";

type LegalPageProps = {
  title: string;
  /** One-line statement of what the document governs, above the fold. */
  standfirst: string;
  /**
   * Rendered into the metadata strip under the standfirst. Both optional, and
   * the strip is omitted entirely when neither is given — /faq reuses this
   * shell for its ToC rail and prose column, and a version number on an FAQ
   * would be a legal-document affordance applied to a page that is not one.
   */
  lastUpdated?: string;
  version?: string;
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
    // data-legal-page is the hook globals.scss uses to turn on smooth
    // scrolling for these pages only. It has to be a plain attribute, not the
    // CSS Module class, because that class name is hashed at build time and a
    // global stylesheet cannot select it.
    <div className={styles.page} data-legal-page>
      <div className={styles.layout}>
        {/*
          The rail is a <div> wrapper around the nav so the sticky positioning
          and the grid placement stay separate concerns: the wrapper holds the
          column, the nav inside it is what sticks.

          It spans both rows so its column starts at the top of the page rather
          than below the header. With the header outside this grid the rail
          began 463px down a 900px screen and its last entries were unreachable
          until the reader scrolled.
        */}
        <div className={styles.rail}>
          <LegalToc sections={sections} label={`${title} sections`} />
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.standfirst}>{standfirst}</p>
          {lastUpdated || version ? (
            <dl className={styles.meta}>
              {lastUpdated ? (
                <div className={styles.metaPair}>
                  <dt className={styles.metaLabel}>Last updated</dt>
                  <dd className={styles.metaValue}>{lastUpdated}</dd>
                </div>
              ) : null}
              {version ? (
                <div className={styles.metaPair}>
                  <dt className={styles.metaLabel}>Version</dt>
                  <dd className={styles.metaValue}>{version}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </header>

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
