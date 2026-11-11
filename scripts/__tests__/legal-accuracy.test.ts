/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PROCESSORS, PROMISES, evidenceFor, plainText, problems } from "../legal-accuracy.mjs";
import { LEGAL } from "../../sanity/seed/legal";

/**
 * The privacy policy's accuracy gate. It runs before every build against the
 * published policy; here it runs against the seed (the policy as published on
 * 2026-11-11) and against a temporary repo, so each rule is proven both ways.
 */

type Evidence = {
  dep: (n: string) => boolean;
  file: (p: string) => boolean;
  text: (p: string) => string;
};

/** The seed in the shape the Content Lake returns: bodies as { en }. */
const published = (doc = LEGAL.privacy) => ({
  ...doc,
  intro: { en: doc.intro ?? [] },
  sections: doc.sections.map((s) => ({ ...s, body: { en: s.body } })),
});

const evidence = (installed: string[] = [], files: string[] = [], config = ""): Evidence => ({
  dep: (n) => installed.includes(n),
  file: (p) => files.includes(p),
  text: () => config,
});

const today: Evidence = evidence(
  ["resend", "@vercel/analytics", "@vercel/speed-insights", "sanity"],
  ["src/lib/ga4.ts", "src/lib/clarity.ts"],
);

describe("the privacy policy as published", () => {
  it("matches what the code does today", () => {
    expect(problems(published(), today)).toEqual([]);
  });

  it("holds against this repo, as the build will check it", () => {
    expect(problems(published(), evidenceFor(process.cwd()))).toEqual([]);
  });

  it("names every processor in a table the gate can read", () => {
    const text = plainText(published());
    for (const { name } of PROCESSORS) expect(text).toContain(name);
  });
});

describe("the rules", () => {
  it("fails when there is no policy at all", () => {
    expect(problems(undefined, today)).toEqual([
      "No published privacy policy (legal-privacy) in this dataset.",
    ]);
  });

  it("fails when no table is marked as the processors in use", () => {
    const doc = published();
    const unmarked = JSON.parse(JSON.stringify(doc).replace(/"processorsActive"/g, '"x"'));
    expect(problems(unmarked, today)).toEqual([
      'The privacy policy has no table marked "processorsActive".',
    ]);
  });

  it("fails when a processor the code installs is not in the in-use table", () => {
    const doc = JSON.parse(JSON.stringify(published()).replace('"Sanity"', '"Someone else"'));
    expect(problems(doc, today)).toEqual([
      'Sanity is in use, but the policy\'s "in use" table does not name it.',
    ]);
  });

  it("fails when an installed processor is still listed as planned", () => {
    const withTurnstile = evidence(
      ["resend", "@vercel/analytics", "sanity"],
      ["src/lib/ga4.ts", "src/lib/clarity.ts"],
      "frame-src https://challenges.cloudflare.com",
    );
    expect(problems(published(), withTurnstile)).toEqual([
      'Cloudflare Turnstile is in use, but the policy\'s "in use" table does not name it.',
      "Cloudflare Turnstile is in use, but the policy still lists it as planned.",
    ]);
  });

  it.each(PROMISES.map((p: { while: string; says: string }) => [p.while, p.says]))(
    "fails when %s is wired in and the policy drops %p",
    (_tool, says) => {
      const doc = JSON.parse(JSON.stringify(published()).split(says).join("Something else."));
      expect(problems(doc, today)).toEqual([expect.stringContaining(says)]);
    },
  );

  it("asks nothing of a tool's promises once the tool is gone", () => {
    const doc = JSON.parse(
      JSON.stringify(published())
        .split("Google Analytics runs only if you accept analytics.")
        .join(""),
    );
    const withoutGa = evidence(["resend", "@vercel/analytics", "sanity"], ["src/lib/clarity.ts"]);
    expect(problems(doc, withoutGa)).toEqual([]);
  });
});

describe("evidenceFor, reading a repo", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "legal-accuracy-"));
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { resend: "1" }, devDependencies: { sanity: "6" } }),
    );
    mkdirSync(path.join(root, "src/lib"), { recursive: true });
    writeFileSync(path.join(root, "src/lib/clarity.ts"), "");
    writeFileSync(path.join(root, "next.config.ts"), "challenges.cloudflare.com");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("sees dependencies of both kinds, files, and file text", () => {
    const ev = evidenceFor(root);
    expect(ev.dep("resend")).toBe(true);
    expect(ev.dep("sanity")).toBe(true);
    expect(ev.dep("three")).toBe(false);
    expect(ev.file("src/lib/clarity.ts")).toBe(true);
    expect(ev.file("src/lib/ga4.ts")).toBe(false);
    expect(ev.text("next.config.ts")).toBe("challenges.cloudflare.com");
    expect(ev.text("missing.ts")).toBe("");
  });

  it("reads a package.json with no dependency lists at all", () => {
    writeFileSync(path.join(root, "package.json"), "{}");
    expect(evidenceFor(root).dep("resend")).toBe(false);
  });
});

describe("plainText", () => {
  it("reads spans and table cells, one space between words", () => {
    const doc = {
      sections: [
        {
          body: {
            en: [{ children: [{ text: "One\n two" }, {}] }, { rows: [{ cells: ["A", "B"] }, {}] }],
          },
        },
        {},
      ],
    };
    expect(plainText(doc)).toBe("One two A B");
  });
});
