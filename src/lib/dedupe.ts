import { createHash } from "node:crypto";

/**
 * One send per identical enquiry within a window.
 *
 * What it stops: the same lead arriving twice in the inbox. A refresh on the
 * no-JavaScript confirmation re-posts the form; a visitor whose first send
 * answered after the timeout is told it failed and sends again (actions.ts,
 * SEND_TIMEOUT_MS); two tabs. The client guard in ContactForm only covers a
 * double click in one page.
 *
 * Keyed on the whole enquiry, not on who sent it: a corrected message is a new
 * lead and is delivered. A duplicate that arrives while the first send is in
 * flight waits for it and shares its outcome, so it can never be told "sent"
 * about a send that then failed. A failed send forgets its key, so retrying
 * after a failure is never swallowed.
 *
 * ponytail: in memory, per server instance, like the rate limiter. Two
 * instances can each deliver one copy. Move to a shared store with the limiter.
 */
export type DedupeOptions = {
  windowMs: number;
  /** Injectable for tests. */
  now?: () => number;
  /** Keys kept at most; the oldest is dropped past this. */
  maxKeys?: number;
};

export function createDeduper({
  windowMs,
  now = () => Date.now(),
  maxKeys = 10_000,
}: DedupeOptions) {
  if (!(windowMs > 0)) throw new Error("createDeduper needs windowMs > 0");
  const seen = new Map<string, { at: number; work: Promise<void> }>();

  const live = (key: string) => {
    const hit = seen.get(key);
    if (!hit) return undefined;
    // A clock that steps backwards keeps the entry rather than resurrecting it.
    if (now() - hit.at >= windowMs) {
      seen.delete(key);
      return undefined;
    }
    return hit;
  };

  return {
    /** True when an identical enquiry was sent, or is sending, in the window. */
    has(key: string): boolean {
      return live(key) !== undefined;
    },

    /**
     * Runs `work` unless an identical enquiry is live, in which case it waits
     * on that one instead. Rejects when the send it depends on rejects.
     */
    async once(key: string, work: () => Promise<void>): Promise<{ duplicate: boolean }> {
      const hit = live(key);
      if (hit) {
        await hit.work;
        return { duplicate: true };
      }
      const running = work();
      seen.set(key, { at: now(), work: running });
      while (seen.size > maxKeys) seen.delete(seen.keys().next().value!);
      try {
        await running;
      } catch (error) {
        if (seen.get(key)?.work === running) seen.delete(key);
        throw error;
      }
      return { duplicate: false };
    },

    /** Forget everything. For tests, which send the same enquiry repeatedly. */
    clear(): void {
      seen.clear();
    },

    /** How many keys are tracked. For tests. */
    get size() {
      return seen.size;
    },
  };
}

/**
 * The key for an enquiry: a hash of every field, in a fixed order, so the map
 * never holds a lead's details in the clear and field order cannot matter.
 */
export function enquiryKey(fields: Record<string, unknown>): string {
  const ordered = Object.keys(fields)
    .sort()
    .map((name) => [name, fields[name] ?? null]);
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

/** Two minutes: longer than any retry after a timeout, shorter than a real second enquiry. */
export const enquiryDedupe = createDeduper({ windowMs: 2 * 60_000 });
