/**
 * @jest-environment node
 */
// The coverage gate is the half of the testing policy that stops padding: a
// PR can reach 3:1 in lines with assertions that exercise nothing, and this is
// what catches it. Every rule is proven against the real CLI.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.resolve(__dirname, "..", "coverage-gate.mjs");

type Metric = { total: number; covered: number; skipped: number; pct: number | "Unknown" };
type Entry = Record<"lines" | "statements" | "functions" | "branches", Metric>;

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "coverage-fixture-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function metric(pct: number, total = 100): Metric {
  return { total, covered: Math.round((pct / 100) * total), skipped: 0, pct };
}

function entry(pct: number, branches = pct): Entry {
  return {
    lines: metric(pct),
    statements: metric(pct),
    functions: metric(pct),
    branches: metric(branches),
  };
}

function writeSummary(total: Entry, files: Record<string, Entry> = {}, absolute = true) {
  const body: Record<string, Entry> = { total };
  for (const [rel, value] of Object.entries(files)) {
    body[absolute ? path.join(root, rel) : rel] = value;
  }
  mkdirSync(path.join(root, "coverage"), { recursive: true });
  writeFileSync(path.join(root, "coverage", "coverage-summary.json"), JSON.stringify(body));
}

function writeBaseline(values: Record<string, number>) {
  writeFileSync(path.join(root, "coverage-baseline.json"), JSON.stringify(values));
}

function readBaseline() {
  return JSON.parse(readFileSync(path.join(root, "coverage-baseline.json"), "utf8"));
}

function put(rel: string, content = "export const x = 1;\n") {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function run(...args: string[]) {
  const r = spawnSync("node", [SCRIPT, "--root", root, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function json(...args: string[]) {
  return JSON.parse(run("--json", ...args).stdout);
}

function git(...args: string[]) {
  execFileSync("git", ["-C", root, ...args], { stdio: "pipe" });
}

function commitAll(message: string) {
  git("add", "-A");
  git(
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-q",
    "--no-verify",
    "-m",
    message,
  );
}

const FLOOR = { lines: 50, statements: 50, functions: 50, branches: 50 };

describe("the floor", () => {
  it("passes when every metric equals the baseline", () => {
    writeSummary(entry(50));
    writeBaseline(FLOOR);
    expect(run().status).toBe(0);
  });

  it("passes when coverage rose", () => {
    writeSummary(entry(80));
    writeBaseline(FLOOR);
    expect(run().status).toBe(0);
  });

  it.each(["lines", "statements", "functions", "branches"] as const)(
    "fails when %s falls by a hundredth of a point",
    (name) => {
      const total = entry(50);
      total[name] = metric(49.99);
      writeSummary(total);
      writeBaseline(FLOOR);
      const { status, stdout } = run();
      expect(status).toBe(1);
      expect(stdout).toContain(`FAIL floor: ${name} 49.99% < 50%`);
    },
  );

  it("reports every metric that fell, not only the first", () => {
    writeSummary(entry(10));
    writeBaseline(FLOOR);
    expect(json().floor).toHaveLength(4);
  });

  it("treats a missing baseline as a floor of zero", () => {
    writeSummary(entry(1));
    expect(run().status).toBe(0);
  });

  it("treats a metric with nothing to count as fully covered", () => {
    const total = entry(50);
    total.branches = { total: 0, covered: 0, skipped: 0, pct: "Unknown" };
    writeSummary(total);
    writeBaseline({ ...FLOOR, branches: 100 });
    expect(run().status).toBe(0);
  });
});

describe("raising the baseline", () => {
  it("writes the current numbers when there is no baseline", () => {
    writeSummary(entry(42));
    run("--update");
    expect(readBaseline()).toEqual({ lines: 42, statements: 42, functions: 42, branches: 42 });
  });

  it("raises metrics that improved and keeps those that did not", () => {
    const total = entry(60);
    total.branches = metric(40);
    writeSummary(total);
    writeBaseline(FLOOR);
    run("--update");
    expect(readBaseline()).toEqual({ lines: 60, statements: 60, functions: 60, branches: 50 });
  });

  it("never lowers the baseline, even when asked to update after a drop", () => {
    writeSummary(entry(10));
    writeBaseline(FLOOR);
    run("--update");
    expect(readBaseline()).toEqual(FLOOR);
  });

  it("exits 0 when updating, so a person can always record progress", () => {
    writeSummary(entry(10));
    writeBaseline(FLOOR);
    expect(run("--update").status).toBe(0);
  });
});

describe("touched files, with --base", () => {
  beforeEach(() => {
    git("init", "-q");
    put("src/lib/old.ts");
    put("src/content/copy.ts");
    commitAll("base");
    git("tag", "base");
    writeBaseline({ lines: 0, statements: 0, functions: 0, branches: 0 });
  });

  it("passes when nothing under src changed", () => {
    writeSummary(entry(10), { "src/lib/old.ts": entry(10) });
    expect(run("--base", "base").status).toBe(0);
  });

  it("passes a new file at exactly the bar", () => {
    put("src/lib/new.ts");
    writeSummary(entry(10), { "src/lib/new.ts": entry(95, 90) });
    expect(run("--base", "base").status).toBe(0);
  });

  it("fails a new file one point under the line bar", () => {
    put("src/lib/new.ts");
    writeSummary(entry(10), { "src/lib/new.ts": entry(94, 90) });
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("FAIL src/lib/new.ts: lines 94% < 95%");
  });

  it("fails a new file under the branch bar", () => {
    put("src/lib/new.ts");
    writeSummary(entry(10), { "src/lib/new.ts": entry(100, 89) });
    expect(run("--base", "base").stdout).toContain("branches 89% < 90%");
  });

  it("holds a modified old file to the same bar as a new one", () => {
    put("src/lib/old.ts", "export const x = 2;\n");
    writeSummary(entry(10), { "src/lib/old.ts": entry(20) });
    expect(run("--base", "base").status).toBe(1);
  });

  it("judges committed and uncommitted changes alike", () => {
    put("src/lib/committed.ts");
    commitAll("work");
    put("src/lib/staged.ts");
    git("add", "src/lib/staged.ts");
    writeSummary(entry(10), {
      "src/lib/committed.ts": entry(0),
      "src/lib/staged.ts": entry(0),
    });
    expect(json("--base", "base").touched).toEqual(["src/lib/committed.ts", "src/lib/staged.ts"]);
  });

  it("includes untracked files, so a forgotten git add cannot dodge the gate", () => {
    put("src/lib/untracked.ts");
    writeSummary(entry(10), { "src/lib/untracked.ts": entry(0) });
    expect(run("--base", "base").status).toBe(1);
  });

  it("ignores deleted files", () => {
    rmSync(path.join(root, "src/lib/old.ts"));
    writeSummary(entry(10));
    expect(run("--base", "base").status).toBe(0);
  });

  it("fails a touched coverable file that is missing from the report", () => {
    put("src/lib/new.ts");
    writeSummary(entry(10));
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("FAIL src/lib/new.ts: not in the coverage report");
  });

  it.each([
    "src/content/copy.ts",
    "src/lib/__tests__/new.test.ts",
    "src/lib/new.test.ts",
    "src/components/X/index.ts",
    "src/types/global.d.ts",
    "src/styles/x.scss",
    "src/lib/new 2.ts",
  ])("does not hold %s to the per-file bar", (rel) => {
    put(rel, "x\n");
    writeSummary(entry(10));
    expect(run("--base", "base").status).toBe(0);
  });

  it("accepts summaries keyed by relative path as well as absolute", () => {
    put("src/lib/new.ts");
    writeSummary(entry(10), { "src/lib/new.ts": entry(100) }, false);
    expect(run("--base", "base").status).toBe(0);
  });

  it("applies the floor and the file bar together", () => {
    writeBaseline(FLOOR);
    put("src/lib/new.ts");
    writeSummary(entry(10), { "src/lib/new.ts": entry(0) });
    const report = json("--base", "base");
    expect(report.pass).toBe(false);
    expect(report.floor.length).toBe(4);
    expect(report.fileFailures.length).toBe(4);
  });
});

describe("inputs", () => {
  it("exits 2 when the summary is missing", () => {
    const { status, stderr } = run();
    expect(status).toBe(2);
    expect(stderr).toContain("Coverage summary not found");
  });

  it("exits 2 when the summary is not JSON", () => {
    mkdirSync(path.join(root, "coverage"));
    writeFileSync(path.join(root, "coverage", "coverage-summary.json"), "{nope");
    expect(run().stderr).toContain("Coverage summary is not valid JSON");
  });

  it("exits 2 when the summary has no total", () => {
    mkdirSync(path.join(root, "coverage"));
    writeFileSync(path.join(root, "coverage", "coverage-summary.json"), "{}");
    expect(run().stderr).toContain('has no "total"');
  });

  it("exits 2 when the baseline is not JSON", () => {
    writeSummary(entry(50));
    writeFileSync(path.join(root, "coverage-baseline.json"), "nope");
    expect(run().stderr).toContain("Baseline is not valid JSON");
  });

  it.each([
    [["--wat"], "Unknown argument: --wat"],
    [["--base", ""], "--base needs a git ref."],
  ])("rejects %j", (args, message) => {
    const { status, stderr } = run(...args);
    expect(status).toBe(2);
    expect(stderr.trim()).toBe(message);
  });

  it("honours --summary and --baseline paths", () => {
    mkdirSync(path.join(root, "elsewhere"));
    writeFileSync(path.join(root, "elsewhere", "s.json"), JSON.stringify({ total: entry(70) }));
    writeFileSync(path.join(root, "elsewhere", "b.json"), JSON.stringify({ lines: 80 }));
    const { status } = run("--summary", "elsewhere/s.json", "--baseline", "elsewhere/b.json");
    expect(status).toBe(1);
  });
});
