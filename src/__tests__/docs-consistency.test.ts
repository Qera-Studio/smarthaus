/**
 * @jest-environment node
 */

/**
 * The docs cannot drift from the repo or from qera-system unnoticed.
 *
 * Found when this was written (2026-09-27): three scripts documented that did
 * not exist, an import table whose examples were not files, AGENTS.md citing
 * an Engineering System "Part A/C/E" that has no parts, images at Performance
 * §3 (fonts) and spacing at Design §7 (motion). Each check below is one of
 * those classes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const tracked = (...globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((file) => file && !file.startsWith("qera-system/") && existsSync(join(ROOT, file)));

const DOCS = tracked("README.md", "AGENTS.md", "CLAUDE.md", "docs/*.md", "docs/**/*.md");

const SYSTEMS: Record<string, string> = {
  Legal: "qera-system/systems/1-legal-system.md",
  Security: "qera-system/systems/2-security-system.md",
  Accessibility: "qera-system/systems/3-accessibility-system.md",
  Engineering: "qera-system/systems/4-engineering-system.md",
  Performance: "qera-system/systems/5-performance-system.md",
  SEO: "qera-system/systems/6-seo-system.md",
  Design: "qera-system/systems/7-design-system.md",
};

/** Section numbers a qera-system document actually has: "## 12a — ..." or "## 9. ...". */
function sectionsOf(path: string): Set<string> {
  return new Set([...read(path).matchAll(/^## (\w+)(?: —|\.)/gm)].map((m) => m[1]!));
}

const REPO_ROOTS = /^(src|e2e|scripts|docs|public|\.github|qera-system)\//;

describe("paths the docs name", () => {
  it.each(DOCS)("%s names only files and folders that exist", (doc) => {
    const missing: string[] = [];
    read(doc)
      .split("\n")
      .forEach((line, index) => {
        const refs = [
          ...[...line.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]!).filter((p) => REPO_ROOTS.test(p)),
          ...[...line.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)].map((m) => m[1]!),
        ];
        for (const ref of refs) {
          // Globs, templates and placeholders name a pattern, not a file.
          if (/[*{<$]/.test(ref)) continue;
          const path = ref.split(":")[0]!.replace(/[.,]$/, "");
          const base = REPO_ROOTS.test(path) ? ROOT : join(ROOT, dirname(doc));
          if (!existsSync(join(base, path))) missing.push(`${doc}:${index + 1} ${path}`);
        }
      });
    expect(missing).toEqual([]);
  });
});

describe("the runbooks", () => {
  const runbooks = tracked("docs/runbooks/*.md");

  it("exist", () => {
    expect(runbooks.length).toBeGreaterThanOrEqual(7);
  });

  it.each(runbooks)("%s is linked from the README's runbook table", (runbook) => {
    expect(read("README.md")).toContain(`](${runbook})`);
  });

  it.each(runbooks)("%s has one title and no em dash", (runbook) => {
    const text = read(runbook);
    expect(text.match(/^# /gm)).toHaveLength(1);
    expect(text).not.toContain("—");
  });
});

describe("citations of qera-system sections", () => {
  it("every row of AGENTS.md's Where-to-look table cites sections its document has", () => {
    const table = read("AGENTS.md").split("## Where to look")[1]!.split("\n---")[0]!;
    const rows = table.split("\n").filter((line) => line.includes("`qera-system/"));
    expect(rows.length).toBeGreaterThanOrEqual(9);
    const wrong: string[] = [];
    for (const row of rows) {
      const doc = row.match(/`(qera-system\/[^`]+\.md)`/)![1]!;
      const have = sectionsOf(doc);
      const cells = row.split("|");
      const cited = cells[3]!;
      if (/\bPart [A-Z]\b/.test(cited)) wrong.push(`${doc}: cites a Part, and it has none`);
      for (const [, first, last] of cited.matchAll(/§(\w+)(?:-(\w+))?/g)) {
        for (const section of [first!, last].filter(Boolean) as string[]) {
          if (!have.has(section)) wrong.push(`${doc}: no §${section}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("every 'X System §N' in the docs and the code names a section that exists", () => {
    const files = tracked("*.md", "*.ts", "*.tsx", "*.mjs", "*.scss");
    const pattern =
      /\b(Legal|Security|Accessibility|Engineering|Performance|SEO|Design) System(?:'s)?,? §(\w+)/g;
    const sections = Object.fromEntries(
      Object.entries(SYSTEMS).map(([name, path]) => [name, sectionsOf(path)]),
    );
    const wrong: string[] = [];
    for (const file of files) {
      read(file)
        .split("\n")
        .forEach((line, index) => {
          for (const [, system, section] of line.matchAll(pattern)) {
            if (!sections[system!]!.has(section!)) {
              wrong.push(`${file}:${index + 1} ${system} System §${section}`);
            }
          }
        });
    }
    expect(wrong).toEqual([]);
  });

  it("reads real section numbers, so the checks above are not vacuous", () => {
    expect(sectionsOf(SYSTEMS.Security!)).toContain("8");
    expect(sectionsOf(SYSTEMS.Design!)).toContain("12a");
    expect(sectionsOf("qera-system/implementations/design-system-architecture.md")).toContain("9");
  });
});

describe("numbers the project docs state", () => {
  it("do not restate values the owned-facts register owns", () => {
    // Point, never restate (CLAUDE.md). Each is a register row.
    const restated = [/30\s*[–-]\s*40\s*%/, /<\s*40\s*KB/i, /LCP\s*[≤<]/, /INP\s*[≤<]\s*\d/];
    for (const doc of ["CLAUDE.md", "AGENTS.md"]) {
      for (const value of restated)
        expect({ doc, match: read(doc).match(value)?.[0] }).toEqual({ doc, match: undefined });
    }
  });

  it("state the JS budget that lighthouserc.json enforces", () => {
    const lhci = JSON.parse(read("lighthouserc.json"));
    const bytes = lhci.ci.assert.assertions["resource-summary:script:size"][1].maxNumericValue;
    expect(read("CLAUDE.md")).toContain(`≤ ${bytes / 1024}KB uncompressed`);
  });

  it("state the TBT budget that lighthouserc.json enforces", () => {
    const lhci = JSON.parse(read("lighthouserc.json"));
    const ms = lhci.ci.assert.assertions["total-blocking-time"][1].maxNumericValue;
    expect(read("CLAUDE.md")).toContain(`TBT < ${ms}ms`);
  });

  it("state the Playwright worker counts the config sets", () => {
    const [, ci, local] = read("playwright.config.ts").match(/workers: CI \? (\d+) : (\d+)/)!;
    const words = ["zero", "one", "two", "three", "four", "five"];
    expect(read("AGENTS.md")).toContain(
      `Workers are fixed at ${words[Number(local)]} locally and ${words[Number(ci)]} in CI`,
    );
  });
});

describe("the branch flow the docs describe", () => {
  it.each(["CLAUDE.md", "AGENTS.md"])("%s cuts feature branches from latest, not main", (doc) => {
    expect(read(doc)).not.toMatch(/`feature\/\*`[^.\n]*off `main`/);
    expect(read(doc)).toMatch(/`feature\/\*`[^.\n]*off `latest`/);
  });
});
