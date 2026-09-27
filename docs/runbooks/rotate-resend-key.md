# Rotate the Resend API key

Rotate when the key may have been exposed (pasted into a chat, a log, a screenshot, a commit), when someone with access leaves, or once a year. The key only sends email, but a leaked key can send email as the Smarthaus domain and spend the quota.

Never paste the key into a terminal command that is logged, a chat, an issue or a commit. Every step below enters it into a form or a prompt.

## Steps

1. **Resend, API Keys, Create API Key.** Permission: **Sending access**, restricted to the sending domain. Name it with the date, for example `smarthaus-production-2026-09`. Copy it once; Resend does not show it again.
2. **Vercel, Settings, Environment Variables.** Edit `RESEND_API_KEY` for Production and paste the new key. Save.
3. **Redeploy production.** A variable reaches only new deployments: Deployments, the current production build, **Redeploy**.
4. **GitHub.** The CI `delivery` job sends one real email per run with its own copy: `gh secret set RESEND_API_KEY` and paste at the prompt, or Settings, Secrets and variables, Actions.
5. **Check.** Send one enquiry from production and confirm it arrives. Re-run the latest CI run's `delivery` job and confirm it passes.
6. **Resend, API Keys.** Delete the old key. Only now: deleting it first leaves production unable to send between steps 1 and 3.

## If the old key was exposed

Delete it in Resend first, even though production cannot send until step 3 lands. The form shows the WhatsApp fallback while it cannot send, so a few minutes of failed sends lose no leads, while a live leaked key can.
