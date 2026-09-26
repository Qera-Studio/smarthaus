# Vercel Firewall: the shared rate limit

The enquiry actions rate-limit sends in code (`src/lib/rate-limit.ts`: five per client per ten minutes). That limiter lives in each server instance's memory, so with several warm instances the real ceiling is several times higher. Security System §11 says as much. This firewall rule is the ceiling every instance shares. It is set by hand in the Vercel dashboard, once.

## The rule

In Vercel, open the project, then **Firewall**, then **Configure**, then **Add New Rule**.

- **Name:** `Throttle form posts`
- **If:** `Method` `equals` `POST`
- **Then:** `Rate Limit`, fixed window, `60` seconds, `20` requests, keyed on `IP Address`, action `Deny`.

Every POST on this site is an enquiry send (server actions post to the page they are on, `/` and `/contact`) or a CSP report to `/api/csp-report`. None of those legitimately exceeds twenty a minute from one address. GET requests, meaning every page view, are untouched.

Publish the rule, then note the date in `docs/launch-gate/blocked-on-input.md` against the firewall row and delete that row.

## What the in-code limiter relies on

The in-code limiter keys on the first address in `x-forwarded-for`. That is safe only because Vercel sets that header itself, from the connection, rather than passing through whatever the client sent. Vercel documents this under request headers. If the site ever moves off Vercel, or behind another proxy, re-check it before trusting the header: a host that passes the client's own header through lets anyone choose their bucket.

The e2e suite exploits the opposite. Its server is `next start` on loopback, which does pass the header through, so each test presents its own address (`e2e/fixtures.ts`).

## Checking it works

After publishing, from one machine:

```sh
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://smarthaus.ae/api/csp-report -H 'content-type: application/csp-report' -d '{"csp-report":{}}'; done
```

The first twenty answer `204` or `429` (the in-code limiter), and the rest are refused by the firewall. The Firewall tab's traffic view shows the denied requests.
