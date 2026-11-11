import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion, FaqSchema } from "../../components/Faq";
import { LegalPage, LegalSectionBlock, type LegalSection } from "../../components/LegalPage";
import { ClosingCta } from "../../components/ClosingCta";
import styles from "../../components/Faq/Faq.module.scss";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getFaqPage, isFaqPublishable } from "../../sanity/content";

const PATH = "/faq";

// ---------------------------------------------------------------------------
// LAUNCH GATE ITEM
//
// Answers holding an unconfirmed fact carry a pending note in the Studio (the
// founding year, the assessment fee, what the price includes, the payment
// split, the three designer commitments), and a {braced} value renders
// through the <Placeholder> marker. The schema refuses a brace without a note.
//
// While any note remains the page ships noindex and emits no FAQPage schema,
// whatever "Show in search" says: an unconfirmed figure that an answer engine
// repeats back is worse than no answer at all (AGENTS.md, claims audit).
// Clearing the last note and turning "Show in search" on publishes it, and
// the sitemap follows the page's own metadata.
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const page = await getFaqPage();
  return pageMetadata(seoInput(PATH, { ...page.seo, index: isFaqPublishable(page) }));
}

export default async function FaqPage() {
  const page = await getFaqPage();
  // The ToC rail entries, derived from the content rather than restated: the
  // rail and the headings both read the categories, so a category cannot
  // appear in one and not the other.
  const sections: readonly LegalSection[] = page.categories.map(({ id, title, short }) => ({
    id,
    title,
    short,
  }));
  return (
    <div className={styles.shell}>
      {isFaqPublishable(page) ? <FaqSchema categories={page.categories} /> : null}

      <LegalPage
        title={page.title}
        // The standfirst is a plain string prop, so the "ask it directly" link
        // cannot live in it. It is carried by the intro paragraph below
        // instead, which keeps the contact route one click from the top of the
        // page without turning the shell's prop into a ReactNode for one page.
        standfirst={page.standfirst}
        sections={sections}
      >
        <p className={styles.intro}>
          {page.intro.before} <Link href="/contact">{page.intro.link}</Link>
          {page.intro.after}
        </p>

        {page.categories.map((category) => (
          <LegalSectionBlock key={category.id} section={category}>
            <div className={styles.list}>
              {category.entries.map((entry) => (
                <FaqAccordion key={entry.id} entry={entry} />
              ))}
            </div>
          </LegalSectionBlock>
        ))}
      </LegalPage>

      {/*
        Outside LegalPage, not inside it: that component lays its children into
        the prose column beside the ToC rail, and this is a full-width centred
        band. Nesting it would have indented it under the rail and broken the
        centring on desktop.

        The copy carries no figures or commitments on purpose. /faq is still
        gated (isFaqPublishable) precisely because several answers hold
        unconfirmed numbers, so a closing prompt that invited a claim would be
        the wrong thing to add to this page of all pages.
      */}
      <ClosingCta
        heading={page.closing.heading}
        // No em dash: the house rule the legal, placeholder and contact pages
        // all assert, and e2e/faq.spec.ts checks the collapsed answers too.
        //
        // Deliberately not a second "we'd rather answer it than have you
        // guess" either. The intro paragraph at the top of the page already
        // says that, and repeating a line verbatim at the foot reads as
        // filler rather than as a close.
        body={page.closing.body}
        href="/contact"
        label={page.closing.cta}
      />
    </div>
  );
}
