// The homepage, one tab per section. The section order is the page's (code);
// what each section says, and its pictures and items, are here.
import type { ProcessLayout } from "../types";
import {
  list,
  maxWords,
  obj,
  optional,
  paragraphs,
  pic,
  plain,
  seoField,
  singleton,
  str,
  txt,
  type SchemaField,
} from "./primitives";

/** The stylesheet's word counts (HomeHero.module.scss, $hero-*-words). */
export const HERO_TITLE_WORDS = 6;
export const HERO_LEDE_WORDS = 24;

/** How many pictures each Process grid has room for. */
export const IMAGES_PER_LAYOUT: Readonly<Record<ProcessLayout, number>> = {
  intro: 0,
  portraitLead: 2,
  wideRight: 1,
  bannerSplit: 2,
  stacked: 1,
  offsetPair: 2,
};

const LAYOUT_TITLES: Readonly<Record<ProcessLayout, string>> = {
  intro: "Intro: text only",
  portraitLead: "Portrait, then text over a picture (2 pictures)",
  wideRight: "Text, then one wide picture (1 picture)",
  bannerSplit: "Banner, then text and a picture (2 pictures)",
  stacked: "Text over a full-width picture (1 picture)",
  offsetPair: "Wide picture and text, then an offset picture (2 pictures)",
};

/** The Process sheet's picture count must fit its grid. */
export function processRule(
  value: { layout?: ProcessLayout; images?: unknown[] } | undefined,
): true | string {
  if (!value?.layout) return true;
  const want = IMAGES_PER_LAYOUT[value.layout];
  const have = value.images?.length ?? 0;
  return have === want || `This layout has room for ${want} picture(s); it has ${have}.`;
}

export const HARDWARE_ICONS = [
  "ac.svg",
  "cctv.svg",
  "curtains.svg",
  "garageDoor.svg",
  "lighting.svg",
  "smartLock.svg",
  "smartScreen.svg",
  "tv.svg",
] as const;

const group = (name: string, field: SchemaField): SchemaField => ({ ...field, group: name });

export const homePage = singleton(
  "homePage",
  "Homepage",
  [
    group("seo", seoField),
    group(
      "hero",
      obj("hero", "Hero", [
        str("title", "Heading", {
          validation: (rule) => rule.required().custom(maxWords(HERO_TITLE_WORDS)),
        }),
        txt("lede", "Lede", {
          validation: (rule) => rule.required().custom(maxWords(HERO_LEDE_WORDS)),
        }),
        str("visitCta", "Site visit button"),
        str("whatsappCta", "WhatsApp button"),
        txt("whatsappMessage", "WhatsApp message, pre-filled"),
        list("proof", "Proof line (the first gets the star)", {
          name: "localeString",
          type: "localeString",
        }),
        str("stripLabel", "Name of the picture strip, for screen readers"),
        plain("cardsHref", "Where every card goes"),
        list(
          "cards",
          "Picture strip",
          obj(
            "card",
            "Card",
            [
              plain("id", "Id"),
              str("title", "Title"),
              txt("line", "Line"),
              str("cta", "Link text"),
              pic("image", "Picture"),
            ],
            "title",
          ),
        ),
      ]),
    ),
    group(
      "partners",
      obj("partners", "Partners", [
        str("heading", "Heading, for screen readers"),
        str("visit", 'Before the name on each link ("Visit")'),
        list(
          "items",
          "Partners",
          obj(
            "partner",
            "Partner",
            [
              plain("id", "Id"),
              plain("name", "Name"),
              str("title", "Title"),
              txt("body", "What they make, and what we do with it"),
              plain("href", "Their website"),
              pic("logo", "Logo"),
            ],
            "name",
          ),
        ),
      ]),
    ),
    group(
      "hardware",
      obj("hardware", "What goes in the house", [
        str("heading", "Heading"),
        txt("lead", "Lead"),
        plain("href", "Where every button goes"),
        list(
          "items",
          "Components",
          obj(
            "component",
            "Component",
            [
              plain("id", "Id"),
              str("title", "Title"),
              txt("description", "Description"),
              str("cta", "Button"),
              plain("icon", "Icon", { options: { list: [...HARDWARE_ICONS] } }),
              pic("image", "Picture"),
            ],
            "title",
          ),
        ),
      ]),
    ),
    group(
      "stats",
      obj("stats", "By the numbers", [
        str("heading", "Heading"),
        list(
          "items",
          "Figures (each confirmed against our records)",
          obj(
            "stat",
            "Figure",
            [plain("value", "Figure"), str("label", "What it counts")],
            "value",
          ),
        ),
      ]),
    ),
    group(
      "connectivity",
      obj("connectivity", "Standards we connect", [
        str("heading", "Heading"),
        txt("lead", "Lead"),
        str("cta", "Site visit button"),
      ]),
    ),
    group(
      "process",
      obj("process", "Process", [
        str("heading", "Heading"),
        str("stepLabel", 'Before each step number ("Step")'),
        list("pages", "Sheets", {
          ...obj(
            "sheet",
            "Sheet",
            [
              plain("id", "Id"),
              optional(plain("step", "Step number, e.g. 01")),
              str("title", "Title"),
              paragraphs("body", "Paragraphs"),
              str("duration", "Duration, as shown"),
              plain("layout", "Layout", {
                options: {
                  list: Object.entries(LAYOUT_TITLES).map(([value, title]) => ({ value, title })),
                },
              }),
              optional(list("images", "Pictures", { name: "figure", type: "figure" })),
            ],
            "title",
          ),
          validation: (rule) => rule.custom((value) => processRule(value as never)),
        }),
      ]),
    ),
    group(
      "care",
      obj("care", "Maintenance", [
        str("heading", "Heading"),
        txt("lead", "Lead"),
        str("packagesHeading", "Packages heading"),
        list(
          "packages",
          "Packages",
          obj(
            "package",
            "Package",
            [
              str("name", "Name"),
              txt("description", "Description"),
              plain("tone", "Card colour", { options: { list: ["light", "dark"] } }),
            ],
            "name",
          ),
        ),
      ]),
    ),
    group(
      "pricing",
      obj("pricing", "Pricing teaser", [
        str("heading", "Heading"),
        txt("standfirst", "Standfirst"),
        str("compareCta", "Compare button"),
      ]),
    ),
    group(
      "enquiry",
      obj("enquiry", "Enquiry form", [str("title", "Heading"), txt("standfirst", "Standfirst")]),
    ),
  ],
  [
    { name: "hero", title: "Hero", default: true },
    { name: "partners", title: "Partners" },
    { name: "hardware", title: "Hardware" },
    { name: "stats", title: "Figures" },
    { name: "connectivity", title: "Connectivity" },
    { name: "process", title: "Process" },
    { name: "care", title: "Maintenance" },
    { name: "pricing", title: "Pricing" },
    { name: "enquiry", title: "Enquiry" },
    { name: "seo", title: "Search" },
  ],
);
