/**
 * @jest-environment node
 */
import { MAX_READ_MINUTES, readMinutes, WORDS_PER_MINUTE } from "../reading-time";

/**
 * How long an article takes to read. The card and the article page both show
 * it, and the Studio refuses an article over MAX_READ_MINUTES, so the count
 * has to be right at the edges: a minute starts at its first word, never
 * rounds down, and a picture is not text.
 */

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const span = (text: unknown) => ({ _type: "span", text });
const block = (...texts: unknown[]) => ({ _type: "block", children: texts.map(span) });

describe("the rate", () => {
  it("is 238 words a minute, the average for silent reading of non-fiction", () => {
    expect(WORDS_PER_MINUTE).toBe(238);
  });

  it("caps an article at five minutes", () => {
    expect(MAX_READ_MINUTES).toBe(5);
  });
});

describe("readMinutes", () => {
  it.each([
    [1, 1],
    [238, 1],
    [239, 2],
    [476, 2],
    [477, 3],
    [1190, 5],
    [1191, 6],
  ])("reads %p words in %p minutes, rounding up", (count, minutes) => {
    expect(readMinutes([block(words(count))])).toBe(minutes);
  });

  it("never says less than a minute, even for no words at all", () => {
    expect(readMinutes([])).toBe(1);
    expect(readMinutes([block("")])).toBe(1);
    expect(readMinutes([block("   \n\t ")])).toBe(1);
  });

  it.each([undefined, null, "text", 42, { en: [] }])("reads %p as nothing to read", (value) => {
    expect(readMinutes(value)).toBe(1);
  });

  it("adds every block's words together", () => {
    expect(readMinutes([block(words(200)), block(words(200)), block(words(200))])).toBe(3);
  });

  it("counts a word split by a bold mark once", () => {
    // "Wi-" plain, "Fi" bold: one word, not two.
    const split = Array.from({ length: 239 }, () => block("Wi-", "Fi"));
    expect(readMinutes(split)).toBe(2);
    const joined = Array.from({ length: 239 }, () => block("Wi-Fi"));
    expect(readMinutes(joined)).toBe(readMinutes(split));
  });

  it("counts words on either side of a mark that carries the space", () => {
    // "the " plain, "network" bold: two words.
    expect(readMinutes(Array.from({ length: 120 }, () => block("the ", "network")))).toBe(2);
  });

  it("splits on any whitespace: spaces, line breaks and tabs", () => {
    const separators = [" ", "\n", "\t", "  "];
    const text = Array.from({ length: 239 }, (_, i) => `w${i}${separators[i % 4]}`).join("");
    expect(readMinutes([block(text)])).toBe(2);
  });

  it("does not count a picture, or its caption", () => {
    const picture = { _type: "articleImage", caption: words(5000), image: {} };
    expect(readMinutes([picture, block(words(10)), picture])).toBe(1);
  });

  it("skips a block with no text yet, and a span whose text is not a string", () => {
    expect(readMinutes([{ _type: "block" }, block(null, 7, words(239))])).toBe(2);
  });

  it("reads the stored text and the rendered text alike", () => {
    // Stored blocks carry keys and marks; the count is over their words only.
    const stored = {
      _type: "block",
      _key: "a",
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: "b", text: words(239), marks: ["strong"] }],
    };
    expect(readMinutes([stored])).toBe(2);
  });
});
