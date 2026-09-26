#!/usr/bin/env node
// Coverage half of the testing policy (AGENTS.md "Testing policy"). The ratio
// script proves there are enough test lines; this proves they exercise the
// code, so a wall of trivial assertions cannot satisfy the rule.
//
// Reads Jest's json-summary report and applies two rules:
//   1. Floor: no global metric may fall below coverage-baseline.json.
//   2. Touched files: every coverable source file added or changed against
//      --base must reach the per-file bar below.
// `--update` raises the baseline to the current numbers, metric by metric,
// and never lowers one. CI never runs --update; a person does, and commits it.
//
// Usage:
//   node scripts/coverage-gate.mjs [--summary <file>] [--baseline <file>]
//                                  [--base <ref>] [--root <dir>] [--update] [--json]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const METRICS = ["lines", "statements", "functions", "branches"];

// Per-file bar for touched files. Branches sit lower because v8 counts both
// arms of every `??` and optional chain, including ones only a corrupted
// runtime could take.
export const FILE_BAR = { lines: 95, statements: 95, functions: 95, branches: 90 };

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

// Jest keys files by absolute path; everything here speaks repo-relative.
export function perFile(summary, root) {
  const files = new Map();
  for (const [key, value] of Object.entries(summary)) {
    if (key === "total") continue;
    const rel = path.isAbsolute(key) ? path.relative(root, key) : key;
    files.set(rel.split(path.sep).join("/"), value);
  }
  return files;
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
  for (const metric of METRICS) {
    const now = pct(total, metric);
    const floor = Number(baseline?.[metric] ?? 0);
    if (now + 1e-9 < floor) failures.push({ metric, now, floor });
  }
  return failures;
}

export function checkTouched(files, touched) {
  const failures = [];
  for (const rel of touched) {
    if (!isCoverable(rel)) continue;
    const entry = files.get(rel);
    if (!entry) {
      // Not in the report at all means Jest never saw it: collectCoverageFrom
      // drifted from isCoverable. Fail loudly rather than pass silently.
      failures.push({ file: rel, metric: "missing", now: 0, need: 100 });
      continue;
    }
    for (const metric of METRICS) {
      const now = pct(entry, metric);
      if (now < FILE_BAR[metric]) failures.push({ file: rel, metric, now, need: FILE_BAR[metric] });
    }
  }
  return failures;
}

export function raise(baseline, total) {
  const next = { ...baseline };
  for (const metric of METRICS) {
    next[metric] = Math.max(Number(baseline?.[metric] ?? 0), pct(total, metric));
  }
  return next;
}

// Added, modified, renamed or copied since the base, including uncommitted
// work, so pre-push and CI judge the same set.
export function touchedSince(root, ref) {
  const out = execFileSync(
    "git",
    ["-C", root, "diff", "--name-only", "--diff-filter=AMRC", ref, "--", "src"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const untracked = execFileSync(
    "git",
    ["-C", root, "ls-files", "--others", "--exclude-standard", "--", "src"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return [...new Set(`${out}\n${untracked}`.split("\n").filter(Boolean))].sort();
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
  const touched = args.base ? touchedSince(args.root, args.base) : [];
  const files = perFile(summary, args.root);
  const fileFailures = checkTouched(files, touched);
  const pass = floor.length === 0 && fileFailures.length === 0;

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify({ pass, total: summary.total, baseline, floor, touched, fileFailures }, null, 2)}\n`,
    );
  } else {
    const lines = ["Coverage gate"];
    for (const metric of METRICS) {
      lines.push(
        `  ${metric.padEnd(12)}${pct(summary.total, metric).toFixed(2).padStart(8)}%  floor ${Number(
          baseline[metric] ?? 0,
        ).toFixed(2)}%`,
      );
    }
    if (args.base)
      lines.push(
        `  touched coverable files since ${args.base}: ${touched.filter(isCoverable).length}`,
      );
    for (const f of floor) lines.push(`FAIL floor: ${f.metric} ${f.now}% < ${f.floor}%`);
    for (const f of fileFailures) {
      lines.push(
        f.metric === "missing"
          ? `FAIL ${f.file}: not in the coverage report`
          : `FAIL ${f.file}: ${f.metric} ${f.now}% < ${f.need}%`,
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
