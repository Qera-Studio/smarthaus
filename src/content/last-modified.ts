import { ACCESSIBILITY_ASSESSED } from "./legal/versions";

/**
 * Every indexable page and the date its content last changed.
 *
 * Fixed dates, not `new Date()`: Google uses <lastmod> only while it is
 * accurate, and a sitemap that says every page changed at every build is one
 * it learns to ignore (SEO System §13). Move a date when the page's content
 * changes, not when its code does.
 *
 * No changefreq or priority: Google ignores both (§13).
 *
 * The list must equal the set of pages whose metadata is indexable;
 * src/app/__tests__/sitemap.test.ts derives that set from the pages and fails
 * when they differ. So a page that drops its noindex is added here in the same
 * change, and a noindex page (/privacy, /terms, /cookie-preferences, /faq,
 * /pricing, the placeholders) never is: listing a URL the page itself refuses
 * is a contradictory signal.
 */
export const LAST_MODIFIED: Readonly<Record<string, string>> = {
  "/": "2026-09-27",
  "/contact": "2026-09-27",
  "/about": "2026-10-07",
  "/accessibility": ACCESSIBILITY_ASSESSED,
};
