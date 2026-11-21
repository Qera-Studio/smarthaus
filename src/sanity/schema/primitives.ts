// The building blocks every content schema is made of, as plain objects.
//
// Plain, not defineType(): defineType only returns its argument, and importing
// "sanity" here would keep Jest (which cannot load it) away from the schemas.
// The seed converter (sanity/seed/to-documents.ts) walks these same objects to
// turn today's content into documents, so a field added here is a field the
// seed must fill, and the round-trip test says so.
import type { Rule } from "sanity";
import { claimsRule } from "../claims";

export type SchemaField = {
  name: string;
  title?: string;
  type: string;
  description?: string;
  of?: SchemaField[];
  fields?: SchemaField[];
  options?: Record<string, unknown>;
  validation?: (rule: Rule) => unknown;
  initialValue?: unknown;
  hidden?: boolean;
  preview?: Record<string, unknown>;
  readOnly?: boolean;
  group?: string;
  groups?: { name: string; title: string; default?: boolean }[];
};

export type SchemaType = SchemaField & { title: string };

const required = (rule: Rule) => rule.required();

/**
 * Field-level translation (AGENTS.md, CMS content rules): every piece of copy
 * is { en, ar }. English is required; Arabic waits for V2, so the migration is
 * filling fields in rather than restructuring the schema.
 */
const localized = (name: string, type: "string" | "text"): SchemaType => ({
  name,
  title: type === "string" ? "Text" : "Paragraph",
  type: "object",
  fields: [
    {
      name: "en",
      title: "English",
      type,
      validation: (rule) => rule.required().custom(claimsRule),
    },
    { name: "ar", title: "Arabic (V2, leave empty for now)", type },
  ],
  options: { columns: 1 },
});

export const localeString = localized("localeString", "string");
export const localeText = localized("localeText", "text");

/**
 * A picture. Served to visitors through Next's image optimiser on our own
 * domain, never straight from Sanity's CDN, so the privacy policy's "Sanity
 * sees nothing about you" stays true.
 */
export const figure: SchemaType = {
  name: "figure",
  title: "Picture",
  type: "image",
  fields: [
    {
      name: "alt",
      title: "Description for screen readers",
      description:
        "What the picture shows, as it is on screen. Leave empty only where the picture is decoration beside text that already says it.",
      type: "localeString",
    },
    {
      name: "stock",
      title: "Temporary stock image",
      description:
        "Ticked while this is licensed stock standing in for our own work. Replace it, then untick.",
      type: "boolean",
      initialValue: false,
    },
  ],
};

/** A plain value that is not copy: an id, a URL, a layout name. */
export const plain = (
  name: string,
  title: string,
  extra: Partial<SchemaField> = {},
): SchemaField => ({
  name,
  title,
  type: "string",
  validation: required,
  ...extra,
});

/** One line of copy. */
export const str = (
  name: string,
  title: string,
  extra: Partial<SchemaField> = {},
): SchemaField => ({
  name,
  title,
  type: "localeString",
  validation: required,
  ...extra,
});

/** A paragraph of copy. */
export const txt = (
  name: string,
  title: string,
  extra: Partial<SchemaField> = {},
): SchemaField => ({
  name,
  title,
  type: "localeText",
  validation: required,
  ...extra,
});

export const pic = (
  name: string,
  title: string,
  extra: Partial<SchemaField> = {},
): SchemaField => ({
  name,
  title,
  type: "figure",
  validation: required,
  options: { hotspot: true },
  ...extra,
});

/** An object field, or an array member when given to list(). */
export const obj = (
  name: string,
  title: string,
  fields: SchemaField[],
  previewField = fields[0]!.name,
): SchemaField => {
  const first = fields.find((f) => f.name === previewField)!;
  const localizedPreview = first.type === "localeString" || first.type === "localeText";
  return {
    name,
    title,
    type: "object",
    fields,
    // Required: a section left empty would leave its page with nothing to
    // render. Inside it, each field says for itself whether it is optional.
    validation: required,
    preview: { select: { title: localizedPreview ? `${previewField}.en` : previewField } },
  };
};

/** An ordered list, reordered by dragging in the Studio. */
export const list = (
  name: string,
  title: string,
  member: SchemaField,
  extra: Partial<SchemaField> = {},
): SchemaField => ({
  name,
  title,
  type: "array",
  of: [member],
  validation: (rule) => rule.required().min(1),
  ...extra,
});

/** Several paragraphs, one entry each. */
export const paragraphs = (name: string, title: string): SchemaField =>
  list(name, title, { name: "localeText", type: "localeText" });

/** A link: where it goes and what it says. */
export const link = obj("link", "Link", [str("label", "Label"), plain("href", "Goes to")]);

/** Optional, for a field the site renders only when it is filled. */
export const optional = (field: SchemaField): SchemaField => {
  const { validation: _dropped, ...rest } = field;
  void _dropped;
  return rest;
};

/** A singleton: one document of its type, with a fixed id equal to its name. */
export const singleton = (
  name: string,
  title: string,
  fields: SchemaField[],
  groups?: SchemaField["groups"],
): SchemaType => ({
  name,
  title,
  type: "document",
  fields,
  ...(groups ? { groups } : {}),
});

/** A word limit, for copy whose animation the stylesheet times word by word. */
export const maxWords = (limit: number) => (value: unknown) => {
  const text = typeof value === "string" ? value : (value as { en?: unknown } | undefined)?.en;
  return (
    typeof text !== "string" ||
    text.trim().split(/\s+/).length <= limit ||
    `At most ${limit} words: each word has its own timing in the stylesheet.`
  );
};

/** A character limit, for copy that has to fit a fixed box. */
export const maxChars = (limit: number) => (value: unknown) => {
  const text = typeof value === "string" ? value : (value as { en?: unknown } | undefined)?.en;
  return (
    typeof text !== "string" ||
    text.length <= limit ||
    `At most ${limit} characters, to fit its box: this is ${text.length}.`
  );
};

/** The seo field every page document carries. */
export const seoField: SchemaField = {
  name: "seo",
  title: "Search and sharing",
  type: "seo",
  validation: (rule) => rule.required(),
};
