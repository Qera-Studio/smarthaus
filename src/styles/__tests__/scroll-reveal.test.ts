import { compile } from "sass";
import { join } from "node:path";

/** The reveal's contract, on the compiled CSS: jsdom applies none of it. */

const css = compile(join(__dirname, "../globals.scss")).css;
const at = css.indexOf("@media screen and (prefers-reduced-motion: no-preference)");
const block = css.slice(at, css.indexOf("@keyframes reveal-rise"));

const rule = (selector: string) => {
  const start = block.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no rule for ${selector}`);
  return block.slice(start, block.indexOf("}", start));
};
const rise = "[data-reveal=in]:not([data-reveal-words])";
const word = "[data-reveal=in][data-reveal-words] > span";

describe("the scroll reveal", () => {
  test("hides only in the state ScrollReveal sets, on screen, with motion allowed", () => {
    expect(at).toBeGreaterThan(-1);
    expect(rule("[data-reveal=waiting]")).toMatch(/opacity:\s*0/);
    // Nowhere else: the attribute alone hides nothing, so /pricing is safe.
    expect(css.slice(0, at)).not.toMatch(/data-reveal/);
    expect(css).not.toMatch(/\[data-reveal\]\s*\{/);
  });

  test("groups rise 28px and fade over 800ms, within the brief's limits", () => {
    expect(rule(rise)).toMatch(/animation-name:\s*reveal-rise/);
    expect(rule(rise)).toMatch(/animation-duration:\s*800ms/);
    expect(css).toMatch(
      /@keyframes reveal-rise\s*\{\s*from\s*\{\s*opacity:\s*0;\s*translate:\s*0 28px/,
    );
  });

  test("words fade and sharpen from 6px, with none on a phone, and never move", () => {
    expect(rule(word)).toMatch(/animation-name:\s*reveal-word/);
    expect(rule(word)).toMatch(/--reveal-blur:\s*6px/);
    expect(block).toMatch(/max-width:\s*40rem[\s\S]*?--reveal-blur:\s*0px/);
    const frames = css.slice(css.indexOf("@keyframes reveal-word"));
    expect(frames.slice(0, frames.indexOf("}"))).not.toMatch(/translate|transform/);
    expect(frames).toMatch(/filter:\s*blur\(var\(--reveal-blur\)\)/);
  });

  test("lets go once played: backwards fill, an animation and not a transition", () => {
    for (const selector of [rise, word]) {
      expect(rule(selector)).toMatch(/animation-fill-mode:\s*backwards/);
    }
    expect(block).not.toMatch(/transition/);
    expect(block).not.toMatch(/forwards;/);
    expect(block).not.toMatch(/!important/);
  });

  test("staggers groups by 90ms, capped at the sixth", () => {
    expect(rule(`${rise}:nth-child(2)`)).toMatch(/animation-delay:\s*90ms/);
    expect(rule(`${rise}:nth-child(6)`)).toMatch(/animation-delay:\s*450ms/);
    expect(block).not.toMatch(/nth-child\(7\)/);
  });

  test("holds a heading back 1s, then runs each word slowly, 60ms apart", () => {
    expect(rule(word)).toMatch(/animation-duration:\s*1200ms/);
    expect(rule(word)).toMatch(/animation-delay:\s*1000ms/);
    expect(rule(`${word}:nth-of-type(2)`)).toMatch(/animation-delay:\s*1060ms/);
    expect(rule(`${word}:nth-of-type(8)`)).toMatch(/animation-delay:\s*1420ms/);
  });

  test("the paragraph under a heading comes after it, and wins over its own stagger", () => {
    const under = "[data-reveal-words] + [data-reveal=in]:not([data-reveal-words])";
    expect(rule(under)).toMatch(/animation-delay:\s*1300ms/);
    expect(block.indexOf(under)).toBeGreaterThan(block.indexOf(`${rise}:nth-child(6)`));
  });
});
