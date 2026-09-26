#!/usr/bin/env node
// Blocking check, run after `next build`. Architecture spec §3.3.
//
// A cascade layer's precedence is fixed by where its name FIRST appears across
// every stylesheet the browser has seen. Next splits CSS per route, and a route
// that calls notFound() ships no <link> tags at all: React inserts the page's
// own chunk first. If that chunk opens with `@layer components {`, components
// outranks reset on that one route. It shipped once (the 404 on a 32-inch
// monitor). So every chunk must carry the full order statement on its own.
//
// The expected order is read from src/styles/_variables.scss, the one place it
// is written. Nothing here restates it.
//
// Usage: node scripts/assert-layer-order.mjs [--root <dir>] [--css-dir <dir>]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function expectedOrder(scss) {
  // The statement form only (`@layer a, b;`), never a block (`@layer a {`).
  const match = scss.match(/^@layer\s+([^;{]+);/m);
  if (!match) throw new Error("No @layer order statement found in _variables.scss.");
  return match[1].split(",").map((name) => name.trim());
}

// Layer names in order of first appearance, from statements and blocks alike.
// Comments are stripped first: a commented-out @layer must not count.
export function firstAppearance(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const seen = [];
  for (const m of clean.matchAll(/@layer\s+([^;{]+)[;{]/g)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim();
      if (name && !seen.includes(name)) seen.push(name);
    }
  }
  return seen;
}

// A chunk passes when it declares no layers at all (plain CSS, e.g. a font
// face), or when its first-appearance order begins with the full expected list.
export function checkChunk(css, expected) {
  const seen = firstAppearance(css);
  if (seen.length === 0) return null;
  const head = seen.slice(0, expected.length);
  if (head.join(",") === expected.join(",")) return null;
  return `expected ${expected.join(" < ")}, found ${seen.join(" < ")}`;
}

function cssFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

function parseArgs(argv) {
  const out = { root: process.cwd(), cssDir: ".next/static" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") out.root = path.resolve(argv[(i += 1)] ?? "");
    else if (arg === "--css-dir") out.cssDir = argv[(i += 1)] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const variables = path.join(args.root, "src/styles/_variables.scss");
  const expected = expectedOrder(readFileSync(variables, "utf8"));
  const dir = path.resolve(args.root, args.cssDir);
  if (!existsSync(dir)) throw new Error(`No build output at ${dir}. Run \`pnpm build\` first.`);
  const files = cssFiles(dir).filter((f) => !/ [2-9]\./.test(f));
  if (files.length === 0) throw new Error(`No CSS files under ${dir}.`);

  const failures = [];
  for (const file of files) {
    const problem = checkChunk(readFileSync(file, "utf8"), expected);
    if (problem) failures.push(`${path.relative(args.root, file)}: ${problem}`);
  }
  if (failures.length > 0) {
    process.stdout.write(
      `Layer order FAIL in ${failures.length} of ${files.length} chunks:\n${failures.join("\n")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Layer order PASS: ${files.length} chunks, each ${expected.join(" < ")}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
