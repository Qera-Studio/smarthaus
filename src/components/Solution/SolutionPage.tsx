import Image from "next/image";

import { solutionPictureProps } from "../../lib/solution-picture";
import { getPosts, getSettings, getSolutionPage } from "../../sanity/content";
import { byTags, RelatedArticles } from "../Blog";
import { Button } from "../Button";
import { FaqAccordion } from "../Faq";
import { HomeEnquiry } from "../HomeEnquiry";
import { WorksWith } from "../WorksWith";
import { solutionIcon } from "./icons";
import styles from "./Solution.module.scss";

/**
 * The process's drawings, one per step and in its order, in
 * public/solutions/process/. Decoration: each step's title says what it shows.
 */
export const PROCESS_DRAWINGS = ["01-inspect.svg", "02-install.svg", "03-maintain.svg"] as const;

/**
 * One solution's page (Figma 4903:4464, Shivanshu 2026-11-15): its picture on
 * the screen's left half and its name beside it; nine features round a
 * picture and a dark box that asks for a visit; the process, visit, install
 * and maintain, one card each over its drawing; then the questions, the
 * enquiry form and the articles, in that order on every solution page.
 *
 * The picture is the Solutions menu's own, which the menu grows into this
 * place when it opens the page (SolutionsMenu.tsx). It and the copy are
 * marked by data attributes for that, and the picture is the page's largest
 * paint, so it alone is fetched at high priority. A page whose item has gone
 * from the menu has no picture, and fails the build.
 */
export async function SolutionPage({
  slug,
}: {
  /** The solution's id in the Solutions menu, and its address. */
  slug: string;
}) {
  const [page, { solutionsMenu }, posts] = await Promise.all([
    getSolutionPage(slug),
    getSettings(),
    getPosts(),
  ]);
  const item = solutionsMenu.items.find((entry) => entry.id === slug);
  if (!item) throw new Error(`Solution page "${slug}": no item with that id in the Solutions menu`);
  const picture = item.image;
  const { features, process } = page;
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="solution-title">
        <div className={styles.picture} data-solution-picture={slug}>
          <Image
            {...solutionPictureProps(picture)}
            alt=""
            className={styles.pictureImage}
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className={styles.copy} data-solution-copy="">
          <h1 className={styles.title} id="solution-title">
            {page.title}
          </h1>
          <p className={styles.lede}>{page.lede}</p>
        </div>
      </section>

      <div className={styles.body}>
        <WorksWith slug={slug} />

        <section className={styles.features} aria-labelledby="solution-features">
          <div className={styles.intro}>
            <h2 className={styles.heading} id="solution-features">
              {features.heading}
            </h2>
            <p className={styles.standfirst}>{features.standfirst}</p>
          </div>

          {/* Nine boxes round a picture and the dark box. One grid, so the
              hairlines between them are its gaps; the picture and the box are
              placed, and the features flow round them in order. */}
          <div className={styles.grid}>
            {features.items.map(({ icon, title, text }) => {
              const Icon = solutionIcon(icon);
              return (
                <div key={title} className={styles.feature}>
                  <Icon className={styles.icon} size={28} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <h3 className={styles.featureTitle}>{title}</h3>
                    <p className={styles.featureText}>{text}</p>
                  </div>
                </div>
              );
            })}
            <div className={styles.featureImage}>
              <Image
                src={features.image.src}
                alt={features.image.alt}
                fill
                sizes="(min-width: 64rem) 40vw, (min-width: 48rem) 100vw, 100vw"
              />
            </div>
            {/* data-ground: a dark box, where the default dark cursor dot
                would vanish (globals.scss). */}
            <div className={styles.slab} data-ground="dark">
              <p className={styles.slabText}>{features.ctaText}</p>
              <Button href="/contact" variant="inverse">
                {features.ctaLabel}
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="solution-process">
          <div className={`${styles.intro} ${styles.centred}`}>
            <h2 className={styles.heading} id="solution-process">
              {process.heading}
            </h2>
            <p className={styles.standfirst}>{process.subtext}</p>
          </div>
          <ol className={styles.steps}>
            {process.steps.map(({ title, text }, index) => (
              <li key={title} className={styles.step}>
                {/* eslint-disable-next-line @next/next/no-img-element -- an SVG, which next/image would only wrap */}
                <img
                  className={styles.drawing}
                  src={`/solutions/process/${PROCESS_DRAWINGS[index]}`}
                  alt=""
                  width={480}
                  height={440}
                  loading="lazy"
                />
                <div>
                  <h3 className={styles.stepTitle}>{title}</h3>
                  <p className={styles.stepText}>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.ruled} aria-labelledby="solution-faqs">
          <div className={styles.pattern}>
            <h2 className={styles.patternTitle} id="solution-faqs">
              {page.faqHeading}
            </h2>
            <div className={styles.rows}>
              {page.faqs.map((entry) => (
                <FaqAccordion key={entry.id} entry={entry} group="solution-faq" />
              ))}
            </div>
          </div>
        </section>

        <HomeEnquiry title={page.enquiry.title} standfirst={page.enquiry.standfirst} />

        <RelatedArticles
          heading={page.articlesHeading}
          posts={byTags([page.articlesTag], posts)}
          standalone
        />
      </div>
    </div>
  );
}
