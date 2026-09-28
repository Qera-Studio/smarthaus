/**
 * @jest-environment node
 */

/**
 * The Lighthouse gate emulates one phone on every machine
 * (scripts/lighthouse-calibrated.mjs). Run through node, as the other script
 * tests are, because the script is an ES module.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.join(__dirname, "../lighthouse-calibrated.mjs");

/** Evaluate an expression against the script's exports, returning JSON. */
function run(expression: string): unknown {
  const out = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import * as m from ${JSON.stringify(SCRIPT)}; let r; try { r = { ok: ${expression} }; } catch (e) { r = { error: e.message }; } console.log(JSON.stringify(r));`,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(out.trim().split("\n").at(-1)!);
}

describe("cpuMultiplier", () => {
  it("gives the slower runner Lighthouse's default 4x, which is what the target was taken from", () => {
    expect(run("m.cpuMultiplier(2480)")).toEqual({ ok: 4 });
  });

  it("slows a faster machine more, so it emulates the same phone", () => {
    expect(run("m.cpuMultiplier(3300)")).toEqual({ ok: 5.32 });
    expect(run("m.cpuMultiplier(3950)")).toEqual({ ok: 6.37 });
  });

  it("never speeds a slow machine up: at or below the target it runs unthrottled", () => {
    expect(run("m.cpuMultiplier(620)")).toEqual({ ok: 1 });
    expect(run("m.cpuMultiplier(300)")).toEqual({ ok: 1 });
  });

  it("caps an absurd benchmark rather than running for ever", () => {
    expect(run("m.cpuMultiplier(1e9)")).toEqual({ ok: 20 });
  });

  it.each(["0", "-5", "NaN", "undefined"])("refuses a benchmark of %s", (value) => {
    expect(run(`m.cpuMultiplier(${value})`)).toEqual({
      error: expect.stringContaining("benchmark must be a positive number"),
    });
  });

  it("targets 620, the slower runner's 2,490 at 4x", () => {
    expect(run("m.TARGET_BENCHMARK")).toEqual({ ok: 620 });
  });
});

describe("averageBenchmark", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "lhci-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("averages the benchmarkIndex of every report, ignoring other files", () => {
    writeFileSync(
      path.join(dir, "lhr-1.json"),
      JSON.stringify({ environment: { benchmarkIndex: 2400 } }),
    );
    writeFileSync(
      path.join(dir, "lhr-2.json"),
      JSON.stringify({ environment: { benchmarkIndex: 2600 } }),
    );
    writeFileSync(path.join(dir, "assertion-results.json"), "[]");
    expect(run(`m.averageBenchmark(${JSON.stringify(dir)})`)).toEqual({ ok: 2500 });
  });

  it("refuses an empty folder rather than calibrating to nothing", () => {
    expect(run(`m.averageBenchmark(${JSON.stringify(dir)})`)).toEqual({
      error: expect.stringContaining("no Lighthouse reports"),
    });
  });
});
