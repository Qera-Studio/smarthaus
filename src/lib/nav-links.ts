/**
 * The primary nav's links. The footer's link lists are content now (the site
 * settings in Sanity); these stay in code because the scrolled capsule is
 * measured by hand around their exact widths.

 *
 * Links to routes still being built land on their coming-soon pages;
 * e2e/coming-soon.spec.ts fails if a link has no page behind it.
 */

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
  { href: "/about", label: "About" },
] as const;

/**
 * Whether a nav link points at the page being viewed, for aria-current
 * (Accessibility System §8, WCAG 2.4.8 Location, adopted at AAA). A section
 * link stays current on its sub-pages (/solutions on /solutions/lighting);
 * home is current only on home, or it would be current everywhere. A trailing
 * slash, a query or a hash never changes the answer.
 */
export function isCurrentPath(pathname: string, href: string): boolean {
  const path = pathname.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  const target = href.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}
