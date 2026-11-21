import { FRAGMENT, REEDS_ACROSS, UNIFORMS, VERTEX } from "./glass-shader";

/**
 * The hero's glass on WebGL2: one program, one full-screen quad, one texture.
 * Pure GL, no DOM: GlassCanvas.tsx owns the canvas, the gates and the pointer.
 */

export interface GlassFrame {
  /** The canvas's backing store, in device pixels. */
  width: number;
  height: number;
  /** One reed's width, in device pixels. */
  reed: number;
  /** The pointer, in device pixels from the canvas's top left. */
  pointerX: number;
  pointerY: number;
  /** The glow's strength, 0 to 1. */
  glow: number;
}

export interface Glass {
  draw(frame: GlassFrame): void;
  dispose(): void;
}

/**
 * On a screen much taller than the picture, covering it would show only the
 * dark middle of the ring. The picture is never scaled past this many canvas
 * widths: it sits at the top, and below it the glass shows its last row,
 * which is dark. The stylesheet's portrait ground is the same sum.
 */
export const MAX_ZOOM = 1.9;

/**
 * Canvas pixels to texture coordinates, as CSS's `background-size: cover`
 * places a picture (scaled to fill, centred, the overflow cut off), up to
 * MAX_ZOOM. Returns [scaleX, scaleY, offsetX, offsetY], for
 * uv = pixel * scale + offset.
 */
export function cover(
  width: number,
  height: number,
  aspect: number,
): [number, number, number, number] {
  const pictureWidth = Math.min(Math.max(width, height * aspect), width * MAX_ZOOM);
  const pictureHeight = pictureWidth / aspect;
  return [
    1 / pictureWidth,
    1 / pictureHeight,
    (pictureWidth - width) / 2 / pictureWidth,
    Math.max(0, pictureHeight - height) / 2 / pictureHeight,
  ];
}

/**
 * One reed's width for a canvas this wide, both in CSS pixels: the design's
 * share of the width, held between 40 and 80 so a phone is not all edges and
 * a wide screen not all slabs. --hero-reed in HomeHero.module.scss is the
 * same sum, for the lines the stylesheet draws before this runs.
 */
export function reedWidth(width: number): number {
  return Math.min(80, Math.max(40, width / REEDS_ACROSS));
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("[hero] glass: no shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`[hero] glass: ${gl.getShaderInfoLog(shader) ?? "shader failed"}`);
  }
  return shader;
}

/** The picture is `aspect` wide for one tall: its own, not the texture's. */
export function createGlass(
  gl: WebGL2RenderingContext,
  picture: TexImageSource,
  aspect: number,
): Glass {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!program) throw new Error("[hero] glass: no program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`[hero] glass: ${gl.getProgramInfoLog(program) ?? "link failed"}`);
  }
  gl.useProgram(program);

  const at = Object.fromEntries(
    UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

  const quad = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Stretched far past its own size and already blurred, so linear filtering
  // is all it needs. Past its edges the picture is its own last pixel: dark.
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
  gl.uniform1i(at.uTexture, 0);

  return {
    draw({ width, height, reed, pointerX, pointerY, glow }) {
      gl.viewport(0, 0, width, height);
      gl.uniform2f(at.uResolution, width, height);
      gl.uniform1f(at.uReed, reed);
      gl.uniform4f(at.uCover, ...cover(width, height, aspect));
      gl.uniform2f(at.uPointer, pointerX, pointerY);
      gl.uniform1f(at.uGlow, glow);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
