// A question and its answer, shared by /faq, /pricing and /about.
import { list, obj, optional, paragraphs, plain, str, txt, type SchemaField } from "./primitives";

const BRACE = /\{[^}]+\}/;

/**
 * An answer holding a {BRACED} value states a fact nobody has confirmed, so it
 * must carry a note saying what is pending. The note keeps /faq out of search
 * and its structured data unpublished until every one is cleared.
 */
export function faqRule(
  value: { answer?: { en?: string }[]; pending?: string } | undefined,
): true | string {
  const braced = (value?.answer ?? []).some((p) => BRACE.test(p?.en ?? ""));
  if (braced && !value?.pending?.trim()) {
    return "This answer has a {braced} value: say what is pending in the note, or replace it with the confirmed fact.";
  }
  return true;
}

export const faqEntry: SchemaField = {
  ...obj(
    "faqEntry",
    "Question",
    [
      plain("id", "Anchor (stable: it appears in shared links)"),
      str("question", "Question"),
      paragraphs("answer", "Answer"),
      optional(
        txt("pending", "Pending: what still needs confirming", {
          description:
            "Leave empty once every fact in the answer is confirmed. While any question has a note, /faq stays out of search.",
        }),
      ),
    ],
    "question",
  ),
  validation: (rule) => rule.custom((value) => faqRule(value as never)),
};

export const faqList = (name: string, title: string) => list(name, title, faqEntry);

export const closingCta = obj("closing", "Closing prompt", [
  str("heading", "Heading"),
  txt("body", "Body"),
  str("cta", "Button"),
  optional(str("secondary", "Second link")),
]);
