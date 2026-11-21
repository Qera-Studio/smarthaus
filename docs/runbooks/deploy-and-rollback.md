# Deploy and roll back

Production is Vercel, deployed from `main`. `latest` is the staging branch and `version/2.0.0` holds everything not yet live: it merges into `latest` first, and `main` is updated from `latest`.

## Deploy

1. Merge the pull request from `version/2.0.0` into `latest`. The ruleset requires every CI check green and the branch up to date, so there is nothing to run by hand.
2. Open a pull request from `latest` into `main`, wait for the same checks, and merge it. Vercel builds and promotes the `main` build to production.
3. Run the Kill List (`qera-system/gates/launch-gate.md`) against the production URL.
4. Watch the runtime logs for ten minutes (Vercel project, then **Logs**). Two lines matter:
   - `{"event":"config-invalid", ...}` at start-up means a production variable is missing. It names the variable, never the value. Fix it in **Settings, Environment Variables** and redeploy: a change to a variable only reaches a new deployment.
   - `[contact] delivery failed` means a lead did not arrive. See `lead-delivery-failure.md`.

## Roll back

Rolling back is for when production is broken now. Fix forward when it can wait for a normal pull request.

1. Vercel project, then **Deployments**. Find the last production deployment that worked.
2. Open its menu and choose **Instant Rollback** (or `vercel rollback <deployment-url>` from the CLI). It swaps the production domain to that build without rebuilding, so it takes seconds.
3. Check the site, then the enquiry form: send one real enquiry and confirm it reaches the lead mailbox.
4. After a rollback Vercel stops assigning new `main` builds to production until you promote one. Fix the fault on a branch, merge through `latest` and `main` as normal, then promote that build (**Promote to Production**, or `vercel promote <deployment-url>`).

Record what happened in `docs/launch-gate/catch-log.md`: the date, what broke, which deployment was restored, and what fixed it.

Drilled on 2026-11-20: rolled back to the previous production deployment and undone (project **Overview**, then **Undo Rollback**; the Deployments list has no undo). On Hobby the only target is the deployment just before the current one; Pro can go further back.

## What a rollback does not undo

- **Content.** It lives in Sanity, not in the build. Restore it from a backup (below).
- **Environment variables.** They are not part of the build. If the fault was a variable, fix the variable.
- **Emails already sent.** Leads that arrived stay in the mailbox.
- **Consent records.** They live in each visitor's cookie. A rollback to a build with an older `CONSENT_VERSION` re-asks everyone who agreed to the newer one; see `consent-version-bump.md`.

## Restore the content from a backup

Backups are exports of the production dataset, kept outside the repo in `../smarthaus-backups/`. The Sanity CLI needs Node 22.12 or later.

1. **Back up first:** `pnpm exec sanity dataset export production ../smarthaus-backups/sanity-production-<date>.tar.gz`.
2. **Restore:** `pnpm exec sanity dataset import ../smarthaus-backups/<file>.tar.gz production --replace`. Only on Shivanshu's yes. It puts every document the backup holds back to its backed-up version and leaves any document created since then alone: an import never deletes.
3. **Check:** every document in the backup's `data.ndjson` matches the dataset once its `_rev`, `_createdAt` and `_updatedAt` are set aside, and its `_sanityAsset` strings are read as the asset references they become. For pictures, each backup file is the original (its SHA-1 is the asset id), but Sanity's CDN serves JPEGs re-encoded, so compare the CDN's bytes with another dataset's CDN bytes, never with the backup file.

Tested on 2026-11-20: the backup of 2026-11-19 restored into `ci`, with all 26 documents identical and all 50 pictures served exactly as production serves them; `ci` was re-seeded after it.
