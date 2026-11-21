/**
 * The social profiles' icons. Which profiles show, their links and their
 * accessible names are content (siteSettings.socials in Sanity); the glyphs
 * are code, one per platform the Studio offers.
 *
 * Icon geometry is inline rather than in public/ so it inherits currentColor,
 * the same reasoning as the Logo component. All paths are authored on a 24x24
 * viewBox. PLACEHOLDER GEOMETRY, except WhatsApp, which is the official
 * full-colour logo as a file: its green bubble and white handset are the
 * mark, so it is not recoloured to the chip's ink. Replace each `path` with
 * the real brand glyph before launch.
 *
 * WhatsApp's green is under 3:1 on the bone chip, 1.4.11's floor, which its
 * exception for logos allows: a brand mark recoloured to pass is no longer the
 * brand mark (Shivanshu's file, 2026-10-03).
 *
 * A profile not live yet is marked pending in the Studio, and its accessible
 * name must say "(profile coming soon)" while it is: the link lands on the
 * platform's home page, and "Smarthaus on Instagram" would tell a screen-reader
 * user something the link does not do. src/sanity/schema/site-settings.ts
 * enforces that pairing.
 */
import type { SocialPlatform } from "../../sanity/types";

export type SocialIcon = { readonly path: string } | { readonly src: string };

export const SOCIAL_ICONS: Readonly<Record<SocialPlatform, SocialIcon>> = {
  whatsapp: { src: "/whatsapp.svg" },
  instagram: {
    path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.5-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  },
  facebook: {
    path: "M13 22v-8h3l.5-3H13V9c0-.9.3-1.5 1.5-1.5H17V5h-2.5C11.8 5 10 6.6 10 9.3V11H7v3h3v8h3Z",
  },
  x: {
    path: "M3 3h4.5l4.2 5.8L16.8 3H21l-6.8 8.2L21.5 21H17l-4.5-6.2L6.9 21H3l7.2-8.6L3 3Z",
  },
  linkedin: {
    path: "M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.6 8.7c4 0 4.4 2.4 4.4 5.6V21h-4v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21h-4V9Z",
  },
};
