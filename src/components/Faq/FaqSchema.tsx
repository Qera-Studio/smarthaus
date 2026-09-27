import { FAQ_CATEGORIES } from "../../content/faq";
import { plainAnswer } from "./FaqAccordion";
import { JsonLd } from "../Schema";

/**
 * FAQPage structured data, built from the same array the page renders — so a
 * question cannot exist in the schema but not on the page, which is the
 * mismatch Google treats as a spam signal.
 *
 * WHY IT IS GATED (see FAQ_IS_PUBLISHABLE in src/app/faq/page.tsx):
 *
 * Google restricted FAQ rich results to government and health sites in 2023,
 * so this markup is not chasing a search snippet. It is here for AEO/GEO — SEO
 * System §18-19 — where answer engines read FAQPage as the cleanest available
 * statement of a question and its answer.
 *
 * It stays off while the page is noindex. Asking a crawler to parse structured
 * data on a page that refuses indexing is a contradictory signal, and the
 * unconfirmed figures are exactly the facts that must not be handed to an
 * answer engine to repeat.
 */
export function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((category) =>
      category.entries.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: plainAnswer(entry),
        },
      })),
    ),
  };

  return <JsonLd data={schema} />;
}
