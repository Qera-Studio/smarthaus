import { Fragment } from "react";

/**
 * A line of copy, one span to a word, for a word-by-word reveal. The spaces stay
 * plain text between inline spans, so it is still one sentence to a screen
 * reader and wraps as it always did. Anything that moved a word would need
 * inline-block, where a screen reader can stop at each one, so a reveal over
 * these changes only how a word is painted.
 */
export function Words({ text, className }: { text: string; className?: string }) {
  return text.split(" ").map((word, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className={className}>{word}</span>
    </Fragment>
  ));
}
