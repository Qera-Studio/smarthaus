# Pre-launch fixes

What 2.0.0 still needs before it goes live: open items from the hero redesign of 2026-11-14, the blog, the Lighthouse runs and the launch run of 2026-11-19. Tick an item off by deleting its row in the change that fixes it.

Decisions that are settled live in `accepted-risks.md`; things waiting on someone live in `blocked-on-input.md`. This file is the work. Everything that is not needed for launch, the design review of 2026-11-17 included, moved to `docs/updates/2.1.0.md` on 2026-11-19, which is where every later update and change is recorded (Shivanshu).

## 1. Left over from the redesign's tests

The pinned tests, the new code's tests, the docs and the e2e for the email field, the rail and the Process hold were done on 2026-11-14. What is left:

| Item                       | What to do                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push from a clean worktree | Three Finder duplicate source files (`* 3.tsx` and so on) count in local coverage and pull it to 93.4% against the 94.01% floor; without them it is 94.6%. CI never sees them |

## 2. Lighthouse

The 73 for Best Practices on 2026-11-14 was measured on the dev server in an everyday Chrome profile, so it is not the site's score. Find the real one first, then fix what is left.

| Item                                                   | What to do                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| "Missing source maps for large first-party JavaScript" | Dev chunks only on that run. Check it on the production build; decide then whether to publish source maps |
| Trusted Types (unscored)                               | Decide whether to adopt `require-trusted-types-for`; record it as an accepted risk if not                 |

## 3. The hero

| Item                               | What to do                                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The input's focus ring was removed | The frame brightens from 60% to full on focus instead. Check that it reads as a focus indicator (WCAG 2.4.7) on the glass at its brightest, and under forced colours |

## 4. The launch run of 2026-11-19

Everything that could be done without an answer from someone was done on this run; what waits on a person is in `blocked-on-input.md`. What is left here is engineering work.

| Item                                   | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A preview deploy that reads production | The content write was sent on 2026-11-19 and a production build against it passes (39 pages). Click through a preview deploy that reads production before the merge to `main` The first one goes without the build cache (Vercel: Redeploy, untick "Use existing Build Cache"): a cached copy of the pricing document from before the package deck's write lacks its new fields, and a local build failed on exactly that until `.next/cache/fetch-cache` was cleared (2026-11-19)                 |
| Two CI flakes, seen once               | On PR #72's first run (2026-11-20), each failed once and passed on retry: the Process pictures' parallax on Galaxy S24 (3.5px against more than 15) and the strip's scroll with a sliver on screen on iPhone 17 (-296ms against less than -500). Neither reproduced locally: not with 40 to 150ms of work added to every frame, not with the page's script held back 1.6s, not in 40 runs each. Watch the next runs; if either comes back, set the CI trace to keep the failed attempt and read it |
| Post-deploy smoke test                 | After the merge to `main`: load every route on smarthaus.ae, send one enquiry from each form and the hero field and read them in the inbox (subject, reply-to, consent lines; the hero field has never sent a real one), publish an edit in the Studio and watch it arrive, and watch Vercel's errors for the first minutes                                                                                                                                                                        |

## 5. Last, once everything above is done

| Item        | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The sitemap | Built, not written: `src/app/sitemap.ts` lists every page whose document has "Show in search" on (`ROUTES` in `src/sanity/content.ts`, plus each article), and `sitemap.test.ts` fails if a page in search is missing from it. So the work is the check: open `https://smarthaus.ae/sitemap.xml` on production and check that every page meant to be found is listed (every reviewed page is in search since 2026-11-20; the placeholders, the legal drafts and `/cookie-preferences` are not, by design). Then submit it in Google Search Console and Bing Webmaster Tools. `/llms.txt` is built from the same list: check it in the same pass, and reread its opening summary (site settings in the Studio), the one part of it written by hand |
