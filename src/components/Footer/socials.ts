/**
 * Social profiles.
 *
 * Icon geometry is inline here rather than in public/ so it inherits
 * currentColor — the same reasoning as the Logo component, and the house
 * precedent set by Nav's inline hamburger. All paths are authored on a 24x24
 * viewBox.
 *
 * PLACEHOLDER GEOMETRY, except WhatsApp's. The other `path` values are stand-ins so the layout,
 * chip sizing and hover states can be built and reviewed. Replace each with
 * the real brand glyph before this ships — the shape of this array is what
 * matters, swapping the `d` strings needs no other change.
 *
 * The `href` values are likewise placeholders and must be confirmed against
 * the real accounts before launch. Until then each one carries `pending`, and
 * its label says "(profile coming soon)": the link lands on the platform's
 * home page, and a label promising "Smarthaus on Instagram" would tell a
 * screen-reader user something the link does not do.
 * src/components/Footer/__tests__/socials.test.ts holds the two together: a
 * pending link must be a bare platform home page with the suffix, and clearing
 * `pending` fails until the href is a real profile and the suffix is gone.
 */

import { whatsappLink } from "../../lib/contact";

export type Social = {
  readonly id: string;
  /** Accessible name. Names the platform AND the brand: "WhatsApp" alone is
   *  ambiguous when a screen reader reads a list of links out of context. */
  readonly label: string;
  readonly href: string;
  /** Single path on a 24x24 viewBox. */
  readonly path: string;
  /** The platform's own colour, for a real glyph. Unset, the icon takes the
   *  chip's ink. */
  readonly color?: string;
  /** Set while `href` is a placeholder. See the note at the top of the file. */
  readonly pending?: true;
};

export const SOCIALS: readonly Social[] = [
  {
    id: "whatsapp",
    label: "Smarthaus on WhatsApp",
    // No pre-filled message: this is the footer's generic profile link, with no
    // page context to draw one from. The contact page passes its own.
    href: whatsappLink(),
    // The real glyph, from Simple Icons (CC0, simple-icons 13.21.0), in
    // WhatsApp's own green. 1.6:1 on the bone chip, under 1.4.11's 3:1, which
    // its exception for essential presentation allows: a brand mark recoloured
    // to pass is no longer the brand mark. The chip itself clears 3:1.
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
    color: "#25D366",
  },
  {
    id: "instagram",
    label: "Smarthaus on Instagram (profile coming soon)",
    href: "https://instagram.com/",
    pending: true,
    // ponytail: placeholder glyph — swap for the real Instagram mark.
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.5-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  },
  {
    id: "facebook",
    label: "Smarthaus on Facebook (profile coming soon)",
    href: "https://facebook.com/",
    pending: true,
    // ponytail: placeholder glyph — swap for the real Facebook mark.
    path: "M13 22v-8h3l.5-3H13V9c0-.9.3-1.5 1.5-1.5H17V5h-2.5C11.8 5 10 6.6 10 9.3V11H7v3h3v8h3Z",
  },
  {
    id: "x",
    label: "Smarthaus on X (profile coming soon)",
    href: "https://x.com/",
    pending: true,
    // ponytail: placeholder glyph — swap for the real X mark.
    path: "M3 3h4.5l4.2 5.8L16.8 3H21l-6.8 8.2L21.5 21H17l-4.5-6.2L6.9 21H3l7.2-8.6L3 3Z",
  },
  {
    id: "linkedin",
    label: "Smarthaus on LinkedIn (profile coming soon)",
    href: "https://linkedin.com/",
    pending: true,
    // ponytail: placeholder glyph — swap for the real LinkedIn mark.
    path: "M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.6 8.7c4 0 4.4 2.4 4.4 5.6V21h-4v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21h-4V9Z",
  },
] as const;
