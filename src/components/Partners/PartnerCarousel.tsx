"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";

import type { Partner } from "../../content/partners";
import { Button } from "../Button";
import styles from "./Partners.module.scss";

/**
 * One card per partner, and a two-tab toggle between them. An ARIA tablist,
 * the same pattern as the hardware carousel's: the tabs are one tab stop, the
 * arrow keys move between them, and a tab shows its card the moment it is
 * focused (automatic activation, since switching costs nothing).
 *
 * No autoplay. A carousel that moves on its own needs a pause control (WCAG
 * 2.2.2) and competes with the copy for attention; two cards a visitor can
 * flip themselves need neither.
 *
 * Every card is in the HTML, stacked in one grid cell, so the stage is as tall
 * as the tallest and switching never moves the page below. The inactive card
 * is `visibility: hidden`, which keeps its copy crawlable while taking it out
 * of the tab order and the accessibility tree.
 */
export function PartnerCarousel({ partners }: { partners: readonly Partner[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = (index + partners.length) % partners.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: partners.length - 1,
    };
    const to = moves[event.key];
    if (to === undefined) return;
    event.preventDefault();
    select(to);
  };

  return (
    <div className={styles.carousel}>
      <div className={styles.tabs} role="tablist" aria-label="Partners">
        {partners.map((partner, index) => (
          <button
            key={partner.id}
            ref={(el) => {
              tabs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`partner-tab-${partner.id}`}
            aria-controls={`partner-panel-${partner.id}`}
            aria-selected={index === active}
            tabIndex={index === active ? 0 : -1}
            className={styles.tab}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {partner.name}
          </button>
        ))}
      </div>

      <div className={styles.stage}>
        {partners.map((partner, index) => (
          <div
            key={partner.id}
            role="tabpanel"
            id={`partner-panel-${partner.id}`}
            aria-labelledby={`partner-tab-${partner.id}`}
            className={styles.card}
            data-active={index === active || undefined}
          >
            <div className={styles.copy}>
              <h3 className={styles.title}>{partner.title}</h3>
              <p className={styles.description}>{partner.body}</p>
              <div className={styles.action}>
                <Button
                  href={partner.href}
                  variant="soft"
                  size="sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit {partner.name}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </Button>
              </div>
            </div>

            <div className={styles.logoPanel}>
              <Image
                src={partner.logo.src}
                alt={partner.name}
                width={partner.logo.width}
                height={partner.logo.height}
                sizes="384px"
                className={styles.logo}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
