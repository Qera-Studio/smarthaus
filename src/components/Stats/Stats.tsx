import { STATS } from "../../content/stats";
import styles from "./Stats.module.scss";

/**
 * Four figures under the hardware carousel: the evidence James & Emma look for
 * before trusting a young brand. Laid out as the enquiry's section pattern,
 * title on the left, a two by two grid of equal cards on the right.
 *
 * A list, not a table or a <dl>: each item reads as one sentence ("150+
 * Residential clients served"), number first, as it is drawn.
 */
export function Stats() {
  return (
    <section className={styles.stats} aria-labelledby="stats" data-stats="">
      <h2 className={styles.heading} id="stats">
        By the numbers
      </h2>
      <ul className={styles.grid}>
        {STATS.map((stat) => (
          <li key={stat.label} className={styles.card}>
            <span className={styles.value}>{stat.value}</span>{" "}
            <span className={styles.label}>{stat.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
