// The blog: the one place editors create and delete documents. Every other
// document is fixed, because a route is code; an article's route is its slug.
import type { Rule } from "sanity";
import { claimProblem } from "../claims";
import {
  optional,
  pic,
  plain,
  seoField,
  singleton,
  str,
  txt,
  type SchemaField,
  type SchemaType,
} from "./primitives";

/**
 * The tags an article can carry, and what the index page filters by. A fixed
 * list, picked from in the Studio, so the filter never fills with near
 * duplicates. Adding one is a line here.
 */
export const BLOG_TAGS = [
  "Planning",
  "Installation",
  "Security",
  "Networking",
  "Design",
  "Everyday use",
] as const;

/** Lower-case words joined by hyphens: the article's address under /blog/. */
export const SLUG = /^[a-z]+(-[a-z]+)*$/;

export function slugRule(value: unknown): true | string {
  return (
    (typeof value === "string" && SLUG.test(value)) ||
    "Lower-case letters and hyphens only, for example one-home-five-vendors."
  );
}

type Span = { text?: unknown };
type Block = { _type?: string; children?: Span[] };

/** The claims audit, over every line of an article's text. */
export function articleClaimsRule(value: unknown): true | string {
  if (!Array.isArray(value)) return true;
  for (const node of value as Block[]) {
    if (node._type !== "block") continue;
    for (const span of node.children ?? []) {
      const problem = typeof span.text === "string" ? claimProblem(span.text) : null;
      if (problem) return problem;
    }
  }
  return true;
}

// An article's text. Layout stays code: these are the only shapes the page
// knows how to draw, so an editor cannot build one it does not.
const articleBlock = {
  name: "block",
  type: "block",
  styles: [
    { title: "Paragraph", value: "normal" },
    { title: "Heading", value: "h2" },
    { title: "Subheading", value: "h3" },
    { title: "Quote", value: "blockquote" },
    { title: "Box", value: "callout" },
  ],
  lists: [
    { title: "Bullets", value: "bullet" },
    { title: "Numbered", value: "number" },
  ],
  marks: {
    decorators: [
      { title: "Bold", value: "strong" },
      { title: "Italic", value: "em" },
    ],
    annotations: [
      {
        name: "link",
        title: "Link",
        type: "object",
        fields: [plain("href", "Goes to")],
      },
    ],
  },
} as SchemaField;

/** A picture between paragraphs, with an optional line under it. */
export const articleImage: SchemaType = {
  name: "articleImage",
  title: "Picture",
  type: "object",
  fields: [pic("image", "Picture"), optional(str("caption", "Caption, under the picture"))],
  preview: { select: { title: "caption.en", media: "image" } },
};

const articleNodes = [articleBlock, { name: "articleImage", type: "articleImage" }];

/** An article's body, per language. */
export const localeArticle: SchemaType = {
  name: "localeArticle",
  title: "Article text",
  type: "object",
  fields: [
    {
      name: "en",
      title: "English",
      type: "array",
      of: articleNodes,
      validation: (rule: Rule) => rule.required().custom(articleClaimsRule),
    },
    {
      name: "ar",
      title: "Arabic (V2, leave empty for now)",
      type: "array",
      of: articleNodes,
    },
  ],
};

export const post: SchemaType = {
  name: "post",
  title: "Article",
  type: "document",
  fields: [
    str("title", "Title"),
    plain("slug", "Address, after /blog/", {
      description: "Lower-case words joined by hyphens. Changing it breaks links to the article.",
      validation: (rule) => rule.required().custom(slugRule),
    }),
    plain("author", "Written by"),
    {
      name: "date",
      title: "Published on",
      type: "date",
      validation: (rule) => rule.required(),
    },
    {
      name: "tags",
      title: "Tags (the first shows on the article's card)",
      type: "array",
      of: [{ name: "tag", type: "string" }],
      options: { list: BLOG_TAGS.map((tag) => ({ title: tag, value: tag })) },
      validation: (rule) => rule.required().min(1).unique(),
    },
    txt("excerpt", "One or two lines, shown under the title on the articles page"),
    pic("image", "Main picture"),
    { name: "body", title: "Text", type: "localeArticle", validation: (rule) => rule.required() },
    seoField,
  ],
  preview: { select: { title: "title.en", subtitle: "date", media: "image" } },
};

/** The articles page itself: its title and search metadata. */
export const blogPage = singleton("blogPage", "Articles page", [
  seoField,
  str("heading", "Heading"),
]);
