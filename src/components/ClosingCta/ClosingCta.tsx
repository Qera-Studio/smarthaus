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
};

/**
 * A centred closing prompt: heading, a line of copy, one button.
 *
 * Sits at the end of a page to give a reader who got all the way down
 * somewhere to go. Deliberately one action — a second button here would split
 * the attention of someone who has already read everything and is deciding.
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
export function ClosingCta({ heading, body, href, label }: ClosingCtaProps) {
  return (
    <section className={styles.closing}>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.body}>{body}</p>
      {/* The wrapper owns the spacing, not the button: see Button.tsx. */}
      <div className={styles.ctaRow}>
        <Button href={href}>{label}</Button>
      </div>
    </section>
  );
}
