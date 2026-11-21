import { getHomePage } from "../../sanity/content";
import { Button } from "../Button";
import { Words } from "../Words";
import { PROTOCOLS, PROTOCOLS_LABEL } from "./protocols";
import styles from "./Connectivity.module.scss";

const DIR = "/landing/connectivity";

/**
 * The standards Smarthaus installs, under the figures (Figma 4914:839, built
 * 2026-11-16): a heading, a line and the site-visit button over a brown
 * ground, and the six marks along its foot.
 *
 * The ground is Figma's own export (bg.svg), baked to a picture and painted
 * by the stylesheet. The Figma's Dither effect over it was built and dropped
 * the same day, at Shivanshu's call: nothing else on the site is dithered.
 */
export async function Connectivity() {
  const { connectivity } = await getHomePage();
  const { heading, lead, cta } = connectivity;
  return (
    <section className={styles.section} aria-labelledby="connectivity" data-ground="dark">
      <div className={styles.copy}>
        <h2 className={styles.heading} id="connectivity" data-reveal="" data-reveal-words="">
          <Words text={heading} />
        </h2>
        <p className={styles.lead} data-reveal="">
          {lead}
        </p>
        <Button href="/contact" variant="inverse" size="sm">
          {cta}
        </Button>
      </div>

      <ul className={styles.marks} aria-label={PROTOCOLS_LABEL}>
        {PROTOCOLS.map((protocol) => (
          <li key={protocol.name} data-reveal="">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small SVG, which next/image would only wrap */}
            <img
              className={styles.mark}
              src={`${DIR}/${protocol.logo}`}
              alt={protocol.name}
              width={protocol.width}
              height={protocol.height}
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
