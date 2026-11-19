import { getSettings, getSolutionPage, solutionPath } from "../../sanity/content";
import { Wiring, type WiringNode } from "./Wiring";
import styles from "./WorksWith.module.scss";

/**
 * "Works with", under a solution page's hero (Shivanshu, 2026-11-16): this
 * solution at the left, the solutions it is paired with in a column beside
 * it, each wired to it, and a panel saying what each pairing does. Smarthaus
 * is one system, not eight gadgets. Only the pairs are drawn; the others are
 * one menu away.
 *
 * Every name is the Solutions menu's. The diagram and the panel are the one
 * client island (Wiring); the header and a plain-text list of the pairs for
 * a screen reader are here.
 */
export async function WorksWith({ slug }: { slug: string }) {
  const [page, { solutionsMenu }] = await Promise.all([getSolutionPage(slug), getSettings()]);
  const name = (id: string) => {
    const item = solutionsMenu.items.find((entry) => entry.id === id);
    if (!item) throw new Error(`Works with: no "${id}" in the Solutions menu`);
    return item.label;
  };
  const { heading, subtext, line, pairs } = page.worksWith;
  // The schema refuses a pair with the page's own solution; leave one out all the same.
  const nodes: WiringNode[] = pairs
    .filter((pair) => pair.with !== slug)
    .map((pair) => ({ id: pair.with, name: name(pair.with), href: solutionPath(pair.with), pair }));

  return (
    <section className={styles.section} aria-labelledby="works-with" data-ground="dark">
      <div className={styles.header}>
        <h2 className={styles.heading} id="works-with">
          {heading}
        </h2>
        <p className={styles.subtext}>{subtext}</p>
      </div>

      <Wiring
        centre={{
          id: slug,
          name: name(slug),
          line,
          body: pairsSentence(nodes.map((node) => node.name)),
        }}
        nodes={nodes}
      />

      <ul className="visually-hidden">
        {nodes.map(({ id, name: other, pair }) => (
          <li key={id}>
            {`${other}: ${pair.title}. When ${lowerFirst(pair.trigger)}, then ${lowerFirst(pair.action)}. ${pair.body}`}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The card when the middle is picked: what this solution pairs with, by name
 * (Shivanshu, 2026-11-16: it used to repeat the section's heading). One app
 * runs every system on every job, a confirmed fact (AGENTS.md). A page has
 * at least one pair: the schema holds it.
 */
export function pairsSentence(names: string[]): string {
  const list =
    names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}`;
  const pick = names.length === 1 ? "Pick it" : "Pick one";
  return `Works with ${list}, in the same app. ${pick} to see what the two do together.`;
}

/** "Someone rings the door" reads on after "When" as "someone rings the door". */
export const lowerFirst = (text: string) =>
  /^[A-Z][a-z]/.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text;
