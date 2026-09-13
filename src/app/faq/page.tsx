import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion, FaqSchema } from "../../components/Faq";
import { LegalPage, LegalSectionBlock, type LegalSection } from "../../components/LegalPage";
import { FAQ_CATEGORIES } from "../../content/faq";
import styles from "../../components/Faq/Faq.module.scss";

// ---------------------------------------------------------------------------
// LAUNCH GATE ITEM
//
// Six answers in src/content/faq.ts carry unconfirmed facts — the founding
// year, the assessment fee, the price range, the payment split, the Premium
// Care response window, and the three designer commitments. Each renders
// through the <Placeholder> marker and each has a `pending` note saying who
// confirms it.
//
// While any remain, the page ships noindex and emits no FAQPage schema. An
// unconfirmed figure that an answer engine repeats back is worse than no
// answer at all, and AGENTS.md's claims audit rules out guessing any of them.
//
// TO PUBLISH: clear every `pending` entry and every {brace} in faq.ts, flip
// this to true, and add /faq to src/app/sitemap.ts in the same change. The
// three moves go together — a noindex page in the sitemap is a contradictory
// signal, and so is structured data on one.
// ---------------------------------------------------------------------------
const FAQ_IS_PUBLISHABLE = false;

/**
 * The ToC rail entries, derived from the content rather than restated — the
 * rail and the headings both read this array, so a category cannot appear in
 * one and not the other.
 */
const SECTIONS: readonly LegalSection[] = FAQ_CATEGORIES.map(({ id, title, short }) => ({
  id,
  title,
  short,
}));

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "What a Smarthaus system costs, how the site assessment works, what happens at handover, and who we are, answered plainly.",
  alternates: { canonical: "/faq" },
  robots: FAQ_IS_PUBLISHABLE ? undefined : { index: false, follow: true },
};

export default function FaqPage() {
  return (
    <div className={styles.shell}>
      {FAQ_IS_PUBLISHABLE ? <FaqSchema /> : null}

      <LegalPage
        title="Frequently Asked Questions"
        // The standfirst is a plain string prop, so the "ask it directly" link
        // cannot live in it. It is carried by the intro paragraph below
        // instead, which keeps the contact route one click from the top of the
        // page without turning the shell's prop into a ReactNode for one page.
        standfirst="Everything below is what people actually ask us before they commit."
        sections={SECTIONS}
      >
        <p className={styles.intro}>
          If your question isn&rsquo;t here, <Link href="/contact">ask it directly</Link>.
          We&rsquo;d rather answer it than have you guess.
        </p>

        {FAQ_CATEGORIES.map((category) => (
          <LegalSectionBlock key={category.id} section={category}>
            <div className={styles.list}>
              {category.entries.map((entry) => (
                <FaqAccordion key={entry.id} entry={entry} />
              ))}
            </div>
          </LegalSectionBlock>
        ))}
      </LegalPage>
    </div>
  );
}
