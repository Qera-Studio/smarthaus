# Deploy and roll back

Production is Vercel, deployed from `main`. `latest` is the staging branch: every phase merges there first, and `main` is updated from it.

## Deploy

1. Merge the pull request into `latest`. The ruleset requires every CI check green and the branch up to date, so there is nothing to run by hand.
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

## What a rollback does not undo

- **Environment variables.** They are not part of the build. If the fault was a variable, fix the variable.
- **Emails already sent.** Leads that arrived stay in the mailbox.
- **Consent records.** They live in each visitor's cookie. A rollback to a build with an older `CONSENT_VERSION` re-asks everyone who agreed to the newer one; see `consent-version-bump.md`.
