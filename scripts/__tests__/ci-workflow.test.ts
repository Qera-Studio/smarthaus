/**
 * @jest-environment node
 */
// The gate guards itself. Branch protection names these jobs as required
// checks, so a renamed or deleted job silently stops being enforced: GitHub
// waits forever for a check that never reports, and an admin clicks through.
// These tests fail first. Read as text on purpose: no YAML dependency, and the
// assertions are about what is written, which is what GitHub runs.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const workflow = read(".github/workflows/ci.yml");
const prePush = read(".husky/pre-push");
const preCommit = read(".husky/pre-commit");
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
const playwright = read("playwright.config.ts");

// Everything under `jobs:` split into one block per job id.
function jobs(): Map<string, string> {
  const body = workflow.slice(workflow.indexOf("\njobs:\n") + 7);
  const out = new Map<string, string>();
  const re = /^ {2}([a-z0-9-]+):\n/gm;
  const starts = [...body.matchAll(re)];
  starts.forEach((m, i) => {
    const end = i + 1 < starts.length ? starts[i + 1]!.index : body.length;
    out.set(m[1]!, body.slice(m.index, end));
  });
  return out;
}

const JOBS = jobs();
const job = (id: string) => {
  const block = JOBS.get(id);
  if (!block) throw new Error(`job ${id} missing from ci.yml`);
  return block;
};

// The required checks, as GitHub will display them. AGENTS.md lists the same.
const REQUIRED_CHECKS = [
  "static",
  "unit",
  "e2e (Desktop Chrome)",
  "e2e (iPhone 14)",
  "e2e (Pixel 7)",
  "e2e-extra",
  "lighthouse",
];

describe("triggers", () => {
  it("runs on pull requests into latest and main", () => {
    expect(workflow).toMatch(/pull_request:\n\s+branches: \[latest, main\]/);
  });

  it("runs on pushes to latest and main", () => {
    expect(workflow).toMatch(/push:\n\s+branches: \[latest, main\]/);
  });

  it("holds only read access to the repository", () => {
    expect(workflow).toMatch(/permissions:\n\s+contents: read/);
    expect(workflow).not.toMatch(/contents: write|pull-requests: write/);
  });
});

describe("the required checks exist under the names branch protection uses", () => {
  it("has exactly the five jobs", () => {
    expect([...JOBS.keys()].sort()).toEqual(["e2e", "e2e-extra", "lighthouse", "static", "unit"]);
  });

  it.each(["static", "unit", "e2e-extra", "lighthouse"])("names job %s after itself", (id) => {
    expect(job(id)).toContain(`name: ${id}\n`);
  });

  it("names each e2e matrix leg after its project", () => {
    expect(job("e2e")).toContain("name: e2e (${{ matrix.project }})");
  });

  it("lists every required check in AGENTS.md", () => {
    const agents = read("AGENTS.md");
    for (const check of REQUIRED_CHECKS) expect(agents).toContain(`\`${check}\``);
  });
});

describe("nothing in the gate can be quietly skipped", () => {
  it("never continues on error", () => {
    expect(workflow).not.toContain("continue-on-error");
  });

  it("swallows a failure only in the summary step, which reports and never gates", () => {
    const swallowed = workflow.split("\n").filter((line) => line.includes("|| true"));
    expect(swallowed).toHaveLength(1);
    const summary = job("unit").slice(job("unit").indexOf("name: Ratio summary"));
    expect(summary.split("\n- ")[0]).toContain("|| true");
  });

  it("never skips a job with an always-false condition", () => {
    expect(workflow).not.toMatch(/if:\s*(false|\$\{\{\s*false\s*\}\})/);
  });

  it("keeps e2e legs independent so one failing device does not hide the others", () => {
    expect(job("e2e")).toContain("fail-fast: false");
  });

  it("installs from the lockfile in every job", () => {
    for (const id of JOBS.keys()) expect(job(id)).toContain("pnpm install --frozen-lockfile");
  });
});

describe("static", () => {
  it.each(["pnpm lint", "pnpm typecheck", "pnpm build", "node scripts/assert-layer-order.mjs"])(
    "runs %s",
    (cmd) => {
      expect(job("static")).toContain(cmd);
    },
  );

  it("asserts layer order after the build, not before", () => {
    const s = job("static");
    expect(s.indexOf("pnpm build")).toBeLessThan(s.indexOf("assert-layer-order"));
  });
});

describe("unit", () => {
  it("fetches full history so the base commit exists", () => {
    expect(job("unit")).toContain("fetch-depth: 0");
  });

  it("runs Jest with coverage, then the coverage gate, then the ratio", () => {
    const u = job("unit");
    const order = ["pnpm test:coverage", "scripts/coverage-gate.mjs", "scripts/test-ratio.mjs"].map(
      (c) => u.indexOf(c),
    );
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("compares pull requests against their target branch", () => {
    expect(job("unit")).toContain('echo "ref=origin/${{ github.base_ref }}"');
  });

  it("compares pushes against the previous commit, and treats a new branch as having no base", () => {
    const u = job("unit");
    expect(u).toContain("github.event.before");
    expect(u).toContain("0000000000000000000000000000000000000000");
  });

  it("passes the base to both gates", () => {
    const u = job("unit");
    expect(u).toContain('coverage-gate.mjs --base "${{ steps.base.outputs.ref }}"');
    expect(u).toContain('test-ratio.mjs --base "${{ steps.base.outputs.ref }}"');
  });
});

describe("e2e", () => {
  function projectNames() {
    return [...playwright.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
  }

  it("covers every device project in playwright.config.ts, and only those", () => {
    const devices = projectNames().filter((n) => n !== "forced-colors" && n !== "zoom-200");
    expect(job("e2e")).toContain(`project: [${devices.map((d) => `"${d}"`).join(", ")}]`);
  });

  it("runs the two extra projects in e2e-extra", () => {
    expect(projectNames()).toEqual(expect.arrayContaining(["forced-colors", "zoom-200"]));
    expect(job("e2e-extra")).toContain("--project forced-colors --project zoom-200");
  });

  it.each(["RESEND_API_KEY", "LEAD_EMAIL", "LEAD_FROM_EMAIL"])("passes the %s secret", (name) => {
    expect(job("e2e")).toContain(`${name}: \${{ secrets.${name} }}`);
  });

  it("installs WebKit, which the iPhone project needs", () => {
    expect(job("e2e")).toContain("playwright install --with-deps chromium webkit");
  });

  it("uploads the report and traces when a leg fails", () => {
    expect(job("e2e")).toContain("if: failure()");
    expect(job("e2e")).toContain("playwright-report/");
  });

  it("sets CI so Playwright forbids .only and retries flaky infrastructure", () => {
    expect(job("e2e")).toContain('CI: "true"');
    expect(playwright).toContain("forbidOnly: CI");
  });
});

describe("lighthouse", () => {
  it("builds before auditing, because lhci starts the built server", () => {
    const l = job("lighthouse");
    expect(l.indexOf("pnpm build")).toBeGreaterThan(0);
    expect(l.indexOf("pnpm build")).toBeLessThan(l.indexOf("pnpm test:lhci"));
  });
});

describe("every command the workflow calls exists", () => {
  it.each(["lint", "typecheck", "build", "test:coverage", "test:lhci"])(
    "package.json has %s",
    (name) => {
      expect(pkg.scripts[name]).toBeTruthy();
    },
  );

  it.each(["test-ratio.mjs", "coverage-gate.mjs", "assert-layer-order.mjs"])(
    "scripts/%s exists",
    (file) => {
      expect(existsSync(path.join(ROOT, "scripts", file))).toBe(true);
    },
  );

  it("generates Next's route types before type-checking, so a fresh clone passes", () => {
    // PageProps and LayoutProps are globals Next writes into .next/types. CI
    // clones have no .next; without typegen, tsc failed there and passed
    // locally on a stale build (first CI run, 2026-09-26).
    expect(pkg.scripts["typecheck"]).toBe("next typegen && tsc --noEmit");
  });

  it("pre-commit type-checks through the same script", () => {
    const staged = (
      JSON.parse(read("package.json")) as { "lint-staged": Record<string, string[]> }
    )["lint-staged"];
    expect(staged["*.{ts,tsx}"]).toEqual(["bash -c 'pnpm typecheck'"]);
  });

  it("measures coverage with the reporter the gate reads", () => {
    expect(read("jest.config.ts")).toContain('"json-summary"');
  });

  it("keeps a coverage baseline for the floor", () => {
    const baseline = JSON.parse(read("coverage-baseline.json"));
    for (const metric of ["lines", "statements", "functions", "branches"]) {
      expect(typeof baseline[metric]).toBe("number");
    }
  });
});

describe("local hooks", () => {
  it("pre-push runs the fast half of the gate against the base", () => {
    for (const cmd of [
      "pnpm typecheck",
      "pnpm test:coverage",
      'coverage-gate.mjs --base "$BASE"',
      'test-ratio.mjs --base "$BASE"',
    ]) {
      expect(prePush).toContain(cmd);
    }
  });

  it("pre-push stops at the first failure", () => {
    expect(prePush).toMatch(/^set -e$/m);
  });

  it("pre-push is executable, or git ignores it", () => {
    expect(statSync(path.join(ROOT, ".husky/pre-push")).mode & 0o111).not.toBe(0);
  });

  it("pre-commit still runs lint-staged", () => {
    expect(preCommit.trim()).toBe("pnpm lint-staged");
  });
});

describe("dependency monitoring", () => {
  const dependabot = read(".github/dependabot.yml");

  it("watches npm and GitHub Actions", () => {
    expect(dependabot).toContain("package-ecosystem: npm");
    expect(dependabot).toContain("package-ecosystem: github-actions");
  });

  it("opens its PRs against latest, so they pass the gate before main", () => {
    expect(dependabot.match(/target-branch: latest/g)).toHaveLength(2);
  });
});
