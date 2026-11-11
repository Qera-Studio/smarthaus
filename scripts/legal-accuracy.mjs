#!/usr/bin/env node
// The privacy policy's accuracy gate, run before every build.
//
// The policy is written in Sanity, so a test in the repo can no longer read it.
// This reads the published policy from the dataset the build uses and fails
// the build when it no longer matches what the site actually does:
//
//   1. every processor the code installs is named in the "in use" table;
//   2. no processor in the "planned" table is installed yet;
//   3. the promises the policy makes about Clarity and Google Analytics are
//      still there, word for word, while either is wired in.
//
// A failure blocks the deploy until the policy is corrected in the Studio (or
// the code is). That is the point: the policy must never fall behind the code.
//
// Usage: node scripts/legal-accuracy.mjs [--root <dir>]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** What the site sends data to, and the evidence in the code that it does. */
export const PROCESSORS = [
  { name: "Vercel Inc.", evidence: () => true },
  { name: "Resend", evidence: ({ dep }) => dep("resend") },
  {
    name: "Vercel Web Analytics and Speed Insights",
    evidence: ({ dep }) => dep("@vercel/analytics") || dep("@vercel/speed-insights"),
  },
  { name: "Google (Analytics 4)", evidence: ({ file }) => file("src/lib/ga4.ts") },
  { name: "Microsoft (Clarity)", evidence: ({ file }) => file("src/lib/clarity.ts") },
  { name: "Sanity", evidence: ({ dep }) => dep("sanity") },
  {
    name: "Cloudflare Turnstile",
    evidence: ({ text }) => text("next.config.ts").includes("challenges.cloudflare.com"),
  },
];

/** Sentences the policy promises while a tool is wired in. */
export const PROMISES = [
  {
    while: "Microsoft (Clarity)",
    says: "Microsoft Clarity runs without cookies until you choose.",
  },
  {
    while: "Microsoft (Clarity)",
    says: "Anything you type into a form is masked and never recorded.",
  },
  { while: "Google (Analytics 4)", says: "Google Analytics runs only if you accept analytics." },
];

export function evidenceFor(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    dep: (name) => Object.hasOwn(deps, name),
    file: (rel) => existsSync(path.join(root, rel)),
    text: (rel) => {
      const full = path.join(root, rel);
      return existsSync(full) ? readFileSync(full, "utf8") : "";
    },
  };
}

function nodesOf(doc) {
  return [...(doc.intro?.en ?? []), ...(doc.sections ?? []).flatMap((s) => s.body?.en ?? [])];
}

/** All the policy's running text, one space between words. */
export function plainText(doc) {
  return nodesOf(doc)
    .flatMap((n) => [
      ...(n.children ?? []).map((c) => c.text ?? ""),
      ...(n.rows ?? []).flatMap((r) => r.cells ?? []),
    ])
    .join(" ")
    .replace(/\s+/g, " ");
}

function rowNames(doc, role) {
  return nodesOf(doc)
    .filter((n) => n._type === "legalTable" && n.role === role)
    .flatMap((n) => (n.rows ?? []).map((r) => r.cells?.[0] ?? ""));
}

/** The problems with a published policy, as sentences. Empty means it holds. */
export function problems(doc, evidence) {
  if (!doc) return ["No published privacy policy (legal-privacy) in this dataset."];
  const active = rowNames(doc, "processorsActive");
  const planned = rowNames(doc, "processorsPlanned");
  if (active.length === 0) {
    return ['The privacy policy has no table marked "processorsActive".'];
  }
  const out = [];
  const installed = PROCESSORS.filter((p) => p.evidence(evidence));
  for (const p of installed) {
    if (!active.some((name) => name.includes(p.name))) {
      out.push(`${p.name} is in use, but the policy's "in use" table does not name it.`);
    }
    if (planned.some((name) => name.includes(p.name))) {
      out.push(`${p.name} is in use, but the policy still lists it as planned.`);
    }
  }
  const text = plainText(doc);
  for (const promise of PROMISES) {
    if (installed.some((p) => p.name === promise.while) && !text.includes(promise.says)) {
      out.push(`${promise.while} is wired in, but the policy no longer says: "${promise.says}"`);
    }
  }
  return out;
}

async function fetchPolicy() {
  const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "nqc5m5ls";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const query = encodeURIComponent('*[_id == "legal-privacy"][0]');
  const url = `https://${project}.api.sanity.io/v2026-11-01/data/query/${dataset}?query=${query}&perspective=published`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity answered ${res.status} for the privacy policy`);
  return (await res.json()).result;
}

async function main() {
  const at = process.argv.indexOf("--root");
  const root = at >= 0 ? path.resolve(process.argv[at + 1]) : process.cwd();
  const found = problems(await fetchPolicy(), evidenceFor(root));
  if (found.length > 0) {
    console.error("The privacy policy does not match the code:");
    for (const p of found) console.error(`  - ${p}`);
    console.error("Correct it in the Studio (Legal > Privacy Policy), then build again.");
    process.exit(1);
  }
  console.log("Privacy policy matches the code.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
