/**
 * The standards under the connectivity section, in the order they are drawn
 * (Figma 4914:856). Each is confirmed as installed in clients' homes
 * (Shivanshu, 2026-11-16); a new one is asked first: AGENTS.md, claims audit.
 *
 * Five of the marks are certification marks (Wi-Fi Alliance, Bluetooth SIG,
 * the CSA for Zigbee and Matter, the Z-Wave Alliance), licensed to members for
 * certified products. They are shown pending counsel's review before launch:
 * docs/launch-gate/accepted-risks.md.
 *
 * In code, not Sanity: a mark is a file in public/landing/connectivity/, as
 * the hero's are (HomeHero/brands.ts). Sizes are each file's own, in CSS px.
 */
export interface Protocol {
  name: string;
  /** File name in public/landing/connectivity/. */
  logo: string;
  width: number;
  height: number;
}

export const PROTOCOLS: readonly Protocol[] = [
  { name: "CoSS", logo: "coss.svg", width: 121, height: 32 },
  { name: "Matter", logo: "matter.svg", width: 149, height: 32 },
  { name: "Zigbee", logo: "zigbee.svg", width: 134, height: 32 },
  { name: "Wi-Fi", logo: "wifi.svg", width: 54, height: 32 },
  { name: "Z-Wave", logo: "zwave.svg", width: 72, height: 32 },
  { name: "Bluetooth", logo: "bluetooth.svg", width: 130, height: 32 },
];

/** What a screen reader calls the row of marks. */
export const PROTOCOLS_LABEL = "Standards we install";
