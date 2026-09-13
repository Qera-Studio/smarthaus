/**
 * The enquiry form's state shape.
 *
 * Deliberately NOT in actions.ts. A "use server" module may only export async
 * functions — any other export (a const, an object) is rejected when the module
 * is evaluated, so every action call 500s rather than just the one that touches
 * it. Types alone would be fine, since they erase at compile time, but
 * INITIAL_STATE is a real object and has to live outside.
 */

export type FieldErrors = Partial<Record<"name" | "phone" | "email" | "interest", string>>;

export type ContactState =
  | { status: "idle" }
  /** Values echoed back for the confirmation copy. */
  | { status: "ok"; name: string; phone: string }
  | { status: "invalid"; fieldErrors: FieldErrors }
  /** The send itself failed. Distinct from "invalid": nothing the user typed is wrong. */
  | { status: "failed" };

export const INITIAL_STATE: ContactState = { status: "idle" };
