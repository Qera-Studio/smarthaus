<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Smarthaus Engineering Rules

> Project-specific engineering only. Everything the standards system already covers is deferred to `qera-system/`. This file owns what the system does not: the scene manifest, the media pipeline, hero interaction, SCSS constraints, project structure, third-party integration rules, and the claims/capability audit.
>
> Read `CLAUDE.md` first for who, what, and why. This file is how.

---

## Where to look

Before guessing a rule, check the owning document.

| Concern                                       | Document                                                    | Key sections                                                |
| --------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Legal, privacy, PDPL, breach clocks           | `qera-system/systems/1-legal-system.md`                     | §6 (consent/cookies), §8 (breach)                           |
| Security headers, CSP, deps, SSRF             | `qera-system/systems/2-security-system.md`                  | §1 (auth), §5 (headers), §13 (deps)                         |
| WCAG conformance, contrast, motion, a11y      | `qera-system/systems/3-accessibility-system.md`             | §4 (contrast), §5 (keyboard), §7 (motion)                   |
| TypeScript, deps policy, AI code, testing     | `qera-system/systems/4-engineering-system.md`               | Part A (TS), Part C (deps), Part E (AI)                     |
| CWV, budgets, fonts, images, animation        | `qera-system/systems/5-performance-system.md`               | §0 (budgets), §1 (CWV), §3 (images)                         |
| Meta, schema, crawl, AEO/GEO, AI crawlers     | `qera-system/systems/6-seo-system.md`                       | §0a (AI crawlers), §2 (meta), §9 (schema), §18-19 (AEO/GEO) |
| Tokens, typography, spacing, dark patterns    | `qera-system/systems/7-design-system.md`                    | §12a (dark patterns), §7 (spacing)                          |
| Kill List (every deploy), Full Sweep (launch) | `qera-system/gates/launch-gate.md`                          | Kill List = 12 items, 2 minutes                             |
| Token architecture, layers, components, SCSS  | `qera-system/implementations/design-system-architecture.md` | §1 (layers), §2 (tokens), §10 (SCSS)                        |
| Thresholds that cross documents               | `qera-system/charter/owned-facts-register.md`               | Check before writing any number                             |

---

## Next.js 16 — read the docs, not your memory

**`node_modules/next/dist/docs/`** is the source of truth for framework APIs. This version has breaking changes from what models are trained on:

- `proxy` replaces `middleware` for request interception
- `PageProps` and `LayoutProps` are global type helpers — use them
- `params` and `searchParams` are async — `await` them
- `next lint` is removed — use `eslint .` directly
- Turbopack is the default dev bundler — no `sassOptions.includePaths` (use relative `@use` paths)

**Before writing any Next.js API call, route handler, or config change:** check the docs directory. Do not rely on training data.

---

## Scene manifest contract

The Blender pipeline exports `src/content/scene-manifest.json`. The site reads it at build time. Swapping placeholder renders for final renders requires **zero code changes** — only new asset files and an updated manifest.

### Schema

The hero has three phases: landing (static), approach (transition video), and explorer (interactive hub with service branches).

```
manifest = {
  landing: {
    still: { desktop: path, mobile: path },         // 110% oversized for parallax travel
    parallax: { x: number, y: number },             // max px shift (e.g. 25, 15)
  },
  approach: {
    clip: { desktop: path, mobile: path },         // zoom + rotate + peel video
    poster: { desktop: path, mobile: path },
  },
  explorer: {
    base: { desktop: path, mobile: path },         // dusk isometric still
    services: [
      {
        id: string,                                 // e.g. "garage"
        label: string,                              // tab label: "Garage"
        deviceId: string,                           // join key to Sanity CMS
        cameraMove: { desktop: path, mobile: path },// clip: isometric → service area
        demo: { desktop: path, mobile: path },      // clip: automation effect
        poster: { desktop: path, mobile: path },    // fallback still for this service
      },
    ],
  },
}
```

- All `path` values are relative to `public/hero/`
- Mobile renders are separate portrait compositions (4:5), never a CSS crop of desktop (16:9)
- `deviceId` is the join key to hotspot copy in Sanity CMS
- A service with `cameraMove` or `demo` set to `null` degrades to its `poster` still — this is how placeholders work during development

### Implementation

- **`src/lib/manifest.ts`** — Zod schema + typed loader. A malformed manifest fails the **build**, not the browser
- **`src/content/scene-manifest.json`** — the manifest file itself. Committed to git. Updated by the Blender Python export module
- **Asset directory:** `public/hero/landing/`, `public/hero/approach/`, `public/hero/explorer/{serviceId}/`

### Validation rules

The build must fail if:

- Any non-null `path` in the manifest does not resolve to a file in `public/`
- Any `service.id` is duplicated
- Any `service` is missing a `poster` (stills are never optional — they're the reduced-motion fallback)
- The manifest fails Zod parsing

---

## Hero interaction rules

### Phase 1 — Landing

Front-view villa on warm background with **mouse-driven parallax**. Heading, subtitle, two CTAs: "Book a site visit" (primary) and "Explore Villa" (secondary).

**Parallax effect:** The villa render is 110% of the display container. Container has `overflow: hidden`. On `mousemove`, a client component updates `--parallax-x` and `--parallax-y` custom properties (normalized -0.5 to 0.5). The image transforms: `translate(calc(var(--parallax-x) * -25px), calc(var(--parallax-y) * -15px))`. Subtle — enough to feel 3D, nothing more.

- Mouse handler throttled via `requestAnimationFrame` (no scroll listeners, no resize listeners)
- `prefers-reduced-motion` → parallax disabled, static centered image
- Mobile/touch devices → parallax disabled (no persistent cursor position). Optionally respond to `deviceorientation` API if available — same subtle range
- The image is the LCP element: server-rendered `<img>` with `fetchpriority="high"`, visible on first paint. No entrance animation that delays LCP

**Blender render spec for the landing still:**

- Front-facing villa, camera slightly elevated (~8° above horizontal)
- Render at **110% of display area** — desktop: 2112×1320 minimum (1920×1200 × 1.1); mobile portrait: 1188×1584 minimum (1080×1440 × 1.1)
- The extra 10% on each edge provides the parallax travel range
- PNG 16-bit for the conversion pipeline (→ AVIF primary + WebP fallback via `scripts/optimise-images.sh`)
- Warm afternoon lighting, palette consistent with brand (brown-100 bg tones, brown-400 bronze warmth in the light)

### Phase 2 — Approach

**Triggered by clicking "Explore Villa."** Not scroll-driven — scroll-scrubbing video stutters on mobile and inflates file size. The approach is a one-shot clip that plays smoothly on click.

During playback:

- Heading, subtitle, and CTAs fade out (CSS transition on a parent class toggle)
- Camera zooms into the villa, rotates, villa peels into cutaway
- On completion, the explorer (phase 3) is revealed

If the user scrolls past instead of clicking "Explore Villa," the hero scrolls away normally. The interactive experience is opt-in.

### Phase 3 — Isometric explorer

Dusk-lit floating cutaway. Everything goes dark to enhance automation visibility.

**Service tabs:** Vertical tab list on the right side. ARIA `role="tablist"` with `role="tab"` buttons. One tab per automation service (Garage, AC, Lighting, Security, Entertainment, Energy).

**On tab click:**

1. Camera-move clip plays: isometric view → service area
2. Demo clip plays: automation effect (garage door opening, AC activating, lights adjusting)
3. Service info panel appears with indexable text (device name, description) from Sanity via `deviceId`

**On scroll from explorer:** Exit the interactive section, continue to proof/credentials. No reverse animation — the section scrolls away naturally.

**Reversible actions** (gate open/close) need clips rendered in BOTH directions — video cannot reliably play backwards.

### Video element rules

All clips: `muted playsinline preload="none"` with a poster. Clips load on demand — `src` set only when the clip is about to play. AV1 primary via `<source type="video/av1">`, H.264 fallback.

### Adaptive loading

`prefers-reduced-motion`, `Save-Data` header, or slow connection (`navigator.connection.effectiveType === '2g' || '3g'`) → stills only, no clips, no camera moves. Service tabs still work: clicking a tab cross-fades to that service's poster still and shows the info panel. All meaning lives in HTML text.

### Accessibility

- The `<video>` elements are `aria-hidden="true"` (decorative media — see CLAUDE.md accessibility section)
- Service tabs are a real ARIA tablist — keyboard navigable with arrow keys, Enter/Space to activate
- Service info panels contain indexable, screen-reader-accessible text
- Poster frame `<img>` has descriptive `alt` text (visible to screen readers, used as reduced-motion fallback)
- `prefers-reduced-motion` path: landing still → static dusk isometric still → service poster stills. No clips play. All content still accessible via tabs

---

## Nav behaviour

| State                           | Desktop                                                 | Mobile                                       |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Hero landing (phase 1)          | Transparent top bar. Logo left, links center, CTA right | Transparent bottom bar. Logo + hamburger     |
| After scroll or "Explore Villa" | Shrinks to floating capsule, `position: sticky`, top    | Shrinks to floating capsule, stays at bottom |
| Inner pages                     | Solid floating capsule from the start, top              | Solid floating capsule, bottom               |

Capsule transition: CSS `translate`, `border-radius`, `padding` with `--duration-normal`. Triggered by IntersectionObserver sentinel at the bottom of hero phase 1. No scroll event listeners.

Mobile bottom nav must account for `env(safe-area-inset-bottom)` — iOS home indicator and Android gesture bar.

---

## Media pipeline

**Input:** Blender `.blend` scene
**Output:** Optimised assets in `public/hero/`

### Scripts (in `scripts/`)

| Script                       | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `scripts/render-export.sh`   | Wraps Blender CLI render → raw frames/clips           |
| `scripts/encode-video.sh`    | ffmpeg: raw → AV1 (`.mp4` container) + H.264 fallback |
| `scripts/optimise-images.sh` | Sharp: raw stills → AVIF primary + WebP fallback      |

### Asset naming

```
public/hero/landing/front.avif             — landing still, primary
public/hero/landing/front.webp             — landing still, fallback
public/hero/approach/approach.mp4          — approach clip, AV1
public/hero/approach/approach.h264.mp4     — approach clip, H.264 fallback
public/hero/approach/poster.avif           — approach poster frame
public/hero/explorer/base.avif             — dusk isometric base, primary
public/hero/explorer/base.webp             — dusk isometric base, fallback
public/hero/explorer/{serviceId}/move.mp4  — camera-move clip, AV1
public/hero/explorer/{serviceId}/demo.mp4  — automation demo clip, AV1
public/hero/explorer/{serviceId}/poster.avif — service fallback still
```

H.264 fallback and WebP fallback follow the same `{name}.h264.mp4` / `{name}.webp` pattern throughout.

### Codec targets

| Format        | Codec                  | Quality       | Max file size guidance                            |
| ------------- | ---------------------- | ------------- | ------------------------------------------------- |
| Video (AV1)   | libaom-av1 / libsvtav1 | CRF 30–35     | ~2MB per 5s clip                                  |
| Video (H.264) | libx264                | CRF 23–28     | ~3MB per 5s clip (fallback, larger is acceptable) |
| Still (AVIF)  | AVIF                   | quality 60–70 | ~150KB per hero-sized still                       |
| Still (WebP)  | WebP                   | quality 75–80 | ~250KB per hero-sized still                       |

---

## SCSS rules — Turbopack constraints

### No `sassOptions.includePaths`

Turbopack does not support `sassOptions.includePaths` or `sassOptions.additionalData`. All `@use` statements must use **relative paths**.

### Import depth table

| File location                                     | Import path for `_variables.scss`       |
| ------------------------------------------------- | --------------------------------------- |
| `src/styles/globals.scss`                         | `@use 'variables' as *`                 |
| `src/app/page.module.scss`                        | `@use '../styles/variables' as *`       |
| `src/app/about/page.module.scss`                  | `@use '../../styles/variables' as *`    |
| `src/components/Button/Button.module.scss`        | `@use '../../styles/variables' as *`    |
| `src/components/Hero/Chapter/Chapter.module.scss` | `@use '../../../styles/variables' as *` |

### No stale compiled CSS

`.gitignore` includes `*.module.css` and `*.module.css.map`. If you see compiled CSS files tracked by git or lingering in the working tree, delete them — they are Turbopack/webpack artefacts that can serve stale styles.

### SCSS conventions (project-level, on top of design-system architecture spec)

- All sizing, colour, spacing, and z-index values via tokens (`var(--token)` or SCSS variable) — no magic numbers
- No `var()` inside CSS shorthands (`font`, `background`, `border`, `transition`, `grid-area`) — use longhands. Substitution happens before parsing; one missing token silently invalidates the entire declaration
- Logical properties only — `padding-inline`, `margin-block`, `inline-size`, never `padding-left` or `width`. Enforced for Arabic RTL readiness
- No `!important` except in the reduced-motion reset (existing, to be revisited when token-based duration zeroing is implemented)
- No ID selectors. Max specificity: `0,3,0`
- Component styles: `@layer components { }`. Block styles: `@layer blocks { }`

---

## CSP and third-party domains

The current CSP in `next.config.ts` is `default-src 'self'` everywhere. As third parties are added, update the CSP **in the same PR that adds the dependency**. Never leave a CSP update for later — it will break in production.

### Planned CSP changes (update when implementing)

| Service               | CSP directive               | Domain(s)                      |
| --------------------- | --------------------------- | ------------------------------ |
| Sanity Studio         | `connect-src`, `img-src`    | `*.sanity.io`, `cdn.sanity.io` |
| Sanity image CDN      | `img-src`                   | `cdn.sanity.io`                |
| Vercel Analytics      | `connect-src`               | `vitals.vercel-insights.com`   |
| Vercel Speed Insights | `script-src`, `connect-src` | `va.vercel-scripts.com`        |

**Each addition must be checked against:**

1. Security System §5 (headers) — new origins expand the attack surface
2. Engineering System Part C (dependency policy) — is there a data flow? does it send PII?
3. Legal System §6 (consent, cookies & tracking) — does it set cookies? does it track users?

---

## Forms and lead capture

### Stack

Server Actions + Zod validation + honeypot field + Resend (email).

No database. Email to a dedicated mailbox (`leads@smarthaus.ae` or equivalent) is the system of record. Gmail doesn't lose emails. If structured reporting is needed later, a Zapier/Make trigger on that mailbox writes to Google Sheets — no code, no deploy, no dependency in the site.

**When to add a database:** The client gets a CRM, lead volume exceeds what email can handle (hundreds/month), or they need structured querying that email search can't do. Not before.

### Spam protection

**V1: honeypot field only.** A hidden form field that real users never see — bots fill it, and the Server Action rejects any submission where it's populated. Zero dependencies, zero JS required, zero CSP changes.

**V2 (when needed): Cloudflare Turnstile.** Added when spam volume exceeds what the honeypot catches. Requires `challenges.cloudflare.com` in `script-src` and `frame-src` CSP directives, a site key, and a secret key. Turnstile requires JS — when added, the honeypot remains as the no-JS fallback.

### What happens on submit

1. Zod validates the payload server-side
2. Honeypot field checked (reject if filled)
3. Resend sends the lead as a formatted email to the designated mailbox
4. User sees a confirmation message + WhatsApp link
5. Done — one network call, one dependency, one thing that can fail

---

## WhatsApp conversion

`wa.me/{number}` deep links with prefilled, context-aware messages. No chat widget scripts, no third-party chat SDKs.

The prefilled message is built from the page context: "Hi, I'm interested in [page topic] for my [project type]." The number is an environment variable, not hardcoded.

**CSP implication:** `wa.me` links are standard `<a href>` — no CSP change needed. No scripts loaded.

---

## CMS — Sanity

### Studio

Embedded at `/studio` via `next-sanity`. Authenticated route — not public, not indexed (`noindex` in robots meta, excluded from sitemap).

### Content rules

- **Structured fields only.** No portable text blocks wider than necessary. Editors are non-technical and must not be able to break layout or performance
- **No page builder.** Layout is code. Content is CMS. The CMS fills slots the code defines
- **Field-level translation:** Every text field has `en` and `ar` sub-fields. `ar` is optional at launch (V2). Schema is ready for it from day one so the migration is "fill in the Arabic fields," not "restructure the schema"
- **`deviceId` join:** Hotspot copy lives in Sanity, joined to the scene manifest via `deviceId`. The CMS does not know about coordinates or rendering — it only knows device names and descriptions
- **Image handling:** All images served via Sanity's CDN (`cdn.sanity.io`) with automatic format negotiation and responsive sizing. Do not download and self-host Sanity images

---

## Analytics

**Vercel Web Analytics + Speed Insights.** Nothing else loading today.

No Meta Pixel. No ad-network tag. No chat widget SDK. No third-party tracking script on initial load, ever — these are the largest sources of JS bloat and CLS on marketing sites.

**GA4 and Microsoft Clarity are planned and consent-gated.** The consent infrastructure now exists: `src/components/Consent/` renders the banner and preferences panel, `src/lib/consent.ts` holds the record, and `/cookie-preferences` is the permanent withdrawal route. Nothing is loaded yet — the gate ships ahead of the tags on purpose.

**Before either tag may fire**, every blocking item in `src/content/legal/consent-content-deck.md` §13 has to clear. Five are not engineering work: the regime confirmation (client), a DPIA screen for session recording (counsel), the cross-border transfer basis for Google and Microsoft (counsel), counsel review of the deck alongside the privacy policy, and the new-tool intake gate. The sixth is: a real Clarity replay must be watched and the person who watched it named, because the privacy policy promises form input is masked and that promise is unverified until someone has looked.

When they do land, the CSP entries from deck §8 and the §7.2 provider-table move ship in the **same PR** as the tags. The consent record already exposes everything a loader needs.

Consent is owned by **Legal System §6** (Consent, Cookies & Tracking). Earlier revisions of this file cited §10; §10 is now Accessibility as a Legal Requirement.

---

## Hosting

**Vercel Pro.** Static generation + on-demand ISR via Sanity webhook.

- Preview deploys on every PR
- Production deploys from `main`
- The `/studio` route is excluded from static generation (it's a client-side SPA)
- `qera-system/` submodule is skipped in builds (it's documentation, not code — see README.md CI/CD section)

---

## Claims and capability audit

**Only services Maple Technologies has actually delivered may appear as claims, hotspots, or package features.** The capability audit is the ground truth.

- **Confirmed capabilities:** Security systems, access control, audio — these can be claimed
- **Licences held, and evidenced — these are verifiable facts, not claims:**
  - **Dubai trade licence: 897839**
  - **SIRA licence: SSP202210037219** — the Security Industry Regulatory Agency licence for security systems work. This is the strongest credential the brand currently has: it is state-issued, independently checkable, and directly relevant to the security half of the offer. Use it on the About page and wherever James & Emma are looking for evidence that the company is real and regulated
  - Both numbers are published in the Privacy Policy and Terms identity tables
  - **The licence evidences security work — it is not a warranty of anything else.** Do not stretch it into a general quality or safety claim, and do not imply SIRA endorses Smarthaus
  - **Regulated sector consequence:** a SIRA licence puts Smarthaus in a regulated sector, which Legal System §0 makes a `(counsel)` item — sector rules stack on top of privacy law. Open items are tracked in the privacy policy's placeholder register
- **TIS and Fibaro partnerships are UNCONFIRMED.** No copy, badge, or logo may reference them until formalised. Ask before writing any partner/brand reference
- The company founding year is a placeholder. Never invent one
- "Sustainable Tomorrows" and similar unevidenced claims must not appear
- **If you find yourself writing a claim with no source, stop and ask.** Do not guess, do not interpolate from the brand name

---

## Photography constraint

No client photography exists and none will be sourced. Client privacy makes it permanently unavailable — this is positioned as a discretion signal, not an apology.

**Never use stock photography of smart homes.** It is instantly recognisable and destroys credibility with this audience (Nadia and James & Emma will both clock it). The design carries itself on:

- Blender renders
- Typography and confident use of space
- Schematic diagrams
- The brand's visual identity

---

## Locale routing — no `/en` prefix at V1

The brief suggested building `/en` routing now. **This is deferred.** Rationale:

- Adding a locale prefix to every URL when only one language exists creates a redirect from `/` to `/en/` on every first visit — unnecessary latency
- Every internal link, canonical URL, and OG URL becomes longer for zero user benefit
- When Arabic ships (V2), Next.js i18n routing can add `/ar` as the non-default locale while English remains at `/` (the default locale needs no prefix)
- No existing URLs break. No redirects needed

**What V1 does instead:** CSS logical properties throughout (already done), `dir="ltr"` explicit on `<html>` (already done), Sanity schema with `en`/`ar` field structure (ready at schema time). The routing change is a V2 task that takes an afternoon, not an architecture decision that needs to be baked in now.

---

## Git workflow

- **Branch:** `feature/*` off `main`. One concern per branch
- **Commits:** imperative mood, lowercase, concise. The diff tells what; the message tells why
- **No co-author attribution** on commits or PRs
- **Pre-commit:** Husky runs `lint-staged` — ESLint fix + Prettier + typecheck on staged `.ts`/`.tsx` files
- **PR:** one concern per PR. Title under 70 characters. Body has summary bullets + test plan
- **Deploy:** merge to `main` triggers Vercel production deploy. Kill List runs on every deploy

---

## Dependency policy

Before adding any dependency, answer:

1. **Does it already exist in the codebase or stdlib?** Check first
2. **What does it cost?** Run `npx import-cost` or check bundlephobia. If it's > 10KB gzipped and only used in one place, inline the logic
3. **Does it touch user data?** If yes, check Security System §13 (supply chain) and Legal System §1 (lawful basis, data flow)
4. **Does it need a CSP change?** If yes, the CSP update ships in the same PR
5. **Is it maintained?** Last publish > 12 months with open security issues = no

**Explicitly banned:** GSAP, Framer Motion, Lenis, three.js, React Three Fiber, any scroll-hijacking library, GA4 on load, Meta Pixel on load, any chat widget SDK, any CMS page builder plugin.

---

## Testing

### Unit (Jest + RTL)

- Behaviour only. Never assert appearance — jsdom doesn't apply CSS Modules
- Test components in isolation: does the button call the handler? does the form validate? does the manifest loader reject bad input?
- The manifest Zod schema gets its own test: valid manifest passes, every invalid variant fails

### E2E (Playwright + axe)

- Smoke test on every page: loads, has `<h1>`, passes axe accessibility scan
- Three device profiles: Desktop Chrome, iPhone 14, Pixel 7
- Hero: landing poster loads, service tabs are keyboard-navigable, reduced-motion shows stills only
- Contact form: submit with valid data, submit with invalid data, honeypot rejection

### Performance (Lighthouse CI)

- Runs against `http://localhost:3000/` (homepage)
- Thresholds in `lighthouserc.json`: performance ≥ 0.95, accessibility = 1.0, best-practices ≥ 0.95, SEO = 1.0
- JS budget: ≤ 100KB (102,400 bytes resource size)
- LCP < 2500ms, TBT < 200ms, CLS < 0.05

### Pre-commit

Husky + lint-staged: ESLint fix, Prettier format, TypeScript typecheck on staged files. Catches errors before they enter the branch, not in CI.

---

## Known tech debt and open items

| Item                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Action                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_reset.scss` reduced-motion uses `!important` | Works but fights the token system. Design-system architecture spec says zero the duration tokens instead                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Refactor when token architecture is implemented. The `!important` override will conflict with component-level duration tokens                                                                                                                                                                                                                                    |
| CSP is restrictive for current scope only      | All `'self'` — will break when third parties are added                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Update per the CSP table above, in the same PR that adds each service                                                                                                                                                                                                                                                                                            |
| Per-page OG images not built                   | Site-wide cards only (`public/og-image.png` 1200×630 + `public/og-image-square.png` 1200×1200, declared in `layout.tsx`). Inner pages need dynamic OG via `opengraph-image.tsx` (ImageResponse API) or static Blender renders                                                                                                                                                                                                                                                                                                                                 | Part of launch gate. Being handled separately                                                                                                                                                                                                                                                                                                                    |
| `twitter:site` / `twitter:creator` not set     | Both need a real @handle and the brand has no X account yet — the footer's X link is a bare `https://x.com/` placeholder. Omitted rather than invented: X silently drops an invalid handle, and a non-resolving claim is worse than none. Affects X only; no other platform reads these tags, and neither renders as visible text on a modern card                                                                                                                                                                                                            | Post-launch. Add `site: "@handle"` to the `twitter` block in `src/app/layout.tsx` once the account exists. Skip `creator` unless Journal posts get named authors — it is for bylined content                                                                                                                                                                     |
| Social profile links are placeholders          | `src/components/Footer/socials.ts` points WhatsApp at a real number but Instagram, Facebook, X and LinkedIn at bare domains (`https://x.com/`, etc.), so they land on each platform's homepage rather than on Smarthaus                                                                                                                                                                                                                                                                                                                                       | Replace with real profile URLs before launch. User-facing, not just metadata                                                                                                                                                                                                                                                                                     |
| Sitemap is static                              | `src/app/sitemap.ts` is a hardcoded list. Needs to query Sanity for journal posts and projects                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Convert to dynamic when Sanity integration is implemented                                                                                                                                                                                                                                                                                                        |
| `/faq` unconfirmed facts, noindex + no schema  | Six answers in `src/content/faq.ts` carry `pending` notes and `{braced}` values: the founding year, the AED 1,500 assessment fee, the AED 18,000–60,000 range, the payment split, the Premium Care response window, and the three designer commitments. Each renders through the `<Placeholder>` marker. `FAQ_IS_PUBLISHABLE` in `src/app/faq/page.tsx` is `false`, so the page ships `noindex` and emits no FAQPage JSON-LD — structured data on a noindex page is a contradictory signal, and these are exactly the figures an answer engine must not quote | **Launch gate.** Confirm each with Sunil, clear every `pending` and every `{brace}` in `faq.ts`, flip `FAQ_IS_PUBLISHABLE` to `true`, and add `/faq` to `src/app/sitemap.ts` — all in one change. Then invert the two assertions in `e2e/faq.spec.ts:78`. The unit suite (`src/content/__tests__/faq.test.ts`) fails if a brace is left without a `pending` note |
