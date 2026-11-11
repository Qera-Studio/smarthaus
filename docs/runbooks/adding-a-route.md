# Add a route

A checklist for a new page under `src/app/`. Most items are enforced by a test; the ones that are not say so.

## Before it has content

1. **Placeholder first.** `src/app/<route>/page.tsx` rendering `<ComingSoon />`, with `export const metadata = pageMetadata({ path, title, description, index: false })` from `src/lib/metadata.ts`, which sets the canonical, og:url and robots together. Copy `src/app/solutions/page.tsx`.
2. **Link it.** Add it to the right list in `src/lib/nav-links.ts`. Labels must be unique within a list (the footer keys on them); `src/lib/__tests__/nav-links.test.ts` checks.
3. **Test it.** Add the route to `PLACEHOLDER_ROUTES` in `e2e/coming-soon.spec.ts`: 200, one h1, axe, noindex.

## When the real page ships

1. **Content and metadata.** The page's copy is a document in Sanity: give it a schema (`src/sanity/schema/`), a render type (`src/sanity/types.ts`), a getter (`src/sanity/content.ts`) and a seed (`sanity/seed/`), and export `generateMetadata` reading its `seo` field through `pageMetadata(seoInput(PATH, seo))`. With "Show in search" on, it enforces SEO System §2's title and description lengths in the Studio and at build. Page files may export only what Next allows, so constants the tests need go in `src/lib/`.
2. **Indexable.** Add the route to `ROUTES` in `src/sanity/content.ts`, turn on "Show in search" on its document, and render `<JsonLd data={pageGraph(seoInput(PATH, seo), updatedAt)} />` in the page. `src/app/__tests__/sitemap.test.ts` fails if the sitemap and the indexable pages differ, and `e2e/metadata.spec.ts` checks the head and JSON-LD once the route is added to its list.
3. **Remove the placeholder row** from `e2e/coming-soon.spec.ts` and give the page its own spec: 200, exactly one h1, `expectAccessible`, `expectNoHorizontalOverflow`, `expectNoEmDash` (all from `e2e/checks.ts`).
4. **Fragments.** If other pages link to sections of it (the footer's install links point at `/solutions` sections), give those sections their ids and restore the fragment links. `src/lib/__tests__/nav-links.test.ts` fails until you do, once `/solutions` stops being a placeholder.
5. **Claims.** Every statement on the page must be verifiable today (CLAUDE.md, AGENTS.md claims audit). Unconfirmed figures go through `<Placeholder>` with a `pending` note, and the page stays noindex while any remain.
6. **Tests carry the code.** Three lines of test per line of code (AGENTS.md, testing policy). The pre-push hook and CI enforce it; the schema, the getter and the page count as code, the seed does not (it is data, outside `src/`).
