import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import styles from "./Button.module.scss";

/**
 * The one button in the codebase.
 *
 * This band was copy-pasted three times before it existed — ClosingCta,
 * ComingSoon and the contact form's submit — and ClosingCta's stylesheet
 * carried a note saying the third copy was the trigger to extract it. The
 * pricing section needed three more, which made the note overdue.
 *
 * No `className` prop, on purpose. A CSS Module's class names are local to its
 * file, so a caller passing one is how a fourth visual variant appears without
 * anyone deciding it should exist. A new look is a new `variant` here, reviewed
 * once, rather than an override at the call site.
 *
 * Outer spacing is the parent's job for the same reason: a button that carries
 * its own `margin-block-start` positions itself differently in every layout it
 * lands in, and the value is invisible from the markup.
 *
 * Square corners are the brand rule, not a default — see the commit that took
 * the radius off every control.
 */

/**
 * - `solid` — brown-950 ground, bone text. The default, and every existing
 *   call site.
 * - `inverse` — bone ground, brown-900 text. For sitting on a dark section.
 * - `outline` — transparent, a 1px border in the inherited ink. For sitting on
 *   a tinted card where a filled band would be too loud.
 * - `soft` — brown-800 ground, bone text. A filled band one step lighter than
 *   solid, for a light section where brown-950 read as too heavy (the Maple
 *   banner).
 */
type Variant = "solid" | "inverse" | "outline" | "soft";

/**
 * - `md` — the default band, every existing call site.
 * - `sm` — tighter padding, for a secondary action inside a compact card (the
 *   Maple banner). The tap area stays at --size-touch-target regardless.
 */
type Size = "md" | "sm";

/**
 * `href` decides the element: present renders a Link, absent a button.
 *
 * Discriminated rather than a single optional `href`, so `type="submit"` on a
 * link and `href` on a button are both type errors instead of silently dropped
 * attributes.
 */
type ButtonProps =
  | ({ href: string; variant?: Variant; size?: Size } & Omit<
      ComponentPropsWithoutRef<typeof Link>,
      "className" | "href"
    >)
  | ({
      href?: never;
      variant?: Variant;
      size?: Size;
      /**
       * Working: announced as busy and unavailable, but still focusable. A
       * `disabled` button drops focus to the page, so a keyboard or screen
       * reader user loses their place in the middle of a submit. The caller
       * stops the second submit (the contact form does, on its onSubmit).
       */
      loading?: boolean;
    } & Omit<ComponentPropsWithoutRef<"button">, "className">);

export function Button({ variant = "solid", size = "md", ...props }: ButtonProps) {
  const className = styles.button;

  if (props.href !== undefined) {
    return <Link {...props} className={className} data-variant={variant} data-size={size} />;
  }

  // `href` is absent, so this is the button arm. Deleted rather than spread,
  // because React warns on an `href={undefined}` reaching a <button>. `type`
  // defaults to "button" so one inside a form cannot submit it by accident.
  const { type = "button", loading = false, ...rest } = props;
  delete rest.href;
  return (
    <button
      {...rest}
      type={type}
      className={className}
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      aria-disabled={loading || rest["aria-disabled"] || undefined}
    />
  );
}
