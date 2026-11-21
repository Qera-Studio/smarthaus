/**
 * The contact details live in Sanity (siteSettings.contact), and every page
 * reads them from there, so a published fact cannot say one thing on /contact
 * and another on /privacy.
 *
 * What stays here is what must work without Sanity: the link builder, and the
 * details the two error pages show. Those pages render when something has
 * failed, possibly the content itself, so they carry their own copy.
 * src/lib/__tests__/contact.test.ts holds it equal to the seed, and a change
 * of number in the Studio needs the same change here.
 *
 * The same number appears in three formats and they are not interchangeable:
 * `tel:` wants E.164 with no spaces, wa.me wants digits with no `+`, and the
 * visible copy wants it grouped.
 */

/**
 * A wa.me deep link, optionally pre-filled.
 *
 * encodeURIComponent, not URLSearchParams: the latter encodes spaces as `+`,
 * and WhatsApp renders those literally in the message box.
 */
export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** What the error pages show. Never read where Sanity can be. */
export const FALLBACK_CONTACT = {
  phoneE164: "+971543755150",
  phoneDisplay: "+971 54 375 5150",
  whatsapp: "971543755150",
  email: "hello@smarthaus.ae",
} as const;
