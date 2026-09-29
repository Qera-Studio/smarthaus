import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// Coverage is judged by scripts/coverage-gate.mjs, not by coverageThreshold:
// a fixed global threshold would be red on every PR until the backlog is paid,
// and the gate also holds each touched file to its own bar. See AGENTS.md
// "Testing policy".
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // The key must match next/jest's own CSS Modules key character for character.
  // Jest takes the first mapper whose pattern matches, next/jest's comes first,
  // and a different key would sit behind it and never run. Same key, same slot,
  // our value. src/__tests__/strict-style-proxy.test.ts fails if this drifts.
  moduleNameMapper: {
    "^.+\\.module\\.(css|sass|scss)$": "<rootDir>/__mocks__/strictStyleProxy.js",
  },
  // " 2." is macOS Finder's duplicate suffix. A copied test would otherwise run
  // twice and count twice.
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/e2e/",
    "<rootDir>/coverage/",
    // Fixtures that deliberately fail; scripts/__tests__/console-guard.test.ts
    // runs them one at a time in a child process.
    "/guard-fixtures/",
    " 2\\.",
  ],
  // Keep in step with isCoverable() in scripts/coverage-gate.mjs; the gate
  // fails loudly on a touched file that is missing from the report.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/index.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/content/**",
    "!**/* 2.*",
  ],
  coverageReporters: ["json-summary", "lcov", "text-summary"],
};

export default createJestConfig(config);
