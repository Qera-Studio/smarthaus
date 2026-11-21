// The claims audit (AGENTS.md), enforced where the copy is now written: in
// the Studio. Every copy field runs this on publish, so a phrase the brand may
// not use cannot reach the site, whoever types it.
//
// Narrow on purpose. A word like "best" is fine in "the best system is the one
// you stop noticing"; what is listed here has no honest use on this site. Legal
// text is not checked: it says "unauthorised access" and "we cannot guarantee"
// because it must. Widening the list means asking first, like any claim.
const BANNED: readonly [RegExp, string][] = [
  [/\bcertified\b/i, 'a tier ("certified") that has not been confirmed'],
  [
    /\bauthori[sz]ed (dealer|partner|installer|reseller)\b/i,
    'a tier ("authorised") that has not been confirmed',
  ],
  [/\b(platinum|gold|premier) partner\b/i, "a partner tier that has not been confirmed"],
  [/\baward[- ]winning\b/i, "an award with no source"],
  [/\byears of experience\b/i, "a track record in years; state the founding year, 2019, instead"],
  [/\btrusted by\b/i, '"trusted by", a claim with no source'],
  [/\b(industry|market)[- ]leading\b/i, "a superlative"],
  [/\b(world|best)[- ]in[- ]class\b|\bworld[- ]class\b/i, "a superlative"],
  [/\bcutting[- ]edge\b/i, '"cutting-edge", which the tone of voice rules out'],
  [/\brevolutionary\b/i, '"revolutionary", which the tone of voice rules out'],
  [/\bstate[- ]of[- ]the[- ]art\b/i, "a superlative"],
  [/\b(number one|no\. ?1)\b|#1\b/i, "a ranking with no source"],
  [/\bunmatched\b|\bunrivall?ed\b/i, "a superlative"],
  [/!/, "an exclamation mark, which the tone of voice rules out"],
  [/—/, "an em dash, which the site never uses"],
];

/** The reason a piece of copy breaks the claims audit, or null when it does not. */
export function claimProblem(text: string): string | null {
  for (const [pattern, reason] of BANNED) {
    if (pattern.test(text))
      return `This makes ${reason}. See the claims audit before publishing it.`;
  }
  return null;
}

/** As a Sanity custom validator: true passes, a string is the error shown. */
export function claimsRule(value: unknown): true | string {
  return typeof value === "string" ? (claimProblem(value) ?? true) : true;
}
