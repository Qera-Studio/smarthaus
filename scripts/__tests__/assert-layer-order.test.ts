/**
 * @jest-environment node
 */
// Guards the cascade bug that shipped on the 404: a route whose first chunk
// opened with `@layer components {` let components outrank the reset. Every
// rule is proven against the real CLI and fixture build output.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(__dirname, "..", "assert-layer-order.mjs");
const ORDER = "@layer reset, base, components, blocks, utilities;";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "layer-fixture-"));
  put("src/styles/_variables.scss", `// tokens\n${ORDER}\n$x: 1;\n`);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function put(rel: string, content: string) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function chunk(name: string, css: string) {
  put(`.next/static/chunks/${name}`, css);
}

function run(...args: string[]) {
  const r = spawnSync("node", [SCRIPT, "--root", root, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe("passing builds", () => {
  it("passes chunks that each open with the order statement", () => {
    chunk("a.css", `${ORDER}@layer components{.a{color:red}}`);
    chunk("b.css", `${ORDER}@layer reset{*{margin:0}}`);
    const { status, stdout } = run();
    expect(status).toBe(0);
    expect(stdout).toContain(
      "Layer order PASS: 2 chunks, each reset < base < components < blocks < utilities",
    );
  });

  it("passes a minified statement with no spaces", () => {
    chunk("a.css", "@layer reset,base,components,blocks,utilities;@layer blocks{.b{}}");
    expect(run().status).toBe(0);
  });

  it("passes when the order is spread over several statements in the right sequence", () => {
    // lightningcss may split or rewrite the statement; only first appearance matters.
    chunk("a.css", "@layer reset;@layer base,components;@layer blocks;@layer utilities;");
    expect(run().status).toBe(0);
  });

  it("passes a chunk with no layers at all, such as a font face", () => {
    chunk("fonts.css", "@font-face{font-family:x;src:url(x.woff2)}");
    chunk("a.css", `${ORDER}`);
    expect(run().status).toBe(0);
  });

  it("finds CSS in nested folders", () => {
    put(".next/static/css/deep/nested/a.css", `${ORDER}`);
    expect(run().stdout).toContain("1 chunks");
  });

  it("reads the expected order from _variables.scss rather than a copy", () => {
    put(
      "src/styles/_variables.scss",
      "@layer reset, tokens, base, components, blocks, utilities, overrides;\n",
    );
    chunk("a.css", "@layer reset,tokens,base,components,blocks,utilities,overrides;");
    expect(run().status).toBe(0);
  });
});

describe("failing builds", () => {
  it("fails the chunk that shipped: a component block before the statement", () => {
    chunk("page.css", `@layer components{.a{}}@layer blocks{.b{}}`);
    chunk("globals.css", `${ORDER}`);
    const { status, stdout } = run();
    expect(status).toBe(1);
    expect(stdout).toContain("Layer order FAIL in 1 of 2 chunks");
    expect(stdout).toContain(
      "page.css: expected reset < base < components < blocks < utilities, found components < blocks",
    );
  });

  it("fails a statement in the wrong order", () => {
    chunk("a.css", "@layer base, reset, components, blocks, utilities;");
    expect(run().status).toBe(1);
  });

  it("fails a statement that is missing a layer", () => {
    chunk("a.css", "@layer reset, base, components, utilities;");
    expect(run().stdout).toContain("found reset < base < components < utilities");
  });

  it("fails a block that precedes a complete statement", () => {
    chunk("a.css", `@layer utilities{.u{}}${ORDER}`);
    expect(run().status).toBe(1);
  });

  it("lists every failing chunk, not only the first", () => {
    chunk("a.css", "@layer blocks{}");
    chunk("b.css", "@layer components{}");
    const { stdout } = run();
    expect(stdout).toContain("FAIL in 2 of 2 chunks");
    expect(stdout).toContain("a.css");
    expect(stdout).toContain("b.css");
  });

  it("ignores @layer inside comments", () => {
    chunk("a.css", `/* @layer components{} */${ORDER}`);
    expect(run().status).toBe(0);
    chunk("b.css", `/* ${ORDER} */@layer components{}`);
    expect(run().status).toBe(1);
  });

  it("skips Finder duplicates in the build folder", () => {
    chunk("a.css", `${ORDER}`);
    chunk("a 2.css", "@layer components{}");
    expect(run().status).toBe(0);
  });
});

describe("inputs", () => {
  it("exits 2 with a hint when there is no build", () => {
    const { status, stderr } = run();
    expect(status).toBe(2);
    expect(stderr).toContain("Run `pnpm build` first.");
  });

  it("exits 2 when the build has no CSS", () => {
    put(".next/static/chunks/a.js", "x");
    expect(run().stderr).toContain("No CSS files under");
  });

  it("exits 2 when _variables.scss has no order statement", () => {
    put("src/styles/_variables.scss", "@layer reset { }\n");
    chunk("a.css", ORDER);
    expect(run().stderr).toContain("No @layer order statement found");
  });

  it("exits 2 on an unknown argument", () => {
    expect(run("--nope").stderr.trim()).toBe("Unknown argument: --nope");
  });

  it("honours --css-dir", () => {
    put("out/a.css", ORDER);
    expect(run("--css-dir", "out").status).toBe(0);
  });
});
