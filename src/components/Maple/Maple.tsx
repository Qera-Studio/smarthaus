import Image from "next/image";

import { Button } from "../Button";
import styles from "./Maple.module.scss";

/**
 * The parent-company banner, between the Hero and the Hardware section.
 *
 * The answer to James & Emma's first question, placed before anything asks
 * them to trust the product: who is behind this brand, and can I check them.
 * The CTA leaves the site on purpose. The evidence is Maple's own record, and
 * sending the reader to it is the honest way to show it.
 *
 * ## Claims status
 *
 * Every statement here already stands elsewhere in the repo: the parent
 * relationship and the SIRA licence (contact page FAQ, privacy and terms
 * identity tables), the security-and-technology description (CLAUDE.md), and
 * the URL (the footer). Nothing new is claimed. Adding a figure (years,
 * installations, clients) means sourcing it first; see AGENTS.md "Claims and
 * capability audit".
 *
 * The logo is Maple's own mark in Maple's own colours. Recolouring it to the
 * Smarthaus palette would misrepresent another company's brand.
 */

export const MAPLE_URL = "https://www.mapletech.ae";

export function Maple() {
  return (
    <section className={styles.maple} aria-labelledby="maple">
      <div className={styles.card}>
        <div className={styles.copy}>
          <h2 className={styles.title} id="maple">
            A brand by Maple Technologies
          </h2>
          <p className={styles.description}>
            Smarthaus is the home automation division of Maple Technologies, a SIRA-licensed
            security and technology company in Dubai. Same team, same licence, same accountability.
          </p>
          <div className={styles.action}>
            <Button
              href={MAPLE_URL}
              variant="soft"
              size="sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Maple Technologies
              <span className="visually-hidden"> (opens in a new tab)</span>
            </Button>
          </div>
        </div>

        <div className={styles.logoPanel}>
          {/* width and height are the SVG's own viewBox, so the box reserves
              the right aspect ratio before the file arrives (no CLS). An SVG
              src is served as-is by next/image, never re-encoded. */}
          <Image
            src="/hero/mapleLogo.svg"
            alt="Maple Technologies"
            width={10261}
            height={3654}
            className={styles.logo}
          />
        </div>
      </div>
    </section>
  );
}
