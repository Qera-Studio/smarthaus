import "@testing-library/jest-dom";

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
