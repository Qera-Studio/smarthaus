/**
 * The About page's copy (src/app/about/page.tsx), verbatim from Shivanshu's
 * mockup and message of 2026-10-07.
 *
 * Every promise here was confirmed by Shivanshu that day as true of every job
 * today (AGENTS.md, claims audit): one team designs, installs and maintains;
 * no finished home is photographed, no address published, no plan shared;
 * footage stays on equipment in the house; no quote without a visit. A line
 * that stops being true comes out of this file before it comes out of the
 * business.
 */
export type Statement = {
  /** The one-line answer, set large. */
  lead: string;
  /** What it means in practice, set as secondary text. */
  body: string;
};

export type Value = {
  title: string;
  body: string;
};

export const MISSION: Statement = {
  lead: "To make one company responsible for everything that runs your home.",
  body: "Most villas end up with four installers in them and nobody to call when something stops working. We design, install and maintain the whole system ourselves, so there's one team, one contract, and one number.",
};

export const VISION: Statement = {
  lead: "A home that asks nothing of you.",
  body: "The lights are already right. The gate is already open. The house is already cool. The best system is the one you stop noticing, and that's what we're building toward in every villa we work in.",
};

export const VALUES: readonly Value[] = [
  {
    title: "We finish what we start.",
    body: "A system isn't done when it's installed. It's done when the family can use it, the documentation is handed over, and someone answers the phone a year later.",
  },
  {
    title: "We say what we can't do.",
    body: "If something isn't possible in your villa, or isn't worth the money, we'll tell you before you spend it. A smaller honest job beats a bigger one that disappoints.",
  },
  {
    title: "The work is in the walls.",
    body: "Most of what we do is never seen. Cable routes, labelled panels, tested connections. That hidden work is the difference between a system that lasts and one that doesn't.",
  },
  {
    title: "Your home stays private.",
    body: "We don't photograph finished homes, publish addresses or share plans. Footage stays on equipment in your house. Discretion isn't a feature, it's the baseline.",
  },
  {
    title: "We'd rather visit than guess.",
    body: "No quote leaves without someone standing in the house first.",
  },
];
