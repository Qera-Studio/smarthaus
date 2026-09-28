#!/usr/bin/env node
/**
 * Lighthouse CI with the CPU slowdown calibrated to the machine it runs on.
 *
 * Why: measured throttling slows the real CPU by a fixed factor, so the same
 * factor emulates a different phone on different hardware. On 2026-09-28 the
 * same commit measured Total Blocking Time of 83ms on a GitHub runner that
 * benchmarks ~3,300 and 322ms on one that benchmarks ~2,490: a gate that
 * passed or failed by which machine it drew.
 *
 * So every run emulates one target phone: first one quick run to read this
 * machine's benchmarkIndex, then the real run with a slowdown of
 * benchmark / TARGET_BENCHMARK. The target is what the slower runner emulates
 * at Lighthouse's default 4x (2,490 / 4), decided by Shivanshu as the
 * strictest consistent bar. Thresholds stay in lighthouserc.json.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const TARGET_BENCHMARK = 620;
const MIN_MULTIPLIER = 1;
const MAX_MULTIPLIER = 20;

/** The slowdown that makes a machine of this benchmark behave like the target. */
export function cpuMultiplier(benchmark, target = TARGET_BENCHMARK) {
  if (!Number.isFinite(benchmark) || benchmark <= 0) {
    throw new Error(`cpuMultiplier: benchmark must be a positive number, got ${benchmark}`);
  }
  const raw = benchmark / target;
  return Math.round(Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, raw)) * 100) / 100;
}

/**
 * The highest benchmarkIndex among the reports in a .lighthouseci folder.
 *
 * Highest, not average: the first run on a cold machine scores low (measured
 * 2,074 against 2,490 for the real runs on the same runner), and a low reading
 * means a smaller slowdown and a faster phone than the target. Erring high
 * errs strict.
 */
export function highestBenchmark(dir) {
  const reports = readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name));
  if (reports.length === 0) throw new Error(`no Lighthouse reports in ${dir}`);
  const values = reports.map(
    (name) => JSON.parse(readFileSync(join(dir, name), "utf8")).environment.benchmarkIndex,
  );
  return Math.max(...values);
}

function lhci(args) {
  execFileSync("pnpm", ["exec", "lhci", ...args], { stdio: "inherit" });
}

function main() {
  const dir = ".lighthouseci";
  rmSync(dir, { recursive: true, force: true });
  // Two runs: the first warms the server and the browser.
  lhci(["collect", "--url=http://localhost:3210/", "--numberOfRuns=2"]);
  const benchmark = highestBenchmark(dir);
  const multiplier = cpuMultiplier(benchmark);
  console.log(
    `lighthouse-calibrated: benchmarkIndex ${Math.round(benchmark)}, CPU slowdown ${multiplier}x (target ${TARGET_BENCHMARK})`,
  );
  rmSync(dir, { recursive: true, force: true });
  lhci(["autorun", `--collect.settings.throttling.cpuSlowdownMultiplier=${multiplier}`]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
