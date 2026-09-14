import { existsSync } from "node:fs";
import { join } from "node:path";

import { POSTER, POSTER_SIZE } from "../frames";

describe("the hero poster", () => {
  // The same contract the scene manifest has: a missing asset fails the test
  // run, never the browser. This one matters more than most — it is the LCP
  // element and the fallback for every device the canvas does not run on.
  it("exists on disk", () => {
    expect(existsSync(join(process.cwd(), "public", POSTER))).toBe(true);
  });

  it("states its intrinsic size, so the box is reserved before it loads", () => {
    expect(POSTER_SIZE.width).toBeGreaterThan(0);
    expect(POSTER_SIZE.height).toBeGreaterThan(0);
  });
});

describe("the villa model", () => {
  it("exists on disk", () => {
    expect(existsSync(join(process.cwd(), "public", "hero", "villa.glb"))).toBe(true);
  });
});
