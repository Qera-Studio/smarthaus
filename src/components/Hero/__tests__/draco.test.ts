/**
 * @jest-environment node
 */

// The Draco decoder is third-party code served from public/draco/, so it ships
// with its licence and a notice. It is a copy of what three.js bundles, which
// goes stale silently when three is upgraded: these fail first.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public/draco");
const UPSTREAM = join(ROOT, "node_modules/three/examples/jsm/libs/draco/gltf");
const threeVersion = JSON.parse(readFileSync(join(ROOT, "node_modules/three/package.json"), "utf8"))
  .version as string;

describe("the self-hosted Draco decoder", () => {
  it("contains exactly the decoder, its wrapper, the licence and the notice", () => {
    // Anything else added here ships unlicensed and unreviewed.
    expect(readdirSync(PUBLIC).sort()).toEqual([
      "LICENSE",
      "NOTICE",
      "draco_decoder.wasm",
      "draco_wasm_wrapper.js",
    ]);
  });

  it.each(["draco_decoder.wasm", "draco_wasm_wrapper.js"])(
    "serves %s byte-identical to the copy in the installed three.js",
    (file) => {
      const shipped = readFileSync(join(PUBLIC, file));
      const upstream = readFileSync(join(UPSTREAM, file));
      expect(shipped.equals(upstream)).toBe(true);
    },
  );

  it("ships the Apache License 2.0 text in full", () => {
    const licence = readFileSync(join(PUBLIC, "LICENSE"), "utf8");
    expect(licence).toMatch(/^\s*Apache License\s+Version 2\.0, January 2004/);
    expect(licence).toContain("TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION");
    expect(licence).toContain("END OF TERMS AND CONDITIONS");
  });

  it("names the upstream, the licence and the installed three.js version in its notice", () => {
    const notice = readFileSync(join(PUBLIC, "NOTICE"), "utf8");
    expect(notice).toContain("https://github.com/google/draco");
    expect(notice).toContain("Apache License, Version 2.0");
    expect(notice).toContain("The Draco Authors");
    expect(notice).toContain(`(three ${threeVersion})`);
  });
});
