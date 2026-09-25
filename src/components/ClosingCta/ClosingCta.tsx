import { Button } from "../Button";
import styles from "./ClosingCta.module.scss";

type ClosingCtaProps = {
  /** The question, as a heading. Short — this is a prompt, not a paragraph. */
  heading: string;
  /** One or two sentences under it. */
  body: string;
  /** Where the button goes. */
  href: string;
  /** Button text. */
  label: string;
  /**
   * An optional second, quieter action. Left out on every page but one: see
   * the note below on why one action is the default.
   */
  secondary?: { href: string; label: string };
};

/**
 * A centred closing prompt: heading, a line of copy, one button.
 *
 * Sits at the end of a page to give a reader who got all the way down
 * somewhere to go. One action by default — a second button here splits the
 * attention of someone who has already read everything and is deciding.
 *
 * `secondary` is the exception, for the one case where a reader plausibly has
 * a second, different question rather than a hesitation about the first: the
 * pricing page, where "book a visit" and "read the full FAQ" are not the same
 * decision. It renders as the outline variant so the primary still reads as
 * the primary.
 *
 * Every string is a prop rather than baked in, because the copy is
 * page-specific and this is meant to be reused at the foot of other pages. It
 * carries no claims of its own for the same reason: what it says is the calling
 * page's business, which matters on a site where the claims audit governs every
 * factual statement.
 *
 * Heading level is h2. It closes a page whose h1 is the page title, and it is a
 * sibling of the content sections rather than nested inside one, so h2 is the
 * level that keeps the outline valid. Not configurable: a prop here would let a
 * caller skip a level.
 */
export function ClosingCta({ heading, body, href, label, secondary }: ClosingCtaProps) {
  return (
    <section className={styles.closing}>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.body}>{body}</p>
      {/* The wrapper owns the spacing, not the button: see Button.tsx. */}
      <div className={styles.ctaRow}>
        <Button href={href}>{label}</Button>
        {secondary ? (
          <Button href={secondary.href} variant="outline">
            {secondary.label}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
