/**
 * Social profiles.
 *
 * Icon geometry is inline here rather than in public/ so it inherits
 * currentColor — the same reasoning as the Logo component, and the house
 * precedent set by Nav's inline hamburger. All paths are authored on a 24x24
 * viewBox.
 *
 * PLACEHOLDER GEOMETRY. The `path` values below are stand-ins so the layout,
 * chip sizing and hover states can be built and reviewed. Replace each with
 * the real brand glyph before this ships — the shape of this array is what
 * matters, swapping the `d` strings needs no other change.
 *
 * The `href` values are likewise placeholders and must be confirmed against
 * the real accounts before launch.
 */

export type Social = {
  readonly id: string;
  /** Accessible name. Names the platform AND the brand: "WhatsApp" alone is
   *  ambiguous when a screen reader reads a list of links out of context. */
  readonly label: string;
  readonly href: string;
  /** Single path on a 24x24 viewBox. */
  readonly path: string;
};

/**
 * WhatsApp is built from the env number rather than hardcoded, per AGENTS.md.
 * Falls back to the documented number from .env.example when unset so local
 * dev and preview builds do not render a broken link.
 */
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "971543755150";

export const SOCIALS: readonly Social[] = [
  {
    id: "whatsapp",
    label: "Smarthaus on WhatsApp",
    href: `https://wa.me/${whatsappNumber}`,
    // ponytail: placeholder glyph — swap for the real WhatsApp mark.
    path: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Z",
  },
  {
    id: "instagram",
    label: "Smarthaus on Instagram",
    href: "https://instagram.com/",
    // ponytail: placeholder glyph — swap for the real Instagram mark.
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.5-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  },
  {
    id: "facebook",
    label: "Smarthaus on Facebook",
    href: "https://facebook.com/",
    // ponytail: placeholder glyph — swap for the real Facebook mark.
    path: "M13 22v-8h3l.5-3H13V9c0-.9.3-1.5 1.5-1.5H17V5h-2.5C11.8 5 10 6.6 10 9.3V11H7v3h3v8h3Z",
  },
  {
    id: "x",
    label: "Smarthaus on X",
    href: "https://x.com/",
    // ponytail: placeholder glyph — swap for the real X mark.
    path: "M3 3h4.5l4.2 5.8L16.8 3H21l-6.8 8.2L21.5 21H17l-4.5-6.2L6.9 21H3l7.2-8.6L3 3Z",
  },
  {
    id: "linkedin",
    label: "Smarthaus on LinkedIn",
    href: "https://linkedin.com/",
    // ponytail: placeholder glyph — swap for the real LinkedIn mark.
    path: "M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.6 8.7c4 0 4.4 2.4 4.4 5.6V21h-4v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21h-4V9Z",
  },
] as const;
