/**
 * The enquiry form's plain constants, with no Zod in sight.
 *
 * ContactForm, a client component, needs these three values. They lived in
 * ./contact-schema, which imports Zod and builds the schemas as it loads, so
 * reading them shipped the whole of Zod to every visitor and ran it at load:
 * on a mid-range phone the form pages spent roughly 0.5 to 1s more on script
 * than /pricing (CI Lighthouse, 2026-09-28). Validation is server-only, so the
 * browser never needed it. e2e/contact.spec.ts asserts no Zod reaches the
 * browser.
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
 * Length caps (Security System §4: bound every input). Generous for a person,
 * useless for a script pasting a novel into the inbox. The form sets the same
 * numbers as `maxLength`, so a visitor can never type past one and meet this
 * error; the server check is for requests that did not come from the form.
 * The two count differently, in the safe direction: the browser's maxLength
 * counts UTF-16 units (an emoji is two), Zod counts code points (an emoji is
 * one). The browser is always the stricter, so the server never refuses what
 * the field allowed.
 */
export const MAX_LENGTH = {
  name: 120,
  phone: 32,
  email: 254,
  community: 120,
  message: 2000,
} as const;

/**
 * The honeypot's field name. `company` rather than anything containing "honey"
 * or "hp" — a bot that reads field names should see a field it wants to fill.
 */
export const HONEYPOT_FIELD = "company";
