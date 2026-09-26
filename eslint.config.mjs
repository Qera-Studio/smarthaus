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
