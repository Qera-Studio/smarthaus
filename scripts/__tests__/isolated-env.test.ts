/**
 * @jest-environment node
 */
// Regression for 2026-09-26: run from a pre-push hook, the gate tests' fixture
// git commands inherited the hook's GIT_DIR and wrote into the real repository,
// including core.bare=true in its shared config. See
// scripts/test-support/isolated-env.ts.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isolatedEnv } from "../test-support/isolated-env";

const HERE = __dirname;

describe("isolatedEnv", () => {
  const saved = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  });

  it("drops every GIT_ variable", () => {
    process.env["GIT_DIR"] = "/somewhere/.git";
    process.env["GIT_WORK_TREE"] = "/somewhere";
    process.env["GIT_INDEX_FILE"] = "/somewhere/.git/index";
    process.env["GIT_PREFIX"] = "sub/";
    const env = isolatedEnv();
    expect(Object.keys(env).filter((k) => k.startsWith("GIT_"))).toEqual([]);
  });

  it("keeps everything else, including PATH and HOME", () => {
    process.env["SOMETHING_ELSE"] = "kept";
    const env = isolatedEnv();
    expect(env["SOMETHING_ELSE"]).toBe("kept");
    expect(env["PATH"]).toBe(process.env["PATH"]);
  });

  it("does not mutate process.env", () => {
    process.env["GIT_DIR"] = "/somewhere/.git";
    isolatedEnv();
    expect(process.env["GIT_DIR"]).toBe("/somewhere/.git");
  });

  it("keeps a fixture's git commands out of a repo named by an inherited GIT_DIR", () => {
    const decoy = mkdtempSync(path.join(tmpdir(), "decoy-"));
    const fixture = mkdtempSync(path.join(tmpdir(), "fixture-"));
    try {
      const clean = isolatedEnv();
      execFileSync("git", ["-C", decoy, "init", "-q"], { env: clean });
      const configBefore = readFileSync(path.join(decoy, ".git", "config"), "utf8");

      // What a hook exports.
      process.env["GIT_DIR"] = path.join(decoy, ".git");

      const env = isolatedEnv();
      const git = (...args: string[]) =>
        execFileSync("git", ["-C", fixture, ...args], { env, stdio: "pipe" });
      git("init", "-q");
      writeFileSync(path.join(fixture, "a.txt"), "a\n");
      git("add", "-A");
      git(
        "-c",
        "user.name=f",
        "-c",
        "user.email=f@example.invalid",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-q",
        "--no-verify",
        "-m",
        "fixture",
      );
      git("tag", "base");

      // The fixture got the commit and the tag...
      expect(
        execFileSync("git", ["-C", fixture, "log", "--format=%s"], {
          env,
          encoding: "utf8",
        }).trim(),
      ).toBe("fixture");
      // ...and the decoy got nothing: no commits, no tags, config unchanged.
      const decoyRefs = execFileSync("git", ["-C", decoy, "for-each-ref"], {
        env: isolatedEnv(),
        encoding: "utf8",
      });
      expect(decoyRefs.trim()).toBe("");
      expect(readFileSync(path.join(decoy, ".git", "config"), "utf8")).toBe(configBefore);
      expect(configBefore).not.toMatch(/bare = true/);
    } finally {
      delete process.env["GIT_DIR"];
      rmSync(decoy, { recursive: true, force: true });
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});

describe("every gate test spawns with the isolated environment", () => {
  const files = readdirSync(HERE).filter(
    (f) => f.endsWith(".test.ts") && f !== "isolated-env.test.ts",
  );

  it.each(files)("%s passes env: isolatedEnv() to every spawn", (file) => {
    const source = readFileSync(path.join(HERE, file), "utf8");
    // Each spawnSync/execFileSync call, up to its closing parenthesis on the
    // same statement. Crude, but these files are small and uniform.
    const calls = [...source.matchAll(/(spawnSync|execFileSync)\(([\s\S]*?)\);/g)];
    for (const [call] of calls) {
      expect(call).toContain("isolatedEnv(");
    }
  });
});
