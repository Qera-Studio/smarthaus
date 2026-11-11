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
import { SEED } from ".";
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
