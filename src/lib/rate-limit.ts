import { createHmac, randomBytes } from "node:crypto";

/**
 * A token bucket per key: `capacity` sends, refilling evenly over `windowMs`.
 * Security System §11 makes a ceiling on every public endpoint a Floor item.
 *
 * ponytail: in memory, per server instance. On Vercel each instance keeps its
 * own buckets, so N warm instances allow N times the ceiling (§11 says as
 * much, at L2). It is the first layer, not the only one: the Vercel Firewall
 * rule in docs/runbooks/vercel-firewall.md is the shared ceiling. Move to a
 * shared store (Upstash) if leads ever arrive in a volume where that matters.
 *
 * It cannot fail open (§18): there is no store to be unreachable, and a full
 * map evicts the least recently used key rather than refusing to track more.
 */
export type Verdict = { ok: true } | { ok: false; retryAfterMs: number };

export type LimiterOptions = {
  capacity: number;
  windowMs: number;
  /** Injectable for tests. */
  now?: () => number;
  /** Keys kept at most; the least recently used is dropped past this. */
  maxKeys?: number;
};

export function createLimiter({
  capacity,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: LimiterOptions) {
  if (!(capacity >= 1) || !(windowMs > 0)) {
    throw new Error("createLimiter needs capacity >= 1 and windowMs > 0");
  }
  const buckets = new Map<string, { tokens: number; at: number }>();
  const perMs = capacity / windowMs;

  return {
    take(key: string): Verdict {
      const t = now();
      const previous = buckets.get(key);
      // A clock that steps backwards refills nothing rather than going negative.
      const elapsed = previous ? Math.max(0, t - previous.at) : 0;
      const tokens = previous ? Math.min(capacity, previous.tokens + elapsed * perMs) : capacity;

      // Re-inserted on every touch, so Map order is least recently used first.
      buckets.delete(key);
      if (tokens < 1) {
        buckets.set(key, { tokens, at: t });
        return { ok: false, retryAfterMs: Math.ceil((1 - tokens) / perMs) };
      }
      buckets.set(key, { tokens: tokens - 1, at: t });
      while (buckets.size > maxKeys) buckets.delete(buckets.keys().next().value!);
      return { ok: true };
    },
    /** How many keys are tracked. For tests. */
    get size() {
      return buckets.size;
    },
  };
}

/**
 * The client's IP, as a keyed hash. The first hop of x-forwarded-for, which is
 * what Vercel sets to the connecting client, then x-real-ip, then "unknown".
 *
 * Keyed with a random per-process secret, not a plain hash: an IPv4 address
 * has only 2^32 values, so a plain SHA-256 is reversible by brute force. The
 * raw address is never stored or logged. Clients with no address at all share
 * the one "unknown" bucket, which throttles them together rather than not at
 * all.
 */
const SECRET = randomBytes(32);

export function clientKey(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || "unknown";
  return createHmac("sha256", SECRET).update(ip.toLowerCase()).digest("hex");
}

/**
 * Enquiry sends: five per client, refilling one every two minutes. A person
 * sends one enquiry, maybe two after a correction; five in ten minutes is
 * already a script. Shared by both forms, since both deliver to one inbox.
 */
export const enquiryLimiter = createLimiter({ capacity: 5, windowMs: 10 * 60_000 });
