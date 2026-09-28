import {
  ADVECTION,
  DISPLAY,
  DIVERGENCE,
  GRADIENT_SUBTRACT,
  PRESSURE,
  SPLAT,
  VERTEX,
} from "./shaders";

/**
 * A stable-fluids simulation (Stam 1999, in the form Pavel Dobryakov's WebGL
 * demo made familiar) on a WebGL2 context. Velocity and dye live in half-float
 * textures; each step advects both, solves for pressure and subtracts its
 * gradient so the field is divergence-free, which is what reads as water.
 *
 * Pure WebGL. No DOM listeners, no timers, no colours of its own: the caller
 * feeds it pointer splats and a `dt`, and the two brand colours come in as
 * options. That is what lets `__tests__/fluid.test.ts` drive it against a
 * recording fake context.
 *
 * It is loaded by dynamic import from FluidCanvas.tsx and by nothing else.
 */

export type Vec3 = readonly [number, number, number];

export interface FluidOptions {
  /** The colour of the empty field (brown-100), 0 to 1 per channel. */
  ground: Vec3;
  /** The colour the pointer trails (brown-700), 0 to 1 per channel. */
  ink: Vec3;
  /** The colour of the revealed glyphs (brown-900), 0 to 1 per channel. */
  glyph: Vec3;
  /** Long side of the velocity and pressure textures. */
  simSize?: number;
  /** Long side of the dye texture: what the viewer actually sees. */
  dyeSize?: number;
  /**
   * Edge of the square blocks the field is drawn in, in device pixels. Every
   * block is one flat shade, sampled at its centre. 1 draws the field smooth.
   */
  pixel?: number;
}

export interface Fluid {
  /** Canvas backing-store size in device pixels. Recreates every texture. */
  resize(width: number, height: number): void;
  /**
   * Push the field at (x, y) in uv space (0 to 1, y up) by (dx, dy), also in
   * uv units, and leave some ink behind.
   */
  splat(x: number, y: number, dx: number, dy: number): void;
  /** Advance the simulation by `dt` seconds. */
  step(dt: number): void;
  /** Render the dye to the canvas. */
  draw(): void;
  /**
   * Upload the glyph layer (glyphs.ts) to reveal under the liquid, or null
   * to reveal nothing. One texture, re-uploaded on every call.
   */
  setGlyphs(source: TexImageSource | null): void;
  /**
   * False once the field has had no input for long enough that the ink is
   * gone, so the caller can stop its frame loop. True again on the next splat.
   */
  readonly active: boolean;
  dispose(): void;
}

// --- Calibration -------------------------------------------------------------
// ponytail: fixed constants, tuned by eye on 2026-09-28. Expose as options if a
// second surface ever needs a different feel.

/** Sim texels on the long side. Coarse is right: it is the motion, not the look. */
const SIM_SIZE = 128;
/** Dye texels on the long side. What is drawn, so this one is worth pixels. */
const DYE_SIZE = 768;
/** Jacobi iterations per step. More converges harder; 20 is the usual floor. */
const PRESSURE_ITERATIONS = 20;
/** Per-second decay of velocity. High: the liquid stops soon after the drag, so it does not spread. */
const VELOCITY_DISSIPATION = 4;
/** Per-second decay of dye. Fast: the trail is gone in about a second. */
const DYE_DISSIPATION = 3;
/** Multiplies the pointer's uv delta into sim velocity. Low: the ink stays near the pointer. */
const SPLAT_FORCE = 1800;
/** Splat radius in uv space, squared-distance denominator. Small: a fingertip, not a cloud. */
const SPLAT_RADIUS = 0.0005;
/** Ink deposited per splat. The display shader's curve caps what it can reach. */
const INK_AMOUNT = 0.2;
/** Seconds with no splat before `active` turns false. Past DYE_DISSIPATION's tail. */
const SETTLE_SECONDS = 5;

interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
}

interface DoubleTarget {
  read: Target;
  write: Target;
  swap(): void;
}

/** The uniforms each fragment shader declares. shaders.test.ts pins these. */
export const UNIFORMS = {
  splat: ["uTarget", "aspectRatio", "color", "point", "radius"],
  advection: ["uVelocity", "uSource", "texelSize", "dt", "dissipation"],
  divergence: ["uVelocity"],
  pressure: ["uPressure", "uDivergence"],
  gradientSubtract: ["uPressure", "uVelocity"],
  display: ["uDye", "uGlyphs", "glyphs", "ground", "ink", "glyph", "pixel", "resolution"],
} as const;

/** Every fragment shader also gets the vertex shader's `texelSize`. */
const VERTEX_UNIFORMS = ["texelSize"] as const;

/**
 * Returns null when the context cannot render to float textures, which is the
 * one capability the whole pipeline rests on. Throws on a compile or link
 * failure: that is a bug in this file, not a device limitation, and the caller
 * logs it.
 */
export function createFluid(gl: WebGL2RenderingContext, options: FluidOptions): Fluid | null {
  // EXT_color_buffer_float makes RGBA16F colour-renderable; the half-float
  // variant is the older name for the same guarantee on RGBA16F. Either will
  // do, and without both there is nothing to draw into.
  if (
    !gl.getExtension("EXT_color_buffer_float") &&
    !gl.getExtension("EXT_color_buffer_half_float")
  ) {
    return null;
  }

  const simSize = options.simSize ?? SIM_SIZE;
  const dyeSize = options.dyeSize ?? DYE_SIZE;
  const pixel = options.pixel ?? 1;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const programs = {
    splat: link(gl, vertex, SPLAT, UNIFORMS.splat),
    advection: link(gl, vertex, ADVECTION, UNIFORMS.advection),
    divergence: link(gl, vertex, DIVERGENCE, UNIFORMS.divergence),
    pressure: link(gl, vertex, PRESSURE, UNIFORMS.pressure),
    gradientSubtract: link(gl, vertex, GRADIENT_SUBTRACT, UNIFORMS.gradientSubtract),
    display: link(gl, vertex, DISPLAY, UNIFORMS.display),
  };
  gl.deleteShader(vertex);

  // One quad, bound once. Every pass draws these four vertices.
  const vao = gl.createVertexArray();
  const quad = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  let canvasWidth = 0;
  let canvasHeight = 0;
  let velocity: DoubleTarget | undefined;
  let dye: DoubleTarget | undefined;
  let pressure: DoubleTarget | undefined;
  let divergence: Target | undefined;
  let quiet = SETTLE_SECONDS;
  let glyphs: WebGLTexture | undefined;

  const targets = () => {
    if (!velocity || !dye || !pressure || !divergence) {
      throw new Error("[fluid] resize() must run before splat(), step() or draw()");
    }
    return { velocity, dye, pressure, divergence };
  };

  const destroyTargets = () => {
    for (const target of [velocity?.read, velocity?.write, dye?.read, dye?.write]) {
      if (target) destroyTarget(gl, target);
    }
    for (const target of [pressure?.read, pressure?.write, divergence]) {
      if (target) destroyTarget(gl, target);
    }
    velocity = dye = pressure = divergence = undefined;
  };

  const blit = (target: Target | null, program: Program, texel: Target) => {
    gl.useProgram(program.program);
    gl.uniform2f(loc(program, "texelSize"), texel.texelX, texel.texelY);
    if (target) {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    } else {
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const bind = (texture: WebGLTexture, unit: number) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    return unit;
  };

  const splatInto = (
    field: DoubleTarget,
    x: number,
    y: number,
    color: Vec3,
    aspect: number,
    sim: Target,
  ) => {
    const splat = programs.splat;
    gl.useProgram(splat.program);
    gl.uniform1i(loc(splat, "uTarget"), bind(field.read.texture, 0));
    gl.uniform1f(loc(splat, "aspectRatio"), aspect);
    gl.uniform2f(loc(splat, "point"), x, y);
    gl.uniform3f(loc(splat, "color"), color[0], color[1], color[2]);
    gl.uniform1f(loc(splat, "radius"), SPLAT_RADIUS);
    blit(field.write, programs.splat, sim);
    field.swap();
  };

  return {
    get active() {
      return quiet < SETTLE_SECONDS;
    },

    resize(width, height) {
      canvasWidth = width;
      canvasHeight = height;
      destroyTargets();
      const sim = fit(width, height, simSize);
      const view = fit(width, height, dyeSize);
      velocity = createDouble(gl, sim.width, sim.height);
      dye = createDouble(gl, view.width, view.height);
      pressure = createDouble(gl, sim.width, sim.height);
      divergence = createTarget(gl, sim.width, sim.height);
    },

    splat(x, y, dx, dy) {
      const t = targets();
      const aspect = canvasWidth / canvasHeight;
      quiet = 0;
      splatInto(t.velocity, x, y, [dx * SPLAT_FORCE, dy * SPLAT_FORCE, 0], aspect, t.velocity.read);
      splatInto(t.dye, x, y, [INK_AMOUNT, 0, 0], aspect, t.velocity.read);
    },

    step(dt) {
      const t = targets();
      quiet += dt;
      const sim = t.velocity.read;

      // Velocity carries itself, then carries the dye.
      const advection = programs.advection;
      gl.useProgram(advection.program);
      gl.uniform1f(loc(advection, "dt"), dt);
      gl.uniform1i(loc(advection, "uVelocity"), bind(t.velocity.read.texture, 0));
      gl.uniform1i(loc(advection, "uSource"), 0);
      gl.uniform1f(loc(advection, "dissipation"), VELOCITY_DISSIPATION);
      blit(t.velocity.write, advection, sim);
      t.velocity.swap();

      gl.useProgram(advection.program);
      gl.uniform1i(loc(advection, "uVelocity"), bind(t.velocity.read.texture, 0));
      gl.uniform1i(loc(advection, "uSource"), bind(t.dye.read.texture, 1));
      gl.uniform1f(loc(advection, "dissipation"), DYE_DISSIPATION);
      blit(t.dye.write, advection, sim);
      t.dye.swap();

      // Projection: measure divergence, solve for the pressure that cancels
      // it, subtract its gradient.
      gl.useProgram(programs.divergence.program);
      gl.uniform1i(loc(programs.divergence, "uVelocity"), bind(t.velocity.read.texture, 0));
      blit(t.divergence, programs.divergence, sim);

      gl.useProgram(programs.pressure.program);
      gl.uniform1i(loc(programs.pressure, "uDivergence"), bind(t.divergence.texture, 0));
      for (let i = 0; i < PRESSURE_ITERATIONS; i += 1) {
        gl.uniform1i(loc(programs.pressure, "uPressure"), bind(t.pressure.read.texture, 1));
        blit(t.pressure.write, programs.pressure, sim);
        t.pressure.swap();
      }

      gl.useProgram(programs.gradientSubtract.program);
      gl.uniform1i(loc(programs.gradientSubtract, "uPressure"), bind(t.pressure.read.texture, 0));
      gl.uniform1i(loc(programs.gradientSubtract, "uVelocity"), bind(t.velocity.read.texture, 1));
      blit(t.velocity.write, programs.gradientSubtract, sim);
      t.velocity.swap();
    },

    draw() {
      const t = targets();
      const display = programs.display;
      gl.useProgram(display.program);
      gl.uniform1i(loc(display, "uDye"), bind(t.dye.read.texture, 0));
      gl.uniform1i(loc(display, "uGlyphs"), glyphs ? bind(glyphs, 1) : 1);
      gl.uniform1f(loc(display, "glyphs"), glyphs ? 1 : 0);
      gl.uniform3f(loc(display, "ground"), ...options.ground);
      gl.uniform3f(loc(display, "ink"), ...options.ink);
      gl.uniform3f(loc(display, "glyph"), ...options.glyph);
      gl.uniform1f(loc(display, "pixel"), pixel);
      gl.uniform2f(loc(display, "resolution"), canvasWidth, canvasHeight);
      blit(null, programs.display, t.dye.read);
    },

    setGlyphs(source) {
      if (!source) {
        if (glyphs) gl.deleteTexture(glyphs);
        glyphs = undefined;
        return;
      }
      if (!glyphs) {
        const texture = gl.createTexture();
        if (!texture) throw new Error("[fluid] could not allocate the glyph texture");
        glyphs = texture;
        bind(glyphs, 1);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      bind(glyphs, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },

    dispose() {
      destroyTargets();
      if (glyphs) gl.deleteTexture(glyphs);
      glyphs = undefined;
      for (const { program } of Object.values(programs)) gl.deleteProgram(program);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/**
 * A uniform's location, or null when the driver optimised it out, which WebGL
 * accepts as "set nothing". Every name here is one shaders.test.ts pins.
 */
function loc(program: Program, name: string): WebGLUniformLocation | null {
  return program.uniforms[name] ?? null;
}

/** Texture size with `long` texels on the longer canvas side, at least 1. */
export function fit(width: number, height: number, long: number) {
  const aspect = width > 0 && height > 0 ? width / height : 1;
  return aspect >= 1
    ? { width: long, height: Math.max(1, Math.round(long / aspect)) }
    : { width: Math.max(1, Math.round(long * aspect)), height: long };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("[fluid] createShader returned null");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`[fluid] shader failed to compile: ${log ?? "no log"}`);
  }
  return shader;
}

function link(
  gl: WebGL2RenderingContext,
  vertex: WebGLShader,
  fragmentSource: string,
  uniformNames: readonly string[],
): Program {
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("[fluid] createProgram returned null");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`[fluid] program failed to link: ${log ?? "no log"}`);
  }
  const uniforms: Program["uniforms"] = {};
  for (const name of [...VERTEX_UNIFORMS, ...uniformNames]) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

function createTarget(gl: WebGL2RenderingContext, width: number, height: number): Target {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new Error("[fluid] could not allocate a render target");
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // RGBA16F everywhere. Single-channel float formats are renderable only
  // under the newer extension; one format that both guarantee is simpler
  // than two paths, and at these sizes the extra channels cost nothing.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw new Error("[fluid] float framebuffer is incomplete on this device");
  }
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height, texelX: 1 / width, texelY: 1 / height };
}

function createDouble(gl: WebGL2RenderingContext, width: number, height: number): DoubleTarget {
  let read = createTarget(gl, width, height);
  let write = createTarget(gl, width, height);
  return {
    get read() {
      return read;
    },
    get write() {
      return write;
    },
    swap() {
      [read, write] = [write, read];
    },
  };
}

function destroyTarget(gl: WebGL2RenderingContext, target: Target) {
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}
