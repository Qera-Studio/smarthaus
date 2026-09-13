/**
 * The dome mark's five strands, as path data.
 *
 * Extracted from Logo.tsx so the logo and the loader draw the SAME geometry.
 * The loader animates these one pair at a time, so it needs them as separate,
 * individually addressable paths rather than as one rendered lockup — and a
 * second copy of the coordinates in the loader would be exactly the drift this
 * repo's owned-facts discipline exists to prevent. Logo.tsx renders them in
 * source order; the loader renders them in the order below.
 *
 * ## Coordinate space
 *
 * The data is authored in an untranslated space around x 345-495, y 158-306,
 * which is why every consumer wraps it in `translate(-345, -158)` and pairs
 * that with the mark viewBox `0 -3 149.5 155`. Do not "simplify" the transform
 * away: the wordmark paths in Logo.tsx share the same origin offset, and the
 * three VIEW_BOX crops in that file are calibrated to it.
 *
 * After translation every strand spans y -0.21 (tip) to y 148.32 (base) in
 * viewBox units, which is what MARK_TOP and MARK_BASE below record.
 *
 * ## Shape, and why these cannot be stroked
 *
 * Each strand is a CLOSED FILLED OUTLINE, not a centreline: the path starts at
 * the tip, runs down one edge to the base, and returns up the other. So
 * `stroke-dasharray` traces the strand's perimeter — down one side, around the
 * base, back up the other — rather than growing the strand from bottom to top.
 * Anything that wants a progressive reveal has to clip the fill instead. The
 * loader does exactly that; see Loader.module.scss.
 *
 * ## Order
 *
 * Listed centre-outward, which is the loader's animation order and the
 * mark's own visual symmetry. The `tip` on each entry is where that strand
 * converges at the top, in viewBox units, measured from the real geometry
 * rather than eyeballed.
 */

/** Topmost point of every strand, in viewBox units. */
export const MARK_TOP = -0.21;

/** Base of every strand, in viewBox units. */
export const MARK_BASE = 148.32;

/** The transform that maps the authored coordinates into the mark viewBox. */
export const MARK_TRANSFORM = "translate(-345 -158)";

/** The mark viewBox, matching VIEW_BOX.mark in Logo.tsx. */
export const MARK_VIEW_BOX = "0 -3 149.5 155";

export type Strand = {
  /** Role in the mark, and the loader's grouping key. */
  id: "centre" | "innerLeft" | "innerRight" | "outerLeft" | "outerRight";
  /** Path data, in the authored (untranslated) space. */
  d: string;
  /** x of this strand's tip in viewBox units — where it converges. */
  tipX: number;
};

export const STRANDS: readonly Strand[] = [
  {
    id: "centre",
    tipX: 75.73,
    d: "M420.733 157.787C421.226 158.472 422.164 173.617 422.371 175.881C424.236 196.222 427.155 216.409 428.17 236.843C428.621 245.916 428.462 255.039 428.436 264.123L428.218 305.998L419.502 306.086C416.995 306.071 414.471 306.032 411.967 306.123C412.309 278.523 411.007 250.367 412.662 222.891C413.562 207.951 416.868 191.435 418.588 176.294C418.943 172.931 419.228 169.56 419.44 166.183C419.576 164.044 419.557 159.444 420.733 157.787Z",
  },
  {
    id: "innerLeft",
    tipX: 67.37,
    d: "M412.371 158.307L412.707 158.512C413.229 159.816 412.95 165.457 412.818 167.021C411.831 177.7 408.58 187.999 403.314 197.132C400.546 201.942 397.664 206.019 395.376 211.207C392.452 217.87 390.207 225.15 388.854 232.375C386.655 244.12 387.258 256.945 387.286 268.908L387.244 305.95C384.502 306.246 379.688 306.156 376.916 305.994L376.609 305.917C376.349 305.322 376.245 282.38 376.241 279.767L376.24 261.486C376.238 250.954 376.01 242.547 378.715 232.212C382.636 217.175 392.31 204.922 400.82 192.548C408.84 180.886 411.312 172.653 412.371 158.307Z",
  },
  {
    id: "innerRight",
    tipX: 82.62,
    d: "M427.621 157.918C428.322 158.415 428.234 160.646 428.398 161.593C429.104 166.039 429.718 171.228 430.962 175.479C434.114 186.735 441.388 195.293 447.888 204.39C456.394 216.295 461.657 228.73 463.503 243.63C463.791 245.915 463.964 248.214 464.023 250.518C464.144 255.208 464.448 304.572 463.96 306.014L463.608 306.135C460.181 306.165 456.753 306.171 453.326 306.152L453.376 270.889C453.416 257.541 454.104 243.422 451.303 230.352C449.778 223.238 447.079 215.835 444.02 209.319C441.603 204.169 438.218 199.309 435.584 194.268C431.055 185.391 427.807 174.577 427.471 164.461C427.408 162.576 427.337 159.761 427.621 157.918Z",
  },
  {
    id: "outerLeft",
    tipX: 59.66,
    d: "M404.662 163.025C404.944 164.162 404.078 167.343 403.681 168.598C402.009 173.879 398.551 179.149 395.062 183.246C392.622 186.111 389.255 188.646 386.458 191.131C379.476 196.752 373.998 202.246 368.732 209.755C361.066 220.688 356.874 232.32 356.012 245.943C355.826 248.877 355.921 251.979 355.924 254.932L355.935 269.742L355.794 306.101L345.726 306.328C345.458 302.296 345.527 296.962 345.508 292.843L345.456 271.197L345.451 256.11C345.449 252.088 345.392 248.709 345.697 244.711C347.341 223.211 358.549 204.918 375.348 193.369C385.386 186.469 395.665 181.994 401.735 170.041C402.9 167.746 403.583 165.235 404.662 163.025Z",
  },
  {
    id: "outerRight",
    tipX: 89.81,
    d: "M434.809 161.029C435.765 162.786 437.024 166.901 438.218 169.284C441.603 176.037 444.996 179.351 450.707 183.774C452.564 185.212 454.782 186.446 456.621 187.866C458.887 189.106 461.375 190.946 463.559 192.407C477.492 201.721 486.341 213.35 491.502 230.168C495.363 242.744 494.416 258.513 494.409 271.876C494.437 283.286 494.369 294.695 494.201 306.103C491.056 306.067 487.87 305.945 484.74 305.938C484.336 291.789 484.792 277.412 484.552 263.275C484.454 257.452 484.716 249.137 484.144 243.701C482.197 225.217 473.661 209.212 460.849 196.854C459.978 196.014 455.082 191.799 454.959 191.64V191.638C454.808 191.537 454.66 191.432 454.515 191.323C444.525 183.801 436.85 174.244 434.809 161.029Z",
  },
] as const;

/**
 * The origin the path data is authored against, which MARK_TRANSFORM undoes.
 *
 * Needed by anything that has to place geometry alongside the strands INSIDE
 * that transform — a clipPath rect, for instance, which resolves in the user
 * space of the element referencing it rather than in the viewBox. Writing such
 * a rect in viewBox coordinates puts it 345 units away from the strands and
 * clips them out of existence.
 */
export const MARK_ORIGIN_X = 345;
export const MARK_ORIGIN_Y = 158;
