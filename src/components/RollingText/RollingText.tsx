import styles from "./RollingText.module.scss";

type RollingTextProps = {
  children: string;
  /** Seconds between each character starting its roll. */
  stagger?: number;
  className?: string;
};

/**
 * Character-roll hover effect: each letter slides up and out while a copy
 * rolls in from below, staggered left to right.
 *
 * Server Component, no JavaScript. One span per character, and nothing else
 * per character: the incoming copy is the character's own `text-shadow`,
 * drawn one line below it, and the stagger comes from :nth-child rules in the
 * stylesheet. It was four spans and an inline style per character, which in
 * the nav and footer came to about 1,500 elements on every page, repeated in
 * the page's embedded React data (measured 2026-09-28: the footer was 1,284 of
 * the homepage's 1,870 elements). Every one was parsed, styled, laid out and
 * hydrated on load, on a phone.
 *
 * The animated copy is aria-hidden and the real text sits beside it, so
 * screen readers announce the word once, not letter by letter.
 */
export function RollingText({ children, stagger = 0.02, className }: RollingTextProps) {
  return (
    <span
      className={[styles.roll, className].filter(Boolean).join(" ")}
      // One custom property per word, not one per character.
      style={
        stagger === 0.02 ? undefined : ({ "--roll-stagger": `${stagger}s` } as React.CSSProperties)
      }
    >
      {/* The accessible name. Splitting text into per-character spans makes
          some screen readers spell the word out, so the real text is here and
          the animated copy is hidden from the a11y tree. */}
      <span className={styles.label}>{children}</span>

      <span className={styles.animation} aria-hidden="true">
        {[...children].map((char, i) => (
          // Characters have no stable identity; index is the correct key.
          <span key={i} className={styles.char}>
            {/* Non-breaking space keeps the cell width for real spaces. */}
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </span>
  );
}
