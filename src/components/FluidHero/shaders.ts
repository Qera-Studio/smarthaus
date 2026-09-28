/**
 * GLSL for the fluid hero. WebGL2 only (`#version 300 es`), so every shader
 * here starts with that line and fluid.ts never has to branch on the context.
 *
 * One vertex shader for everything: a full-screen quad, the fragment's own uv,
 * and the four neighbouring uvs at one texel's distance, which the divergence,
 * pressure and gradient passes all read.
 *
 * `__tests__/shaders.test.ts` checks that each fragment shader declares
 * exactly the uniforms fluid.ts sets on it, so a renamed uniform fails a test
 * rather than silently becoming a no-op `uniform1f(null, ...)`.
 */

export const VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Adds a Gaussian blob of `color` to `uTarget` at `point` (uv, 0 to 1). */
export const SPLAT = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}
`;

/**
 * Semi-Lagrangian advection: each texel looks back along the velocity to
 * where its value came from. Used for the velocity itself and for the dye.
 * `dissipation` is a per-second decay, so ink fades and the field settles.
 */
export const ADVECTION = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  vec4 result = texture(uSource, coord);
  float decay = 1.0 + dissipation * dt;
  fragColor = result / decay;
}
`;

export const DIVERGENCE = `#version 300 es
precision mediump float;
precision mediump sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

/** One Jacobi iteration of the pressure solve. Run many times per step. */
export const PRESSURE = `#version 300 es
precision mediump float;
precision mediump sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

/** Subtracts the pressure gradient, which is what makes the field swirl. */
export const GRADIENT_SUBTRACT = `#version 300 es
precision mediump float;
precision mediump sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= 0.5 * vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * The only pass that reaches the screen. Dye density in the red channel is
 * the mix between the two brand tokens: 0 is the ground (brown-100), and the
 * ink (brown-800) is approached but never reached. Both come in as uniforms
 * read from CSS, so this file holds no colour values.
 *
 * The curve saturates at half way. The copy sits on top of this field in
 * --color-text-primary, and at a 50% mix of the two tokens that text still
 * measures 5.3:1 against the darkest the field can get; at 60% it is 4.0:1
 * and at full brown-800 about 1.5:1. AA contrast is a floor, so the cap is
 * in the shader rather than left to the tuning constants in fluid.ts.
 */
export const DISPLAY = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform vec3 ground;
uniform vec3 ink;
void main () {
  float dye = max(texture(uDye, vUv).x, 0.0);
  float d = 0.5 * (1.0 - exp(-2.0 * dye));
  fragColor = vec4(mix(ground, ink, d), 1.0);
}
`;
