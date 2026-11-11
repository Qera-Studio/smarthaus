// The legal pages: privacy, terms and the accessibility statement, one
// document each (legal-privacy, legal-terms, legal-accessibility), and the
// consent copy the cookie banner, the preferences panel and the enquiry form
// share.
//
// An edit here is a legal change. Each document carries its version and a
// changelog entry for every version; the privacy policy's table of processors
// is checked at every build against what the site actually sends data to
// (scripts/legal-accuracy.mjs), so the policy cannot fall behind the code.
import {
  list,
  obj,
  optional,
  plain,
  seoField,
  singleton,
  str,
  txt,
  type SchemaField,
  type SchemaType,
} from "./primitives";

/** What a contact token prints, from the site settings, so it never drifts. */
export const CONTACT_FIELDS = ["email", "phone", "whatsapp", "address"] as const;

const contactValue: SchemaField = {
  name: "contactValue",
  title: "Contact detail",
  type: "object",
  fields: [
    plain("field", "Which", { options: { list: [...CONTACT_FIELDS] } }),
    optional(plain("label", "Link text (WhatsApp only)")),
    optional({ name: "message", title: "Pre-filled WhatsApp message", type: "text" }),
  ],
  preview: { select: { title: "field" } },
};

/** The document's own date, as its header shows it. */
const updatedDate: SchemaField = {
  name: "updatedDate",
  title: "This document's date",
  type: "object",
  fields: [{ name: "show", title: "Show the date", type: "boolean", initialValue: true }],
};

/** A table whose first column names each row. A {braced} cell is a placeholder. */
const legalTable: SchemaField = {
  name: "legalTable",
  title: "Table",
  type: "object",
  fields: [
    plain("caption", "What the table shows, for screen readers"),
    optional(
      plain("role", "Checked at build as", {
        description:
          "Processors in use, or planned: the build checks these against what the site actually installs.",
        options: { list: ["processorsActive", "processorsPlanned"] },
      }),
    ),
    list("columns", "Column headings", { name: "string", type: "string" }),
    list(
      "rows",
      "Rows",
      obj("row", "Row", [
        list("cells", "Cells, the first names the row", { name: "string", type: "text" }),
      ]),
    ),
  ],
  preview: { select: { title: "caption" } },
};

/** Two columns: a label and its value, or a contact detail from the settings. */
const defTable: SchemaField = {
  name: "defTable",
  title: "Details table",
  type: "object",
  fields: [
    plain("caption", "What the table shows, for screen readers"),
    list(
      "rows",
      "Rows",
      obj(
        "defRow",
        "Row",
        [
          plain("label", "Label"),
          optional(plain("value", "Value")),
          optional(
            plain("contact", "Or a contact detail", { options: { list: [...CONTACT_FIELDS] } }),
          ),
        ],
        "label",
      ),
    ),
  ],
  preview: { select: { title: "caption" } },
};

const block: SchemaField = {
  name: "block",
  type: "block",
  styles: [
    { title: "Paragraph", value: "normal" },
    { title: "Subheading", value: "h3" },
  ],
  lists: [
    { title: "Bullets", value: "bullet" },
    { title: "Numbered", value: "number" },
  ],
  marks: {
    decorators: [
      { title: "Bold", value: "strong" },
      { title: "Italic", value: "em" },
      // Renders as the amber marker: a fact still to be confirmed. A page with
      // any left cannot be marked effective.
      { title: "Placeholder", value: "placeholder" },
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
  of: [contactValue, updatedDate],
} as SchemaField;

/** Rich text, per language: the legal bodies. */
export const localeBlocks: SchemaType = {
  name: "localeBlocks",
  title: "Text",
  type: "object",
  fields: [
    {
      name: "en",
      title: "English",
      type: "array",
      of: [block, legalTable, defTable],
      validation: (rule) => rule.required(),
    },
    {
      name: "ar",
      title: "Arabic (V2, leave empty for now)",
      type: "array",
      of: [block, legalTable, defTable],
    },
  ],
};

type Span = { marks?: string[] };
type Block = { _type?: string; children?: Span[] };

/** Whether a body still holds a placeholder mark. */
export function hasPlaceholder(blocks: readonly Block[] | undefined): boolean {
  return (blocks ?? []).some((b) => b.children?.some((s) => s.marks?.includes("placeholder")));
}

/** An effective document has no placeholder left anywhere in it. */
export function legalRule(
  doc:
    | { status?: string; intro?: { en?: Block[] }; sections?: { body?: { en?: Block[] } }[] }
    | undefined,
): true | string {
  if (doc?.status !== "effective") return true;
  const bodies = [doc.intro?.en, ...(doc.sections ?? []).map((s) => s.body?.en)];
  return bodies.some(hasPlaceholder)
    ? "A document with placeholders left cannot be effective. Confirm each, then publish."
    : true;
}

export const legalPage: SchemaType = {
  name: "legalPage",
  title: "Legal page",
  type: "document",
  fields: [
    seoField,
    str("title", "Heading"),
    txt("standfirst", "Standfirst"),
    plain("status", "Status", {
      options: { list: ["draft", "effective"] },
      initialValue: "draft",
    }),
    optional(plain("version", "Version, e.g. 0.5.0-draft")),
    str("updatedLabel", 'Before the date, e.g. "Assessed", or the whole line for a draft'),
    optional({ name: "updated", title: "Date", type: "date" }),
    optional({ name: "intro", title: "Before the first section", type: "localeBlocks" }),
    list(
      "sections",
      "Sections",
      obj(
        "section",
        "Section",
        [
          plain("id", "Anchor"),
          str("title", "Title"),
          optional(str("short", "Short title, for the contents rail")),
          {
            name: "body",
            title: "Text",
            type: "localeBlocks",
            validation: (rule) => rule.required(),
          },
        ],
        "title",
      ),
    ),
    list(
      "changelog",
      "Changelog: one entry per version",
      obj(
        "change",
        "Change",
        [
          plain("version", "Version"),
          { name: "date", title: "Date", type: "date", validation: (rule) => rule.required() },
          txt("note", "What changed"),
        ],
        "version",
      ),
    ),
  ],
  validation: (rule) => rule.custom((doc) => legalRule(doc as never)),
};

export const consentCopy = singleton("consentCopy", "Cookie and consent wording", [
  seoField,
  str("pageTitle", "Cookie preferences page heading"),
  obj("banner", "Banner", [
    str("heading", "Heading"),
    txt("body", "Body"),
    str("accept", "Accept button"),
    str("decline", "Decline button"),
    str("customise", "Preferences button"),
    str("link", "Policy link text"),
    plain("linkHref", "Policy link"),
  ]),
  obj("prefs", "Preferences panel", [
    str("heading", "Heading"),
    txt("intro", "Intro"),
    obj("essential", "Essential", [
      str("label", "Label"),
      str("state", "State"),
      txt("body", "Body"),
    ]),
    obj("analytics", "Analytics", [
      str("label", "Label"),
      txt("body", "Body"),
      txt("clarity", "Clarity disclosure (its own paragraph, never merged)"),
      txt("retention", "Retention"),
    ]),
    str("save", "Save button"),
    str("back", "Back button"),
    txt("withdraw", "How to change your mind"),
  ]),
  obj("state", "Returning-visitor lines", [
    txt("on", "Analytics on"),
    txt("off", "Analytics off"),
    txt("expired", "Re-asked: the choice expired"),
    txt("changed", "Re-asked: a tool was added"),
  ]),
  obj("form", "Enquiry form consent", [
    obj("required", "Contact consent", [
      txt("label", "Label"),
      str("marker", "Required marker"),
      txt("helperLead", "Helper, before the link"),
      str("helperLinkText", "Helper link text"),
      plain("helperHref", "Helper link"),
    ]),
    obj("marketing", "Marketing consent", [txt("label", "Label")]),
  ]),
]);
