/**
 * @jest-environment node
 */
// Every e2e spec takes `test` from e2e/fixtures.ts, which carries the suite's
// defaults (today: the hero's villa off unless a spec opts in). A spec that
// imported it from @playwright/test would silently run with the villa on and
// bring back the main-thread stalls it was switched off for. ESLint catches
// this too; this test does not depend on the linter being run.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const E2E = path.resolve(__dirname, "..", "..", "e2e");
const specs = readdirSync(E2E).filter((f) => f.endsWith(".spec.ts") && !/ [2-9]\./.test(f));
const fixtures = readFileSync(path.join(E2E, "fixtures.ts"), "utf8");
const eslint = readFileSync(path.resolve(__dirname, "..", "..", "eslint.config.mjs"), "utf8");

describe("e2e specs", () => {
  it("exist, so the checks below are not vacuous", () => {
    expect(specs.length).toBeGreaterThan(10);
  });

  it.each(specs)("%s takes test from ./fixtures", (spec) => {
    const source = readFileSync(path.join(E2E, spec), "utf8");
    expect(source).toMatch(/import \{[^}]*\btest\b[^}]*\} from "\.\/fixtures";/);
  });

  it.each(specs)("%s never imports test from @playwright/test", (spec) => {
    const source = readFileSync(path.join(E2E, spec), "utf8");
    for (const m of source.matchAll(/import \{([^}]*)\} from "@playwright\/test";/g)) {
      expect(m[1]!.split(",").map((s) => s.trim())).not.toContain("test");
    }
  });
});

describe("the fixture", () => {
  it("defaults the villa to off", () => {
    expect(fixtures).toContain("villa: [false, { option: true }]");
  });

  it("switches it off through Save-Data, the product's own gate", () => {
    expect(fixtures).toContain("saveData: true");
    expect(
      readFileSync(
        path.resolve(__dirname, "..", "..", "src/components/Hero/VillaCanvas.tsx"),
        "utf8",
      ),
    ).toContain("connection?.saveData");
  });

  it("runs for every test without being asked", () => {
    expect(fixtures).toContain("{ auto: true }");
  });
});

describe("the lint rule", () => {
  it("restricts importing test from @playwright/test in e2e files", () => {
    expect(eslint).toContain('files: ["e2e/**/*.ts"]');
    expect(eslint).toContain('importNames: ["test"]');
  });

  it("exempts the fixture file and the checks module from the spec rules", () => {
    expect(eslint).toContain('ignores: ["e2e/fixtures.ts", "e2e/checks.ts"]');
  });

  it("restricts importing axe in e2e files to the checks module", () => {
    expect(eslint).toContain('name: "@axe-core/playwright"');
    expect(eslint).toContain('files: ["e2e/checks.ts"]');
  });
});

describe("the shared checks", () => {
  // Code only: the doc comments explain what the helpers replaced, and name
  // the weaker calls on purpose.
  const checks = readFileSync(path.join(process.cwd(), "e2e/checks.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const specs = readdirSync(path.join(process.cwd(), "e2e")).filter(
    (file) => file.endsWith(".spec.ts") && !/ [2-9]\./.test(file),
  );

  it("are the only e2e file that imports axe", () => {
    for (const spec of specs) {
      const source = readFileSync(path.join(process.cwd(), "e2e", spec), "utf8");
      expect({ spec, importsAxe: source.includes("@axe-core/playwright") }).toEqual({
        spec,
        importsAxe: false,
      });
    }
  });

  it("run axe with every rule: no tag filter, no disabled rule", () => {
    expect(checks).toContain("new AxeBuilder({ page })");
    for (const narrowing of ["withTags", "withRules", "disableRules", "exclude("]) {
      expect(checks).not.toContain(narrowing);
    }
  });

  it("read text with textContent, which includes a closed <details>", () => {
    expect(checks).toContain(".textContent()");
    expect(checks).not.toContain(".innerText()");
  });

  it("measure overflow against clientWidth with no slack", () => {
    expect(checks).toContain("document.documentElement.clientWidth");
    expect(checks).toContain("toBeLessThanOrEqual(\n    client,");
    expect(checks).not.toContain("innerWidth");
  });

  it("are used by every page suite that checks accessibility", () => {
    const users = specs.filter((spec) =>
      readFileSync(path.join(process.cwd(), "e2e", spec), "utf8").includes("expectAccessible("),
    );
    expect(users.length).toBeGreaterThanOrEqual(12);
  });
});
