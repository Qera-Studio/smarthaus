/**
 * @jest-environment node
 */
// The ratio script is the enforcement point for the 1:3 rule, so every counting
// rule and both ratchet rules are proven here against throwaway trees. The CLI
// is spawned for real: an import would test a module, not the gate CI runs.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isolatedEnv } from "../test-support/isolated-env";

const SCRIPT = path.resolve(__dirname, "..", "test-ratio.mjs");

type Verdict = {
  pass: boolean;
  absolute: boolean;
  carriesTests: boolean | null;
  noRegression: boolean | null;
  codeAdded?: number;
  testsAdded?: number;
  testsRequiredForNewCode?: number;
};
type Report = {
  code: number;
  unit: number;
  e2e: number;
  tests: number;
  ratio: number | null;
  min: number;
  target: number;
  shortfall: number;
  files: { code: number; unit: number; e2e: number };
  base: null | { code: number; tests: number; ratio: number | null };
  verdict: Verdict;
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "ratio-fixture-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function put(rel: string, content: string) {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

// N non-blank lines, with blank lines interleaved so the blank rule is always
// exercised, not just in the test that names it.
function lines(n: number) {
  return Array.from({ length: n }, (_, i) => `const x${i} = ${i};\n\n`).join("");
}

function run(...args: string[]) {
  const result = spawnSync("node", [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: isolatedEnv(),
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function report(...args: string[]): Report {
  const { stdout } = run("--json", ...args);
  return JSON.parse(stdout) as Report;
}

function git(...args: string[]) {
  execFileSync("git", ["-C", root, ...args], { stdio: "pipe", env: isolatedEnv() });
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

describe("what counts as code", () => {
  it("counts .ts and .tsx under src", () => {
    put("src/lib/a.ts", lines(4));
    put("src/components/B/B.tsx", lines(6));
    expect(report().code).toBe(10);
  });

  it("counts src/content as code, because copy ships to users", () => {
    put("src/content/pricing.ts", lines(7));
    expect(report().code).toBe(7);
  });

  it("skips index.ts barrels at any depth", () => {
    put("src/components/B/index.ts", lines(3));
    put("src/index.ts", lines(3));
    put("src/components/B/B.tsx", lines(2));
    expect(report().code).toBe(2);
  });

  it("does not skip files that merely contain 'index' in their name", () => {
    put("src/lib/indexer.ts", lines(5));
    put("src/lib/index.tsx", lines(2));
    expect(report().code).toBe(7);
  });

  it("skips .d.ts declarations", () => {
    put("src/types/global.d.ts", lines(9));
    put("src/lib/a.ts", lines(1));
    expect(report().code).toBe(1);
  });

  it("ignores stylesheets, markdown, json and plain js", () => {
    put("src/styles/a.scss", lines(50));
    put("src/content/legal/policy.md", lines(50));
    put("src/content/manifest.json", "{}\n");
    put("src/lib/legacy.js", lines(50));
    put("src/lib/a.ts", lines(1));
    expect(report().code).toBe(1);
  });

  it("ignores anything outside src and e2e", () => {
    put("scripts/tool.ts", lines(40));
    put("next.config.ts", lines(40));
    put("src/lib/a.ts", lines(2));
    expect(report()).toMatchObject({ code: 2, tests: 0 });
  });
});

describe("what counts as a test", () => {
  it("counts files under __tests__ as unit tests", () => {
    put("src/lib/__tests__/a.test.ts", lines(5));
    put("src/lib/__tests__/helpers.ts", lines(2));
    expect(report()).toMatchObject({ unit: 7, code: 0 });
  });

  it("counts co-located .test.ts and .test.tsx files as unit tests", () => {
    put("src/lib/a.test.ts", lines(3));
    put("src/components/B/B.test.tsx", lines(4));
    expect(report().unit).toBe(7);
  });

  it("counts every .ts file under e2e, fixtures and helpers included", () => {
    put("e2e/home.spec.ts", lines(10));
    put("e2e/fixtures/index.ts", lines(5));
    expect(report().e2e).toBe(15);
  });

  it("does not count e2e snapshots or reports", () => {
    put("e2e/home.spec.ts-snapshots/a.png", "binary");
    put("e2e/README.md", lines(20));
    put("e2e/home.spec.ts", lines(1));
    expect(report().e2e).toBe(1);
  });

  it("never counts a test file as code", () => {
    put("src/lib/__tests__/index.ts", lines(3));
    expect(report()).toMatchObject({ code: 0, unit: 3 });
  });
});

describe("line counting", () => {
  it("drops blank and whitespace-only lines on both sides", () => {
    put("src/lib/a.ts", "a\n\n   \n\t\nb\n");
    put("src/lib/__tests__/a.test.ts", "\n\n\nx\n   \n");
    expect(report()).toMatchObject({ code: 2, unit: 1 });
  });

  it("counts CRLF files the same as LF files", () => {
    put("src/lib/a.ts", "a\r\nb\r\n\r\nc\r\n");
    expect(report().code).toBe(3);
  });

  it("counts a last line with no trailing newline", () => {
    put("src/lib/a.ts", "a\nb");
    expect(report().code).toBe(2);
  });

  it("counts comment lines, which are not blank", () => {
    put("src/lib/a.ts", "// one\n/* two */\n");
    expect(report().code).toBe(2);
  });
});

describe("paths that must be skipped", () => {
  it("skips macOS Finder duplicates with ' 2.' in the name", () => {
    put("src/lib/a 2.ts", lines(30));
    put("src/lib/__tests__/a.test 2.ts", lines(30));
    put("e2e/home.spec 2.ts", lines(30));
    expect(report()).toMatchObject({ code: 0, tests: 0 });
  });

  it("skips node_modules, .next and dot-directories inside src", () => {
    put("src/node_modules/pkg/a.ts", lines(10));
    put("src/.next/a.ts", lines(10));
    put("src/.cache/a.ts", lines(10));
    put("src/lib/a.ts", lines(1));
    expect(report().code).toBe(1);
  });

  it("reports file counts alongside line counts", () => {
    put("src/lib/a.ts", lines(1));
    put("src/lib/b.ts", lines(1));
    put("src/lib/__tests__/a.test.ts", lines(1));
    put("e2e/a.spec.ts", lines(1));
    expect(report().files).toEqual({ code: 2, unit: 1, e2e: 1 });
  });
});

describe("the absolute rule, without --base", () => {
  it("passes at exactly 3:1", () => {
    put("src/lib/a.ts", lines(10));
    put("src/lib/__tests__/a.test.ts", lines(20));
    put("e2e/a.spec.ts", lines(10));
    const r = report();
    expect(r).toMatchObject({ ratio: 3, target: 30, shortfall: 0 });
    expect(r.verdict.pass).toBe(true);
    expect(run().status).toBe(0);
  });

  it("fails one line short of 3:1 and names the shortfall", () => {
    put("src/lib/a.ts", lines(10));
    put("src/lib/__tests__/a.test.ts", lines(29));
    const r = report();
    expect(r.verdict.pass).toBe(false);
    expect(r.shortfall).toBe(1);
    const { status, stdout } = run();
    expect(status).toBe(1);
    expect(stdout).toContain("FAIL: 1 more test lines needed to reach 3:1.");
  });

  it("rounds the target up so a fractional line is never forgiven", () => {
    put("src/lib/a.ts", lines(7)); // 7 x 3 = 21
    put("src/lib/__tests__/a.test.ts", lines(20));
    expect(report()).toMatchObject({ target: 21, shortfall: 1 });
  });

  it("honours --min", () => {
    put("src/lib/a.ts", lines(10));
    put("src/lib/__tests__/a.test.ts", lines(15));
    expect(run("--min", "1.5").status).toBe(0);
    expect(run("--min", "1.6").status).toBe(1);
  });

  it("passes a tree with no code, whose ratio is undefined", () => {
    put("src/lib/__tests__/a.test.ts", lines(3));
    const r = report();
    expect(r.ratio).toBeNull();
    expect(r.verdict.pass).toBe(true);
  });

  it("prints a readable table by default", () => {
    put("src/lib/a.ts", lines(2));
    put("src/lib/__tests__/a.test.ts", lines(6));
    const { stdout } = run();
    for (const label of ["Code", "Unit tests", "E2E tests", "Tests total", "Ratio", "Shortfall"]) {
      expect(stdout).toContain(label);
    }
    expect(stdout.trim().endsWith("PASS")).toBe(true);
  });
});

describe("argument handling", () => {
  it.each([
    [["--min", "0"], "--min must be a positive number."],
    [["--min", "-1"], "--min must be a positive number."],
    [["--min", "abc"], "--min must be a positive number."],
    [["--wat"], "Unknown argument: --wat"],
    [["--base", ""], "--base needs a git ref."],
  ])("rejects %j with exit 2", (args, message) => {
    const { status, stderr } = run(...args);
    expect(status).toBe(2);
    expect(stderr.trim()).toBe(message);
  });

  it("exits 2 when the base ref does not exist", () => {
    git("init", "-q");
    put("src/lib/a.ts", lines(1));
    commitAll("start");
    const { status } = run("--base", "no-such-ref");
    expect(status).toBe(2);
  });
});

describe("the ratchet, with --base", () => {
  beforeEach(() => {
    git("init", "-q");
    // Base: 100 code, 100 tests. Ratio 1.0, far below 3.
    put("src/lib/a.ts", lines(100));
    put("src/lib/__tests__/a.test.ts", lines(100));
    commitAll("base");
    git("tag", "base");
  });

  it("passes an unchanged tree even though it is below 3:1", () => {
    const r = report("--base", "base");
    expect(r.verdict).toMatchObject({
      pass: true,
      absolute: false,
      carriesTests: true,
      noRegression: true,
    });
    expect(run("--base", "base").stdout).toContain("PASS (ratchet: below 3:1, not regressing)");
  });

  it("passes new code that carries exactly three times its lines in tests", () => {
    put("src/lib/b.ts", lines(10));
    put("src/lib/__tests__/b.test.ts", lines(30));
    const r = report("--base", "base");
    expect(r.verdict).toMatchObject({
      pass: true,
      carriesTests: true,
      codeAdded: 10,
      testsAdded: 30,
      testsRequiredForNewCode: 30,
    });
  });

  it("fails new code that is one test line short", () => {
    put("src/lib/b.ts", lines(10));
    put("src/lib/__tests__/b.test.ts", lines(29));
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("new code needs 30 test lines, 29 were added");
  });

  it("fails new code with no tests at all", () => {
    put("src/lib/b.ts", lines(1));
    expect(report("--base", "base").verdict).toMatchObject({ pass: false, carriesTests: false });
  });

  it("fails when tests are deleted without code, because the ratio falls", () => {
    put("src/lib/__tests__/a.test.ts", lines(90));
    const { status, stdout } = run("--base", "base");
    expect(status).toBe(1);
    expect(stdout).toContain("ratio fell from 1 to 0.9");
  });

  it("passes deleting code alone, which raises the ratio", () => {
    put("src/lib/a.ts", lines(50));
    expect(report("--base", "base").verdict).toMatchObject({ pass: true, codeAdded: -50 });
  });

  it("fails deleting code and more than its share of tests", () => {
    put("src/lib/a.ts", lines(50));
    put("src/lib/__tests__/a.test.ts", lines(40));
    expect(report("--base", "base").verdict).toMatchObject({
      pass: false,
      carriesTests: true,
      noRegression: false,
    });
  });

  it("reports both failures at once when both rules break", () => {
    put("src/lib/b.ts", lines(10));
    put("src/lib/__tests__/a.test.ts", lines(50));
    const { stdout } = run("--base", "base");
    expect(stdout).toMatch(/new code needs 30 test lines, -50 were added; ratio fell from 1 to/);
  });

  it("stops applying the ratchet once the tree reaches 3:1", () => {
    // Deletes most tests but the tree is still at 3:1 absolute, so it passes.
    put("src/lib/a.ts", lines(10));
    put("src/lib/__tests__/a.test.ts", lines(30));
    const r = report("--base", "base");
    expect(r.verdict).toMatchObject({ pass: true, absolute: true });
  });

  it("measures the committed base, not the working tree", () => {
    put("src/lib/a.ts", lines(1000));
    const r = report("--base", "base");
    expect(r.base).toMatchObject({ code: 100, tests: 100 });
  });

  it("leaves the working tree and index untouched", () => {
    put("src/lib/b.ts", lines(3));
    git("add", "src/lib/b.ts");
    run("--base", "base");
    const status = execFileSync("git", ["-C", root, "status", "--porcelain"], {
      encoding: "utf8",
      env: isolatedEnv(),
    });
    expect(status.trim()).toBe("A  src/lib/b.ts");
  });

  it("ignores Finder duplicates on the base side too", () => {
    put("src/lib/c 2.ts", lines(500));
    commitAll("duplicate committed by mistake");
    git("tag", "dup");
    expect(report("--base", "dup").base).toMatchObject({ code: 100 });
  });
});
