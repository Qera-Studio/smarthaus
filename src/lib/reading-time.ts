/**
 * Words a minute: the average for silent reading of non-fiction in English
 * (Brysbaert, 2019, a review of 190 studies). Pictures are not counted.
 */
export const WORDS_PER_MINUTE = 238;

/** The longest an article may read (Shivanshu, 2026-11-15): readers rarely give more. */
export const MAX_READ_MINUTES = 5;

type Block = { _type?: string; children?: { text?: unknown }[] };

/**
 * How long an article's text takes to read, in whole minutes, rounded up and
 * never under one. Reads the stored text and the rendered text alike, both
 * Portable Text. A block's spans are joined before counting, so a word split
 * by a bold mark is still one word.
 */
export function readMinutes(value: unknown): number {
  let words = 0;
  if (Array.isArray(value)) {
    for (const node of value as Block[]) {
      if (node._type !== "block") continue;
      const text = (node.children ?? [])
        .map((span) => (typeof span.text === "string" ? span.text : ""))
        .join("");
      words += text.split(/\s+/).filter(Boolean).length;
    }
  }
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
