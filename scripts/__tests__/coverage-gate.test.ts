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

  it.each(["lines", "statements"] as const)(
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

  it.each(["functions", "branches"] as const)(
    "does not gate %s, whose total grows as untested files gain their first test",
    (name) => {
      // The real case: lines 30% to 45%, branches 77.9% to 76.7%, in a PR that
      // only added tests. A floor here would have failed it.
      const total = entry(50);
      total[name] = metric(10);
      writeSummary(total);
      writeBaseline(FLOOR);
      const { status, stdout } = run();
      expect(status).toBe(0);
      expect(stdout).toMatch(new RegExp(`${name}\\s+10\\.00%\\s+reported, not gated`));
    },
  );

  it("reports every gated metric that fell, not only the first", () => {
    writeSummary(entry(10));
    writeBaseline(FLOOR);
    expect(json().floor.map((f: { metric: string }) => f.metric)).toEqual(["lines", "statements"]);
  });

  it("treats a missing baseline as a floor of zero", () => {
    writeSummary(entry(1));
    expect(run().status).toBe(0);
  });

  it("treats a metric with nothing to count as fully covered", () => {
    const total = entry(50);
    total.lines = { total: 0, covered: 0, skipped: 0, pct: "Unknown" };
    writeSummary(total);
    writeBaseline({ ...FLOOR, lines: 100 });
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

// lcov for one file: every listed line with its hit count, plus branch arms.
function lcovRecord(rel: string, hits: Record<number, number>, branches: [number, number][] = []) {
  const da = Object.entries(hits).map(([n, h]) => `DA:${n},${h}`);
  const brda = branches.map(
    ([line, taken], i) => `BRDA:${line},0,${i},${taken === 0 ? "-" : taken}`,
  );
  return [`SF:${rel}`, ...da, ...brda, "end_of_record"].join("\n");
}

function writeLcov(...records: string[]) {
  mkdirSync(path.join(root, "coverage"), { recursive: true });
  writeFileSync(path.join(root, "coverage", "lcov.info"), `${records.join("\n")}\n`);
}

const OLD = [
  "export const a = 1;",
  "export const b = 2;",
  "export const c = 3;",
  "export const d = 4;",
  "",
].join("\n");

describe("changed lines, with --base", () => {
  beforeEach(() => {
    git("init", "-q");
    put("src/lib/old.ts", OLD);
    put("src/content/copy.ts");
    commitAll("base");
    git("tag", "base");
    writeBaseline({ lines: 0, statements: 0, functions: 0, branches: 0 });
    writeSummary(entry(10));
  });

  it("passes when nothing under src changed, without needing lcov", () => {
    expect(run("--base", "base").status).toBe(0);
  });

  it("passes a one-line change that a test runs, in a file that is otherwise untested", () => {
    // The whole point of the rule: the old lines stay untested, the new one is.
    put("src/lib/old.ts", OLD.replace("const b = 2", "const b = 20"));
    writeLcov(lcovRecord("src/lib/old.ts", { 1: 0, 2: 1, 3: 0, 4: 0 }));
    const r = json("--base", "base");
    expect(r.pass).toBe(true);
    expect(r.changed).toEqual({ "src/lib/old.ts": [2] });
  });

  it("fails a changed line no test runs, and names the line", () => {
    put("src/lib/old.ts", OLD.replace("const c = 3", "const c = 30"));
    writeLcov(lcovRecord("src/lib/old.ts", { 1: 1, 2: 1, 3: 0, 4: 1 }));
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("FAIL src/lib/old.ts: changed lines not run by any test: 3");
  });

  it("lists every uncovered changed line in order", () => {
    put(
      "src/lib/old.ts",
      [
        "export const a = 10;",
        "export const b = 2;",
        "export const c = 30;",
        "export const d = 40;",
        "",
      ].join("\n"),
    );
    writeLcov(lcovRecord("src/lib/old.ts", { 1: 0, 2: 1, 3: 0, 4: 0 }));
    expect(run("--base", "base").stdout).toContain("changed lines not run by any test: 1, 3, 4");
  });

  it("holds every line of a new untracked file to the rule", () => {
    put("src/lib/new.ts", "export const x = 1;\nexport const y = 2;\n");
    writeLcov(lcovRecord("src/lib/new.ts", { 1: 1, 2: 0 }));
    const r = json("--base", "base");
    expect(r.changed["src/lib/new.ts"]).toEqual([1, 2, 3]);
    expect(r.changedFailures).toEqual([{ file: "src/lib/new.ts", kind: "lines", lines: [2] }]);
  });

  it("judges committed and staged changes alike", () => {
    put("src/lib/committed.ts", "export const x = 1;\n");
    commitAll("work");
    put("src/lib/staged.ts", "export const y = 1;\n");
    git("add", "src/lib/staged.ts");
    writeLcov(
      lcovRecord("src/lib/committed.ts", { 1: 1 }),
      lcovRecord("src/lib/staged.ts", { 1: 1 }),
    );
    expect(Object.keys(json("--base", "base").changed).sort()).toEqual([
      "src/lib/committed.ts",
      "src/lib/staged.ts",
    ]);
  });

  it("does not ask tests of comment or blank lines, even in a file no test loads", () => {
    put("src/lib/old.ts", `// a new comment\n\n/* block */\n * star line\n${OLD}`);
    writeLcov(lcovRecord("src/lib/old.ts", { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }));
    expect(run("--base", "base").status).toBe(0);
  });

  it("ignores changed lines that are not executable, such as a type", () => {
    // lcov has no DA entry for the line at all, which is how v8 reports
    // type-only lines in a loaded file.
    put("src/lib/old.ts", `export type T = string;\n${OLD}`);
    writeLcov(lcovRecord("src/lib/old.ts", { 2: 1, 3: 1, 4: 1, 5: 1 }));
    expect(run("--base", "base").status).toBe(0);
  });

  it("ignores pure deletions", () => {
    put("src/lib/old.ts", OLD.replace("export const b = 2;\n", ""));
    writeLcov(lcovRecord("src/lib/old.ts", { 1: 0, 2: 0, 3: 0 }));
    const r = json("--base", "base");
    expect(r.pass).toBe(true);
    expect(r.changed).toEqual({});
  });

  it("ignores deleted files", () => {
    rmSync(path.join(root, "src/lib/old.ts"));
    expect(run("--base", "base").status).toBe(0);
  });

  it("fails a changed coverable file that is missing from the lcov report", () => {
    put("src/lib/new.ts", "export const x = 1;\n");
    writeLcov(lcovRecord("src/lib/other.ts", { 1: 1 }));
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("FAIL src/lib/new.ts: not in the coverage report");
  });

  it("exits 2 when lines changed but there is no lcov report", () => {
    put("src/lib/new.ts", "export const x = 1;\n");
    const { status, stderr } = run("--base", "base");
    expect(status).toBe(2);
    expect(stderr).toContain("Coverage lcov not found");
  });

  it.each([
    "src/content/copy.ts",
    "src/lib/__tests__/new.test.ts",
    "src/lib/new.test.ts",
    "src/components/X/index.ts",
    "src/types/global.d.ts",
    "src/styles/x.scss",
    "src/lib/new 2.ts",
  ])("does not hold %s to the rule", (rel) => {
    put(rel, "x\n");
    expect(run("--base", "base").status).toBe(0);
  });

  it("accepts lcov paths written absolute as well as relative", () => {
    put("src/lib/new.ts", "export const x = 1;\n");
    writeLcov(lcovRecord(path.join(root, "src/lib/new.ts"), { 1: 1 }));
    expect(run("--base", "base").status).toBe(0);
  });

  describe("branches on changed lines", () => {
    it("passes at exactly the bar", () => {
      put("src/lib/new.ts", "export const x = 1;\n");
      const arms: [number, number][] = [...Array(9).fill([1, 1]), [1, 0]];
      writeLcov(lcovRecord("src/lib/new.ts", { 1: 1 }, arms));
      expect(run("--base", "base").status).toBe(0);
    });

    it("fails below the bar and reports the count", () => {
      put("src/lib/new.ts", "export const x = 1;\n");
      writeLcov(
        lcovRecord("src/lib/new.ts", { 1: 1 }, [
          [1, 1],
          [1, 0],
        ]),
      );
      const { status, stdout } = run("--base", "base");
      expect(status).toBe(1);
      expect(stdout).toContain("FAIL branches on changed lines: 1/2 taken (50% < 90%)");
    });

    it("counts only arms on changed lines, not the rest of the file", () => {
      put("src/lib/old.ts", OLD.replace("const b = 2", "const b = 20"));
      writeLcov(
        lcovRecord("src/lib/old.ts", { 1: 1, 2: 1, 3: 1, 4: 1 }, [
          [1, 0],
          [3, 0],
          [2, 1],
        ]),
      );
      const r = json("--base", "base");
      expect(r).toMatchObject({ pass: true, branchTotal: 1, branchTaken: 1 });
    });

    it("passes when changed lines carry no branches at all", () => {
      put("src/lib/new.ts", "export const x = 1;\n");
      writeLcov(lcovRecord("src/lib/new.ts", { 1: 1 }));
      expect(json("--base", "base")).toMatchObject({ pass: true, branchTotal: 0 });
    });
  });

  it("applies the floor and the changed-line rule together", () => {
    writeBaseline(FLOOR);
    put("src/lib/new.ts", "export const x = 1;\n");
    writeLcov(lcovRecord("src/lib/new.ts", { 1: 0 }));
    const report = json("--base", "base");
    expect(report.pass).toBe(false);
    expect(report.floor.length).toBe(2);
    expect(report.changedFailures).toEqual([{ file: "src/lib/new.ts", kind: "lines", lines: [1] }]);
  });

  it("honours --lcov", () => {
    put("src/lib/new.ts", "export const x = 1;\n");
    mkdirSync(path.join(root, "elsewhere"), { recursive: true });
    writeFileSync(path.join(root, "elsewhere", "l.info"), lcovRecord("src/lib/new.ts", { 1: 1 }));
    expect(run("--base", "base", "--lcov", "elsewhere/l.info").status).toBe(0);
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
