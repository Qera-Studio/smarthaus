/**
 * Crawlers that train models on what they fetch, refused site-wide.
 *
 * The policy follows SEO System §0a's buckets. Search and retrieval crawlers
 * (OAI-SearchBot, PerplexityBot, Google-Extended, Applebot) and user-directed
 * fetchers (ChatGPT-User) are allowed by the `*` group: they are how an
 * answer engine finds and cites the site. Training crawlers, the six §0a
 * names, are disallowed: they send close to no visitors back, and training on
 * the site's content is a licensing question the client owns.
 *
 * Decided by Shivanshu for the plan on 2026-09-26; §0a says the training call
 * is the client's, so it is in docs/launch-gate/blocked-on-input.md for Sunil
 * to confirm in writing. robots.txt is a request, not a control: the Vercel
 * Firewall must not block what this allows (docs/runbooks/vercel-firewall.md).
 */
export const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
  "meta-externalagent",
] as const;
