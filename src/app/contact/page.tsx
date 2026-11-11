import type { Metadata } from "next";
import Image from "next/image";

import { whatsappLink } from "../../lib/contact";
import { ContactForm } from "./ContactForm";
import styles from "./page.module.scss";
import { JsonLd, pageGraph } from "../../components/Schema";
import { pageMetadata, seoInput } from "../../lib/metadata";
import { getConsentCopy, getContactPage, getSettings } from "../../sanity/content";

const PATH = "/contact";

// Title and h1 share their key words (SEO System §2): what the visitor came to
// do, rather than "Contact". Both are in the Studio now; keep them in step.
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getContactPage();
  return pageMetadata(seoInput(PATH, seo));
}

/**
 * No FAQPage JSON-LD on this page, deliberately.
 *
 * The paid visit in the first answer is the term /faq carries as
 * `pending: "Fee pending Sunil's approval."`. Showing an unconfirmed term to a
 * reader who can ask about it is one thing; publishing it as structured data is
 * another, because that is what an answer engine quotes back with no way to
 * check whether it still holds. /faq withholds its schema for exactly this
 * reason (see the launch-gate row in AGENTS.md).
 *
 * To add it: confirm the fee, clear that `pending` note, then emit the schema
 * from the page's questions in the same change.
 */

export default async function ContactPage() {
  const [page, { contact }, { form: consent }] = await Promise.all([
    getContactPage(),
    getSettings(),
    getConsentCopy(),
  ]);
  const channels = [
    {
      label: page.channels.phone,
      value: contact.phoneDisplay,
      href: `tel:${contact.phoneE164}`,
      external: false,
    },
    {
      label: page.channels.email,
      value: contact.email,
      href: `mailto:${contact.email}`,
      external: false,
    },
    {
      label: page.channels.whatsapp,
      value: contact.phoneDisplay,
      href: whatsappLink(contact.whatsapp, page.channels.whatsappMessage),
      external: true,
    },
  ];
  return (
    <>
      {page.seo.index ? (
        <JsonLd data={pageGraph(seoInput(PATH, page.seo), page.updatedAt)} />
      ) : null}
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{page.title}</h1>
          <p className={styles.standfirst}>{page.standfirst}</p>
        </header>

        <section className={styles.section} aria-labelledby="book-a-visit">
          <h2 className={styles.sectionTitle} id="book-a-visit">
            {page.formHeading}
          </h2>
          <div className={styles.sectionBody}>
            <ContactForm copy={page.form} consent={consent} whatsapp={contact.whatsapp} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="get-in-touch">
          <h2 className={styles.sectionTitle} id="get-in-touch">
            {page.channelsHeading}
          </h2>
          <ul className={styles.channels}>
            {channels.map(({ label, value, href, external }) => (
              <li key={label} className={styles.channel}>
                <span className={styles.channelLabel}>{label}</span>
                <a
                  className={styles.channelValue}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {value}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="location">
          <h2 className={styles.sectionTitle} id="location">
            {page.locationHeading}
          </h2>
          <div className={styles.location}>
            <div className={styles.locationImage}>
              {/* Served through next/image so the 3024x4032 source is re-encoded
                  to AVIF/WebP at the widths actually needed. sizes is explicit:
                  without it the largest candidate is picked at every viewport. */}
              <Image
                src={page.locationPhoto.src}
                alt={page.locationPhoto.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 45vw, 90vw"
                className={styles.locationPhoto}
              />
            </div>

            {/* data-ground: this panel paints brown-900, where the default
                brown-900 cursor dot is invisible. See globals.scss. */}
            <div className={styles.locationCard} data-ground="dark">
              <address className={styles.address}>
                {contact.addressLines.map((line) => (
                  <span key={line} className={styles.addressLine}>
                    {line}
                  </span>
                ))}
              </address>
              <a
                className={styles.outlineCta}
                href={contact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {page.directions}
              </a>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faqs">
          <h2 className={styles.sectionTitle} id="faqs">
            {page.faqHeading}
          </h2>
          <div className={styles.faqs}>
            {page.faqs.map(({ question: q, answer: a }) => (
              // Native details/summary: keyboard operable and open without JS for
              // free, and it costs no client component. `name` makes them an
              // exclusive accordion, which browsers implement natively.
              <details key={q} className={styles.faq} name="contact-faq">
                <summary className={styles.faqQuestion}>
                  <span>{q}</span>
                  <Chevron />
                </summary>
                <p className={styles.faqAnswer}>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Chevron() {
  return (
    <svg
      className={styles.faqChevron}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
