import { readFileSync } from "node:fs";
import { join } from "node:path";

import { UNIFORMS } from "../fluid";
import * as shaders from "../shaders";

/**
 * Static checks on the GLSL. jsdom cannot compile it, so this pins what a
 * compile would otherwise catch late: the version line, balanced braces, and
 * that each shader declares exactly the uniforms fluid.ts sets on it. A
 * uniform that fluid.ts sets and the shader does not declare is silently a
 * no-op in WebGL, which is the worst kind of bug to find by eye.
 *
 * The last block is about the copy on top of the canvas, not the GLSL: the
 * display shader caps the ink so --color-text-primary keeps AA contrast over
 * the darkest pixel the field can produce.
 */

const FRAGMENTS = {
  splat: shaders.SPLAT,
  advection: shaders.ADVECTION,
  divergence: shaders.DIVERGENCE,
  pressure: shaders.PRESSURE,
  gradientSubtract: shaders.GRADIENT_SUBTRACT,
  display: shaders.DISPLAY,
} as const;

const declaredUniforms = (source: string) =>
  [...source.matchAll(/^uniform\s+\w+\s+(\w+);/gm)].map((match) => match[1]);

describe("every shader", () => {
  test.each(Object.entries({ vertex: shaders.VERTEX, ...FRAGMENTS }))(
    "%s starts with the WebGL2 version line",
    (_name, source) => {
      expect(source.startsWith("#version 300 es\n")).toBe(true);
    },
  );

  test.each(Object.entries({ vertex: shaders.VERTEX, ...FRAGMENTS }))(
    "%s has balanced braces and parentheses",
    (_name, source) => {
      const count = (char: string) => source.split(char).length - 1;
      expect(count("{")).toBe(count("}"));
      expect(count("(")).toBe(count(")"));
    },
  );

  test.each(Object.entries(FRAGMENTS))("%s writes fragColor and reads vUv", (_name, source) => {
    expect(source).toMatch(/out vec4 fragColor;/);
    expect(source).toMatch(/in vec2 vUv;/);
  });
});

describe("uniforms", () => {
  test.each(Object.keys(FRAGMENTS) as (keyof typeof FRAGMENTS)[])(
    "%s declares exactly the uniforms fluid.ts sets",
    (name) => {
      expect(declaredUniforms(FRAGMENTS[name]).sort()).toEqual([...UNIFORMS[name]].sort());
    },
  );

  test("the vertex shader declares texelSize, which every pass sets", () => {
    expect(declaredUniforms(shaders.VERTEX)).toEqual(["texelSize"]);
  });

  test("the neighbour passes read the vertex shader's four offsets", () => {
    for (const source of [shaders.DIVERGENCE, shaders.PRESSURE, shaders.GRADIENT_SUBTRACT]) {
      for (const varying of ["vL", "vR", "vT", "vB"]) {
        expect(source).toMatch(new RegExp(`in vec2 ${varying};`));
        expect(source).toMatch(new RegExp(`texture\\(\\w+, ${varying}\\)`));
      }
    }
  });
});

describe("the display cap keeps the copy readable", () => {
  // The display curve: d = 0.6 * smoothstep(0.06, 0.45, dye), so d <= 0.6.
  const CAP = 0.6;

  const tokens = readFileSync(join(process.cwd(), "src/styles/_variables.scss"), "utf8");
  const token = (name: string) => {
    const match = tokens.match(new RegExp(`^\\$${name}:\\s*(#[0-9a-f]{6});`, "mi"));
    if (!match?.[1]) throw new Error(`no $${name} in _variables.scss`);
    return match[1];
  };
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const luminance = ([r, g, b]: [number, number, number]) => {
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const mixed = (amount: number) => {
    const ground = rgb(token("brown-100"));
    const ink = rgb(token("brown-700"));
    return ground.map((g, i) => g + ((ink[i] ?? 0) - g) * amount) as [number, number, number];
  };

  test("the shader's curve is the one this test assumes", () => {
    expect(shaders.DISPLAY).toMatch(/float d = 0\.6 \* smoothstep\(0\.06, 0\.45, dye\);/);
    expect(shaders.DISPLAY).toMatch(/mix\(ground, ink, d\)/);
  });

  test("brown-900 text on the darkest possible field clears 4.5:1", () => {
    // The shader mixes the sRGB values it is given, so mix in sRGB here too.
    const text = rgb(token("brown-900"));
    expect(contrast(luminance(text), luminance(mixed(CAP)))).toBeGreaterThanOrEqual(4.5);
  });

  test("and would not at a 65% cap, which is why the cap is where it is", () => {
    const text = rgb(token("brown-900"));
    expect(contrast(luminance(text), luminance(mixed(0.65)))).toBeLessThan(4.5);
  });
});

describe("GLSL hygiene", () => {
  const declared = (source: string, kind: "uniform" | "in" | "out") =>
    [...source.matchAll(new RegExp(`^${kind}\\s+\\w+\\s+(\\w+);`, "gm"))].map((m) => m[1]);

  test.each(Object.entries(FRAGMENTS))("%s samples only declared samplers", (_name, source) => {
    const samplers = [...source.matchAll(/^uniform sampler2D (\w+);/gm)].map((m) => m[1]);
    const sampled = [...source.matchAll(/texture\((\w+),/g)].map((m) => m[1]);
    for (const name of sampled) expect(samplers).toContain(name);
    // And every declared sampler is read: an unused one is a wasted unit.
    for (const name of samplers) expect(sampled).toContain(name);
  });

  test.each(Object.entries(FRAGMENTS))("%s reads only declared varyings", (_name, source) => {
    const ins = declared(source, "in");
    const outs = declared(shaders.VERTEX, "out");
    for (const name of ins) expect(outs).toContain(name);
  });

  test.each(Object.entries(FRAGMENTS))("%s uses no WebGL1 built-ins", (_name, source) => {
    expect(source).not.toMatch(/gl_FragColor|texture2D\(|varying\s|attribute\s/);
  });

  test.each(Object.entries(FRAGMENTS))("%s declares float precision", (_name, source) => {
    expect(source).toMatch(/^precision (highp|mediump) float;/m);
  });

  test.each(Object.entries(FRAGMENTS))(
    "%s has one main that assigns fragColor",
    (_name, source) => {
      expect(source.match(/void main\s*\(\)/g)).toHaveLength(1);
      expect(source).toMatch(/fragColor = /);
    },
  );

  test("the vertex shader owns aPosition at attribute 0 and emits the four neighbours", () => {
    expect(shaders.VERTEX).toMatch(/^in vec2 aPosition;/m);
    expect(shaders.VERTEX).toMatch(/gl_Position = vec4\(aPosition, 0\.0, 1\.0\);/);
    for (const name of ["vUv", "vL", "vR", "vT", "vB"]) {
      expect(shaders.VERTEX).toMatch(new RegExp(`^out vec2 ${name};`, "m"));
    }
  });

  test("advection looks back along the velocity and decays per second", () => {
    expect(shaders.ADVECTION).toMatch(/vUv - dt \* texture\(uVelocity, vUv\)\.xy \* texelSize/);
    expect(shaders.ADVECTION).toMatch(/1\.0 \+ dissipation \* dt/);
  });

  test("the projection is a central difference on the four neighbours", () => {
    expect(shaders.DIVERGENCE).toMatch(/0\.5 \* \(R - L \+ T - B\)/);
    expect(shaders.PRESSURE).toMatch(/\(L \+ R \+ B \+ T - divergence\) \* 0\.25/);
    expect(shaders.GRADIENT_SUBTRACT).toMatch(/0\.5 \* vec2\(R - L, T - B\)/);
  });

  test("the splat is a Gaussian corrected for the canvas aspect", () => {
    expect(shaders.SPLAT).toMatch(/p\.x \*= aspectRatio;/);
    expect(shaders.SPLAT).toMatch(/exp\(-dot\(p, p\) \/ radius\)/);
  });

  test("the display shader holds no colour literal", () => {
    expect(shaders.DISPLAY).not.toMatch(/vec3\(\s*\d/);
    expect(shaders.DISPLAY).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

describe("the glyph reveal", () => {
  test("the display shader samples the glyph layer flipped, since a 2D canvas is y-down", () => {
    expect(shaders.DISPLAY).toMatch(/texture\(uGlyphs, vec2\(vUv\.x, 1\.0 - vUv\.y\)\)\.a/);
  });

  test("reveals only inside dense dye, and only when a layer exists", () => {
    expect(shaders.DISPLAY).toMatch(/float reveal = smoothstep\(0\.5, 0\.9, dye\) \* glyphs;/);
    expect(shaders.DISPLAY).toMatch(/mix\(color, glyph, mark \* reveal\)/);
  });

  test("the reveal starts past the point where the liquid has a body", () => {
    // The body curve begins at 0.02 and the reveal at 0.5: characters sit
    // inside the pool, never on its faint outer edge.
    const body = /smoothstep\((\d+\.\d+), (\d+\.\d+), dye\)/.exec(shaders.DISPLAY);
    const reveal = /reveal = smoothstep\((\d+\.\d+), (\d+\.\d+), dye\)/.exec(shaders.DISPLAY);
    expect(Number(reveal?.[1])).toBeGreaterThan(Number(body?.[1]));
  });

  test("glyph colour is a uniform, so the shader still holds no colour", () => {
    expect(declaredUniforms(shaders.DISPLAY)).toEqual(
      expect.arrayContaining(["uGlyphs", "glyphs", "glyph"]),
    );
  });
});

describe("the glyph colour", () => {
  test("enters only through the mark and the reveal, never the ground", () => {
    expect(shaders.DISPLAY).toMatch(/vec3 color = mix\(ground, ink, d\);/);
    expect(shaders.DISPLAY).toMatch(
      /fragColor = vec4\(mix\(color, glyph, mark \* reveal\), 1\.0\);/,
    );
    expect(shaders.DISPLAY.match(/\bglyph\b/g)).toHaveLength(2);
  });
});
