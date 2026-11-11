// Everything every page shares: how to reach us, who we are, the footer and
// the contact strip above the nav. One document, so the footer, the contact
// page, the legal pages and the structured data cannot disagree.
//
// The primary nav's links and its button label are NOT here: the scrolled
// capsule is measured by hand around their exact widths (Nav.module.scss,
// --nav-links-row and --nav-cta-width), so renaming one would break the nav.
import { link, list, obj, optional, pic, plain, singleton, str, txt } from "./primitives";

const digitsOnly = (value: unknown) =>
  typeof value !== "string" ||
  /^\d{8,15}$/.test(value) ||
  "Digits only, country code first, no + or spaces.";
const e164 = (value: unknown) =>
  typeof value !== "string" || /^\+\d{8,15}$/.test(value) || "A + and digits only, no spaces.";

/** The rule the Studio enforces on each profile: a pending one says so. */
export function socialRule(
  value: { label?: { en?: string }; pending?: boolean } | undefined,
): true | string {
  const label = value?.label?.en ?? "";
  const says = label.endsWith("(profile coming soon)");
  if (value?.pending && !says)
    return 'A profile not live yet must end its name with "(profile coming soon)".';
  if (!value?.pending && says) return 'Remove "(profile coming soon)" from a profile that is live.';
  return true;
}

export const SOCIAL_PLATFORMS = ["whatsapp", "instagram", "facebook", "x", "linkedin"] as const;

export const siteSettings = singleton("siteSettings", "Site settings", [
  obj("contact", "How to reach us", [
    plain("phoneE164", "Phone, for dialling", {
      description: "+971 and the number, no spaces. Used for tap-to-call.",
      validation: (rule) => rule.required().custom(e164),
    }),
    plain("phoneDisplay", "Phone, as shown", {
      description: "As people read it, e.g. +971 54 375 5150.",
    }),
    plain("whatsapp", "WhatsApp number", {
      description: "Digits only, country code first, e.g. 971543755150.",
      validation: (rule) => rule.required().custom(digitsOnly),
    }),
    plain("email", "Email", { validation: (rule) => rule.required().email() }),
    list(
      "addressLines",
      "Address",
      { name: "localeString", type: "localeString" },
      {
        description: "One line per row, as the contact page shows it.",
      },
    ),
    plain("mapsUrl", "Map link"),
    str("locality", "City, as the footer shows it"),
  ]),
  obj("identity", "Legal identity", [
    plain("legalName", "Legal entity"),
    plain("tradingAs", "Trading as"),
    plain("tradeLicence", "Trade licence number"),
    plain("siraLicence", "SIRA licence number"),
    plain("licensingAuthority", "Licensing authority"),
  ]),
  obj("announcement", "Contact strip above the nav", [
    str("call", "Before the phone number"),
    str("mail", "Before the email"),
    str("whatsapp", "Before the WhatsApp number"),
  ]),
  obj("footer", "Footer", [
    str("tagline", "Tagline"),
    str("parent", "Parent company line"),
    plain("parentHref", "Parent company site"),
    str("newsletterTitle", "Newsletter heading"),
    str("newsletterSubtitle", "Newsletter line"),
    str("newsletterPlaceholder", "Newsletter field placeholder"),
    str("newsletterSubmit", "Newsletter button"),
    str("newsletterNote", "Newsletter note"),
    str("contactTitle", "Contact heading"),
    str("pagesTitle", "Pages heading"),
    str("installTitle", "What we install heading"),
    str("copyright", "Copyright line"),
    str("credit", "Credit"),
    plain("creditHref", "Credit link"),
  ]),
  list("pageLinks", "Footer: pages", link),
  list(
    "installLinks",
    "Footer: what we install",
    obj("installLink", "Service", [
      str("label", "Label"),
      plain("href", "Goes to"),
      plain("section", "Section id on /solutions"),
    ]),
  ),
  list("legalLinks", "Footer: legal", link),
  list(
    "socials",
    "Social profiles",
    obj("social", "Profile", [
      plain("id", "Platform", { options: { list: [...SOCIAL_PLATFORMS] } }),
      str("label", "Accessible name", {
        description: 'What a screen reader says, e.g. "Smarthaus on Instagram".',
      }),
      plain("href", "Profile link", {
        description: "Ignored for WhatsApp, which always uses the number above.",
      }),
      optional({ name: "pending", title: "Profile not live yet", type: "boolean" }),
    ]),
    {
      validation: (rule) =>
        rule.required().custom((items) => {
          for (const item of (items ?? []) as Parameters<typeof socialRule>[0][]) {
            const problem = socialRule(item);
            if (problem !== true) return problem;
          }
          return true;
        }),
    },
  ),
  obj("solutionsMenu", "Nav: Solutions menu", [
    plain("href", "Where every item goes"),
    list(
      "items",
      "Solutions",
      obj(
        "solution",
        "Solution",
        [
          plain("id", "Id"),
          str("label", "Label"),
          pic("image", "Picture (decoration: the label says it)", {
            validation: undefined,
          }),
        ],
        "label",
      ),
    ),
  ]),
  obj("seo", "Defaults for search and sharing", [
    str("defaultTitle", "Fallback title"),
    txt("defaultDescription", "Fallback description"),
    txt("llmsSummary", "Summary for answer engines (llms.txt)"),
  ]),
]);
