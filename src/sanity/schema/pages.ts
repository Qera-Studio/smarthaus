// /faq, /pricing, /about and the coming-soon pages.
import { closingCta, faqList } from "./faq";
import {
  list,
  obj,
  optional,
  pic,
  plain,
  seoField,
  singleton,
  str,
  txt,
  type SchemaType,
} from "./primitives";

export const faqPage = singleton("faqPage", "FAQ page", [
  seoField,
  str("title", "Heading"),
  txt("standfirst", "Standfirst"),
  obj("intro", "Intro, around its link to /contact", [
    txt("before", "Before the link"),
    str("link", "Link text"),
    txt("after", "After the link"),
  ]),
  list(
    "categories",
    "Categories",
    obj(
      "category",
      "Category",
      [
        plain("id", "Anchor"),
        str("title", "Title"),
        optional(str("short", "Short title, for the contents rail")),
        faqList("entries", "Questions"),
      ],
      "title",
    ),
  ),
  closingCta,
]);

const cell = obj(
  "cell",
  "Cell",
  [
    { name: "included", title: "Included", type: "boolean", initialValue: true },
    optional(str("note", "Instead of a tick, the level (e.g. Basic)")),
  ],
  "note",
);

export const pricingPage = singleton("pricingPage", "Pricing", [
  seoField,
  str("title", "Heading"),
  txt("standfirst", "Standfirst"),
  str("tierCta", "Button on each tier"),
  str("includes", 'After the tier name ("includes:")'),
  list(
    "tiers",
    "Tiers (no prices: the site discloses none)",
    obj(
      "tier",
      "Tier",
      [
        plain("id", "Id"),
        str("name", "Name"),
        txt("description", "Description"),
        list("includes", "Includes", { name: "localeString", type: "localeString" }),
        plain("tone", "Card ground", { options: { list: ["sand", "image", "dark"] } }),
        plain("ctaVariant", "Button style", { options: { list: ["solid", "inverse", "outline"] } }),
      ],
      "name",
    ),
  ),
  str("compareHeading", "Comparison heading"),
  list(
    "comparison",
    "Comparison, by system",
    obj(
      "section",
      "System",
      [
        plain("id", "Id"),
        str("title", "Title"),
        list(
          "rows",
          "Features",
          obj(
            "row",
            "Feature",
            [
              plain("id", "Id (unique across the table)"),
              str("feature", "Feature"),
              txt("description", "What it means in the house"),
              list("values", "One cell per tier, in tier order", cell),
            ],
            "feature",
          ),
        ),
      ],
      "title",
    ),
    {
      validation: (rule) =>
        rule.required().custom((sections, context) => {
          const tiers = ((context.document as { tiers?: unknown[] } | undefined)?.tiers ?? [])
            .length;
          for (const section of (sections ?? []) as { rows?: { values?: unknown[] }[] }[]) {
            for (const row of section.rows ?? []) {
              if ((row.values?.length ?? 0) !== tiers) {
                return `Every feature needs exactly one cell per tier (${tiers}).`;
              }
            }
          }
          return true;
        }),
    },
  ),
  str("faqHeading", "Questions heading"),
  faqList("faqs", "Questions"),
  closingCta,
]);

/** The about cards' icons, files in public/about/icons/. */
export const ABOUT_ICONS = [
  "boundary.svg",
  "visit.svg",
  "existing.svg",
  "people.svg",
  "document.svg",
  "aftercare.svg",
] as const;

const statement = (name: string, title: string) =>
  obj(name, title, [str("lead", "The answer, set large"), txt("body", "What it means")]);

export const aboutPage = singleton("aboutPage", "About page", [
  seoField,
  str("title", "Heading"),
  pic("heroImage", "Hero picture (decoration)"),
  str("approachHeading", "Approach heading"),
  list(
    "approach",
    "Approach",
    obj(
      "step",
      "Card",
      [
        str("title", "Title"),
        txt("body", "Body"),
        plain("icon", "Icon", { options: { list: [...ABOUT_ICONS] } }),
      ],
      "title",
    ),
  ),
  pic("missionImage", "Mission picture (decoration)"),
  str("missionHeading", "Mission heading"),
  statement("mission", "Mission"),
  str("visionHeading", "Vision heading"),
  statement("vision", "Vision"),
  str("valuesHeading", "Values heading"),
  list(
    "values",
    "Values",
    obj("value", "Value", [str("title", "Title"), txt("body", "Body")], "title"),
  ),
  str("faqHeading", "Questions heading"),
  faqList("faqs", "Questions"),
]);

/** One document per placeholder route: comingSoon.solutions, and so on. */
export const comingSoonPage: SchemaType = {
  name: "comingSoonPage",
  title: "Coming-soon page",
  type: "document",
  fields: [seoField, txt("blurb", "What the page will be")],
};
