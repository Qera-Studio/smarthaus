import Image from "next/image";
import type { ReactNode } from "react";

import { ValuesHover } from "../../components/About/ValuesHover";
import styles from "../../components/About/About.module.scss";
import { FaqAccordion } from "../../components/Faq";
import faq from "../../components/Faq/Faq.module.scss";
import { HomeEnquiry } from "../../components/HomeEnquiry";
import { JsonLd, pageGraph } from "../../components/Schema";
import { ABOUT_FAQS, APPROACH, MISSION, VALUES, VISION, type Statement } from "../../content/about";
import { pageMetadata } from "../../lib/metadata";

const PAGE = {
  path: "/about",
  title: "About Smarthaus, Home Automation in Dubai",
  description:
    "Who Smarthaus is: one team that designs, installs and maintains home automation and security for Dubai villas, and the values behind every job.",
  index: true,
} as const;

export const metadata = pageMetadata(PAGE);

/**
 * The About page: a hero, the approach, then mission, vision and values,
 * from Shivanshu's mockups of 2026-10-07, closing on the homepage's
 * enquiry form and a short FAQ. A Server Component; the only client code is the
 * values' hover (ValuesHover), and the hero's parallax is CSS.
 *
 * Both photographs are decorative (empty alt): the words carry the meaning,
 * and the h1 says what the hero is.
 */
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <JsonLd data={pageGraph(PAGE)} />

      <section className={styles.hero} aria-labelledby="about-title" data-about-hero="">
        <div className={styles.heroLayer} data-parallax="hero">
          <Image
            src="/about/aboutUs_hero.png"
            alt=""
            fill
            // The page's LCP. `priority` is deprecated in Next 16; the docs
            // recommend these two over `preload`.
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1440px) 1376px, 100vw"
            className={styles.cover}
          />
        </div>
        <h1 className={styles.heroTitle} id="about-title">
          About Us
        </h1>
      </section>

      <section className={styles.approach} aria-labelledby="approach" data-about-approach="">
        <h2 className={styles.approachTitle} id="approach">
          Our Approach
        </h2>
        <ul className={styles.approachGrid}>
          {APPROACH.map((step) => (
            <li key={step.title} className={styles.approachCard}>
              {/* Decorative: the title beside it says what the step is. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- a 32px SVG, as the hardware icons are */}
              <img
                className={styles.approachIcon}
                src={`/about/icons/${step.icon}`}
                alt=""
                width={32}
                height={32}
              />
              <div>
                <h3 className={styles.approachStep}>{step.title}</h3>
                <p className={styles.approachBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* One dark band for the photograph, Mission and Vision (Shivanshu,
          2026-10-07): two sections in it, so each keeps its own landmark. */}
      <div className={styles.dark} data-about-dark="" data-ground="dark">
        <div className={styles.missionMedia} data-about-mission-media="">
          <div className={styles.mediaLayer} data-parallax="mission">
            <Image
              src="/about/mission_Img.png"
              alt=""
              fill
              sizes="100vw"
              className={styles.cover}
            />
          </div>
        </div>
        <section className={styles.darkSection} aria-labelledby="mission" data-about-mission="">
          <Pattern id="mission" title="Mission">
            <StatementCopy statement={MISSION} />
          </Pattern>
        </section>
        <section
          className={`${styles.darkSection} ${styles.darkRuled}`}
          aria-labelledby="vision"
          data-about-vision=""
        >
          <Pattern id="vision" title="Vision">
            <StatementCopy statement={VISION} />
          </Pattern>
        </section>
      </div>

      <section className={styles.ruled} aria-labelledby="values" data-about-values="">
        <Pattern id="values" title="Values">
          <ValuesHover className={styles.rows}>
            {VALUES.map((value, index) => (
              <details key={value.title} className={faq.entry} name="values">
                <summary className={faq.question}>
                  <span className={faq.questionText}>{value.title}</span>
                  <span className={styles.number} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </summary>
                <div className={faq.answer}>
                  <p>{value.body}</p>
                </div>
              </details>
            ))}
          </ValuesHover>
        </Pattern>
      </section>

      {/* The homepage's own enquiry, then a short FAQ in the contact page's
          pattern below it (Shivanshu, 2026-10-07). */}
      <HomeEnquiry />

      <section className={styles.ruled} aria-labelledby="about-faqs" data-about-faqs="">
        <Pattern id="about-faqs" title="Frequently Asked Questions" small>
          <div className={styles.rows}>
            {ABOUT_FAQS.map((entry) => (
              <FaqAccordion key={entry.id} entry={entry} group="about-faq" />
            ))}
          </div>
        </Pattern>
      </section>
    </div>
  );
}

/** The house section pattern: the title on the left half, the content on the right. */
function Pattern({
  id,
  title,
  small = false,
  children,
}: {
  id: string;
  title: string;
  /** The contact page's section size, for a title that sits beside the form. */
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.pattern}>
      <h2 className={small ? styles.titleSmall : styles.title} id={id}>
        {title}
      </h2>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

function StatementCopy({ statement }: { statement: Statement }) {
  return (
    <>
      <p className={styles.lead}>{statement.lead}</p>
      <p className={styles.body}>{statement.body}</p>
    </>
  );
}
