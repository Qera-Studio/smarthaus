import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Full jsx-a11y recommended rules (eslint-config-next only ships a subset).
    // Plugin is already registered by eslint-config-next, so only spread rules.
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    // Specs take `test` from e2e/fixtures.ts, which switches the hero's villa
    // off unless a spec opts in. Importing it from @playwright/test skips that.
    files: ["e2e/**/*.ts"],
    ignores: ["e2e/fixtures.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              importNames: ["test"],
              message: "Import test from ./fixtures, which carries the suite-wide defaults.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    // Vendored and generated assets. public/draco/ is Google's Draco decoder,
    // shipped byte for byte; linting it reports six errors nobody may fix.
    "public/**",
    // The standards submodule is documentation, read-only from this repo.
    "qera-system/**",
    // macOS Finder duplicates ("name 2.ts"). Never code; see .gitignore.
    "**/* [2-9].*",
  ]),
]);

export default eslintConfig;
