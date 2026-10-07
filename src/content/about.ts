/**
 * The About page's copy (src/app/about/page.tsx), verbatim from Shivanshu's
 * mockup and message of 2026-10-07.
 *
 * Every promise here was confirmed by Shivanshu that day as true of every job
 * today (AGENTS.md, claims audit): one team designs, installs and maintains;
 * no finished home is photographed, no address published, no plan shared;
 * footage stays on equipment in the house; no quote without a visit. The
 * approach cards' facts were confirmed the same day: a technician and a
 * technical lead spend about 90 minutes at the visit; the price that follows
 * is fixed and itemised; most jobs are in homes already lived in. A line
 * that stops being true comes out of this file before it comes out of the
 * business.
 */
import type { FaqEntry } from "./faq";

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

export type ApproachStep = {
  title: string;
  body: string;
  /** Filename in public/about/icons/. Decorative: the title says it all. */
  icon: string;
};

export const APPROACH: readonly ApproachStep[] = [
  {
    title: "We start at the boundary.",
    body: "Cameras, gate and entry come first, then the rooms inside. It's the order a house actually needs, and it's where our experience is deepest.",
    icon: "boundary.svg",
  },
  {
    title: "We visit before we quote.",
    body: "A technician and a technical lead spend about 90 minutes in the home, looking at cabling, network and whatever is already installed. The price that follows is fixed and itemised, not an estimate.",
    icon: "visit.svg",
  },
  {
    title: "We work with what's there.",
    body: "Most of our jobs are in homes people are already living in. Anything sound stays, anything that needs replacing gets explained before it's touched.",
    icon: "existing.svg",
  },
  {
    title: "We design for the people, not specs.",
    // Shivanshu's text of 2026-10-07, its em dashes made commas.
    body: "A system that needs an expert to operate has failed. Everyone in the house, including staff and guests, should be able to use it without being taught twice.",
    icon: "people.svg",
  },
  {
    title: "We document everything.",
    body: "What was installed, where it sits, how it's configured. You own that record, which means you're never locked to us.",
    icon: "document.svg",
  },
  {
    title: "We stay afterwards.",
    body: "Maintenance, updates and one number to call. The install is the beginning of the relationship, not the end of it.",
    icon: "aftercare.svg",
  },
];

/**
 * The page's short FAQ, above the enquiry. Every answer restates a fact the
 * site already holds as confirmed, and adds none: the licence numbers and the
 * Maple Technologies relationship (AGENTS.md), the TIS and Fibaro
 * partnerships (src/content/partners.ts), and the approach and values above.
 * A new question whose answer needs a new fact is asked first, not written.
 */
export const ABOUT_FAQS: readonly FaqEntry[] = [
  {
    id: "who-is-behind-smarthaus",
    question: "Who is behind Smarthaus?",
    answer: [
      "Maple Technologies Security Systems LLC, a Dubai company licensed by SIRA, the Security Industry Regulatory Agency (licence SSP202210037219, trade licence 897839). Smarthaus is its home division: the same team and the same accountability.",
    ],
  },
  {
    id: "what-do-you-install",
    question: "Which systems do you install?",
    answer: [
      "Cameras, gate and door entry, audio and home automation. We are a partner of TIS and Fibaro and install both makers' systems.",
    ],
  },
  {
    id: "who-looks-after-it",
    question: "Who looks after the system once it is in?",
    answer: [
      "The team that installed it. Maintenance, updates and one number to call, so you are never passed between companies.",
    ],
  },
  {
    id: "what-do-i-keep",
    question: "What do I keep at handover?",
    answer: [
      "A record of what was installed, where it sits and how it is configured. It is yours, which means you are never locked to us.",
    ],
  },
  {
    id: "is-my-home-private",
    question: "Will you photograph my home or share its details?",
    answer: [
      "No. We don't photograph finished homes, publish addresses or share plans, and camera footage stays on equipment in your house.",
    ],
  },
];

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
