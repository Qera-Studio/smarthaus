import { createGlass, cover, MAX_ZOOM, reedWidth } from "../glass";
import { FRAGMENT, REEDS_ACROSS, UNIFORMS, VERTEX } from "../glass-shader";

/**
 * The glass on WebGL2, against a context that records what it is asked.
 * jsdom has no WebGL; what is pinned is the sequence the real one needs: the
 * shaders compiled and linked with the quad's attribute at 0, one texture set
 * to stretch and clamp, every uniform set before each draw, and everything
 * handed back on dispose. A failure throws with the driver's own words, so
 * GlassCanvas can log it and keep the CSS ground.
 */

type Call = [string, ...unknown[]];

function fakeGl({ compiles = true, links = true, shader = true, program = true } = {}) {
  const calls: Call[] = [];
  const record =
    (name: string, result?: unknown) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return typeof result === "function"
        ? (result as (...a: unknown[]) => unknown)(...args)
        : result;
    };
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TEXTURE0: 0x84c0,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    TRIANGLE_STRIP: 0x0005,
    createShader: record("createShader", (type: unknown) => (shader ? { shader: type } : null)),
    shaderSource: record("shaderSource"),
    compileShader: record("compileShader"),
    getShaderParameter: record("getShaderParameter", compiles),
    getShaderInfoLog: record("getShaderInfoLog", "ERROR: 0:12: syntax error"),
    createProgram: record("createProgram", program ? { program: true } : null),
    attachShader: record("attachShader"),
    bindAttribLocation: record("bindAttribLocation"),
    linkProgram: record("linkProgram"),
    getProgramParameter: record("getProgramParameter", links),
    getProgramInfoLog: record("getProgramInfoLog", "link: mismatch"),
    useProgram: record("useProgram"),
    getUniformLocation: record("getUniformLocation", (_p: unknown, name: unknown) => ({ name })),
    createVertexArray: record("createVertexArray", { vao: true }),
    createBuffer: record("createBuffer", { buffer: true }),
    bindVertexArray: record("bindVertexArray"),
    bindBuffer: record("bindBuffer"),
    bufferData: record("bufferData"),
    enableVertexAttribArray: record("enableVertexAttribArray"),
    vertexAttribPointer: record("vertexAttribPointer"),
    createTexture: record("createTexture", { texture: true }),
    activeTexture: record("activeTexture"),
    bindTexture: record("bindTexture"),
    texParameteri: record("texParameteri"),
    texImage2D: record("texImage2D"),
    uniform1i: record("uniform1i"),
    uniform1f: record("uniform1f"),
    uniform2f: record("uniform2f"),
    uniform4f: record("uniform4f"),
    viewport: record("viewport"),
    drawArrays: record("drawArrays"),
    deleteTexture: record("deleteTexture"),
    deleteBuffer: record("deleteBuffer"),
    deleteVertexArray: record("deleteVertexArray"),
    deleteProgram: record("deleteProgram"),
    deleteShader: record("deleteShader"),
  };
  const named = (name: string) => calls.filter((c) => c[0] === name);
  const uniform = (name: string) =>
    calls.filter((c) => c[0].startsWith("uniform") && (c[1] as { name?: string })?.name === name);
  return { gl: gl as unknown as WebGL2RenderingContext, raw: gl, calls, named, uniform };
}

const PICTURE = { picture: true } as unknown as TexImageSource;
const ASPECT = 3640 / 2048;
const FRAME = { width: 2880, height: 1800, reed: 118.5, pointerX: 400, pointerY: 300, glow: 0.5 };

describe("cover", () => {
  it("fills a landscape screen as CSS's cover would: scaled to its width, centred", () => {
    const [sx, sy, ox, oy] = cover(1440, 810, ASPECT);
    const pictureWidth = 1 / sx;
    const pictureHeight = 1 / sy;
    expect(pictureWidth).toBeCloseTo(1440);
    expect(pictureHeight).toBeCloseTo(1440 / ASPECT);
    expect(ox).toBeCloseTo(0);
    expect(oy * pictureHeight * 2).toBeCloseTo(pictureHeight - 810);
  });

  it("fills a squarer screen by its height, cropping the sides evenly", () => {
    const [sx, sy, ox, oy] = cover(1000, 1000, ASPECT);
    expect(1 / sy).toBeCloseTo(1000);
    expect(1 / sx).toBeCloseTo(1000 * ASPECT);
    expect(ox).toBeCloseTo((1000 * ASPECT - 1000) / 2 / (1000 * ASPECT));
    expect(oy).toBeCloseTo(0);
  });

  it("never zooms past MAX_ZOOM screens wide, so a phone sees the ring, not its middle", () => {
    const [sx] = cover(390, 844, ASPECT);
    expect(MAX_ZOOM).toBe(1.9);
    expect(1 / sx).toBeCloseTo(390 * MAX_ZOOM);
    // Covering would have needed 844 * 1.78 = 1500px, almost four screens.
    expect(844 * ASPECT).toBeGreaterThan(390 * MAX_ZOOM);
  });

  it("pins the picture to the top when it no longer reaches the foot", () => {
    const [, sy, , oy] = cover(390, 844, ASPECT);
    expect(1 / sy).toBeLessThan(844);
    expect(oy).toBe(0);
  });

  it("maps the screen's centre to the picture's centre, across, at any size", () => {
    for (const [w, h] of [
      [1440, 900],
      [1920, 1080],
      [768, 1024],
      [390, 844],
    ] as const) {
      const [sx, , ox] = cover(w, h, ASPECT);
      expect((w / 2) * sx + ox).toBeCloseTo(0.5);
    }
  });
});

describe("reedWidth", () => {
  it("is the design's share of the width: 59.25px at 1440", () => {
    expect(reedWidth(1440)).toBeCloseTo(1440 / REEDS_ACROSS);
    expect(reedWidth(1440)).toBeCloseTo(59.25, 0);
  });

  it("is never under 40px, so a phone is not all edges", () => {
    expect(reedWidth(390)).toBe(40);
    expect(reedWidth(0)).toBe(40);
  });

  it("is never over 80px, so a wide screen is not all slabs", () => {
    expect(reedWidth(2560)).toBe(80);
    expect(reedWidth(5120)).toBe(80);
  });

  it("is the stylesheet's own sum, for the lines it draws first", () => {
    // HomeHero.module.scss: --hero-reed: clamp(40px, calc(100vw / 24.3), 80px).
    expect(REEDS_ACROSS).toBe(24.3);
  });
});

describe("createGlass", () => {
  it("compiles the two shaders it was given, vertex first", () => {
    const { gl, named } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    expect(named("shaderSource").map((c) => c[2])).toEqual([VERTEX, FRAGMENT]);
    expect(named("createShader").map((c) => c[1])).toEqual([0x8b31, 0x8b30]);
  });

  it("binds the quad's corners to attribute 0 before it links", () => {
    const { gl, calls } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    const names = calls.map((c) => c[0]);
    expect(calls.find((c) => c[0] === "bindAttribLocation")!.slice(2)).toEqual([0, "aPosition"]);
    expect(names.indexOf("bindAttribLocation")).toBeLessThan(names.indexOf("linkProgram"));
  });

  it("finds every uniform once, by name", () => {
    const { gl, named } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    expect(named("getUniformLocation").map((c) => c[2])).toEqual([...UNIFORMS]);
  });

  it("draws one quad of two triangles, from four corners", () => {
    const { gl, named } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    const [, , data] = named("bufferData")[0]!;
    expect(Array.from(data as Float32Array)).toEqual([-1, -1, 1, -1, -1, 1, 1, 1]);
    expect(named("vertexAttribPointer")[0]!.slice(1)).toEqual([0, 2, 0x1406, false, 0, 0]);
  });

  it("uploads the picture once, smoothed and clamped at its edges", () => {
    const { gl, named, uniform } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    expect(named("texImage2D")).toHaveLength(1);
    expect(named("texImage2D")[0]!.at(-1)).toBe(PICTURE);
    const params = Object.fromEntries(named("texParameteri").map((c) => [c[2], c[3]]));
    expect(params).toEqual({
      [0x2801]: 0x2601,
      [0x2800]: 0x2601,
      [0x2802]: 0x812f,
      [0x2803]: 0x812f,
    });
    expect(uniform("uTexture").map((c) => c.slice(2))).toEqual([[0]]);
  });

  it("draws nothing until asked", () => {
    const { gl, named } = fakeGl();
    createGlass(gl, PICTURE, ASPECT);
    expect(named("drawArrays")).toHaveLength(0);
  });

  describe("draw", () => {
    it("fills the backing store", () => {
      const { gl, named } = fakeGl();
      createGlass(gl, PICTURE, ASPECT).draw(FRAME);
      expect(named("viewport")[0]!.slice(1)).toEqual([0, 0, 2880, 1800]);
    });

    it("sets every per-frame uniform from the frame it was given", () => {
      const { gl, uniform } = fakeGl();
      createGlass(gl, PICTURE, ASPECT).draw(FRAME);
      expect(uniform("uResolution")[0]!.slice(2)).toEqual([2880, 1800]);
      expect(uniform("uReed")[0]!.slice(2)).toEqual([118.5]);
      expect(uniform("uPointer")[0]!.slice(2)).toEqual([400, 300]);
      expect(uniform("uGlow")[0]!.slice(2)).toEqual([0.5]);
      expect(uniform("uCover")[0]!.slice(2)).toEqual(cover(2880, 1800, ASPECT));
    });

    it("sets the uniforms before it draws, and draws the quad once", () => {
      const { gl, calls, named } = fakeGl();
      createGlass(gl, PICTURE, ASPECT).draw(FRAME);
      const names = calls.map((c) => c[0]);
      expect(named("drawArrays")[0]!.slice(1)).toEqual([0x0005, 0, 4]);
      expect(names.lastIndexOf("uniform1f")).toBeLessThan(names.indexOf("drawArrays"));
    });

    it("draws again, with the new frame, each time it is asked", () => {
      const { gl, named, uniform } = fakeGl();
      const glass = createGlass(gl, PICTURE, ASPECT);
      glass.draw(FRAME);
      glass.draw({ ...FRAME, glow: 0 });
      expect(named("drawArrays")).toHaveLength(2);
      expect(uniform("uGlow").map((c) => c[2])).toEqual([0.5, 0]);
    });

    it("never uploads the picture again", () => {
      const { gl, named } = fakeGl();
      const glass = createGlass(gl, PICTURE, ASPECT);
      for (let i = 0; i < 5; i += 1) glass.draw(FRAME);
      expect(named("texImage2D")).toHaveLength(1);
    });
  });

  it("hands everything back on dispose", () => {
    const { gl, named } = fakeGl();
    createGlass(gl, PICTURE, ASPECT).dispose();
    for (const name of ["deleteTexture", "deleteBuffer", "deleteVertexArray", "deleteProgram"]) {
      expect({ name, n: named(name).length }).toEqual({ name, n: 1 });
    }
    expect(named("deleteShader")).toHaveLength(2);
  });

  describe("when the driver refuses", () => {
    it("throws with the compiler's own words", () => {
      const { gl } = fakeGl({ compiles: false });
      expect(() => createGlass(gl, PICTURE, ASPECT)).toThrow(
        "[hero] glass: ERROR: 0:12: syntax error",
      );
    });

    it("throws with the linker's own words", () => {
      const { gl } = fakeGl({ links: false });
      expect(() => createGlass(gl, PICTURE, ASPECT)).toThrow("[hero] glass: link: mismatch");
    });

    it("throws when it cannot make a shader, as a lost context does", () => {
      const { gl } = fakeGl({ shader: false });
      expect(() => createGlass(gl, PICTURE, ASPECT)).toThrow("[hero] glass: no shader");
    });

    it("throws when it cannot make a program", () => {
      const { gl } = fakeGl({ program: false });
      expect(() => createGlass(gl, PICTURE, ASPECT)).toThrow("[hero] glass: no program");
    });

    it("says so even when the driver gives no words", () => {
      const compiled = fakeGl({ compiles: false });
      compiled.raw.getShaderInfoLog = () => null as never;
      expect(() => createGlass(compiled.gl, PICTURE, ASPECT)).toThrow(
        "[hero] glass: shader failed",
      );
      const linked = fakeGl({ links: false });
      linked.raw.getProgramInfoLog = () => null as never;
      expect(() => createGlass(linked.gl, PICTURE, ASPECT)).toThrow("[hero] glass: link failed");
    });

    it("uploads nothing once compiling has failed", () => {
      const { gl, named } = fakeGl({ compiles: false });
      expect(() => createGlass(gl, PICTURE, ASPECT)).toThrow();
      expect(named("texImage2D")).toHaveLength(0);
    });
  });
});
