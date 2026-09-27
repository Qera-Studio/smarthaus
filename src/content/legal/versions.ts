/**
 * The published version of each legal document, in one place. The pages print
 * it in their header, and every lead email records which privacy policy the
 * visitor was shown when they sent it, so a later question about what they
 * agreed to has an answer.
 *
 * Bump it in the same change as the wording, alongside the markdown source's
 * `version` frontmatter; src/content/__tests__/legal.test.ts fails if the two
 * disagree.
 */
export const PRIVACY_POLICY_VERSION = "0.2.0-draft";
export const TERMS_VERSION = "0.1.0-draft";

/**
 * When the accessibility statement was last assessed, as an ISO date. Re-date
 * it at each review: a stale statement is evidence against the site
 * (Accessibility System §22). src/app/__tests__/accessibility-page.test.tsx
 * fails once it is more than six months old.
 */
export const ACCESSIBILITY_ASSESSED = "2026-09-27";
