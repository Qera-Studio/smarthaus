# Add a route

A checklist for a new page under `src/app/`. Most items are enforced by a test; the ones that are not say so.

## Before it has content

1. **Placeholder first.** `src/app/<route>/page.tsx` rendering `<ComingSoon />`, with `robots: { index: false, follow: true }` and a canonical. Copy `src/app/solutions/page.tsx`.
2. **Link it.** Add it to the right list in `src/lib/nav-links.ts`. Labels must be unique within a list (the footer keys on them); `src/lib/__tests__/nav-links.test.ts` checks.
3. **Test it.** Add the route to `PLACEHOLDER_ROUTES` in `e2e/coming-soon.spec.ts`: 200, one h1, axe, noindex.

## When the real page ships

1. **Metadata.** `title`, `description` and `alternates.canonical` in the page's `metadata` export. Page files may export only what Next allows, so constants the tests need go in `src/content/` or `src/lib/`.
2. **Indexable.** Remove the `robots` noindex and add the route to `src/app/sitemap.ts` in the same change. Not enforced by a test today: check both by hand.
3. **Remove the placeholder row** from `e2e/coming-soon.spec.ts` and give the page its own spec: 200, exactly one h1, `expectAccessible`, `expectNoHorizontalOverflow`, `expectNoEmDash` (all from `e2e/checks.ts`).
4. **Fragments.** If other pages link to sections of it (the footer's install links point at `/solutions` sections), give those sections their ids and restore the fragment links. `src/lib/__tests__/nav-links.test.ts` fails until you do, once `/solutions` stops being a placeholder.
5. **Claims.** Every statement on the page must be verifiable today (CLAUDE.md, AGENTS.md claims audit). Unconfirmed figures go through `<Placeholder>` with a `pending` note, and the page stays noindex while any remain.
6. **Tests carry the code.** Three lines of test per line of code (AGENTS.md, testing policy). The pre-push hook and CI enforce it; a route that is mostly content still counts, because `src/content/*.ts` is code.
