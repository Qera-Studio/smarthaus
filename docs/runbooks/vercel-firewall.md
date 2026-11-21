# Vercel Firewall: the shared rate limit

The enquiry actions rate-limit sends in code (`src/lib/rate-limit.ts`: five per client per ten minutes). That limiter lives in each server instance's memory, so with several warm instances the real ceiling is several times higher. Security System §11 says as much. This firewall rule is the ceiling every instance shares. It is set by hand in the Vercel dashboard, once.

## The rule

In Vercel, open the project, then **Firewall**, then **Configure**, then **Add New Rule**.

- **Name:** `Throttle form posts`
- **If:** `Method` `equals` `POST`, and `Request Path` `does not start with` `/api/`
- **Then:** `Rate Limit`, fixed window, `60` seconds, `20` requests, keyed on `IP Address`, action `Deny`.

Every POST outside `/api/` is an enquiry send: server actions post to the page they are on, `/` and `/contact`. None legitimately exceeds twenty a minute from one address. GET requests, meaning every page view, are untouched.

**Why `/api/` is left out** (2026-11-21). Safari sends a CSP report as one POST per violation (`report-uri`), and the strict Report-Only twin reports every inline style and script: 34 POSTs on one homepage load. Under the rule as first published, which caught every POST, a Safari visitor passed twenty on their first page and their enquiry was refused for the rest of that minute (measured on smarthaus.ae: 20 reports answered `204`, 14 refused). `/api/csp-report` keeps its own limits in code: a per-address limiter, a 16KB cap and a schema check. Sanity's publish webhook (`/api/revalidate`) is also outside the rule, and refuses any call without its signature, so a bulk publish is no longer throttled.

Publish the rule, then note the date in `docs/launch-gate/blocked-on-input.md` against the firewall row and delete that row.

## AI crawlers: the edge must agree with robots.txt

`robots.txt` allows every crawler, AI training crawlers included (`src/app/robots.ts`, decided 2026-09-28). A firewall that blocks what robots.txt allows is a config that lies: answer engines are refused at the edge and no SEO tool shows it. In **Firewall**, check that no managed rule or bot-protection setting blocks AI crawlers, search crawlers or Googlebot.

## What the in-code limiter relies on

The in-code limiter keys on the first address in `x-forwarded-for`. That is safe only because Vercel sets that header itself, from the connection, rather than passing through whatever the client sent. Vercel documents this under request headers. If the site ever moves off Vercel, or behind another proxy, re-check it before trusting the header: a host that passes the client's own header through lets anyone choose their bucket.

The e2e suite exploits the opposite. Its server is `next start` on loopback, which does pass the header through, so each test presents its own address (`e2e/fixtures.ts`).

## Checking it works

After publishing, from one machine:

```sh
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://smarthaus.ae/contact -H 'content-type: text/plain' -d 'x'; done | sort | uniq -c
```

With no action header no server action runs and nothing is sent: the first twenty answer `405`, and the rest are refused by the firewall with `403`. The Firewall tab's traffic view shows the denied requests. Then load the homepage in Safari (or Playwright's WebKit) and check that every POST to `/api/csp-report` answers `204`, none `403`.

Published and checked on 2026-11-20: twenty `204`s from `/api/csp-report`, then `403` from the firewall. Narrowed to leave out `/api/` and checked on 2026-11-21: twenty `405`s from `/contact`, then five `403`s; two WebKit homepage loads in a row, 68 reports, every one `204`.
