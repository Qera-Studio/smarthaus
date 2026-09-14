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
    .replace(/^0(?=5)/, "+971")
    // Bare subscriber number: 5x xxx xxxx, no trunk zero and no country code.
    // The form prints "+971" beside the input, so this is the form the UI
    // itself invites — rejecting it made the visible prefix a trap.
    .replace(/^(?=5\d{8}$)/, "+971");

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
 *
 * `null` is accepted alongside it because `FormData.get` returns null for a
 * field that is not in the payload at all — which is every optional field the
 * short form omits, and any field a future variant stops rendering. A rendered
 * -but-empty input posts "", so this does not affect the current page; it stops
 * a dropped field from failing validation with a message about the wrong thing.
 */
const optionalText = z
  .union([z.string(), z.null()])
  .transform((value) => (value ?? "").trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalEmail = optionalText.refine(
  (value) => value === undefined || z.email().safeParse(value).success,
  { message: "Check the email address." },
);

/**
 * An unticked checkbox posts nothing at all; a ticked one posts "on". So the
 * absence of the key is the "no" case, and only the literal "on" is a yes.
 *
 * Written as a coercion rather than `z.boolean()` because FormData never
 * carries booleans — a naive boolean schema would reject every submission.
 */
const checkbox = z
  .union([z.literal("on"), z.undefined(), z.null()])
  .transform((value) => value === "on")
  // `.optional()` so a MISSING key parses, not just an explicit `undefined`.
  // Without it the union rejects an absent property, and an unticked box is
  // absent from FormData — so the optional marketing box would have failed
  // every submission where the visitor left it alone, which is most of them.
  .optional()
  .transform((value) => value === true);

/**
 * Contact consent, and the reason it is a separate field from marketing.
 *
 * Legal §6 prohibits bundled consent, and the consent deck records a standing
 * objection to this checkbox even in its narrowed form: requiring a tick to get
 * a reply makes the consent less than freely given, which is a weak basis —
 * while "steps toward a contract", the basis the privacy policy already
 * states, is strong and needs no tick at all.
 *
 * It is kept because the deck's §6.1 narrowed it to consent for one specific
 * thing rather than dropping it, and that is the reviewed position. If counsel
 * later takes the notice-only variant, this becomes `.optional()` and the
 * component renders a line of static text: see the note in ContactForm.
 */
const contactConsent = checkbox.refine((value) => value === true, {
  message: "Please confirm you would like us to contact you about your enquiry.",
});

const baseSchema = z.object({
  name,
  phone,
  email: optionalEmail,
  community: optionalText,
  message: optionalText,
  /**
   * Not from the brief's field list. `interest` is a closed set, so an
   * unrecognised value means the payload was not produced by our form.
   * Omitted entirely by the short form — see shortContactSchema.
   */
  interest: z.enum(INTERESTS),
  /** Required. See contactConsent above for why that is contested. */
  contactConsent,
  /**
   * Marketing, and never required. Separate from contactConsent because
   * Legal §6 requires marketing consent to be distinct from service consent —
   * bundling them is precisely what "no bundled consent" prohibits. Unticked by
   * default; a pre-ticked box is basket sneaking.
   */
  marketingConsent: checkbox,
});

/** The full contact-page form: every field, consent ticked. */
export const contactSchema = baseSchema;

/**
 * The short homepage form: name, email, phone, message, and nothing else.
 *
 * `contactConsent` is dropped rather than made optional-but-present, because
 * the short form carries the §6.4 notice-only variant instead of a checkbox —
 * a static line of text stating the purpose, resting on the "steps toward a
 * contract" basis the privacy policy already asserts. Keeping the field here
 * as an unticked optional would record a "no" against a visitor who was never
 * asked, which is worse than recording nothing.
 *
 * Omitting rather than loosening also keeps the contact page's required tick
 * genuinely required: the two forms cannot drift into one permissive schema.
 */
export const shortContactSchema = baseSchema.omit({
  community: true,
  interest: true,
  contactConsent: true,
  marketingConsent: true,
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.infer<typeof contactSchema>;

/**
 * The honeypot's field name. `company` rather than anything containing "honey"
 * or "hp" — a bot that reads field names should see a field it wants to fill.
 */
export const HONEYPOT_FIELD = "company";
