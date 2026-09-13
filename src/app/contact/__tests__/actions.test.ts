/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A "use server" module may export only async functions. Exporting anything
 * else — a const, an object — is not a type error, not a lint error, and not a
 * build error: it throws when the module is first evaluated, at which point
 * EVERY action call returns a 500 with a digest and no message.
 *
 * That cost an afternoon once. This is the cheap guard so it cannot come back
 * silently: it reads the file rather than importing it, because importing a
 * "use server" module under Jest does not reproduce the runtime's check.
 */

const actionsSource = readFileSync(join(__dirname, "..", "actions.ts"), "utf8");

describe("the contact action module", () => {
  it("is a server module", () => {
    expect(actionsSource.trimStart()).toMatch(/^["']use server["'];/);
  });

  it("exports only async functions and types", () => {
    // Every `export` that is not `export async function` or `export type`.
    // A hit here means: move it to ./state.ts.
    const offending = [
      ...actionsSource.matchAll(/^export\s+(?!async\s+function|type\s)(.*)$/gm),
    ].map((match) => match[1]);

    expect(offending).toEqual([]);
  });
});
