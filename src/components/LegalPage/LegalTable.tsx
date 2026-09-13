import type { ReactNode } from "react";
import styles from "./LegalPage.module.scss";

/**
 * Scroll container for a table. A table is one of the few things allowed to
 * exceed the prose measure (AGENTS.md), provided it scrolls itself rather than
 * the page — the page body must never scroll horizontally.
 *
 * The wrapper is a focusable, labelled group, which is not decoration: a
 * horizontally scrollable region with nothing focusable inside it cannot be
 * scrolled by keyboard at all (WCAG 2.1.1, and axe's
 * scrollable-region-focusable — it failed on Pixel 7, where these tables
 * genuinely overflow). tabIndex makes it reachable, and role + aria-label give
 * it a name so a screen-reader user arriving at the stop knows what it is
 * rather than landing on an anonymous scroll box.
 *
 * jsx-a11y/no-noninteractive-tabindex disagrees and is disabled on the
 * attribute below. The two checks genuinely conflict: the lint rule reasons
 * from the element's role alone and cannot see that it scrolls, while axe
 * measures real overflow in a real viewport. Keyboard access is a floor
 * (AGENTS.md), so axe wins. If these tables ever stop overflowing at every
 * breakpoint, remove the tabIndex and the disable together.
 */
export function LegalTable({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div
      className={styles.tableWrap}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- required by axe scrollable-region-focusable; see the note above
      tabIndex={0}
      role="group"
      aria-label={caption ? `${caption} (scrollable)` : "Scrollable table"}
    >
      <table className={styles.table}>
        {/* Names the table for screen-reader users, who meet it out of the
            surrounding prose context. Visually hidden — the heading above it
            already labels it for sighted readers. */}
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

/**
 * A two-column key/value table — entity details, contact rows.
 *
 * Row headers are <th scope="row">, not <td>: the left column labels its row,
 * and marking it up as a header is what lets a screen reader announce
 * "Trade licence number: …" rather than reading two unrelated cells.
 */
export function LegalDefTable({
  rows,
  caption,
}: {
  rows: readonly { label: string; value: ReactNode }[];
  caption: string;
}) {
  return (
    <LegalTable caption={caption}>
      <tbody>
        {rows.map(({ label, value }) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </LegalTable>
  );
}
