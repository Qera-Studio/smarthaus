import styles from "./Consent.module.scss";

type SwitchProps = {
  /** Form control name, and the id the label points at. */
  id: string;
  /** Accessible name. Rendered by the caller, so passed for aria-labelledby. */
  labelId: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  /**
   * Renders visibly on, and genuinely not operable.
   *
   * Used by the Essential row. The design brief is explicit that a switch which
   * looks interactive and silently refuses is a dark pattern in control form,
   * so this uses the real `disabled` attribute rather than swallowing the
   * change event.
   */
  disabled?: boolean;
  /** Extra description, for the row body copy. */
  describedBy?: string;
};

/**
 * The consent toggle.
 *
 * A native `<input type="checkbox" role="switch">` with `appearance: none`,
 * not a styled `<div>` — which the brief rules out and the accessibility floor
 * requires. Going native means `:checked` and `:disabled` reach CSS for free,
 * and keyboard operation, the accessibility tree, form semantics and
 * find-in-page all come from the platform rather than from a keydown handler.
 *
 * This is the same reasoning the contact page's `<select>` records (see
 * page.module.scss) and the FAQ accordion's use of `<details>`: style the
 * platform control, do not rebuild it.
 *
 * `role="switch"` on a checkbox is valid ARIA and is the right role here —
 * these are on/off states, not list selections, so a screen reader should
 * announce "on"/"off" rather than "checked"/"unchecked".
 *
 * There is no `aria-checked`: the native `checked` state already populates it,
 * and setting both is how the two drift apart.
 */
export function Switch({
  id,
  labelId,
  checked,
  onChange,
  disabled = false,
  describedBy,
}: SwitchProps) {
  return (
    <input
      type="checkbox"
      role="switch"
      id={id}
      className={styles.switch}
      checked={checked}
      disabled={disabled}
      // A disabled control is dropped from the tab order but stays in the
      // accessibility tree, which is what "information, not a choice" needs.
      // aria-disabled is added as well so assistive tech announces the reason
      // rather than simply skipping it.
      aria-disabled={disabled || undefined}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      onChange={onChange ? (event) => onChange(event.currentTarget.checked) : undefined}
    />
  );
}
