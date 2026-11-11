// The site's one way to read content. Server-only by construction: nothing
// that renders in the browser imports it, so no Sanity code or request ever
// reaches a visitor.
//
// Published documents are fetched at build and cached under one tag; a
// publish calls /api/revalidate, which expires the tag, and the next request
// renders the page again. If that render throws, Next keeps serving the last
// good page, so a bad edit cannot take the site down.
//
// In draft mode (an editor previewing in the Studio's Presentation tool) the
// same call reads drafts with the server-only Viewer token, uncached, and
// marks the copy so a click on it opens the field in the Studio.
import { client } from "./client";
import { inDraftMode } from "./draft";
import { dataset, SANITY_TAG } from "./env";
import { localize } from "./localize";

const QUERY = "*[_id == $id][0]";

/**
 * Click-to-edit marks go on copy only: the English text of a field. Ids,
 * links, layout names and the search metadata stay clean, because the code
 * compares them and a hidden mark would break the comparison.
 */
export function shouldMark(path: readonly unknown[]): boolean {
  return path.at(-1) === "en" && !path.includes("seo");
}

function draftClient() {
  const token = process.env.SANITY_API_TOKEN;
  if (!token) throw new Error("Draft preview needs SANITY_API_TOKEN, a Viewer token");
  return client.withConfig({
    token,
    perspective: "drafts",
    stega: {
      enabled: true,
      studioUrl: "/studio",
      filter: (props) => shouldMark(props.sourcePath) && props.filterDefault(props),
    },
  });
}

/**
 * One document by id, in render shape. Throws when it is missing: a page
 * without its content is a failed build, never an empty page.
 */
export async function getDoc<T>(id: string): Promise<T> {
  const doc = (await inDraftMode())
    ? await draftClient().fetch<unknown>(QUERY, { id }, { cache: "no-store" })
    : await client.fetch<unknown>(
        QUERY,
        { id },
        { cache: "force-cache", next: { tags: [SANITY_TAG] } },
      );
  if (doc === null || doc === undefined) {
    throw new Error(`Sanity: no published document "${id}" in dataset "${dataset}"`);
  }
  return localize(doc) as T;
}
