import { STATS } from "../../content/stats";
import { Words } from "../Words";
import { RollingFigures } from "./RollingFigures";
import styles from "./Stats.module.scss";

/**
 * Four figures above the hardware carousel: the evidence James & Emma look for
 * before trusting a young brand. Laid out as the enquiry's section pattern,
 * title on the left, a two by two grid of equal cards on the right.
 *
 * A list, not a table or a <dl>: each item reads as one sentence ("150+
 * Residential clients served"), number first, as it is drawn. The figures roll
 * up as they come on screen (RollingFigures), over the real text.
 */
export function Stats() {
  return (
    <section className={styles.stats} aria-labelledby="stats" data-stats="">
      <h2 className={styles.heading} id="stats" data-reveal="" data-reveal-words="">
        <Words text="By the numbers" />
      </h2>
      <RollingFigures className={styles.grid}>
        {STATS.map((stat) => (
          <li key={stat.label} className={styles.card} data-reveal="">
            <span className={styles.value} data-stat-value="">
              {stat.value}
            </span>{" "}
            <span className={styles.label}>{stat.label}</span>
          </li>
        ))}
      </RollingFigures>
    </section>
  );
}
