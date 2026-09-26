#!/usr/bin/env node
// Coverage half of the testing policy (AGENTS.md "Testing policy"). The ratio
// script proves there are enough test lines; this proves they exercise the
// code, so a wall of trivial assertions cannot satisfy the rule.
//
// Reads Jest's json-summary and lcov reports and applies two rules:
//   1. Floor: global line and statement coverage may not fall below
//      coverage-baseline.json. Functions and branches are reported, not gated,
//      because v8 counts them only in files some test loads: the first test
//      for an untested file adds its untested branches to the total, so a PR
//      that took lines from 30% to 45% took branches from 77.9% to 76.7%. A
//      floor on that number punishes exactly the work it should reward. Line
//      and statement totals include every file, loaded or not, so they only
//      rise when tests are added. Branches are held on changed lines instead.
//   2. Changed lines: every executable line added or changed against --base,
//      in a coverable source file, must be run by a test. Across all changed
//      lines, at least BRANCH_BAR percent of branch arms must be taken.
//
// Changed lines, not whole files (decided 2026-09-26): the rule is "three
// lines of test for every line you write". Holding a one-line fix to the
// coverage of the whole legacy file around it turned every bug fix into a
// backfill project; the backfill is its own work, measured by the ratio.
// `--update` raises the baseline to the current numbers, metric by metric,
// and never lowers one. CI never runs --update; a person does, and commits it.
//
// Usage:
//   node scripts/coverage-gate.mjs [--summary <file>] [--lcov <file>] [--baseline <file>]
//                                  [--base <ref>] [--root <dir>] [--update] [--json]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const METRICS = ["lines", "statements", "functions", "branches"];
// The metrics whose denominator covers every file. See rule 1 above.
export const FLOOR_METRICS = ["lines", "statements"];

// Share of branch arms on changed lines that tests must take. Not 100: v8
// counts both arms of every `??` and optional chain, including ones only a
// corrupted runtime could take.
export const BRANCH_BAR = 90;

// Same set as jest.config.ts collectCoverageFrom. Content modules are data:
// they are held to the ratio, not to coverage, which would be meaningless.
export function isCoverable(relPath) {
  const p = relPath.split(path.sep).join("/");
  if (p.includes(" 2.")) return false;
  if (!p.startsWith("src/") || !/\.(ts|tsx)$/.test(p)) return false;
  if (p.startsWith("src/content/")) return false;
  if (p.includes("/__tests__/") || /\.test\.tsx?$/.test(p)) return false;
  if (p.endsWith(".d.ts")) return false;
  if (path.posix.basename(p) === "index.ts") return false;
  return true;
}

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    summary: "coverage/coverage-summary.json",
    lcov: "coverage/lcov.info",
    baseline: "coverage-baseline.json",
    base: null,
    update: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--update") out.update = true;
    else if (arg === "--json") out.json = true;
    else if (arg === "--root") out.root = path.resolve(argv[(i += 1)] ?? "");
    else if (arg === "--summary") out.summary = argv[(i += 1)] ?? "";
    else if (arg === "--lcov") out.lcov = argv[(i += 1)] ?? "";
    else if (arg === "--baseline") out.baseline = argv[(i += 1)] ?? "";
    else if (arg === "--base") out.base = argv[(i += 1)] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.base === "") throw new Error("--base needs a git ref.");
  return out;
}

function readJson(file, what) {
  if (!existsSync(file)) throw new Error(`${what} not found: ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`${what} is not valid JSON: ${file}`);
  }
}

// Per file: executable lines with their hit counts, and branch arms by line.
// Paths are made repo-relative; Jest writes them relative or absolute
// depending on the reporter.
export function parseLcov(text, root) {
  const files = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const file = line.slice(3);
      const rel = (path.isAbsolute(file) ? path.relative(root, file) : file)
        .split(path.sep)
        .join("/");
      current = { lines: new Map(), branches: [] };
      files.set(rel, current);
    } else if (!current) {
      continue;
    } else if (line.startsWith("DA:")) {
      const [n, hits] = line.slice(3).split(",");
      current.lines.set(Number(n), Number(hits));
    } else if (line.startsWith("BRDA:")) {
      const [n, , , taken] = line.slice(5).split(",");
      current.branches.push({ line: Number(n), taken: taken === "-" ? 0 : Number(taken) });
    } else if (line === "end_of_record") {
      current = null;
    }
  }
  return files;
}

// New-side line numbers from a zero-context diff. "@@ -a,b +c,d @@" adds lines
// c..c+d-1; d defaults to 1, and d=0 is a pure deletion.
export function changedLinesFromDiff(diff) {
  const lines = new Set();
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i += 1) lines.add(start + i);
  }
  return lines;
}

// A blank or comment-only line executes nothing, so it needs no test. v8
// reports every line of a file no test loads as uncovered, comments included,
// so without this a reworded comment would demand a test.
export function isInert(text) {
  const t = text.trim();
  return (
    t === "" || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("*/")
  );
}

export function pct(entry, metric) {
  const m = entry?.[metric];
  if (!m) return 0;
  // Jest reports "Unknown" for a metric with nothing to count. A file with no
  // branches has fully covered its branches; it did not skip them.
  if (m.total === 0) return 100;
  return typeof m.pct === "number" ? m.pct : 0;
}

export function checkFloor(total, baseline) {
  const failures = [];
  for (const metric of FLOOR_METRICS) {
    const now = pct(total, metric);
    const floor = Number(baseline?.[metric] ?? 0);
    if (now + 1e-9 < floor) failures.push({ metric, now, floor });
  }
  return failures;
}

// changed: Map<relPath, { lines: Set<number>, source: string[] }>
export function checkChanged(lcov, changed) {
  const failures = [];
  let branchTotal = 0;
  let branchTaken = 0;
  for (const [rel, { lines, source }] of changed) {
    if (!isCoverable(rel)) continue;
    const entry = lcov.get(rel);
    if (!entry) {
      // Jest never saw it: collectCoverageFrom drifted from isCoverable.
      // Fail loudly rather than pass silently.
      failures.push({ file: rel, kind: "missing" });
      continue;
    }
    const uncovered = [];
    for (const n of [...lines].sort((a, b) => a - b)) {
      if (isInert(source[n - 1] ?? "")) continue;
      const hits = entry.lines.get(n);
      if (hits === 0) uncovered.push(n);
    }
    if (uncovered.length > 0) failures.push({ file: rel, kind: "lines", lines: uncovered });
    for (const b of entry.branches) {
      if (!lines.has(b.line)) continue;
      branchTotal += 1;
      if (b.taken > 0) branchTaken += 1;
    }
  }
  const branchPct = branchTotal === 0 ? 100 : (branchTaken / branchTotal) * 100;
  if (branchPct < BRANCH_BAR) {
    failures.push({
      kind: "branches",
      pct: Number(branchPct.toFixed(2)),
      taken: branchTaken,
      total: branchTotal,
    });
  }
  return { failures, branchTotal, branchTaken };
}

export function raise(baseline, total) {
  const next = { ...baseline };
  for (const metric of METRICS) {
    next[metric] = Math.max(Number(baseline?.[metric] ?? 0), pct(total, metric));
  }
  return next;
}

// Changed lines per coverable file since the base, uncommitted work included,
// so pre-push and CI judge the same set. Untracked files are new in full.
export function changedSince(root, ref) {
  const run = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const tracked = run(["diff", "--name-only", "--diff-filter=AMRC", ref, "--", "src"]).split("\n");
  const untracked = run(["ls-files", "--others", "--exclude-standard", "--", "src"]).split("\n");
  const out = new Map();
  for (const rel of new Set([...tracked, ...untracked].filter(Boolean))) {
    if (!isCoverable(rel)) continue;
    const full = path.join(root, rel);
    if (!existsSync(full)) continue;
    const source = readFileSync(full, "utf8").split(/\r?\n/);
    const lines = untracked.includes(rel)
      ? new Set(source.map((_, i) => i + 1))
      : changedLinesFromDiff(run(["diff", "-U0", "--no-color", "--no-ext-diff", ref, "--", rel]));
    if (lines.size > 0) out.set(rel, { lines, source });
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const summaryPath = path.resolve(args.root, args.summary);
  const baselinePath = path.resolve(args.root, args.baseline);
  const summary = readJson(summaryPath, "Coverage summary");
  if (!summary.total) throw new Error(`Coverage summary has no "total": ${summaryPath}`);
  const baseline = existsSync(baselinePath) ? readJson(baselinePath, "Baseline") : {};

  if (args.update) {
    const next = raise(baseline, summary.total);
    writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    process.stdout.write(`Baseline raised: ${JSON.stringify(next)}\n`);
    return;
  }

  const floor = checkFloor(summary.total, baseline);
  const changed = args.base ? changedSince(args.root, args.base) : new Map();
  let result = { failures: [], branchTotal: 0, branchTaken: 0 };
  if (changed.size > 0) {
    const lcovPath = path.resolve(args.root, args.lcov);
    if (!existsSync(lcovPath)) throw new Error(`Coverage lcov not found: ${lcovPath}`);
    result = checkChanged(parseLcov(readFileSync(lcovPath, "utf8"), args.root), changed);
  }
  const pass = floor.length === 0 && result.failures.length === 0;

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          pass,
          total: summary.total,
          baseline,
          floor,
          changed: Object.fromEntries([...changed].map(([k, v]) => [k, [...v.lines]])),
          changedFailures: result.failures,
          branchTotal: result.branchTotal,
          branchTaken: result.branchTaken,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    const lines = ["Coverage gate"];
    for (const metric of METRICS) {
      const gated = FLOOR_METRICS.includes(metric);
      const floorText = gated
        ? `floor ${Number(baseline[metric] ?? 0).toFixed(2)}%`
        : "reported, not gated";
      lines.push(
        `  ${metric.padEnd(12)}${pct(summary.total, metric).toFixed(2).padStart(8)}%  ${floorText}`,
      );
    }
    if (args.base) {
      const count = [...changed.values()].reduce((n, v) => n + v.lines.size, 0);
      lines.push(`  changed lines since ${args.base}: ${count} in ${changed.size} files`);
    }
    for (const f of floor) lines.push(`FAIL floor: ${f.metric} ${f.now}% < ${f.floor}%`);
    for (const f of result.failures) {
      if (f.kind === "missing") lines.push(`FAIL ${f.file}: not in the coverage report`);
      else if (f.kind === "lines")
        lines.push(`FAIL ${f.file}: changed lines not run by any test: ${f.lines.join(", ")}`);
      else
        lines.push(
          `FAIL branches on changed lines: ${f.taken}/${f.total} taken (${f.pct}% < ${BRANCH_BAR}%)`,
        );
    }
    lines.push(pass ? "PASS" : "FAIL");
    process.stdout.write(`${lines.join("\n")}\n`);
  }
  process.exitCode = pass ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
