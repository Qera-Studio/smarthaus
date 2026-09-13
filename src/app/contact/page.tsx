import type { Metadata } from "next";
import Image from "next/image";

import {
  ADDRESS_LINES,
  EMAIL,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_E164,
  whatsappLink,
} from "../../lib/contact";
import { ContactForm } from "./ContactForm";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a site visit with Smarthaus. Tell us about your home and we will call you back, usually within the hour during business hours. Dubai, U.A.E.",
  alternates: { canonical: "/contact" },
};

/**
 * The FAQ content, and the source of the FAQPage structured data below. One
 * array, two consumers, so the markup a crawler reads cannot drift from the
 * text a visitor reads.
 *
 * No em dashes: the house rule, asserted by the e2e suites.
 */
const FAQS = [
  {
    q: "Is the visit an obligation?",
    a: "No. The site assessment is a paid visit, AED 1,500, credited in full against any installation you go ahead with. If you decide not to, you keep the report and owe us nothing further.",
  },
  {
    q: "What happens during the visit?",
    a: "A technician and a technical salesperson spend about 90 minutes in your home. They check your cabling, network and any systems you already have, go room by room to see what is possible, and ask how you actually use the house. You will have a fixed, itemised proposal within 48 hours.",
  },
  {
    q: "Do I need to be renovating?",
    a: "No. Most of our work happens in homes people are living in. Some things need new cabling, and we will tell you exactly which ones before you commit to anything.",
  },
  {
    q: "Is Smarthaus a new company?",
    // The founding year is a documented placeholder in AGENTS.md and must not
    // be invented, so the answer carries the licence instead, which is the
    // verifiable part and the part that actually answers the worry.
    a: "No. Smarthaus is the home division of Maple Technologies Security Systems LLC, a SIRA-licensed Dubai company. Same team, same licence, same accountability.",
  },
  {
    q: "Do you work outside Dubai?",
    a: "We work across Dubai. If you are in Abu Dhabi or Sharjah, tell us anyway and we will be straight with you about whether we can look after you properly.",
  },
] as const;

const CONTACT_ROWS = [
  { label: "Phone", value: PHONE_DISPLAY, href: `tel:${PHONE_E164}`, external: false },
  { label: "Email", value: EMAIL, href: `mailto:${EMAIL}`, external: false },
  {
    label: "Whatsapp",
    value: PHONE_DISPLAY,
    href: whatsappLink("Hi, I would like to talk about smart home automation."),
    external: true,
  },
] as const;

/**
 * No FAQPage JSON-LD on this page, deliberately.
 *
 * The assessment fee above is the same figure src/content/faq.ts carries as
 * `pending: "Fee pending Sunil's approval."`. Showing an unconfirmed price to a
 * reader who can ask about it is one thing; publishing it as structured data is
 * another, because that is what an answer engine quotes back with no way to
 * check whether it still holds. /faq withholds its schema for exactly this
 * reason (see the launch-gate row in AGENTS.md).
 *
 * To add it: confirm the fee, clear that `pending` note, then emit the schema
 * from the FAQS array in the same change.
 */

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.standfirst}>
          Tell us a little about your home and we&rsquo;ll call you back. During business hours,
          that&rsquo;s usually within the hour.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="book-a-visit">
        <h2 className={styles.sectionTitle} id="book-a-visit">
          Book a visit
        </h2>
        <div className={styles.sectionBody}>
          <ContactForm />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="get-in-touch">
        <h2 className={styles.sectionTitle} id="get-in-touch">
          Get In Touch
        </h2>
        <ul className={styles.channels}>
          {CONTACT_ROWS.map(({ label, value, href, external }) => (
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
          Location
        </h2>
        <div className={styles.location}>
          <div className={styles.locationImage}>
            {/* Served through next/image so the 3024x4032 source is re-encoded
                to AVIF/WebP at the widths actually needed. sizes is explicit:
                without it the largest candidate is picked at every viewport. */}
            <Image
              src="/contact-location.jpg"
              alt="Downtown Dubai at dusk, looking along Sheikh Zayed Road towards the Burj Khalifa"
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 768px) 40vw, 90vw"
              className={styles.locationPhoto}
            />
          </div>

          {/* data-ground: this panel paints brown-900, where the default
              brown-900 cursor dot is invisible. See globals.scss. */}
          <div className={styles.locationCard} data-ground="dark">
            <address className={styles.address}>
              {ADDRESS_LINES.map((line) => (
                <span key={line} className={styles.addressLine}>
                  {line}
                </span>
              ))}
            </address>
            <a
              className={styles.outlineCta}
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="faqs">
        <h2 className={styles.sectionTitle} id="faqs">
          Frequently Asked Questions
        </h2>
        <div className={styles.faqs}>
          {FAQS.map(({ q, a }) => (
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
