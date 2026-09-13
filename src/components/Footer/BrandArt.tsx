import { MARK_PATHS, MARK_TRANSFORM, WORDMARK_PATHS, WORDMARK_TRANSFORM } from "./brand-art";

/**
 * Half of the brand lockup — the mark, or the wordmark.
 *
 * TEMPORARY, and paired with brand-art.ts. The Logo component gains a
 * `variant` prop on feature/navbar that does exactly this from one copy of the
 * artwork; this exists only because feature/footer branches off main, where
 * that prop does not exist. Editing Logo.tsx here instead would conflict with
 * that branch on merge.
 *
 * Each part is a crop of the same horizontal lockup: the mark and wordmark sit
 * side by side, so narrowing the viewBox to one half selects it.
 *
 * Decorative — the accessible name comes from whatever wraps it.
 */

const VIEW_BOX = {
  mark: "0 -3 149.5 155",
  wordmark: "211 -3 865.5 155",
} as const;

export function BrandArt({ part, className }: { part: keyof typeof VIEW_BOX; className?: string }) {
  const [transform, paths] =
    part === "mark"
      ? ([MARK_TRANSFORM, MARK_PATHS] as const)
      : ([WORDMARK_TRANSFORM, WORDMARK_PATHS] as const);

  return (
    <svg
      viewBox={VIEW_BOX[part]}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...(className ? { className } : {})}
    >
      <g transform={transform}>
        {paths.map((d) => (
          // fill as an attribute, so a CSS `fill` declaration can override it —
          // which is how the footer wordmark picks up its gradient.
          <path key={d} fill="currentColor" d={d} />
        ))}
      </g>
    </svg>
  );
}
