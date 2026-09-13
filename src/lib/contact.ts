/**
 * The public contact details, in one place.
 *
 * The same number appears in three formats and they are not interchangeable:
 * `tel:` wants E.164 with no spaces, wa.me wants digits with no `+`, and the
 * visible copy wants it grouped. Deriving all three from one raw value would
 * need a formatter per format, which is more code than three constants.
 *
 * The legal pages keep their own literals on purpose. e2e/legal.spec.ts asserts
 * against them as published identity-table facts, so they are not free to move.
 */

/** `tel:` href. E.164, no spaces — dialers reject the grouped form. */
export const PHONE_E164 = "+971543755150";

/** Visible copy. Never put this in an href. */
export const PHONE_DISPLAY = "+971 54 375 5150";

export const EMAIL = "contact@mapletech.ae";

/**
 * Registered address, as filed. Matches the privacy policy's identity table.
 * Split into lines because the location card renders each on its own row.
 */
export const ADDRESS_LINES = [
  "225, 2nd floor,",
  "The Iridium. Umm Suqeim St,",
  "Al Barsha First - Al Barsha,",
  "Dubai, U.A.E.",
] as const;

export const MAPS_URL = "https://maps.app.goo.gl/6TaV1nqiKs5StD566";

/**
 * Built from the env number rather than hardcoded, per AGENTS.md. Falls back to
 * the documented number from .env.example when unset so local dev and preview
 * builds do not render a broken link.
 */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "971543755150";

/**
 * A wa.me deep link, optionally pre-filled.
 *
 * encodeURIComponent, not URLSearchParams: the latter encodes spaces as `+`,
 * and WhatsApp renders those literally in the message box.
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
