/**
 * The homepage's "By the numbers" figures (src/components/Stats).
 *
 * Each is Smarthaus's own track record, not Maple Technologies', and each is
 * backed by Smarthaus's project and maintenance-contract records: confirmed
 * by Shivanshu on 2026-10-07 (AGENTS.md, claims audit). A figure changes only
 * when those records do; a new one needs the same confirmation first.
 */
export type Stat = {
  value: string;
  label: string;
};

export const STATS: readonly Stat[] = [
  { value: "150+", label: "Residential clients served" },
  { value: "200+", label: "Homes fitted in residential deals" },
  { value: "350+", label: "Systems installed in all segments" },
  { value: "90%", label: "Contract renewal rate for annual maintenance packages" },
];
