@AGENTS.md

# CLAUDE.md — Smarthaus

> Read this before writing any code. This file is project orientation — who the client is, what we're building, and why. Engineering rules live in `AGENTS.md`.

---

## The standards system is authoritative

`qera-system/` is a git submodule containing Qera's nine master documents. They govern every decision on this project.

**Precedence order** (lower number wins):

1. Legal & Compliance
2. Security
3. Accessibility
4. Engineering correctness
5. Performance
6. SEO / AEO / GEO
7. Design & Brand

Before writing any threshold, version floor, or numeric standard into this project: check `qera-system/charter/owned-facts-register.md`. If another document owns it, point — never restate.

**Never edit qera-system/ from inside this project.** Note the issue, fix it in the qera-system repo, publish a version.

**This project targets the top tier across every system document.** Premium in Performance, SEO, Engineering, Design. AA in Accessibility (with select AAA criteria adopted where free — see below). Maximum scope in Security and Legal. No settling for Base or Standard on anything.

---

## What Smarthaus is

**Smarthaus** is a premium smart home automation brand based in Dubai, UAE. Sub-brand of **Maple Technologies** (MapleTech), a security and technology company. Smarthaus integrates lighting, climate, security, entertainment, and energy systems into unified home automation — positioned as high-end residential, not mass-market IoT.

**Domain:** smarthaus.ae (registered).

**What we're building:** A marketing site. Not an app, not a dashboard, not e-commerce. Every page ends at a lead capture form — that is the only conversion event. The site's job is to make affluent Dubai homeowners and interior designers want to start a conversation.

**Claims constraint:** Smarthaus is a young brand. No claims of "10 years of experience," no invented heritage, no "trusted by thousands." Everything stated must be verifiable today. This applies hardest on the About page.

---

## Who the site is for

Four buyer profiles drive every page:

| Persona          | Who they are                                                                                                                                      | What they need                                                                                             | What they don't respond to                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Ravi**         | Existing Maple Technologies client upgrading. Technically literate. Wants a demo, a fixed price, and a written SLA                                | Don't oversimplify for him. He knows what he's buying — show him the spec, the process, and the commitment | Vague promises, marketing fluff                               |
| **James & Emma** | British couple renovating a Palm Jumeirah villa. Compare five vendors over six weeks. Their deepest fear is paying a company that then disappears | Evidence, credentials, transparency. A clear process they can follow from enquiry to installation          | Hype, pressure, urgency tactics                               |
| **Aditya**       | Property investor with three villas. ROI-first                                                                                                    | Numbers, volume pricing, a tenant-proof interface. He's buying outcomes, not technology                    | Lifestyle imagery without substance                           |
| **Nadia**        | Interior designer, 10–14 villa projects a year. The highest-value channel                                                                         | A professional B2B page and documentation she can hand to her own client without embarrassment             | Anything that makes her look less professional by association |

**None of them respond to hype. They respond to clarity, evidence, and quiet confidence.**

Ravi and Nadia are the most important channels — Ravi is an upsell within an existing relationship, Nadia is a multiplier who brings repeat projects. James & Emma are the volume persona. Aditya is highest per-deal value but lowest volume.

---

## Tone of voice

Precise. Warm. Unhurried. No exclamation marks. No "cutting-edge solutions." No urgency tactics.

Name the actual thing: "as-built drawings and two handover sessions", not "we go above and beyond."

- **Confident, not loud.** Smarthaus doesn't need to convince you it's premium — it assumes you already expect premium.
- **Warm, not corporate.** This is someone's home.
- **Specific, not vague.** "Your lights adjust to the time of day" beats "intelligent lighting solutions."
- **Restrained.** No superlatives. No "revolutionary." If the product is good, the copy doesn't shout.

---

## Visual direction

**Palette:** Dark charcoal base (`--ink`), warm white surfaces (`--bone`), bronze accent. Warm neutral palette: Ink, Umber, Leather, Bronze, Sand, Bone.

**Avoid:** Security-industry orange/red, IT-company cold blue, consumer-tech bright white, full-black luxury overplay.

**Typography:** Manrope (Google Fonts, variable, 200–800 weight). Geometric sans — confident and precise. Heavy weights (700–800) for headings, regular (400) for body. Reference zone: premium property developers and architecture practices — generous spacing, confident hierarchy.

**Photography:** No client photography exists yet. The site launches with the pre-rendered Blender hero and stock/AI-generated lifestyle imagery. All imagery must feel residential Dubai — not Scandinavian, not American suburban. Warm light, natural materials, architectural scale.

**Elements feel embedded and architectural, not floating or decorative.** The logo is a dome-and-converging-strands mark — a Middle Eastern home, merged wiring, unified automation.

Where the Design System covers something (tokens, spacing, component conventions), follow it. This direction is brand expression layered on top, not a replacement.

---

## The Blender hero

The homepage hero is a **pre-rendered 3D scene** — not real-time WebGL. Blender renders frames or video; the site plays them.

**Why pre-rendered:** No runtime 3D library, no shader compilation, no GPU requirement on the client. A 10MB WebGL bundle would blow the JS budget on page one and exclude every mid-range phone in Dubai. Pre-rendered video is a fraction of the code cost and works on every device.

### Three phases

| Phase                  | What the user sees                                                                                                                                                | Trigger                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Landing**            | Front-view villa on warm background. Heading, subtitle, "Book a site visit" + "Explore Villa" CTAs                                                                | Page load                                                                |
| **Approach**           | Camera zooms + rotates into the villa, villa peels into architectural cutaway. Text/buttons fade out, left behind                                                 | Click "Explore Villa" (not scroll-scrubbed — video plays once, smoothly) |
| **Isometric explorer** | Floating dusk-lit cutaway. Vertical service tabs on right (Garage, AC, Lighting, Security, etc.). Click a tab → camera moves to that area → automation demo plays | Tab clicks. Scroll exits to next section                                 |

The landing is a single still with two CTAs. The interactive experience is opt-in via "Explore Villa." Users who scroll past see the rest of the homepage without entering the explorer.

Mobile gets separate portrait compositions for every asset — never a CSS crop of desktop. Mobile nav is at the bottom, not the top.

**Media pipeline:** Blender scene → ffmpeg (AV1 primary + H.264 fallback) + Sharp (AVIF primary + WebP fallback). Two video codecs, two image formats, selected by `<source>` / `<picture>`.

The scene manifest contract, schema, and interaction rules live in `AGENTS.md`.

---

## Page inventory (priority order)

Build order. Higher priority ships first.

| Priority | Page                  | Purpose                                                                  | Notes                                                                                                         |
| -------- | --------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **P0**   | Homepage              | Hero moment + value prop + lead capture                                  | The Blender hero lives here. First impression. Ravi and James & Emma land here                                |
| **P0**   | Contact / Get Started | Lead capture form                                                        | Server Actions + Zod + honeypot + Resend                                                                      |
| **P1**   | Solutions (umbrella)  | What Smarthaus does — lighting, climate, security, entertainment, energy | One page or towns, not five thin pages. Ravi wants spec depth, James & Emma want clarity                      |
| **P1**   | About                 | Who Smarthaus/MapleTech is                                               | Claims constraint applies hardest here. No invented heritage. Show the parent company's track record honestly |
| **P2**   | Projects / Portfolio  | Visual proof                                                             | Renders until real photography exists. Gallery or case-study format. James & Emma's confidence builder        |
| **P2**   | For Designers         | Nadia's page. Professional B2B landing                                   | Documentation she can hand to her client. Integration details, process, partnership path                      |
| **P3**   | For Developers        | Aditya's page. Property developer landing                                | ROI framing, project scale, volume enquiry path                                                               |
| **P3**   | Blog / Journal        | SEO + AEO content engine                                                 | Sanity CMS. Launches with 3–5 seed articles                                                                   |

**Sanity Studio** lives at `/studio` — authenticated, not public. Structured fields, not freeform rich text. English at launch; Arabic (V2) via field-level translation, not page duplication.

---

## Arabic and RTL — V2, not V1

Arabic is planned but not shipping at launch. English only (`lang="en"`, `dir="ltr"`).

**V1 prepares:**

- CSS logical properties throughout — `padding-inline`, `margin-block`, `inline-size`, never `padding-left`
- No hardcoded directional values in SCSS
- `dir="ltr"` set explicitly on `<html>`

**V1 does NOT do:**

- No `hreflang` tags (single-language site)
- No translation infrastructure
- No Arabic typography tokens

---

## Project-level performance targets

Values owned by the system (via Owned Facts Register) — do not restate, point only:

- **LCP, INP, CLS** → Performance System §1
- **CSS budget** → Performance System (< 40KB gzipped, on the register)

**Project-specific targets** (these are ours, not the system's):

- **CLS < 0.05** — tighter than the system's 0.1 because the scroll-driven hero and motion-heavy design create more CLS risk. Project decision, not a system change
- **TBT < 200ms** — lab metric (Lighthouse CI), complementary to the system's INP (field metric). Different measurements, not conflicting
- **First-load JS: ≤ 100KB gzipped** on marketing pages — set in `lighthouserc.json`. The system says JS budgets are per-project; this is ours. Does not apply to the `/studio` route (Sanity Studio is its own bundle). Next.js App Router with Server Components keeps the client runtime small; this budget covers the React runtime + Next.js client shim + our code. Turnstile and Zod load only on the contact page, not homepage
- **Lighthouse mobile: ≥ 0.95** — project floor for Premium tier. The system does not set a Lighthouse threshold; it says "lab scores are a proxy, field data is the truth." We use this as a CI gate to catch regressions. A mostly-static Server Components site with optimised media has no excuse for scoring below 95

---

## Accessibility — AA with free AAA upgrades

Build target is **WCAG 2.2 Level AA** (Accessibility System default). The following AAA criteria are adopted where the design meets them for free or near-free. The rest are explicitly declined with reasoning.

### AAA criteria we adopt (zero or trivial extra cost)

| Criterion                         | What it asks                                          | Why it's free                                                                                                 |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **1.4.12 Text Spacing**           | Content readable when user overrides spacing          | Free if CSS doesn't use fixed heights on text containers. Fluid type + logical properties already handle this |
| **2.4.5 Multiple Ways**           | Two+ ways to locate a page                            | Nav + sitemap + breadcrumbs. We're building all three anyway                                                  |
| **2.4.6 Headings and Labels**     | Descriptive headings and labels                       | Free with good content discipline                                                                             |
| **2.4.8 Location**                | User's location within the site is available          | Breadcrumbs on inner pages. Trivial                                                                           |
| **2.4.10 Section Headings**       | Content organised with headings                       | Free — we'd never ship a page without heading structure                                                       |
| **2.1.3 Keyboard (No Exception)** | All functionality operable by keyboard, no exceptions | Four client components, all simple. No keyboard traps possible                                                |
| **2.2.3 No Timing**               | No time limits on content                             | Marketing site — nothing is timed                                                                             |
| **2.2.4 Interruptions**           | User can postpone/suppress interruptions              | No interruptions, no pop-ups, no auto-playing modals                                                          |
| **3.2.5 Change on Request**       | Context changes only on user action                   | No auto-redirects, no surprise navigation                                                                     |
| **3.3.6 Error Prevention (All)**  | User submissions: review, confirm, reversible         | Contact form gets a confirmation step. One form, low cost                                                     |
| **1.3.6 Identify Purpose**        | Programmatic purpose of UI components                 | Semantic HTML + `autocomplete` attributes on form fields. Free                                                |

### AAA criteria explicitly declined

| Criterion                            | What it asks                                         | Why we're not doing it                                                                                                                                                                                 | Trigger to reconsider                                                      |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **1.4.6 Contrast (Enhanced)**        | 7:1 normal text, 4.5:1 large text                    | Kills the bronze accent on dark backgrounds. Body text (bone-on-ink) likely clears 7:1 naturally, but enforcing 7:1 everywhere removes half the palette as text-legal colours. AA's 4.5:1 is the floor | If accessibility audit reveals real user difficulty with current contrast  |
| **1.2.6 Sign Language**              | Sign language interpretation for video with audio    | No spoken-audio video content at launch. The Blender hero is silent motion                                                                                                                             | Any video with speech is added to the site                                 |
| **1.2.7 Extended Audio Description** | Extended audio description where pauses insufficient | Same — hero is silent, no narration track                                                                                                                                                              | Video with narration is added                                              |
| **1.2.8 Media Alternative**          | Full text alternative for video                      | The hero is decorative/atmospheric. A text alternative adds nothing a sighted user doesn't also miss on `prefers-reduced-motion`. The poster frame + alt text covers the informational content         | Hero carries essential information that the static fallback doesn't convey |
| **3.1.3 Unusual Words**              | Mechanism for definitions of jargon                  | Smart home terminology (KNX, Lutron, DALI) is the audience's vocabulary. Ravi and Nadia know these terms. James & Emma encounter them in context with plain-language descriptions                      | User testing reveals comprehension issues                                  |
| **3.1.5 Reading Level**              | Supplementary content for advanced text              | A B2B/technical site can't dumb down to lower secondary reading level without losing Ravi and Nadia. Plain language is the standard; supplementary easy-read versions are disproportionate             | Public-sector or mass-consumer audience is added                           |

### What stays non-negotiable regardless of tier

- `prefers-reduced-motion` honoured on all significant motion (`[Floor]`)
- Keyboard access to all functionality (`[Floor]`)
- 4.5:1 body text contrast, 3:1 large text / UI (`[Floor]`, AA)
- No keyboard traps (`[Floor]`)
- All form fields labelled (`[Floor]`)
- All meaningful images have alt text (`[Floor]`)
- Automated tools catch ~30–40% of issues — manual + AT testing required for the rest

### Hero and WCAG 1.2.5 (Audio Description) — resolved

WCAG 1.2.5 applies to "prerecorded video content in synchronized media" — video synchronized with audio or with time-based interaction. The Blender hero is a silent, scroll-driven, decorative animation with no audio track and no information that isn't already in the surrounding text. Under W3C's own Understanding SC 1.2.5, the criterion does not trigger when there is no audio track and the video is decorative/atmospheric.

**Implementation:**

- `aria-hidden="true"` on the `<video>` element — the animation is decorative, not informational
- Descriptive `alt` on the poster frame `<img>` (e.g., "Smarthaus-automated villa interior at dusk — lights, blinds and climate adjusting as the sun sets")
- The poster frame is the `prefers-reduced-motion` fallback — it must communicate the same mood as the animation
- This matches the industry standard approach (Apple, Bang & Olufsen, Porsche Design all treat silent hero animations as decorative media on AA-compliant marketing sites)

**Tripwire:** If the hero ever gains narration, spoken audio, or conveys information not present in the surrounding text, 1.2.5 triggers immediately and requires an audio description track or a full text transcript. Same for any other video added to the site with speech.

---

## Client components — the short list

Server Components first. `'use client'` limited to:

- Hero video stage (scroll-driven playback via IntersectionObserver)
- Wireframe/scene reveal (Web Animations API)
- Contact form (form state, Turnstile widget)
- Mobile navigation (toggle state)

Everything else is a Server Component. If you're reaching for `'use client'`, a Server Component with a small client island probably works instead.

---

## Motion stack

CSS transitions + IntersectionObserver + Web Animations API. Nothing else.

No GSAP. No Framer Motion. No Lenis. No smooth-scroll libraries. The JS budget can't afford them, and the `prefers-reduced-motion` path is simpler when animations are CSS-driven.

---

## Collaboration style

- **Stop after each deliverable for review.** Don't run ahead.
- **qera-system is read-only from this repo.** If a system document needs updating, say so — don't edit it here.
- **No co-author attribution on commits or PRs.**
- **Commit messages:** imperative mood, lowercase, concise. The diff tells what changed; the message tells why.
- **Branch strategy:** `feature/*` branches off `main`. One concern per branch.
- **Push back.** If something is wrong, smells wrong, or could be better — say it immediately with the fix. Don't wait to be asked. Don't soften it.
