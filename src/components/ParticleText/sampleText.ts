/**
 * Turns a string into particle origins by rasterising it once on an offscreen
 * canvas and reading back the opaque pixels.
 *
 * Sampling rendered text rather than hand-placing coordinates means the glyph
 * shapes come from the real font (Manrope, already loaded for the page), so the
 * particle "404" is the brand's 404 rather than an approximation. It also means
 * changing the string or the weight needs no new data.
 */

export type Particle = {
  /** Origin — where the particle rests and returns to. */
  ox: number;
  oy: number;
  /** Current position. */
  x: number;
  y: number;
  /** Current velocity, carried between frames so motion has inertia. */
  vx: number;
  vy: number;
  /** Per-particle radius, jittered so the field does not read as a grid. */
  r: number;
};

type SampleOptions = {
  text: string;
  /** Device-pixel width/height of the target canvas. */
  width: number;
  height: number;
  /** Distance in device px between sample points. Lower = denser = slower. */
  gap: number;
  /** CSS font shorthand, e.g. "800 320px Manrope, sans-serif". */
  font: string;
};

/**
 * Rasterise `text`, then keep one particle per `gap`-spaced opaque pixel.
 *
 * Returns an empty array when the canvas has no size or no 2D context, which is
 * the correct degradation — the caller renders its static fallback instead.
 */
export function sampleText({ text, width, height, gap, font }: SampleOptions): Particle[] {
  if (width <= 0 || height <= 0) return [];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.fillText(text, width / 2, height / 2);

  const { data } = ctx.getImageData(0, 0, width, height);
  const particles: Particle[] = [];

  // Step by `gap` in both axes and keep any sample that landed on a glyph. The
  // alpha channel is the only one that matters — the fill colour above is
  // arbitrary, since the real paint colour is applied at draw time.
  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === undefined || alpha < 128) continue;

      // Jitter the resting position by a fraction of the gap. Without this the
      // particles sit on a perfect lattice, which reads as a halftone print
      // rather than as a swarm, and makes the grid visible in the gaps.
      const jx = (Math.random() - 0.5) * gap * 0.6;
      const jy = (Math.random() - 0.5) * gap * 0.6;
      const ox = x + jx;
      const oy = y + jy;

      particles.push({
        ox,
        oy,
        x: ox,
        y: oy,
        vx: 0,
        vy: 0,
        // Range chosen so the field has visible depth without any particle
        // reading as a blob at the sizes this is displayed at. Relative to gap,
        // so density and dot size stay in proportion when gap is retuned.
        r: gap * (0.24 + Math.random() * 0.18),
      });
    }
  }

  return particles;
}
