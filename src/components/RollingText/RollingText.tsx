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
 * Server Component — no JavaScript ships. The animation is two stacked copies
 * of each character moved by CSS transforms, with the per-character delay set
 * by a custom property on each span.
 *
 * The duplicate copy is aria-hidden and the whole effect is wrapped so screen
 * readers announce the word once, not letter by letter.
 */
export function RollingText({ children, stagger = 0.02, className }: RollingTextProps) {
  const chars = [...children];

  return (
    <span className={[styles.roll, className].filter(Boolean).join(" ")}>
      {/* The accessible name. Splitting text into per-character spans makes
          some screen readers spell the word out, so the real text is here and
          the animated copy is hidden from the a11y tree. */}
      <span className={styles.label}>{children}</span>

      <span className={styles.animation} aria-hidden="true">
        {chars.map((char, i) => (
          <span
            // Characters have no stable identity; index is the correct key.
            key={i}
            className={styles.char}
            style={{ "--char-delay": `${i * stagger}s` } as React.CSSProperties}
          >
            {/* Non-breaking space keeps the column width for real spaces. */}
            <span className={styles.charIn}>{char === " " ? " " : char}</span>
            <span className={styles.charOut}>{char === " " ? " " : char}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
