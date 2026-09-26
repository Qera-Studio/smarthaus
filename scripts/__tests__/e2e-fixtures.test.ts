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

  it("exempts the fixture file itself", () => {
    expect(eslint).toContain('ignores: ["e2e/fixtures.ts"]');
  });
});
