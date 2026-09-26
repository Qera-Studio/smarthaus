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
