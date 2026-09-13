import { Fragment } from "react";
import { Placeholder } from "../LegalPage";
import type { FaqEntry } from "../../content/faq";
import styles from "./Faq.module.scss";

/**
 * One question. A native <details>/<summary> — no client JS at all.
 *
 * The platform already does disclosure: keyboard operation, the expanded state
 * in the accessibility tree, and find-in-page opening a closed answer (Chrome
 * and Safari search `content-visibility: auto` subtrees, which a div-and-state
 * implementation cannot offer). A React version would add a client component,
 * an id, aria-expanded, aria-controls and a keydown handler to arrive at what
 * the browser gives for nothing.
 *
 * The answers are also all present in the HTML whether open or closed, so the
 * whole page is indexable and readable by a screen reader without a single
 * interaction — which is the point of putting 34 answers behind disclosures.
 */
export function FaqAccordion({ entry }: { entry: FaqEntry }) {
  return (
    <details className={styles.entry} id={entry.id}>
      {/*
        No role and no aria-expanded. Both would be redundant: Chromium exposes
        a bare <summary> as role DisclosureTriangle carrying an `expanded`
        property that tracks the parent's open state, verified against the
        accessibility tree rather than assumed.

        Note that Playwright's getByRole("button") does NOT match it — that is a
        gap in the role selector, not in what a screen reader is told, and
        e2e/faq.spec.ts locates these by element for that reason. Adding
        role="button" to satisfy a locator would be changing the product to suit
        the test.
      */}
      <summary className={styles.question}>
        <span className={styles.questionText}>{entry.question}</span>
        {/*
          aria-hidden: the chevron is state already announced by <summary>'s
          own expanded/collapsed role. A second announcement is noise.

          currentColor and no fill, so it inherits the summary's colour
          transitions rather than declaring its own.
        */}
        <svg
          className={styles.chevron}
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className={styles.answer}>
        {entry.answer.map((paragraph, i) => (
          <p key={i}>{renderPlaceholders(paragraph)}</p>
        ))}
        {entry.pending ? (
          <p className={styles.pendingNote}>
            <Placeholder>{entry.pending}</Placeholder>
          </p>
        ) : null}
      </div>
    </details>
  );
}

/**
 * Wraps every `{…}` span in the answer with the placeholder marker.
 *
 * Braces rather than square brackets: no other prose on the site uses them, so
 * a false positive is impossible, and an unfilled fact is both visually
 * obvious in review and greppable in the built HTML as data-placeholder.
 *
 * The split keeps the delimiters in the result array (the capture group), so
 * odd indices are the matches and even ones the surrounding text.
 */
function renderPlaceholders(text: string) {
  const parts = text.split(/\{([^}]+)\}/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <Placeholder key={i}>{part}</Placeholder> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** The plain-text answer, placeholder braces stripped. Used for the JSON-LD. */
export function plainAnswer(entry: FaqEntry): string {
  return entry.answer.join(" ").replace(/[{}]/g, "");
}
