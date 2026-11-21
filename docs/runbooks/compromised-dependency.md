# A package we use was just compromised

Security System §12 asks for this decision to be made before it is needed: this class of incident gives hours, not days.

## Standing controls

- **Install scripts do not run.** pnpm runs none except the allowlist in `pnpm-workspace.yaml`, which has one entry that builds (`@parcel/watcher`).
- **Three-day cooldown.** `minimumReleaseAge: 4320` means no install resolves a release younger than three days, and Dependabot waits the same (`.github/dependabot.yml`).
- **Lockfile everywhere.** Every CI job installs with `--frozen-lockfile`.
- **Shipped tree audited.** CI's `static` job fails on any high or critical advisory in production dependencies.
- **Secrets are narrow.** Only the `delivery` CI job holds the Resend key; no job holds a deploy or publish token.

## When a compromise is announced

1. **Is it in the tree?** `pnpm why <package>` locally, and search `pnpm-lock.yaml` for the package name. Check the exact compromised versions against the lockfile, not against `package.json` ranges.
2. **If it is not, stop.** Note the check and the date in the catch log.
3. **If it is:**
   - Pin a known-good version with `pnpm.overrides` in `package.json`, reinstall, and open a PR. CI proves the build.
   - Assume every credential on any machine that installed the bad version is exposed: rotate the Resend API key (Resend dashboard, then the GitHub secret and the Vercel environment variable), GitHub tokens, and anything else on that machine.
   - If the bad version ran in CI, rotate the repository secrets and review the Actions logs for the affected runs.
4. **Tell the client** if any credential that touches their data or their inbox was exposed. Legal System's breach clocks apply if personal data was reachable.

## Known advisories in the dev-only tree (2026-11-21)

`pnpm audit` reports 20. Eighteen come through `@lhci/cli` 0.15.1 (Lighthouse CI), which runs only in CI's `lighthouse` job and never ships to a visitor: one critical (`proxy-addr`, inside the Express server it starts only for a static directory, which this project does not use: `startServerCommand` in `lighthouserc.json`), seven high (`tmp`, `extract-zip` twice, `basic-ftp`, `compression`, `zod`, `body-parser`), nine moderate and one low. The other two are moderate: `glob` under Jest, and `minimatch` under Sanity, the one `pnpm audit --prod` reports, below CI's `--audit-level high`. The Lighthouse job holds no secrets, which bounds what a compromised tool there could reach.

Decided 2026-11-21 (Shivanshu): wait for Lighthouse CI rather than override them. Its 0.16.1 (published 2026-11-11) drops `tmp` and lifts Express, `compression`, `uuid` and `proxy-agent`, but brings Lighthouse 13 in place of 12.6, which moves what the gate measures, so it is a 2.1.0 upgrade with a re-baseline (`docs/updates/2.1.0.md`).
