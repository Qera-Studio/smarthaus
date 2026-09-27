# A lead did not arrive

The enquiry email is the system of record: there is no database. When a send fails the lead is **not stored anywhere**. The visitor sees the failed message with the WhatsApp link, so the lead may be on WhatsApp instead.

## How it shows

- A visitor says they sent the form and heard nothing, or the WhatsApp number receives "the form did not work".
- The Vercel runtime logs carry `[contact] delivery failed`, followed by the error. The error carries Resend's own name for the failure, for example `monthly_quota_exceeded` or `validation_error`.
- At start-up: `{"event":"config-invalid", ...}`, naming a missing variable.

A refusal by the send limit (five per visitor per ten minutes) is not a delivery failure and is not logged as one. That visitor saw "Several enquiries have come from here" and can message on WhatsApp.

## What to check, in order

1. **The variables.** `RESEND_API_KEY`, `LEAD_EMAIL`, `LEAD_FROM_EMAIL` in Vercel, Production scope. A missing one logs `config-invalid` at every start-up. After fixing, redeploy.
2. **The Resend dashboard, Logs.** Each send attempt is listed with its status. A rejection says why.
3. **The quota.** The account ran out on 2026-09-26, when the e2e suite still sent real email. The suite now writes to a local sink and sends one real email per CI run (the `delivery` job), so CI cannot exhaust it again, but a plan limit can still be reached.
4. **The sending domain.** `LEAD_FROM_EMAIL` must be on a domain verified in Resend, with SPF and DKIM in DNS. An unverified domain is a `validation_error`.
5. **The mailbox.** A send Resend accepted and the mailbox never showed is a spam filter or a forwarding rule, not the site.

## After it is fixed

- Send one real enquiry from the production site and confirm it arrives.
- Ask whoever reads the WhatsApp number to check for messages from the outage window: those are the leads the form could not deliver.
- Record it in `docs/launch-gate/catch-log.md`.
