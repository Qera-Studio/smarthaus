/**
 * The manufacturers Smarthaus is a partner of, for the homepage's partner
 * cards (src/components/Partners).
 *
 * Both partnerships were confirmed as formalised by Shivanshu on 2026-10-06,
 * which lifted the AGENTS.md rule that kept them off the site. The copy claims
 * only that: Smarthaus is a partner and installs the maker's systems. What
 * each maker builds is a description of their products, not a claim about
 * our work. No tier ("certified", "platinum"), no years and no figures until
 * one is confirmed and has a source.
 */
export type Partner = {
  /** Stable key, and the tab's id. */
  id: string;
  /** The tab's label and the logo's accessible name. */
  name: string;
  title: string;
  body: string;
  /** The maker's own site, as given by Shivanshu. */
  href: string;
  logo: { src: string; width: number; height: number };
};

export const PARTNERS: readonly Partner[] = [
  {
    id: "tis",
    name: "TIS",
    title: "A TIS partner",
    body: "TIS makes wired home control: the wall panels, keypads and modules that run a villa's lighting, climate and scenes from one system. As a TIS partner, Smarthaus installs and sets up TIS systems.",
    href: "https://www.tiscontrol.com/",
    logo: { src: "/hero/TIS_Logo.png", width: 1152, height: 545 },
  },
  {
    id: "fibaro",
    name: "Fibaro",
    title: "A Fibaro partner",
    body: "Fibaro, a Nice brand, makes wireless smart home devices: sensors, switches and a central controller that add automation without rewiring. As a Fibaro partner, Smarthaus installs and sets up Fibaro systems where the walls are already finished.",
    href: "https://www.fibaro.com/en/",
    logo: { src: "/hero/FIBARO_Logo.png", width: 1152, height: 364 },
  },
];
