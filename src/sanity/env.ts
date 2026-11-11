// Which Sanity project and dataset this build reads. Public: the Studio runs
// in the browser and needs both. CI and e2e builds set the dataset to "ci", a
// copy seeded from sanity/seed/, so an editor's change on production can never
// turn a test red.
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

// Pinned, so a Content Lake API change never reaches the site unannounced.
export const apiVersion = "2026-11-01";

// The one cache tag every content fetch carries. The site is small enough
// that a publish revalidating everything costs less than tracking which page
// reads which document.
export const SANITY_TAG = "sanity";
