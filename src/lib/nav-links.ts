/**
 * Shared link registry.
 *
 * Most of these routes do not exist yet and 404 until each page lands. That is
 * deliberate, and matches the choice already documented in Nav.tsx: the site
 * ships its real information architecture rather than a stub, and the dev
 * overlay surfaces each missing route as a reminder to build it.
 *
 * Nav.tsx keeps its own local copy of the page links for now — it is being
 * edited on feature/navbar and must not be touched from here. It adopts this
 * module in a follow-up once that branch merges, at which point this file
 * becomes the single source and the two cannot drift.
 */

import { PREFERENCES_ROUTE } from "./consent";

export type NavLink = {
  readonly href: string;
  readonly label: string;
};

/** Primary pages. Order follows the footer design, not the nav's. */
export const PAGE_LINKS: readonly NavLink[] = [
  { href: "/solutions", label: "Solutions" },
  { href: "/about", label: "About" },
  { href: "/designers", label: "Designers" },
  { href: "/developers", label: "Developers" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Service lines. These are anchors into the single Solutions page rather than
 * seven separate routes — CLAUDE.md specifies Solutions is "one page or towns,
 * not five thin pages", and seven thin service pages would be exactly that.
 *
 * Every label here is a capability Maple Technologies has actually delivered.
 * Per AGENTS.md's claims audit, nothing speculative goes in this list.
 */
export const INSTALL_LINKS: readonly NavLink[] = [
  { href: "/solutions#smart-home-automation", label: "Smart home automation" },
  { href: "/solutions#cctv-and-cameras", label: "CCTV and cameras" },
  { href: "/solutions#video-intercom", label: "Video Intercom" },
  { href: "/solutions#smart-locks-and-access", label: "Smart locks and access" },
  { href: "/solutions#multiroom-audio", label: "Multiroom audio" },
  { href: "/solutions#cabling-and-networks", label: "Cabling and networks" },
  { href: "/solutions#care-plans", label: "Care plans" },
] as const;

/**
 * Legal and utility links.
 *
 * Sitemap points at /sitemap.xml — the metadata route that actually exists
 * (src/app/sitemap.ts). There is no /sitemap HTML page.
 */
export const LEGAL_LINKS: readonly NavLink[] = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: PREFERENCES_ROUTE, label: "Cookie Preferences" },
  { href: "/sitemap.xml", label: "Sitemap" },
] as const;
