import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalDefTable,
  LegalNote,
  LegalPage,
  LegalSectionBlock,
  Placeholder,
  TERMS_SECTIONS as S,
} from "../../components/LegalPage";

// ---------------------------------------------------------------------------
// DRAFT — pending the counsel review this document requires.
//
// Source of truth for the wording: src/content/legal/terms-and-conditions.md,
// which carries the full drafting notes and the placeholder register.
//
// The risk-allocating clauses — sections 8 (as-is), 10 (liability) and 11
// (indemnity) — plus 14 (governing law) are hard counsel items. Section 10's
// liability cap is deliberately an unfilled placeholder rather than a guessed
// figure: a cap a UAE court will not enforce is worse than a narrower one,
// because it creates false confidence in exactly the scenario it was written
// for. Do not invent a number here.
// ---------------------------------------------------------------------------

const LAST_UPDATED = "Draft — not yet effective";
const VERSION = "0.1.0-draft";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms governing your use of the Smarthaus website, including what is and is not a binding offer.",
  alternates: { canonical: "/terms" },
  // Draft: states liability and governing-law positions that are not settled.
  // Flip to indexable in the same change that clears the placeholders and
  // records counsel sign-off.
  robots: { index: false, follow: true },
};

const ENTITY_ROWS = [
  { label: "Legal entity", value: <Placeholder>registered legal name</Placeholder> },
  { label: "Trading as", value: "Smarthaus" },
  { label: "Trade licence number", value: <Placeholder>trade licence no.</Placeholder> },
  { label: "Registered address", value: <Placeholder>registered address, Dubai, UAE</Placeholder> },
  { label: "Contact", value: <Placeholder>hello@smarthaus.ae</Placeholder> },
] as const;

const CONTACT_ROWS = [
  { label: "Email", value: <Placeholder>hello@smarthaus.ae</Placeholder> },
  { label: "Post", value: <Placeholder>registered address, Dubai, UAE</Placeholder> },
] as const;

export default function TermsAndConditions() {
  return (
    <LegalPage
      title="Terms and Conditions"
      standfirst="These terms govern your use of this website. They are not the agreement for installing a system in your home — that is a separate written contract."
      lastUpdated={LAST_UPDATED}
      version={VERSION}
      sections={S}
    >
      <p>
        These terms govern your use of the Smarthaus website at smarthaus.ae. Please read them
        before using the site.
      </p>
      <LegalNote>
        <p>
          <strong>What these terms are, in one sentence:</strong> they cover using this website.
          They are not the agreement for installing a system in your home — that is a separate
          written contract, and nothing on this website commits either of us to it.
        </p>
      </LegalNote>

      {/* 1 */}
      <LegalSectionBlock section={S[0]!}>
        <p>
          This website is operated by <Placeholder>registered legal entity name</Placeholder>, a
          company licensed in <Placeholder>licensing authority and jurisdiction</Placeholder>,
          trading as Smarthaus.
        </p>
        <LegalDefTable rows={ENTITY_ROWS} caption="Smarthaus entity and contact details" />
        <p>
          In these terms, “we”, “us” and “our” mean that entity. “You” means you, the person using
          this website.
        </p>
      </LegalSectionBlock>

      {/* 2 */}
      <LegalSectionBlock section={S[1]!}>
        <p>
          By using this website you accept these terms. If you do not accept them, please do not use
          the site.
        </p>
        <p>
          If you are using the site on behalf of a company, practice, or other organisation — for
          example as an interior designer or a developer enquiring for a client — you confirm you
          are authorised to accept these terms on its behalf, and “you” includes that organisation.
        </p>
        <p>You must be at least 18 years old to submit an enquiry through this site.</p>
      </LegalSectionBlock>

      {/* 3 */}
      <LegalSectionBlock section={S[2]!}>
        <p>
          We may update these terms. The version and date at the top of this page tell you which
          version applies.
        </p>
        <p>
          Changes take effect when published, and apply to use of the site after that point. They do
          not change the terms of any contract already signed between us. If a change is material,
          we will make it apparent rather than relying on you re-reading the page.
        </p>
      </LegalSectionBlock>

      {/* 4 */}
      <LegalSectionBlock section={S[3]!}>
        <p>
          You may use this site to learn about Smarthaus, view our work, and contact us. You may
          read, print, and share pages for your own use or for your organisation’s genuine
          assessment of our services — including sharing them with your own client.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>use the site unlawfully, or for any fraudulent or deceptive purpose;</li>
          <li>
            attempt to gain unauthorised access to the site, its hosting, or any connected system;
          </li>
          <li>interfere with the site’s operation or availability, including by overloading it;</li>
          <li>
            use automated means to scrape, harvest, or copy the site’s content systematically, other
            than search engine and AI crawlers acting in accordance with our robots.txt;
          </li>
          <li>
            copy, reproduce, or republish our content commercially without our written permission,
            except as section 7 allows;
          </li>
          <li>remove or obscure any copyright, trademark, or other proprietary notice;</li>
          <li>
            submit an enquiry impersonating someone else, or send us anyone else’s personal
            information without their knowledge;
          </li>
          <li>
            use our contact forms or contact details to send unsolicited marketing, or to harvest
            them for a marketing list.
          </li>
        </ul>
        <p>
          We may restrict or withdraw access to the site if you breach these terms. We would
          generally rather tell you first and give you a chance to stop.
        </p>
      </LegalSectionBlock>

      {/* 5 — the load-bearing clause */}
      <LegalSectionBlock section={S[4]!}>
        <LegalNote>
          <p>
            <strong>
              Nothing on this website is an offer to sell, a quotation, or a commitment to supply at
              any particular price or on any particular timescale.
            </strong>{" "}
            Prices, indicative costs, package descriptions, timelines, and capability descriptions
            are illustrative and may change.
          </p>
        </LegalNote>
        <p>A binding agreement between us comes into existence only when:</p>
        <ol>
          <li>we have discussed your project and, where relevant, surveyed the property;</li>
          <li>we have issued a written proposal or quotation for that specific project; and</li>
          <li>both parties have signed a written contract.</li>
        </ol>
        <p>
          Until all three have happened, neither of us is committed. Submitting an enquiry does not
          oblige you to buy anything, and it does not oblige us to accept the work.
        </p>
        <p>
          Where these terms and a signed installation contract say different things about that
          project, <strong>the signed contract governs.</strong>
        </p>
      </LegalSectionBlock>

      {/* 6 */}
      <LegalSectionBlock section={S[5]!}>
        <p>
          When you submit an enquiry, you confirm the information you give us is accurate and that
          you are entitled to provide it.
        </p>
        <p>
          We aim to respond to every genuine enquiry. We cannot guarantee a response time, and we
          may decline an enquiry — for example where a project is outside the areas we serve,
          outside our technical scope, or outside our current capacity. We are not obliged to give a
          reason, though we usually will.
        </p>
        <p>
          An enquiry is not a booking. A site visit is arranged by agreement between us, and
          arranging one commits neither party to a project.
        </p>
        <p>
          We handle the personal information in your enquiry as described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSectionBlock>

      {/* 7 */}
      <LegalSectionBlock section={S[6]!}>
        <h3>What we own</h3>
        <p>
          All content on this website — text, photographs, renders, animations, diagrams,
          illustrations, the Smarthaus name and logo, the site’s design and code — is owned by us or
          licensed to us, and is protected by copyright, trademark, and other intellectual property
          law.
        </p>
        <p>
          Nothing on this site transfers any ownership or licence to you, other than the limited
          permission to view and share pages described in section 4.
        </p>
        <p>
          The Smarthaus name and logo are our trademarks. You may not use them without our written
          permission, except to refer to us factually and accurately — for example an interior
          designer describing us as a specialist they work with.
        </p>

        <h3>Renders and visualisations</h3>
        <p>
          Some imagery on this site is computer-generated or otherwise illustrative rather than
          photographic. It is there to communicate design intent, spatial arrangement, and the
          character of an installation. It is not a photograph of a specific completed property, and
          it does not depict a guaranteed outcome.
        </p>
        <p>
          The finished appearance of any installation depends on your property, the products
          selected, and what is agreed in your project documentation.
        </p>

        <h3>Third-party names and marks</h3>
        <p>
          Any third-party product, brand, or manufacturer name appearing on this site remains the
          property of its owner. We use such names only to describe equipment or systems factually.
          Their appearance does not imply that we are an authorised dealer, certified partner, or
          endorsed by that company, unless we say so expressly in writing.
        </p>

        <h3>Feedback</h3>
        <p>
          If you send us an idea, suggestion, or feedback about our website or services, we may use
          it without restriction and without owing you anything for it. Please do not send us
          confidential or commercially sensitive information this way. This does not apply to
          project information you give us in the course of a signed engagement, which is governed by
          that contract.
        </p>
      </LegalSectionBlock>

      {/* 8 */}
      <LegalSectionBlock section={S[7]!}>
        <p>
          We build and maintain this site carefully, and we keep its content accurate to the best of
          our knowledge.
        </p>
        <p>
          That said, we provide the website on an “as is” and “as available” basis. We do not
          warrant that:
        </p>
        <ul>
          <li>the site will be uninterrupted, timely, or error-free;</li>
          <li>
            the site or its hosting will be free of viruses or other harmful components, though we
            take reasonable measures;
          </li>
          <li>
            the information on the site is complete, current, or free of error at every moment;
          </li>
          <li>
            the site will be compatible with every device, browser, or assistive technology, though
            we design and test for broad compatibility and accessibility.
          </li>
        </ul>
        <p>
          Technical information, product descriptions, and capability descriptions are given in good
          faith for general guidance. They are not technical advice for your specific property.
          Decisions about your property should be based on the written proposal and documentation we
          prepare for your project, not on a website page.
        </p>
        <p>
          We may change, suspend, or withdraw any part of the site, or the whole site, at any time.
        </p>
      </LegalSectionBlock>

      {/* 9 */}
      <LegalSectionBlock section={S[8]!}>
        <p>
          This site may link to websites we do not control — a manufacturer’s product page, for
          instance.
        </p>
        <p>
          We provide those links for convenience. We are not responsible for their content, their
          accuracy, their security, or how they handle your personal information, and a link is not
          an endorsement. Once you leave our site, that site’s own terms and privacy policy apply.
        </p>
      </LegalSectionBlock>

      {/* 10 */}
      <LegalSectionBlock section={S[9]!}>
        <p>
          Nothing in these terms limits or excludes any liability that cannot be limited or excluded
          under UAE law. In particular, nothing here limits liability for death or personal injury
          caused by our negligence, or for fraud or fraudulent misrepresentation.
        </p>
        <p>Subject to that:</p>
        <ul>
          <li>
            We are not liable for any loss arising from your use of, or inability to use, this
            website.
          </li>
          <li>
            We are not liable for indirect or consequential loss, loss of profit, loss of revenue,
            loss of business, loss of anticipated savings, or loss of data arising from your use of
            this website.
          </li>
          <li>
            We are not liable for any decision you take based solely on information on this website
            rather than on a written proposal prepared for your project.
          </li>
          <li>
            Where liability arising from your use of this website cannot be excluded, it is limited
            to <Placeholder>figure and currency — counsel to advise</Placeholder>.
          </li>
        </ul>
        <LegalNote>
          <p>
            <strong>These limits apply to your use of this website only.</strong> Our liability in
            relation to an installation, a supply of goods, or services we are engaged to perform is
            governed by the signed contract for that project, not by this section.
          </p>
        </LegalNote>
      </LegalSectionBlock>

      {/* 11 */}
      <LegalSectionBlock section={S[10]!}>
        <p>
          If you use this website in breach of these terms and that causes us loss, you agree to be
          responsible for that loss, including reasonable legal costs.
        </p>
        <p>
          This does not apply to ordinary use of the site, and it does not apply where the loss was
          caused by us.
        </p>
      </LegalSectionBlock>

      {/* 12 */}
      <LegalSectionBlock section={S[11]!}>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains what personal information we
          collect, why, how long we keep it, and your rights over it. It forms part of these terms.
        </p>
      </LegalSectionBlock>

      {/* 13 */}
      <LegalSectionBlock section={S[12]!}>
        <p>
          <strong>If part of these terms cannot be enforced,</strong> the rest continues to apply.
          The unenforceable part is treated as modified to the minimum extent needed to make it
          enforceable, or removed if that is not possible.
        </p>
        <p>
          <strong>If we do not enforce a term immediately,</strong> we do not lose the right to
          enforce it later.
        </p>
        <p>
          <strong>These terms are between you and us.</strong> No one else can enforce them.
        </p>
        <p>
          <strong>We may transfer our rights and obligations</strong> under these terms to another
          entity, for example if our business is restructured or sold. Your rights are not reduced
          by such a transfer. You may not transfer your rights or obligations without our written
          permission.
        </p>
        <p>
          <strong>These terms, together with our Privacy Policy,</strong> are the entire agreement
          between us in relation to your use of this website, and replace any earlier statement
          about it. This does not affect any signed contract between us for a project, and does not
          limit liability for fraudulent misrepresentation.
        </p>
      </LegalSectionBlock>

      {/* 14 */}
      <LegalSectionBlock section={S[13]!}>
        <p>
          These terms are governed by the federal laws of the United Arab Emirates and the laws of
          the Emirate of Dubai.
        </p>
        <p>
          The courts of <Placeholder>forum — counsel to confirm</Placeholder> have jurisdiction over
          any dispute arising out of or in connection with these terms or your use of this website.
        </p>
      </LegalSectionBlock>

      {/* 15 */}
      <LegalSectionBlock section={S[14]!}>
        <p>If you have a question about these terms, contact us.</p>
        <LegalDefTable rows={CONTACT_ROWS} caption="How to contact Smarthaus about these terms" />
      </LegalSectionBlock>
    </LegalPage>
  );
}
