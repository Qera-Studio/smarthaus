/**
 * Writes the seed as NDJSON for `sanity dataset import`. Run under Jest, which
 * already compiles the schema's TypeScript:
 *
 *   pnpm sanity:seed            # writes sanity/seed/out/seed.ndjson
 *   pnpm exec sanity dataset import sanity/seed/out/seed.ndjson ci --replace
 *
 * Production was seeded once, on 2026-11-11. After that the Studio is the
 * source of truth for production, and this seed is only the ci dataset and the
 * unit tests' content: re-importing it into production would overwrite every
 * edit made since.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BLOG_SEED, SEED, SOLUTION_SEED } from ".";
import { toDocument } from "./to-documents";

it("writes the seed as NDJSON", () => {
  const out = path.join(__dirname, "out");
  mkdirSync(out, { recursive: true });
  const docs = SEED.map(toDocument);
  writeFileSync(
    path.join(out, "seed.ndjson"),
    `${docs.map((d) => JSON.stringify(d)).join("\n")}\n`,
  );
  expect(docs).toHaveLength(SEED.length);
});

// The blog's documents alone, for the one import production has had since it
// was seeded (2026-11-14): new documents only, and without --replace, so no
// document that already exists there can be touched.
//
//   pnpm exec sanity dataset import sanity/seed/out/blog.ndjson production
it("writes the blog's documents on their own", () => {
  const out = path.join(__dirname, "out");
  mkdirSync(out, { recursive: true });
  const docs = BLOG_SEED.map(toDocument);
  writeFileSync(
    path.join(out, "blog.ndjson"),
    `${docs.map((d) => JSON.stringify(d)).join("\n")}\n`,
  );
  expect(docs.every((d) => d._type === "post" || d._type === "blogPage")).toBe(true);
});

it("writes the solution pages on their own", () => {
  const out = path.join(__dirname, "out");
  mkdirSync(out, { recursive: true });
  const docs = SOLUTION_SEED.map(toDocument);
  writeFileSync(
    path.join(out, "solutions.ndjson"),
    `${docs.map((d) => JSON.stringify(d)).join("\n")}\n`,
  );
  expect(docs.length).toBeGreaterThan(0);
  expect(docs.every((d) => d._type === "solutionPage")).toBe(true);
});
