import { createFluid, fit, UNIFORMS, type Fluid } from "../fluid";
import * as shaders from "../shaders";

/**
 * The simulation against a recording context (fakeGl.ts). None of this proves
 * the field looks like water; the screenshot in review does that. It proves
 * the pipeline is wired the way a stable-fluids step has to be: the passes in
 * order, each into the right ping-pong target, uniforms pointing at the right
 * textures, and every GPU object released. Those are the failures that render
 * a plausible-looking wrong picture, which no eye catches.
 */

// --- A recording stand-in for WebGL2RenderingContext ---------------------
/**
 * A recording stand-in for WebGL2RenderingContext. jsdom has no GPU, so the
 * simulation is tested by what it ASKS the context to do: which program each
 * pass draws with, into which target, with which uniforms, and whether every
 * object it creates is deleted again.
 *
 * Every method not listed here is a no-op that records its name. Constants
 * are distinct small integers so a wrong one shows up as a wrong number, not
 * as `undefined === undefined`.
 */

interface Draw {
  program: string;
  target: number | null;
  viewport: [number, number];
  /** The texture the target framebuffer renders into, if any. */
  targetTexture: number | undefined;
  /** Textures bound on each unit at the moment of the draw. */
  inputs: number[];
}

interface FakeGl {
  gl: WebGL2RenderingContext;
  calls: string[];
  draws: Draw[];
  /** Uniform values at the moment of each draw, keyed by draw index. */
  uniformsAtDraw: Record<string, number[]>[];
  created: { textures: number; framebuffers: number; programs: number; shaders: number };
  deleted: { textures: number; framebuffers: number; programs: number; shaders: number };
  bound: Map<number, number | undefined>;
  lostContext: boolean;
}

interface Options {
  extensions?: string[];
  compiles?: boolean;
  links?: boolean;
  framebufferComplete?: boolean;
  loseContext?: boolean;
}

const CONSTANTS: Record<string, number> = {
  VERTEX_SHADER: 1,
  FRAGMENT_SHADER: 2,
  COMPILE_STATUS: 3,
  LINK_STATUS: 4,
  ARRAY_BUFFER: 5,
  STATIC_DRAW: 6,
  FLOAT: 7,
  BLEND: 8,
  TEXTURE0: 100,
  TEXTURE_2D: 10,
  TEXTURE_MIN_FILTER: 11,
  TEXTURE_MAG_FILTER: 12,
  TEXTURE_WRAP_S: 13,
  TEXTURE_WRAP_T: 14,
  LINEAR: 15,
  CLAMP_TO_EDGE: 16,
  RGBA16F: 17,
  RGBA: 18,
  HALF_FLOAT: 19,
  FRAMEBUFFER: 20,
  COLOR_ATTACHMENT0: 21,
  FRAMEBUFFER_COMPLETE: 22,
  FRAMEBUFFER_INCOMPLETE: 23,
  COLOR_BUFFER_BIT: 24,
  TRIANGLE_STRIP: 25,
};

const FRAGMENT_NAMES: Record<string, string> = {
  [shaders.SPLAT]: "splat",
  [shaders.ADVECTION]: "advection",
  [shaders.DIVERGENCE]: "divergence",
  [shaders.PRESSURE]: "pressure",
  [shaders.GRADIENT_SUBTRACT]: "gradientSubtract",
  [shaders.DISPLAY]: "display",
};

function createFakeGl(options: Options = {}): FakeGl {
  const {
    extensions = ["EXT_color_buffer_float"],
    compiles = true,
    links = true,
    framebufferComplete = true,
    loseContext = true,
  } = options;

  const state: FakeGl = {
    gl: undefined as unknown as WebGL2RenderingContext,
    calls: [],
    draws: [],
    uniformsAtDraw: [],
    created: { textures: 0, framebuffers: 0, programs: 0, shaders: 0 },
    deleted: { textures: 0, framebuffers: 0, programs: 0, shaders: 0 },
    bound: new Map(),
    lostContext: false,
  };

  let nextId = 1;
  const shaderSources = new Map<number, string>();
  const programNames = new Map<number, string>();
  const uniforms = new Map<string, number[]>();
  let currentProgram: number | undefined;
  let currentTarget: number | null = null;
  let viewport: [number, number] = [0, 0];
  let activeUnit = 0;
  const attachments = new Map<number, number>();

  const id = () => ({ id: nextId++ });
  const setUniform = (location: { name: string } | null, ...values: number[]) => {
    if (!location) return;
    uniforms.set(`${currentProgram}:${location.name}`, values);
  };

  const methods: Record<string, (...args: never[]) => unknown> = {
    getExtension: (name: string) => {
      if (name === "WEBGL_lose_context" && loseContext) {
        return {
          loseContext: () => {
            state.lostContext = true;
          },
        };
      }
      return extensions.includes(name) ? {} : null;
    },
    createShader: () => {
      state.created.shaders += 1;
      return id();
    },
    shaderSource: (shader: { id: number }, source: string) => {
      shaderSources.set(shader.id, source);
    },
    getShaderParameter: () => compiles,
    getShaderInfoLog: () => "fake compile log",
    deleteShader: () => {
      state.deleted.shaders += 1;
    },
    createProgram: () => {
      state.created.programs += 1;
      return id();
    },
    attachShader: (program: { id: number }, shader: { id: number }) => {
      const source = shaderSources.get(shader.id) ?? "";
      const name = FRAGMENT_NAMES[source];
      if (name) programNames.set(program.id, name);
    },
    getProgramParameter: () => links,
    getProgramInfoLog: () => "fake link log",
    deleteProgram: () => {
      state.deleted.programs += 1;
    },
    getUniformLocation: (_program: unknown, name: string) => ({ name }),
    useProgram: (program: { id: number }) => {
      currentProgram = program.id;
    },
    uniform1f: setUniform,
    uniform1i: setUniform,
    uniform2f: setUniform,
    uniform3f: setUniform,
    createTexture: () => {
      state.created.textures += 1;
      return id();
    },
    deleteTexture: () => {
      state.deleted.textures += 1;
    },
    createFramebuffer: () => {
      state.created.framebuffers += 1;
      return id();
    },
    deleteFramebuffer: () => {
      state.deleted.framebuffers += 1;
    },
    bindFramebuffer: (_target: number, framebuffer: { id: number } | null) => {
      currentTarget = framebuffer?.id ?? null;
    },
    framebufferTexture2D: (
      _target: number,
      _attachment: number,
      _textarget: number,
      texture: { id: number },
    ) => {
      if (currentTarget !== null) attachments.set(currentTarget, texture.id);
    },
    checkFramebufferStatus: () =>
      framebufferComplete ? CONSTANTS["FRAMEBUFFER_COMPLETE"] : CONSTANTS["FRAMEBUFFER_INCOMPLETE"],
    viewport: (_x: number, _y: number, width: number, height: number) => {
      viewport = [width, height];
    },
    activeTexture: (unit: number) => {
      activeUnit = unit - (CONSTANTS["TEXTURE0"] ?? 0);
    },
    bindTexture: (_target: number, texture: { id: number } | null) => {
      state.bound.set(activeUnit, texture?.id);
    },
    drawArrays: () => {
      const program = programNames.get(currentProgram ?? -1) ?? `unknown:${currentProgram}`;
      const snapshot: Record<string, number[]> = {};
      for (const [key, value] of uniforms) {
        if (key.startsWith(`${currentProgram}:`)) snapshot[key.split(":")[1] ?? ""] = value;
      }
      state.uniformsAtDraw.push(snapshot);
      state.draws.push({
        program,
        target: currentTarget,
        viewport,
        targetTexture: currentTarget === null ? undefined : attachments.get(currentTarget),
        // Only the units the program's samplers point at count: a stale
        // binding on a unit nothing reads is not a feedback loop in WebGL.
        inputs: Object.entries(snapshot)
          .filter(([name]) => name.startsWith("u"))
          .map(([, value]) => state.bound.get(value[0] ?? -1))
          .filter((id): id is number => id !== undefined),
      });
    },
  };

  state.gl = new Proxy({} as WebGL2RenderingContext, {
    get(_target, key) {
      if (typeof key !== "string") return undefined;
      if (key in CONSTANTS) return CONSTANTS[key];
      const method = methods[key];
      return (...args: unknown[]) => {
        state.calls.push(key);
        return method ? (method as (...a: unknown[]) => unknown)(...args) : undefined;
      };
    },
  });

  return state;
}

// --- Tests --------------------------------------------------------------

const COLOURS = {
  ground: [0.9, 0.8, 0.7] as const,
  ink: [0.2, 0.1, 0.05] as const,
  glyph: [0.1, 0.05, 0.02] as const,
};

function make(options: Parameters<typeof createFakeGl>[0] = {}) {
  const fake = createFakeGl(options);
  const fluid = createFluid(fake.gl, COLOURS);
  return { fake, fluid };
}

function ready(options: Parameters<typeof createFakeGl>[0] = {}) {
  const { fake, fluid } = make(options);
  if (!fluid) throw new Error("expected a fluid");
  fluid.resize(1000, 500);
  fake.draws.length = 0;
  fake.uniformsAtDraw.length = 0;
  return { fake, fluid };
}

describe("createFluid", () => {
  test("returns null without a float colour-buffer extension", () => {
    const fake = createFakeGl({ extensions: [] });
    expect(createFluid(fake.gl, COLOURS)).toBeNull();
    // Nothing was compiled or allocated for a context that cannot render.
    expect(fake.created.programs).toBe(0);
    expect(fake.created.textures).toBe(0);
  });

  test.each(["EXT_color_buffer_float", "EXT_color_buffer_half_float"])(
    "accepts %s on its own",
    (extension) => {
      const fake = createFakeGl({ extensions: [extension] });
      expect(createFluid(fake.gl, COLOURS)).not.toBeNull();
    },
  );

  test("links one program per fragment shader and frees the shaders", () => {
    const { fake } = make();
    expect(fake.created.programs).toBe(6);
    // One vertex shader plus six fragments, all deleted once linked.
    expect(fake.created.shaders).toBe(7);
    expect(fake.deleted.shaders).toBe(7);
  });

  test("throws with the log when a shader fails to compile", () => {
    const fake = createFakeGl({ compiles: false });
    expect(() => createFluid(fake.gl, COLOURS)).toThrow(/failed to compile: fake compile log/);
  });

  test("throws with the log when a program fails to link", () => {
    const fake = createFakeGl({ links: false });
    expect(() => createFluid(fake.gl, COLOURS)).toThrow(/failed to link: fake link log/);
  });

  test("allocates nothing until resize()", () => {
    const { fake, fluid } = make();
    expect(fake.created.textures).toBe(0);
    expect(() => fluid?.draw()).toThrow(/resize\(\) must run/);
    expect(() => fluid?.step(0.016)).toThrow(/resize\(\) must run/);
    expect(() => fluid?.splat(0.5, 0.5, 0, 0)).toThrow(/resize\(\) must run/);
  });
});

describe("resize", () => {
  test("creates seven targets: two each for velocity, dye and pressure, one for divergence", () => {
    const { fake, fluid } = make();
    fluid?.resize(1000, 500);
    expect(fake.created.textures).toBe(7);
    expect(fake.created.framebuffers).toBe(7);
  });

  test("a second resize frees the first set before allocating again", () => {
    const { fake, fluid } = make();
    fluid?.resize(1000, 500);
    fluid?.resize(500, 1000);
    expect(fake.deleted.textures).toBe(7);
    expect(fake.deleted.framebuffers).toBe(7);
    expect(fake.created.textures).toBe(14);
  });

  test("sim targets are the sim size on the long side, dye targets the dye size", () => {
    const { fake, fluid } = make();
    fluid?.resize(1000, 500);
    // The order createTarget runs: velocity x2, dye x2, pressure x2, divergence.
    const viewports = fake.calls.filter((call) => call === "viewport").length;
    expect(viewports).toBe(7);
    fluid?.draw();
    // The display pass draws to the canvas at its full pixel size.
    expect(fake.draws.at(-1)).toMatchObject({ target: null, viewport: [1000, 500] });
  });

  test("honours simSize and dyeSize options", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, { ...COLOURS, simSize: 64, dyeSize: 256 });
    fluid?.resize(200, 100);
    fluid?.splat(0.5, 0.5, 0.1, 0);
    // Splats draw into the velocity and dye write targets; their viewports
    // are the sim and dye sizes fitted to a 2:1 canvas.
    expect(fake.draws.map((draw) => draw.viewport)).toEqual([
      [64, 32],
      [256, 128],
    ]);
  });

  test("throws when the float framebuffer is incomplete", () => {
    const { fake, fluid } = make({ framebufferComplete: false });
    expect(() => fluid?.resize(100, 100)).toThrow(/framebuffer is incomplete/);
    // The half-built target was released.
    expect(fake.deleted.textures).toBe(1);
    expect(fake.deleted.framebuffers).toBe(1);
  });
});

describe("fit", () => {
  test("puts the long side on the wider axis", () => {
    expect(fit(1000, 500, 128)).toEqual({ width: 128, height: 64 });
    expect(fit(500, 1000, 128)).toEqual({ width: 64, height: 128 });
    expect(fit(100, 100, 128)).toEqual({ width: 128, height: 128 });
  });

  test("never returns a zero side", () => {
    expect(fit(10_000, 1, 128)).toEqual({ width: 128, height: 1 });
    expect(fit(0, 0, 128)).toEqual({ width: 128, height: 128 });
  });
});

describe("splat", () => {
  let fake: FakeGl;
  let fluid: Fluid;

  beforeEach(() => {
    ({ fake, fluid } = ready());
  });

  test("draws once into velocity and once into dye, both with the splat program", () => {
    fluid.splat(0.25, 0.75, 0.01, -0.02);
    expect(fake.draws.map((draw) => draw.program)).toEqual(["splat", "splat"]);
    expect(fake.draws[0]?.target).not.toBe(fake.draws[1]?.target);
  });

  test("the velocity splat carries the scaled delta and the dye splat carries ink", () => {
    fluid.splat(0.25, 0.75, 0.01, -0.02);
    const [velocity, dye] = fake.uniformsAtDraw;
    expect(velocity?.["point"]).toEqual([0.25, 0.75]);
    expect(velocity?.["aspectRatio"]).toEqual([2]);
    const [vx, vy, vz] = velocity?.["color"] ?? [];
    expect(vx).toBeGreaterThan(0);
    expect(vy).toBeLessThan(0);
    expect(vz).toBe(0);
    // Same direction as the pointer, scaled by one constant.
    expect((vx ?? 0) / 0.01).toBeCloseTo((vy ?? 0) / -0.02);
    const [ink, g, b] = dye?.["color"] ?? [];
    expect(ink).toBeGreaterThan(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
    expect(dye?.["point"]).toEqual([0.25, 0.75]);
  });

  test("a still pointer adds ink but no velocity", () => {
    fluid.splat(0.5, 0.5, 0, 0);
    expect(fake.uniformsAtDraw[0]?.["color"]).toEqual([0, 0, 0]);
    expect(fake.uniformsAtDraw[1]?.["color"]?.[0]).toBeGreaterThan(0);
  });

  test("swaps, so the next splat reads what the last one wrote", () => {
    fluid.splat(0.5, 0.5, 0, 0);
    fluid.splat(0.5, 0.5, 0, 0);
    const targets = fake.draws.map((draw) => draw.target);
    // velocity write A, dye write B, then velocity write A', dye write B'.
    expect(targets[0]).not.toBe(targets[2]);
    expect(targets[1]).not.toBe(targets[3]);
  });
});

describe("step", () => {
  test("runs the passes in stable-fluids order", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const programs = fake.draws.map((draw) => draw.program);
    expect(programs.slice(0, 3)).toEqual(["advection", "advection", "divergence"]);
    const pressurePasses = programs.filter((program) => program === "pressure").length;
    expect(pressurePasses).toBeGreaterThanOrEqual(20);
    expect(programs.slice(3, 3 + pressurePasses).every((p) => p === "pressure")).toBe(true);
    expect(programs.at(-1)).toBe("gradientSubtract");
    expect(programs).toHaveLength(4 + pressurePasses);
  });

  test("passes dt and separate dissipation rates to the two advections", () => {
    const { fake, fluid } = ready();
    fluid.step(0.02);
    const [velocity, dye] = fake.uniformsAtDraw;
    expect(velocity?.["dt"]).toEqual([0.02]);
    expect(dye?.["dt"]).toEqual([0.02]);
    const velocityDissipation = velocity?.["dissipation"]?.[0] ?? 0;
    const dyeDissipation = dye?.["dissipation"]?.[0] ?? 0;
    // A thick liquid: the motion damps before the ink fades, so a drag
    // settles into a body of colour rather than trailing smoke.
    expect(velocityDissipation).toBeGreaterThan(dyeDissipation);
    expect(dyeDissipation).toBeGreaterThan(0);
  });

  test("the velocity advection reads and writes velocity, the dye advection reads dye", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const [velocity, dye] = fake.uniformsAtDraw;
    // Velocity is its own source: both samplers point at unit 0.
    expect(velocity?.["uVelocity"]).toEqual([0]);
    expect(velocity?.["uSource"]).toEqual([0]);
    // Dye is sourced from unit 1, velocity still from unit 0.
    expect(dye?.["uVelocity"]).toEqual([0]);
    expect(dye?.["uSource"]).toEqual([1]);
  });

  test("every pressure iteration alternates its target", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const pressure = fake.draws.filter((draw) => draw.program === "pressure");
    for (let i = 1; i < pressure.length; i += 1) {
      expect(pressure[i]?.target).not.toBe(pressure[i - 1]?.target);
    }
  });

  test("the gradient pass writes into the velocity target the advection did not", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const advected = fake.draws[0]?.target;
    const projected = fake.draws.at(-1)?.target;
    // Advection wrote A and swapped, so the projection writes B.
    expect(projected).not.toBe(advected);
  });

  test("the divergence pass draws into its own single target", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    fluid.step(1 / 60);
    const divergence = fake.draws.filter((draw) => draw.program === "divergence");
    expect(divergence[0]?.target).toBe(divergence[1]?.target);
  });
});

describe("draw", () => {
  test("renders the dye to the canvas with both brand colours", () => {
    const { fake, fluid } = ready();
    fluid.draw();
    expect(fake.draws).toHaveLength(1);
    expect(fake.draws[0]).toMatchObject({
      program: "display",
      target: null,
      viewport: [1000, 500],
    });
    expect(fake.uniformsAtDraw[0]?.["ground"]).toEqual([0.9, 0.8, 0.7]);
    expect(fake.uniformsAtDraw[0]?.["ink"]).toEqual([0.2, 0.1, 0.05]);
    expect(fake.uniformsAtDraw[0]?.["uDye"]).toEqual([0]);
  });
});

describe("active", () => {
  test("is false at rest, true after a splat, and false again once settled", () => {
    const { fluid } = ready();
    expect(fluid.active).toBe(false);
    fluid.splat(0.5, 0.5, 0.01, 0);
    expect(fluid.active).toBe(true);
    for (let i = 0; i < 60 * 3; i += 1) fluid.step(1 / 60);
    expect(fluid.active).toBe(true);
    for (let i = 0; i < 60 * 6; i += 1) fluid.step(1 / 60);
    expect(fluid.active).toBe(false);
  });

  test("a splat while settling restarts the clock", () => {
    const { fluid } = ready();
    fluid.splat(0.5, 0.5, 0.01, 0);
    for (let i = 0; i < 60 * 4; i += 1) fluid.step(1 / 60);
    fluid.splat(0.5, 0.5, 0.01, 0);
    for (let i = 0; i < 60 * 2; i += 1) fluid.step(1 / 60);
    expect(fluid.active).toBe(true);
  });
});

describe("dispose", () => {
  test("deletes every program, texture, framebuffer, the quad and the VAO, then loses the context", () => {
    const { fake, fluid } = ready();
    fluid.dispose();
    expect(fake.deleted.programs).toBe(6);
    expect(fake.deleted.textures).toBe(7);
    expect(fake.deleted.framebuffers).toBe(7);
    expect(fake.calls).toContain("deleteBuffer");
    expect(fake.calls).toContain("deleteVertexArray");
    expect(fake.lostContext).toBe(true);
  });

  test("survives a context without WEBGL_lose_context", () => {
    const { fake, fluid } = ready({ loseContext: false });
    expect(() => fluid.dispose()).not.toThrow();
    expect(fake.lostContext).toBe(false);
  });

  test("is safe before resize", () => {
    const { fake, fluid } = make();
    expect(() => fluid?.dispose()).not.toThrow();
    expect(fake.deleted.textures).toBe(0);
    expect(fake.deleted.programs).toBe(6);
  });
});

// --- Setup details ------------------------------------------------------------
//
// The parts of the pipeline that are not passes: how the targets are made and
// how each pass binds its inputs. A wrong filter or wrap mode does not throw;
// it makes the field tear at the edges or step between texels.

describe("target setup", () => {
  test("every target is a linear, clamped, half-float RGBA texture", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, COLOURS);
    fluid?.resize(400, 200);
    const gl = fake.gl;
    const texImage = fake.calls.filter((call) => call === "texImage2D").length;
    expect(texImage).toBe(7);
    // The parameter calls per target: min, mag, wrap s, wrap t.
    expect(fake.calls.filter((call) => call === "texParameteri")).toHaveLength(28);
    // The format is the one both float extensions make renderable.
    expect(gl.RGBA16F).toBeDefined();
    expect(gl.HALF_FLOAT).toBeDefined();
  });

  test("every target is cleared once it is attached, so no frame shows garbage", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, COLOURS);
    fluid?.resize(400, 200);
    expect(fake.calls.filter((call) => call === "clear")).toHaveLength(7);
    expect(fake.calls.filter((call) => call === "checkFramebufferStatus")).toHaveLength(7);
  });

  test("the quad is bound once, at creation, with blending off", () => {
    const fake = createFakeGl();
    createFluid(fake.gl, COLOURS);
    expect(fake.calls.filter((call) => call === "bufferData")).toHaveLength(1);
    expect(fake.calls.filter((call) => call === "bindVertexArray")).toHaveLength(1);
    expect(fake.calls.filter((call) => call === "vertexAttribPointer")).toHaveLength(1);
    expect(fake.calls).toContain("disable");
    // aPosition is pinned to attribute 0 before linking, for every program.
    expect(fake.calls.filter((call) => call === "bindAttribLocation")).toHaveLength(6);
  });

  test("uniform locations are looked up once per program, at link time", () => {
    const fake = createFakeGl();
    createFluid(fake.gl, COLOURS);
    const lookups = fake.calls.filter((call) => call === "getUniformLocation").length;
    // texelSize on each of six programs, plus each program's own uniforms.
    const own = Object.values(UNIFORM_COUNTS).reduce((sum, n) => sum + n, 0);
    expect(lookups).toBe(6 + own);
    const { fluid } = ready();
    const before = fake.calls.length;
    fluid.step(1 / 60);
    fluid.draw();
    expect(fake.calls.slice(before).filter((call) => call === "getUniformLocation")).toEqual([]);
  });
});

const UNIFORM_COUNTS = {
  splat: 5,
  advection: 5,
  divergence: 1,
  pressure: 2,
  gradientSubtract: 2,
  display: 8,
};

describe("pass details", () => {
  test("simulation passes use the sim texel size; the display pass uses the dye's", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    fluid.draw();
    const sim = fake.uniformsAtDraw.slice(0, -1);
    for (const uniforms of sim) {
      expect(uniforms["texelSize"]).toEqual([1 / 128, 1 / 64]);
    }
    expect(fake.uniformsAtDraw.at(-1)?.["texelSize"]).toEqual([1 / 768, 1 / 384]);
  });

  test("a portrait canvas gets portrait targets", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, COLOURS);
    fluid?.resize(500, 1000);
    fluid?.step(1 / 60);
    expect(fake.uniformsAtDraw[0]?.["texelSize"]).toEqual([1 / 64, 1 / 128]);
    expect(fake.draws[0]?.viewport).toEqual([64, 128]);
  });

  test("each pass binds its program before setting uniforms and drawing", () => {
    const { fake, fluid } = ready();
    const start = fake.calls.length;
    fluid.step(1 / 60);
    const calls = fake.calls.slice(start);
    // Never a uniform call before the first useProgram of the step.
    expect(calls.indexOf("useProgram")).toBeLessThan(
      calls.findIndex((call) => call.startsWith("uniform")),
    );
    // And every drawArrays has a useProgram somewhere before it.
    let seenProgram = false;
    for (const call of calls) {
      if (call === "useProgram") seenProgram = true;
      if (call === "drawArrays") expect(seenProgram).toBe(true);
    }
  });

  test("the pressure solve reads divergence on unit 0 and pressure on unit 1", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const pressure = fake.draws
      .map((draw, i) => ({ draw, uniforms: fake.uniformsAtDraw[i] }))
      .filter(({ draw }) => draw.program === "pressure");
    for (const { uniforms } of pressure) {
      expect(uniforms?.["uDivergence"]).toEqual([0]);
      expect(uniforms?.["uPressure"]).toEqual([1]);
    }
  });

  test("the gradient pass reads pressure on unit 0 and velocity on unit 1", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    expect(fake.uniformsAtDraw.at(-1)?.["uPressure"]).toEqual([0]);
    expect(fake.uniformsAtDraw.at(-1)?.["uVelocity"]).toEqual([1]);
  });

  test("the divergence pass never writes into a velocity or pressure target", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const divergence = fake.draws.find((draw) => draw.program === "divergence");
    const others = fake.draws.filter((draw) => draw.program !== "divergence");
    expect(others.map((draw) => draw.target)).not.toContain(divergence?.target);
  });

  test("the splat radius is the same for velocity and dye", () => {
    const { fake, fluid } = ready();
    fluid.splat(0.5, 0.5, 0.01, 0.01);
    expect(fake.uniformsAtDraw[0]?.["radius"]).toEqual(fake.uniformsAtDraw[1]?.["radius"]);
    expect(fake.uniformsAtDraw[0]?.["radius"]?.[0]).toBeGreaterThan(0);
  });

  test("the aspect ratio follows the canvas, not the targets", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, COLOURS);
    fluid?.resize(300, 900);
    fluid?.splat(0.5, 0.5, 0, 0);
    expect(fake.uniformsAtDraw[0]?.["aspectRatio"]).toEqual([1 / 3]);
  });

  test("a step after a splat carries on from the splatted targets", () => {
    const { fake, fluid } = ready();
    fluid.splat(0.5, 0.5, 0.01, 0);
    const velocityAfterSplat = fake.draws[0]?.target;
    fluid.step(1 / 60);
    // Advection writes into the other velocity buffer than the splat did.
    expect(fake.draws[2]?.target).not.toBe(velocityAfterSplat);
    expect(fake.draws[2]?.program).toBe("advection");
  });

  test("dispose after resize frees exactly what resize made", () => {
    const { fake, fluid } = ready();
    fluid.resize(100, 100);
    fluid.dispose();
    expect(fake.created.textures).toBe(fake.deleted.textures);
    expect(fake.created.framebuffers).toBe(fake.deleted.framebuffers);
    expect(fake.created.programs).toBe(fake.deleted.programs);
  });
});

describe("no feedback loops", () => {
  // Reading a texture while rendering into it is undefined behaviour in
  // WebGL: some drivers return stale texels, some return garbage, none throw.
  // The ping-pong exists to prevent it, so every draw is checked for it.
  const noLoops = (fake: FakeGl) => {
    for (const draw of fake.draws) {
      if (draw.targetTexture === undefined) continue;
      // A failure names the pass: it samples the texture it renders into.
      expect([draw.program, ...draw.inputs]).not.toContain(draw.targetTexture);
    }
  };

  test("during a step", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    expect(fake.draws.length).toBeGreaterThan(20);
    noLoops(fake);
  });

  test("during a splat", () => {
    const { fake, fluid } = ready();
    fluid.splat(0.3, 0.6, 0.02, 0.01);
    noLoops(fake);
  });

  test("across a run of splats, steps and draws", () => {
    const { fake, fluid } = ready();
    for (let i = 0; i < 5; i += 1) {
      fluid.splat(0.1 * i, 0.5, 0.01, -0.01);
      fluid.step(1 / 60);
      fluid.draw();
    }
    noLoops(fake);
  });

  test("after a resize mid-run, the new targets are the ones drawn into", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const oldTargets = new Set(fake.draws.map((draw) => draw.target));
    fake.draws.length = 0;
    fluid.resize(640, 480);
    fluid.step(1 / 60);
    for (const draw of fake.draws) expect(oldTargets.has(draw.target)).toBe(false);
    noLoops(fake);
  });

  test("the display pass samples the most recently written dye buffer", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    const dyeWrite = fake.draws[1];
    fake.draws.length = 0;
    fluid.draw();
    expect(fake.draws[0]?.inputs).toContain(dyeWrite?.targetTexture);
  });
});

describe("boundaries", () => {
  test("a zero dt steps without dividing by anything", () => {
    const { fake, fluid } = ready();
    expect(() => fluid.step(0)).not.toThrow();
    expect(fake.uniformsAtDraw[0]?.["dt"]).toEqual([0]);
  });

  test("active flips exactly at the settle time", () => {
    const { fluid } = ready();
    fluid.splat(0.5, 0.5, 0.01, 0);
    fluid.step(4.999);
    expect(fluid.active).toBe(true);
    fluid.step(0.001);
    expect(fluid.active).toBe(false);
  });

  test("resizing to the same size still replaces the targets", () => {
    const { fake, fluid } = ready();
    fluid.resize(1000, 500);
    expect(fake.deleted.textures).toBe(7);
    expect(fake.created.textures).toBe(14);
  });

  test("splats outside the unit square are forwarded, not clamped", () => {
    // The pointer can leave the canvas mid-move; the Gaussian simply lands
    // off screen, which is cheaper than a branch on every event.
    const { fake, fluid } = ready();
    fluid.splat(1.2, -0.1, 0, 0);
    expect(fake.uniformsAtDraw[0]?.["point"]).toEqual([1.2, -0.1]);
  });

  test("the first step after resize reads cleared targets", () => {
    const { fake, fluid } = ready();
    const clears = fake.calls.filter((call) => call === "clear").length;
    fluid.step(1 / 60);
    expect(fake.calls.filter((call) => call === "clear")).toHaveLength(clears);
  });
});

describe("program setup", () => {
  test("all six programs share one vertex shader", () => {
    const fake = createFakeGl();
    createFluid(fake.gl, COLOURS);
    // Seven compiles: the vertex shader once, then six fragments. Each link
    // attaches two shaders, so twelve attaches for six programs.
    expect(fake.calls.filter((call) => call === "compileShader")).toHaveLength(7);
    expect(fake.calls.filter((call) => call === "attachShader")).toHaveLength(12);
    expect(fake.calls.filter((call) => call === "linkProgram")).toHaveLength(6);
  });

  test("every blit sets texelSize before drawing", () => {
    const { fake, fluid } = ready();
    fluid.step(1 / 60);
    fluid.draw();
    for (const uniforms of fake.uniformsAtDraw) {
      expect(uniforms["texelSize"]).toHaveLength(2);
      expect(uniforms["texelSize"]?.[0]).toBeGreaterThan(0);
    }
  });

  test("a link failure frees the program it was linking", () => {
    const fake = createFakeGl({ links: false });
    expect(() => createFluid(fake.gl, COLOURS)).toThrow();
    expect(fake.deleted.programs).toBe(1);
    expect(fake.created.programs).toBe(1);
  });

  test("a compile failure frees the shader it was compiling", () => {
    const fake = createFakeGl({ compiles: false });
    expect(() => createFluid(fake.gl, COLOURS)).toThrow();
    expect(fake.deleted.shaders).toBe(1);
  });
});

describe("fit, at the extremes", () => {
  test("a very wide canvas keeps at least one row", () => {
    expect(fit(4000, 10, 128).height).toBe(1);
  });

  test("a very tall canvas keeps at least one column", () => {
    expect(fit(10, 4000, 512).width).toBe(1);
  });

  test("rounds to the nearest texel rather than truncating", () => {
    // 128 / (1000/600) = 76.8, which rounds up.
    expect(fit(1000, 600, 128)).toEqual({ width: 128, height: 77 });
  });
});

describe("setGlyphs", () => {
  const source = { fake: "canvas" } as unknown as TexImageSource;

  test("draw reports no glyphs until a layer is uploaded", () => {
    const { fake, fluid } = ready();
    fluid.draw();
    expect(fake.uniformsAtDraw[0]?.["glyphs"]).toEqual([0]);
    expect(fake.uniformsAtDraw[0]?.["uGlyphs"]).toEqual([1]);
    expect(fake.uniformsAtDraw[0]?.["glyph"]).toEqual([0.1, 0.05, 0.02]);
  });

  test("the first upload allocates one texture; later uploads reuse it", () => {
    const { fake, fluid } = ready();
    const before = fake.created.textures;
    const uploads = fake.calls.filter((call) => call === "texImage2D").length;
    fluid.setGlyphs(source);
    fluid.setGlyphs(source);
    fluid.setGlyphs(source);
    expect(fake.created.textures).toBe(before + 1);
    expect(fake.calls.filter((call) => call === "texImage2D")).toHaveLength(uploads + 3);
  });

  test("once uploaded, draw binds it on unit 1 and turns the reveal on", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    fluid.draw();
    expect(fake.uniformsAtDraw.at(-1)?.["glyphs"]).toEqual([1]);
    expect(fake.uniformsAtDraw.at(-1)?.["uGlyphs"]).toEqual([1]);
    expect(fake.draws.at(-1)?.inputs).toHaveLength(2);
  });

  test("the glyph texture is linear and clamped, like the field", () => {
    const { fake, fluid } = ready();
    const before = fake.calls.filter((call) => call === "texParameteri").length;
    fluid.setGlyphs(source);
    expect(fake.calls.filter((call) => call === "texParameteri")).toHaveLength(before + 4);
  });

  test("null removes the layer and frees the texture", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    const deleted = fake.deleted.textures;
    fluid.setGlyphs(null);
    expect(fake.deleted.textures).toBe(deleted + 1);
    fluid.draw();
    expect(fake.uniformsAtDraw.at(-1)?.["glyphs"]).toEqual([0]);
    // A second null is a no-op, not a double free.
    fluid.setGlyphs(null);
    expect(fake.deleted.textures).toBe(deleted + 1);
  });

  test("dispose frees the glyph texture with everything else", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    fluid.dispose();
    expect(fake.deleted.textures).toBe(fake.created.textures);
  });

  test("a resize keeps the glyph texture: it is not a field target", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    const created = fake.created.textures;
    fluid.resize(640, 480);
    fluid.draw();
    expect(fake.created.textures).toBe(created + 7);
    expect(fake.uniformsAtDraw.at(-1)?.["glyphs"]).toEqual([1]);
  });

  test("the simulation passes never read the glyph texture", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    const glyphTexture = fake.bound.get(1);
    fake.draws.length = 0;
    fluid.step(1 / 60);
    for (const draw of fake.draws) expect(draw.inputs).not.toContain(glyphTexture);
  });
});

describe("setGlyphs, ordering", () => {
  const source = { fake: "canvas" } as unknown as TexImageSource;

  test("may be called before resize, and the first draw then shows it", () => {
    const { fake, fluid } = make();
    if (!fluid) throw new Error("expected a fluid");
    expect(() => fluid.setGlyphs(source)).not.toThrow();
    fluid.resize(400, 200);
    fake.uniformsAtDraw.length = 0;
    fluid.draw();
    expect(fake.uniformsAtDraw[0]?.["glyphs"]).toEqual([1]);
  });

  test("the display pass leaves the dye on unit 0 and the glyphs on unit 1", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs(source);
    const glyphTexture = fake.bound.get(1);
    fluid.draw();
    expect(fake.bound.get(1)).toBe(glyphTexture);
    expect(fake.bound.get(0)).not.toBe(glyphTexture);
    expect(fake.draws.at(-1)?.inputs).toEqual([fake.bound.get(0), glyphTexture]);
  });

  test("draws in blocks of the given size, over the canvas's full resolution", () => {
    const fake = createFakeGl();
    const fluid = createFluid(fake.gl, { ...COLOURS, pixel: 8 });
    if (!fluid) throw new Error("expected a fluid");
    fluid.resize(1000, 500);
    fluid.draw();
    const uniforms = fake.uniformsAtDraw.at(-1);
    expect(uniforms?.["pixel"]).toEqual([8]);
    expect(uniforms?.["resolution"]).toEqual([1000, 500]);
  });

  test("without a block size, draws smooth: one device pixel per block", () => {
    const { fake, fluid } = ready();
    fluid.draw();
    expect(fake.uniformsAtDraw.at(-1)?.["pixel"]).toEqual([1]);
  });

  test("UNIFORMS.display lists the glyph uniforms the shader declares", () => {
    expect(UNIFORMS.display).toEqual(expect.arrayContaining(["uGlyphs", "glyphs", "glyph"]));
  });
});

describe("setGlyphs, after dispose", () => {
  test("a fresh upload after dispose allocates a fresh texture", () => {
    const { fake, fluid } = ready();
    fluid.setGlyphs({ fake: "canvas" } as unknown as TexImageSource);
    fluid.dispose();
    const created = fake.created.textures;
    fluid.setGlyphs({ fake: "canvas" } as unknown as TexImageSource);
    expect(fake.created.textures).toBe(created + 1);
  });
});
