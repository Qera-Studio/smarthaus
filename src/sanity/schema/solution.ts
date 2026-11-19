// One page per solution in the nav's Solutions menu, at /solutions/<id>
// (Shivanshu, 2026-11-15). Fixed documents, like every page: a solution gets
// a page when its id is added to FIXED_DOCUMENTS.solutionPage in ./index.ts.
// Its picture is its menu item's, in the site settings, so the menu's picture
// and the page's are one file and the opening can grow one into the other.
import { BLOG_TAGS } from "./blog";
import { faqList } from "./faq";
import { list, maxChars, obj, pic, plain, seoField, singleton, str, txt } from "./primitives";

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

/**
 * The process under the features: visit, install, maintain, one card each
 * over its drawing (Shivanshu, 2026-11-16). The drawings are code's, in
 * public/solutions/process/, matched to the steps by their order.
 */
export const PROCESS_STEP_COUNT = 3;

/**
 * The solutions a "Works with" pair can name (Shivanshu, 2026-11-16): every
 * solution with a page, and nothing else (the tests hold it to
 * FIXED_DOCUMENTS).
 */
export const SOLUTION_IDS = [
  "cameras",
  "smart-lock",
  "garage",
  "lighting",
  "curtains",
  "ac",
  "audio",
  "wall-controller",
] as const;

/** How many solutions one page pairs with: the column has three rows. */
export const MAX_PAIRS = 3;

/** The panel's two chips, "When" and "Then", hold one line each at 360px. */
export const TRIGGER_CHARS = 40;
export const ACTION_CHARS = 50;

/**
 * A page's pairs: each with a solution other than its own, and each once.
 * The page's own id is read from the document's (solution-<id>, or its draft).
 */
export function pairsRule(value: unknown, context?: { document?: { _id?: string } }) {
  const pairs = (Array.isArray(value) ? value : []) as { with?: string }[];
  const own = context?.document?._id?.replace(/^drafts\./, "").replace(/^solution-/, "");
  const ids = pairs.map((pair) => pair.with);
  if (own && ids.includes(own)) return "A solution cannot pair with itself.";
  if (new Set(ids).size !== ids.length) return "Each solution can be paired once.";
  return true;
}

export const solutionPage = singleton("solutionPage", "Solution page", [
  seoField,
  str("title", "Heading"),
  str("lede", "The line under it"),
  // Under the hero (Shivanshu, 2026-11-16): this solution at the left, wired to
  // the solutions it is paired with in a column beside it.
  obj("worksWith", "Works with", [
    str("heading", "Heading"),
    txt("subtext", "The line under it"),
    str("line", "This solution in one line, shown when it is picked"),
    list(
      "pairs",
      `Pairs (1 to ${MAX_PAIRS}), each delivered on a client's job`,
      obj(
        "pair",
        "Pair",
        [
          plain("with", "Works with", { options: { list: [...SOLUTION_IDS] } }),
          str("title", "Title"),
          str("trigger", `When (at most ${TRIGGER_CHARS} characters)`, {
            validation: (rule) => rule.required().custom(maxChars(TRIGGER_CHARS)),
          }),
          str("action", `Then (at most ${ACTION_CHARS} characters)`, {
            validation: (rule) => rule.required().custom(maxChars(ACTION_CHARS)),
          }),
          txt("body", "One or two sentences"),
        ],
        "title",
      ),
      { validation: (rule) => rule.required().min(1).max(MAX_PAIRS).custom(pairsRule) },
    ),
  ]),
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
  obj("process", "Process", [
    str("heading", "Heading"),
    txt("subtext", "The line under it"),
    list(
      "steps",
      `Steps (exactly ${PROCESS_STEP_COUNT}: visit, install, maintain, each over its drawing)`,
      obj("step", "Step", [str("title", "Title"), txt("text", "One or two sentences")]),
      { validation: (rule) => rule.required().length(PROCESS_STEP_COUNT) },
    ),
  ]),
  str("faqHeading", "Questions heading"),
  faqList("faqs", "Questions"),
  obj("enquiry", "Enquiry form", [str("title", "Heading"), txt("standfirst", "The line under it")]),
  str("articlesHeading", "Articles heading"),
  plain("articlesTag", "Articles: those with this tag first", {
    options: { list: [...BLOG_TAGS] },
  }),
]);
