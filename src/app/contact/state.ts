/**
 * The enquiry form's state shape.
 *
 * Deliberately NOT in actions.ts. A "use server" module may only export async
 * functions — any other export (a const, an object) is rejected when the module
 * is evaluated, so every action call 500s rather than just the one that touches
 * it. Types alone would be fine, since they erase at compile time, but
 * INITIAL_STATE is a real object and has to live outside.
 */

export type FieldErrors = Partial<
  Record<
    "name" | "phone" | "email" | "community" | "interest" | "message" | "contactConsent",
    string
  >
>;

/**
 * What the visitor typed, echoed back so a re-render can refill the form.
 *
 * Raw strings exactly as submitted, NOT the parsed output: on an error there is
 * no parsed output, and a phone the normaliser rewrote to +971… should still
 * show the visitor the digits they actually typed.
 *
 * Consent ticks are deliberately absent. Re-ticking a consent box on the
 * visitor's behalf would be recording agreement they did not give on the
 * submission in front of them — Legal §6. They re-tick it themselves.
 */
export type SubmittedValues = Partial<
  Record<"name" | "phone" | "email" | "community" | "message" | "interest", string>
>;

export type ContactState =
  | { status: "idle" }
  /** Values echoed back for the confirmation copy. */
  | { status: "ok"; name: string; phone: string }
  /** `values` refills the form: an error must never cost the visitor their typing. */
  | { status: "invalid"; fieldErrors: FieldErrors; values: SubmittedValues }
  /** The send itself failed. Distinct from "invalid": nothing the user typed is wrong. */
  | {
      status: "failed";
      values: SubmittedValues;
      /** Set when the send was refused by the rate limit rather than failing. */
      reason?: "rate-limited";
    };

export const INITIAL_STATE: ContactState = { status: "idle" };

/** Fields worth echoing back. Consent ticks excluded — see SubmittedValues. */
const ECHOED = ["name", "phone", "email", "community", "message", "interest"] as const;

/**
 * Lift the raw strings out of a submission so a failed one can refill the form.
 *
 * Lives here rather than in actions.ts because a "use server" module may export
 * nothing but async functions, and this is neither async nor worth making so.
 * Only known fields are read, so nothing unexpected in the payload is echoed
 * back into the HTML.
 */
export function submittedValues(formData: FormData): SubmittedValues {
  const values: SubmittedValues = {};
  for (const field of ECHOED) {
    const value = formData.get(field);
    if (typeof value === "string" && value !== "") values[field] = value;
  }
  return values;
}
