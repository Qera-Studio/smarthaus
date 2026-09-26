#!/usr/bin/env node
// The 1:3 rule, measured. AGENTS.md "Testing policy" is the contract; this file
// is the only place the counting rules live, so a reviewer who doubts a number
// reads here and nowhere else.
//
// Code:  non-blank lines of src/**/*.{ts,tsx}, excluding tests, index.ts
//        barrels and .d.ts files. src/content/*.ts is code: copy and tables
//        ship to users and can be wrong.
// Tests: non-blank lines of src/**/__tests__/**, src/**/*.test.{ts,tsx} and
//        e2e/**/*.ts. Fixtures and helpers under e2e/ count: they exist only
//        to serve tests.
//
// Blank lines are dropped on both sides so whitespace cannot pad either.
// Any path containing " 2." is skipped: macOS Finder duplicates, never code.
//
// Usage: node scripts/test-ratio.mjs [--root <dir>] [--min <n>] [--base <ref>] [--json]
//
// Without --base: exits 1 when the ratio is below --min (default 3).
//
// With --base <git ref> (what CI and pre-push run): the tree passes when it is
// at or above --min, OR when both of these hold against the base:
//   1. new code carries its own tests: test lines added >= min x code lines added;
//   2. the overall ratio did not fall.
// Why not the absolute check alone: the repo started at 0.43:1, and a gate that
// is red on every PR until the backlog is paid blocks the very PRs that pay it.
// A permanently red gate hides real regressions (CLAUDE.md, JS budget note).
// Once the tree reaches --min, rule 0 applies and the ratchet no longer matters.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "test-results"]);
const SOURCE_EXT = /\.(ts|tsx)$/;

function parseArgs(argv) {
  const out = { root: process.cwd(), min: 3, json: false, base: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") out.json = true;
    else if (arg === "--root") out.root = path.resolve(argv[(i += 1)] ?? "");
    else if (arg === "--min") out.min = Number(argv[(i += 1)]);
    else if (arg === "--base") out.base = argv[(i += 1)] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(out.min) || out.min <= 0) {
    throw new Error("--min must be a positive number.");
  }
  if (out.base === "") throw new Error("--base needs a git ref.");
  return out;
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const files = [];
  for (const name of entries) {
    if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

export function nonBlankLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim() !== "").length;
}

// One place decides what a file is. Returns "code", "unit", "e2e" or null.
export function classify(relPath) {
  const p = relPath.split(path.sep).join("/");
  if (p.includes(" 2.")) return null;
  if (!SOURCE_EXT.test(p)) return null;
  if (p.startsWith("e2e/")) return "e2e";
  if (!p.startsWith("src/")) return null;
  if (p.includes("/__tests__/") || /\.test\.tsx?$/.test(p)) return "unit";
  if (p.endsWith(".d.ts")) return null;
  if (path.posix.basename(p) === "index.ts") return null;
  return "code";
}

export function measure(root) {
  const totals = { code: 0, unit: 0, e2e: 0 };
  const files = { code: 0, unit: 0, e2e: 0 };
  for (const dir of ["src", "e2e"]) {
    for (const full of walk(path.join(root, dir))) {
      const kind = classify(path.relative(root, full));
      if (!kind) continue;
      totals[kind] += nonBlankLines(readFileSync(full, "utf8"));
      files[kind] += 1;
    }
  }
  const tests = totals.unit + totals.e2e;
  const ratio = totals.code === 0 ? Infinity : tests / totals.code;
  return { ...totals, tests, files, ratio };
}

// The base tree is extracted with git archive rather than checked out, so the
// working tree, the index and any uncommitted work are never touched.
export function measureRef(root, ref) {
  // Only archive the roots that exist at that ref: git archive fails outright
  // on a pathspec that matches nothing, and a base with no e2e/ is legitimate.
  const present = execFileSync("git", ["-C", root, "ls-tree", "--name-only", ref], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\n")
    .filter((name) => name === "src" || name === "e2e");
  const dir = mkdtempSync(path.join(tmpdir(), "test-ratio-"));
  try {
    if (present.length === 0) return measure(dir);
    const tar = execFileSync("git", ["-C", root, "archive", "--format=tar", ref, ...present], {
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execFileSync("tar", ["-x", "-C", dir], { input: tar });
    return measure(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Pure decision, so the rules are unit-testable without git.
export function judge(now, base, min) {
  const absolute = now.ratio >= min;
  if (!base) return { pass: absolute, absolute, carriesTests: null, noRegression: null };
  const codeAdded = now.code - base.code;
  const testsAdded = now.tests - base.tests;
  const carriesTests = codeAdded <= 0 || testsAdded >= min * codeAdded;
  // A tolerance of one part in a million absorbs float noise, nothing more.
  const noRegression = now.ratio >= base.ratio - 1e-6;
  return {
    pass: absolute || (carriesTests && noRegression),
    absolute,
    carriesTests,
    noRegression,
    codeAdded,
    testsAdded,
    testsRequiredForNewCode: Math.max(0, Math.ceil(min * codeAdded)),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const m = measure(args.root);
  const base = args.base ? measureRef(args.root, args.base) : null;
  const verdict = judge(m, base, args.min);
  const target = Math.ceil(m.code * args.min);
  const shortfall = Math.max(0, target - m.tests);
  const pass = verdict.pass;
  const ratio = Number.isFinite(m.ratio) ? Number(m.ratio.toFixed(2)) : null;
  const baseRatio = base && Number.isFinite(base.ratio) ? Number(base.ratio.toFixed(4)) : null;

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ...m,
          ratio,
          min: args.min,
          target,
          shortfall,
          base: base && { ...base, ratio: baseRatio },
          verdict,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    const row = (label, value) => `  ${label.padEnd(22)}${String(value).padStart(10)}`;
    const lines = [
      "Test ratio (non-blank lines)",
      row("Code", m.code),
      row("Unit tests", m.unit),
      row("E2E tests", m.e2e),
      row("Tests total", m.tests),
      row("Ratio", ratio === null ? "n/a" : `${ratio} : 1`),
      row("Required", `${args.min} : 1`),
      row("Target test lines", target),
      row("Shortfall", shortfall),
    ];
    if (base) {
      lines.push(
        `Against ${args.base}`,
        row("Base ratio", `${baseRatio} : 1`),
        row("Code lines added", verdict.codeAdded),
        row("Test lines added", verdict.testsAdded),
        row("Tests needed for new code", verdict.testsRequiredForNewCode),
        row("New code carries tests", verdict.carriesTests ? "yes" : "NO"),
        row("Ratio did not fall", verdict.noRegression ? "yes" : "NO"),
      );
    }
    if (pass) {
      lines.push(verdict.absolute ? "PASS" : `PASS (ratchet: below ${args.min}:1, not regressing)`);
    } else if (!base) {
      lines.push(`FAIL: ${shortfall} more test lines needed to reach ${args.min}:1.`);
    } else {
      const why = [];
      if (!verdict.carriesTests) {
        why.push(
          `new code needs ${verdict.testsRequiredForNewCode} test lines, ${verdict.testsAdded} were added`,
        );
      }
      if (!verdict.noRegression) why.push(`ratio fell from ${baseRatio} to ${ratio}`);
      lines.push(`FAIL: ${why.join("; ")}.`);
    }
    process.stdout.write(`${lines.join("\n")}\n`);
  }
  process.exitCode = pass ? 0 : 1;
}

// Imported for its helpers by nothing today; kept callable either way.
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
