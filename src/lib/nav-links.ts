/**
 * Shared link registry.
 *
 * Most of these routes do not exist yet and 404 until each page lands. That is
 * deliberate: the site ships its real information architecture rather than a
 * stub, and the dev overlay surfaces each missing route as a reminder to build
 * it. e2e/coming-soon.spec.ts guards the other direction, failing if a link is
 * added here without a page or a placeholder behind it.
 *
 * Nav.tsx reads NAV_LINKS from here. It kept a local copy while the navbar was
 * being built on its own branch; that branch has merged and the copy is gone,
 * so this file is the single source and the nav and footer cannot drift.
 */

import { PREFERENCES_ROUTE } from "./consent";

export type NavLink = {
  readonly href: string;
  readonly label: string;
};

/**
 * The primary nav, in its own order. Pricing sits second: after what we
 * install, the next question a visitor has is what it costs.
 *
 * Nav.module.scss measures this row by hand for the scrolled capsule (see
 * --nav-links-half there). Adding or renaming a link means re-measuring.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/designers", label: "Designers" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
] as const;

/** Primary pages. Order follows the footer design, not the nav's. */
export const PAGE_LINKS: readonly NavLink[] = [
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
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
