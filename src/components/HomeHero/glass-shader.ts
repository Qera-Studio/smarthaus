/**
 * The hero's reeded glass, as GLSL ES 3.00.
 *
 * The numbers were fitted to the Figma frame (node 4886:1856, exported as
 * "Rectangle 96", 1440x1024) on 2026-11-14: its reeds are 59.25px wide with an
 * edge on the centre line, and each shows a slice of the picture behind it
 * MAGNIFY times its own width, bent a little at its edges (CURVE). The
 * frame's progressive blur is not here: it depends only on the row, so it is
 * baked into the texture (public/hero/glass/ground.webp).
 *
 * The glow is added behind the glass, so the reeds break it as they break
 * the picture, though they bend it less (GLOW_BEND).
 */

/** Reeds across the design frame: 1440 / 59.25. */
export const REEDS_ACROSS = 24.3;

/**
 * The brightest the glass may get, as relative luminance. The hero's text is
 * --color-text-inverse (brown-100), which needs 4.5:1 over it:
 * (0.818 + 0.05) / 4.5 - 0.05. glass-shader.test.ts checks it against the
 * token.
 */
export const LUMINANCE_CAP = 0.14;

export const UNIFORMS = [
  "uTexture",
  "uResolution",
  "uReed",
  "uCover",
  "uPointer",
  "uGlow",
] as const;

export const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uReed;
uniform vec4 uCover;
uniform vec2 uPointer;
uniform float uGlow;

out vec4 color;

const float MAGNIFY = 3.25;
const float CURVE = 0.18;
// The glass's own fill: white at 4.6%.
const float TINT = 0.046;
// A line of light down each reed's edge, this share of a reed wide: it
// catches what is behind it, plus a little of its own.
const float EDGE_WIDTH = 0.02;
const float EDGE_CATCH = 0.18;
const vec3 EDGE_OWN = vec3(0.015, 0.01, 0.005);
// The glow: a warm ball, this many reeds in radius. The reeds bend it far
// less than the picture (GLOW_BEND against MAGNIFY): at the picture's bend it
// was cut into tall slices and sat off the pointer, where this stays round
// and under it, broken only at each reed's edge (Shivanshu, 2026-11-14).
// Faint enough to stay under the cap, so it fades from its centre like a
// blurred light and never has a flat, bright middle.
const vec3 GLOW = vec3(0.77, 0.50, 0.28);
const float GLOW_STRENGTH = 0.38;
const float GLOW_RADIUS = 0.55;
const float GLOW_BEND = 1.1;
const float CAP = ${LUMINANCE_CAP};

void main() {
  // Pixels from the top left, as CSS counts them.
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  // Which reed, and where across it: -0.5 at one edge, 0.5 at the other.
  float r = (p.x - 0.5 * uResolution.x) / uReed;
  float f = fract(r) - 0.5;
  float centre = 0.5 * uResolution.x + (floor(r) + 0.5) * uReed;

  // What the reed shows: the picture behind its centre, MAGNIFY reeds wide.
  float bend = f + CURVE * 4.0 * f * f * f;
  vec2 behind = vec2(centre + MAGNIFY * uReed * bend, p.y);

  vec3 scene = texture(uTexture, behind * uCover.xy + uCover.zw).rgb;

  vec2 lit = vec2(centre + GLOW_BEND * uReed * bend, p.y);
  vec2 away = (lit - uPointer) / (GLOW_RADIUS * uReed);
  scene += GLOW * GLOW_STRENGTH * uGlow * exp(-dot(away, away));

  vec3 glass = mix(scene, vec3(1.0), TINT);
  float edge = smoothstep(0.5 - EDGE_WIDTH, 0.5, abs(f));
  glass += edge * (EDGE_CATCH * scene + EDGE_OWN);

  // Never brighter than the text can be read on.
  float luminance = dot(pow(glass, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
  glass *= pow(min(1.0, CAP / max(luminance, 1e-4)), 1.0 / 2.2);

  color = vec4(glass, 1.0);
}
`;
