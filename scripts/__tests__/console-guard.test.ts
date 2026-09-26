/**
 * @jest-environment node
 */
// jest.setup.ts fails any test that writes console.error or console.warn
// without asserting on it. That guard fires in afterEach, so it cannot be
// observed from inside the same run: these tests spawn Jest on fixtures.
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES = path.join(__dirname, "guard-fixtures");

type JestJson = {
  numFailedTests: number;
  numPassedTests: number;
  testResults: {
    assertionResults: { title: string; status: string; failureMessages: string[] }[];
  }[];
};

function runJest(fixture: string): JestJson {
  const r = spawnSync(
    "node",
    [
      path.join(ROOT, "node_modules", "jest", "bin", "jest.js"),
      "--ci",
      "--json",
      "--coverage=false",
      "--testMatch",
      "**/guard-fixtures/*.guard.ts",
      "--testPathIgnorePatterns",
      "/node_modules/",
      // By path, not by pattern: a positional argument is a regex and would run
      // every fixture in the folder.
      "--runTestsByPath",
      path.join(FIXTURES, fixture),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  return JSON.parse(r.stdout) as JestJson;
}

function results(fixture: string) {
  const report = runJest(fixture);
  // Exactly one fixture file ran, or the assertions below are reading the
  // wrong suite.
  expect(report.testResults).toHaveLength(1);
  return report.testResults.flatMap((t) => t.assertionResults);
}

jest.setTimeout(60_000);

describe("the console guard", () => {
  it("fails a test that calls console.error", () => {
    const [only] = results("console-error.guard.ts");
    expect(only?.status).toBe("failed");
    expect(only?.failureMessages.join("\n")).toContain("console.error: boom");
  });

  it("fails a test that calls console.warn", () => {
    const [only] = results("console-warn.guard.ts");
    expect(only?.status).toBe("failed");
    expect(only?.failureMessages.join("\n")).toContain("console.warn: careful");
  });

  it("tells the author how to allow an expected log", () => {
    const [only] = results("console-error.guard.ts");
    expect(only?.failureMessages.join("\n")).toContain("spy on console and assert on it");
  });

  it("lets a test that spies on console own its output", () => {
    const [only] = results("spied.guard.ts");
    expect(only?.status).toBe("passed");
  });

  it("allows console.log", () => {
    const [only] = results("quiet.guard.ts");
    expect(only?.status).toBe("passed");
  });

  it("does not carry one test's output into the next", () => {
    const [leaks, clean] = results("leak-once.guard.ts");
    expect(leaks?.status).toBe("failed");
    expect(clean?.status).toBe("passed");
  });
});
