// Proves jest.config.ts routes CSS Modules to the strict proxy rather than to
// next/jest's permissive default. If this fails, a misspelt class name in a
// component renders silently in every unit test.
import styles from "@/components/Button/Button.module.scss";

describe("CSS Modules in unit tests", () => {
  it("returns the requested key as the class name", () => {
    expect(styles.button).toBe("button");
  });

  it("returns keys with dashes and digits", () => {
    expect((styles as Record<string, string>)["h-2"]).toBe("h-2");
  });

  it.each(["bad key", "2col", "-lead", "with.dot", ""])("throws on %j", (key) => {
    expect(() => (styles as Record<string, string>)[key]).toThrow(`Invalid CSS Module key: ${key}`);
  });

  it("does not pretend to be an ES module default or a thenable", () => {
    const loose = styles as unknown as Record<string | symbol, unknown>;
    expect(loose.__esModule).toBeUndefined();
    expect(loose[Symbol.iterator]).toBeUndefined();
  });
});
