// One page per solution in the nav's Solutions menu, at /solutions/<id>
// (Shivanshu, 2026-11-15). Fixed documents, like every page: a solution gets
// a page when its id is added to FIXED_DOCUMENTS.solutionPage in ./index.ts.
// Its picture is its menu item's, in the site settings, so the menu's picture
// and the page's are one file and the opening can grow one into the other.
import { BLOG_TAGS } from "./blog";
import { faqList } from "./faq";
import { list, obj, pic, plain, seoField, singleton, str, txt } from "./primitives";

/**
 * The icons a feature can wear: Lucide's (lucide-react), by name. Adding one
 * is a line here and its component in src/components/Solution/icons.ts, which
 * TypeScript holds to this list.
 */
export const SOLUTION_ICONS = [
  "audio-lines",
  "bed-double",
  "bell-ring",
  "blinds",
  "cable",
  "calendar-clock",
  "clipboard-list",
  "door-closed",
  "eye",
  "eye-off",
  "fingerprint-pattern",
  "footprints",
  "globe-lock",
  "house",
  "key-round",
  "layout-grid",
  "leaf",
  "lightbulb",
  "lock",
  "lock-keyhole",
  "map-pinned",
  "moon",
  "palette",
  "plane",
  "power",
  "scan-eye",
  "shield-check",
  "sliders-horizontal",
  "smartphone",
  "speaker",
  "sun",
  "sun-dim",
  "sunrise",
  "tag",
  "thermometer",
  "thermometer-sun",
  "trees",
  "users",
  "wind",
  "wrench",
] as const;

/** The grid has nine boxes for features, round its picture and its button. */
export const FEATURE_COUNT = 9;

export const solutionPage = singleton("solutionPage", "Solution page", [
  seoField,
  str("title", "Heading"),
  str("lede", "The line under it"),
  obj("features", "Features", [
    str("heading", "Heading"),
    txt("standfirst", "The line under it"),
    list(
      "items",
      `Features (exactly ${FEATURE_COUNT}: the grid has a box for each)`,
      obj(
        "feature",
        "Feature",
        [
          plain("icon", "Icon", { options: { list: [...SOLUTION_ICONS] } }),
          str("title", "Title"),
          str("text", "One line"),
        ],
        "title",
      ),
      { validation: (rule) => rule.required().length(FEATURE_COUNT) },
    ),
    pic("image", "Picture, beside the features (decoration)"),
    str("ctaText", "Dark box: the line above its button"),
    str("ctaLabel", "Dark box: its button, to the contact page"),
  ]),
  str("faqHeading", "Questions heading"),
  faqList("faqs", "Questions"),
  obj("enquiry", "Enquiry form", [str("title", "Heading"), txt("standfirst", "The line under it")]),
  str("articlesHeading", "Articles heading"),
  plain("articlesTag", "Articles: those with this tag first", {
    options: { list: [...BLOG_TAGS] },
  }),
]);
