import { COMPARISON, PRICING_TIERS, type CellValue } from "../../content/pricing";
import styles from "./PricingComparison.module.scss";

/**
 * The full feature comparison: every section open, every row expandable to a
 * one-line description, four tier columns.
 *
 * Not a <table>, deliberately. Both levels of collapse are native <details>,
 * the FAQ accordion's precedent, which means zero client JavaScript and a
 * reduced-motion path that is just a transition-duration. A <details> cannot
 * live inside <tr>, so a real table would need a client toggle island and
 * would put the description in a second row, where the tick cells could not
 * stay centred against the open text the way they do here.
 *
 * What a table gave for free was column association: a screen reader on a
 * tick in the third column would know it belongs to Connected. Without one,
 * every cell carries its tier name in visually-hidden text, so the same cell
 * reads "Connected: Included". The header row is visual only and hidden from
 * AT; the cells are the source of truth.
 *
 * Below md the row is wider than the viewport by design and the region
 * scrolls sideways with the feature column pinned; the page never does. The
 * region is focusable and named, which axe requires of any scroll stop.
 *
 * Content and the claims status are in src/content/pricing.ts. This emits no
 * structured data, and the unit suite asserts the absence.
 */
export function PricingComparison() {
  return (
    // data-pricing-comparison is the stable hook for e2e: the module's class
    // names are hashed at build time.
    <section className={styles.comparison} aria-labelledby="compare" data-pricing-comparison>
      <h2 className={styles.heading} id="compare">
        Compare all features
      </h2>

      <div
        className={styles.scroll}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- required by axe scrollable-region-focusable; same as LegalTable
        tabIndex={0}
        role="group"
        aria-label="Feature comparison (scrollable)"
      >
        {/* Visual only. Each cell names its own column for AT, so announcing
            this row as well would read the four names twice. */}
        <div className={styles.head} aria-hidden="true">
          <div className={styles.headFeature}>Feature</div>
          {PRICING_TIERS.map((tier) => (
            <div key={tier.id} className={styles.headTier}>
              {tier.name}
            </div>
          ))}
        </div>

        {COMPARISON.map((section) => (
          // Open by default: the page is the comparison, and a visitor should
          // not have to click eleven times to see it. Closing is for skipping
          // a system they do not care about.
          <details key={section.id} className={styles.section} open>
            <summary className={styles.sectionSummary}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <ChevronDown className={styles.sectionChevron} />
            </summary>

            <div className={styles.rows}>
              {section.rows.map((row) => (
                <div key={row.id} className={styles.row}>
                  {/* Column one. The wrapper is the sticky, stretched cell;
                      the <details> inside it holds the name and, on open,
                      the description. The cells beside it are centred by the
                      row's grid, so they stay level with the name however
                      tall the description is. */}
                  <div className={styles.featureCell}>
                    <details className={styles.feature}>
                      <summary className={styles.featureSummary}>
                        <ChevronRight className={styles.featureChevron} />
                        <span className={styles.featureName}>{row.feature}</span>
                      </summary>
                      <p className={styles.description}>{row.description}</p>
                    </details>
                  </div>

                  {row.values.map((value, i) => {
                    const tier = PRICING_TIERS[i];
                    return (
                      <div key={tier?.id ?? i} className={styles.cell}>
                        <span className="visually-hidden">{tier?.name}: </span>
                        <Cell value={value} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * One cell. A tick and a rule are both drawn in CSS with hidden text beside
 * them, so what a screen reader hears is a word and what a sighted reader sees
 * is a mark. The rule is not a dash character: the copy guards forbid em
 * dashes, and a lone "-" reads as a typo rather than as "no".
 */
function Cell({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <>
        <span className={styles.tick} aria-hidden="true" />
        <span className="visually-hidden">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className={styles.none} aria-hidden="true" />
        <span className="visually-hidden">Not included</span>
      </>
    );
  }
  return <span className={styles.level}>{value}</span>;
}

/**
 * The FAQ accordion's chevron. Points down; rotates on open.
 *
 * `string | undefined`, not `string`: a CSS Module's class lookup is typed as
 * possibly missing under noUncheckedIndexedAccess, and that is the honest type
 * for what is passed in.
 */
function ChevronDown({ className }: { className: string | undefined }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Points right beside a label; rotates to down on open, as a disclosure. */
function ChevronRight({ className }: { className: string | undefined }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
