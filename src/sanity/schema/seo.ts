// A page's search and sharing metadata. The canonical path is the code's (a
// route is code, not content), so editors set only what a search result shows.
// The length rule is pageMetadata()'s, checked here so the Studio refuses to
// publish what the build would refuse to render.
import { DESCRIPTION_RANGE, TITLE_RANGE, fullTitle } from "../../lib/metadata";
import type { SchemaType } from "./primitives";

type SeoValue = {
  title?: { en?: string };
  description?: { en?: string };
  absolute?: boolean;
  index?: boolean;
};

/** Why a page's metadata would be refused, or true. Indexable pages only. */
export function seoRule(value: SeoValue | undefined): true | string {
  if (!value?.index) return true;
  const title = fullTitle({ title: value.title?.en ?? "", absolute: value.absolute });
  const description = value.description?.en ?? "";
  const [tMin, tMax] = TITLE_RANGE;
  const [dMin, dMax] = DESCRIPTION_RANGE;
  if (title.length < tMin || title.length > tMax) {
    return `The title as search shows it, "${title}", is ${title.length} characters. A page in search needs ${tMin}-${tMax}.`;
  }
  if (description.length < dMin || description.length > dMax) {
    return `The description is ${description.length} characters. A page in search needs ${dMin}-${dMax}.`;
  }
  return true;
}

export const seo: SchemaType = {
  name: "seo",
  title: "Search and sharing",
  type: "object",
  fields: [
    {
      name: "title",
      title: "Title",
      description:
        'Shown in the browser tab and in search. " | Smarthaus" is added unless "Exact title" is on.',
      type: "localeString",
      validation: (rule) => rule.required(),
    },
    {
      name: "absolute",
      title: "Exact title",
      description: 'Use the title exactly as written, without " | Smarthaus".',
      type: "boolean",
      initialValue: false,
    },
    {
      name: "description",
      title: "Description",
      type: "localeText",
      validation: (rule) => rule.required(),
    },
    {
      name: "index",
      title: "Show in search",
      description:
        "Off for drafts and pages with unconfirmed facts. Turning it on also puts the page in the sitemap.",
      type: "boolean",
      initialValue: false,
    },
  ],
  validation: (rule) => rule.custom((value) => seoRule(value as SeoValue)),
};
