import "@testing-library/jest-dom";

// jsdom has no Element.scrollTo; every browser this site supports does.
// HardwareStage scrolls its tab strip on every slide change, mount included,
// so any test that renders it would throw without this. A no-op, not a fake:
// a test that cares what was scrolled replaces it with its own spy. Suites
// that run in the node environment have no Element at all, hence the first
// check.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = function scrollTo() {};
}

// Console guard. A React warning in a test is a bug in the component or the
// test: an act() warning, a key warning, a hydration mismatch, a prop on the
// wrong element. Each fails the test that caused it instead of scrolling past.
//
// A test that expects a log says so, and asserts on it:
//   const spy = jest.spyOn(console, "error").mockImplementation(() => {});
//   ...
//   expect(spy).toHaveBeenCalledWith(...);
// A spy installed by the test replaces the guard for that test only.

type Level = "error" | "warn";
const LEVELS: Level[] = ["error", "warn"];
const originals = new Map<Level, (...args: unknown[]) => void>();
let captured: string[] = [];

beforeEach(() => {
  captured = [];
  for (const level of LEVELS) {
    originals.set(level, console[level]);
    console[level] = (...args: unknown[]) => {
      captured.push(`console.${level}: ${args.map(String).join(" ")}`);
    };
  }
});

afterEach(() => {
  const leaked = captured;
  captured = [];
  for (const level of LEVELS) {
    const original = originals.get(level);
    if (original) console[level] = original;
  }
  if (leaked.length > 0) {
    throw new Error(
      `Unexpected console output. Fix the cause, or spy on console and assert on it:\n${leaked.join("\n")}`,
    );
  }
});

// Content. Pages and components read Sanity through getDoc, which Jest cannot
// reach (next-sanity is ESM, and a unit test must not depend on the network).
// Every suite gets the seed instead: the same content the ci dataset holds,
// in the shape getDoc returns. src/sanity/__tests__/fetch.test.ts unmocks it.
jest.mock("./src/sanity/fetch", () => {
  const { seedDoc } = jest.requireActual("./sanity/seed");
  return { getDoc: jest.fn(async (id: string) => seedDoc(id)) };
});

// The Studio's click-to-edit overlay, mounted by the root layout in draft
// mode only. ESM that Jest cannot load; e2e/preview.spec.ts covers the real one.
jest.mock("next-sanity/visual-editing", () => ({ VisualEditing: () => null }));
