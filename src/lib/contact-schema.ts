import { z } from "zod";

/**
 * The enquiry form's contract. The server is the only validator that matters —
 * the browser's own constraint validation is a convenience, not a boundary.
 *
 * Error strings live here rather than in the component so the message a field
 * shows and the message the server produced cannot drift apart.
 */

/** Verbatim from the brief. The value IS the label — there is no code to map. */
export const INTERESTS = [
  "Smart home for my villa",
  "Cameras and security",
  "Both",
  "I'm a designer or project manager",
  "Something else",
] as const;

/**
 * A UAE number, written the way people actually write it: `+971 54 375 5150`,
 * `0543755150`, `971-54-375-5150`, `00971…`.
 *
 * Canonicalises to E.164 rather than merely stripping punctuation. The value
 * that survives here is what gets logged, what a future Resend email carries,
 * and what the confirmation reads back to the visitor — so `0543755150` and
 * `+971 54 375 5150` must not become two different records of one number.
 */
const normalisePhone = (value: string) =>
  value
    .replace(/[\s\-().]/g, "")
    // 00971… and 971… are both the international form written without the +.
    .replace(/^00/, "+")
    .replace(/^971/, "+971")
    // Local trunk prefix: 0 5x… is the same subscriber as +971 5x….
    .replace(/^0(?=5)/, "+971");

/**
 * E.164 only, because normalisePhone has already converted the local form.
 * Deliberately not a general matcher: this business installs in the UAE, and a
 * +44 number in the field is far more likely a typo than a real lead.
 */
const UAE_PHONE = /^\+9715\d{8}$/;

const name = z.string().trim().min(1, { message: "Add your name so we know who we're calling." });

const phone = z
  .string()
  .trim()
  .min(1, { message: "Add a phone number so we can call you back." })
  .transform(normalisePhone)
  .refine((value) => UAE_PHONE.test(value), {
    message: "Check the number. It should start with +971 or 05.",
  });

/**
 * Optional fields treat "" as absent. An empty input always posts an empty
 * string, so without this an untouched email field would fail format checks.
 */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalEmail = optionalText.refine(
  (value) => value === undefined || z.email().safeParse(value).success,
  { message: "Check the email address." },
);

export const contactSchema = z.object({
  name,
  phone,
  email: optionalEmail,
  community: optionalText,
  message: optionalText,
  /**
   * Not from the brief's field list. `interest` is a closed set, so an
   * unrecognised value means the payload was not produced by our form.
   */
  interest: z.enum(INTERESTS),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.infer<typeof contactSchema>;

/**
 * The honeypot's field name. `company` rather than anything containing "honey"
 * or "hp" — a bot that reads field names should see a field it wants to fill.
 */
export const HONEYPOT_FIELD = "company";
