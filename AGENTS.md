<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

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
| Security headers, CSP, deps, SSRF             | `qera-system/systems/2-security-system.md`                  | §1 (auth), §8 (headers), §12 (deps)                         |
| WCAG conformance, contrast, motion, a11y      | `qera-system/systems/3-accessibility-system.md`             | §4 (contrast), §5 (keyboard), §16 (motion)                  |
| TypeScript, deps policy, AI code, testing     | `qera-system/systems/4-engineering-system.md`               | §16 (types), §17 (testing), §20 (AI coding), §24 (deps)     |
| CWV, budgets, fonts, images, animation        | `qera-system/systems/5-performance-system.md`               | §0 (budgets), §1 (CWV), §2 (images)                         |
| Meta, schema, crawl, AEO/GEO, AI crawlers     | `qera-system/systems/6-seo-system.md`                       | §0a (AI crawlers), §2 (meta), §9 (schema), §18-19 (AEO/GEO) |
| Tokens, typography, spacing, dark patterns    | `qera-system/systems/7-design-system.md`                    | §9 (tokens), §12a (dark patterns), §15 (spacing)            |
| Kill List (every deploy), Full Sweep (launch) | `qera-system/gates/launch-gate.md`                          | The Kill List section: its size is the gate's to state      |
| Token architecture, layers, components, SCSS  | `qera-system/implementations/design-system-architecture.md` | §1 (layers), §2 (tokens), §9 (enforcement)                  |
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

- **`src/lib/manifest.ts`** — Zod schema + typed loader. **Not yet imported by any page**: it is the contract for hero phases 2 and 3, which are unbuilt, so today it is enforced only by `src/lib/__tests__/manifest.test.ts`. Once `HeroStage` reads it, a malformed manifest fails the **build**, not the browser
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

> **SUPERSEDED — this section describes an image-parallax landing that is not
> what shipped.** Phase 1 is now real-time WebGL: `src/components/Hero/`
> renders `public/hero/villa.glb` with three.js and orbits the camera on
> pointer move. The still-image parallax below, and the 45-frame cursor grid
> that briefly replaced it, are both gone. See the three.js section under
> "Dependency policy" for why, and `scripts/export-villa.py` for the Blender
> export. Phases 2 and 3 below are unbuilt and their spec still stands.
>
> What carried over unchanged: the two CTAs, the camera range (azimuth ±4°,
> elevation 0–5°, one-sided so the camera never looks up from below ground),
> the server-rendered still as the LCP element, and every adaptive-loading and
> reduced-motion gate.

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
- PNG 16-bit for the conversion pipeline (→ AVIF primary + WebP fallback via the planned optimise-images script)
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

## The Process stack — sheets on scroll

`src/components/Process/` is six full-screen brown-950 sheets on the homepage, one per sheet of the homepage document's Process tab in Sanity (seed: `sanity/seed/home-page.ts`). Each pins at the top of the screen when it gets there, and the next rises from the bottom edge and covers it, like a sheet of paper pushed up over the last. It replaced the horizontal rail and its portal zoom on 2026-10-04, at Shivanshu's call; the rail is kept at the git tag `archive/process-rail`.

### The mechanism

`position: sticky; inset-block-start: 0` on each `<li>`, inside one `<ol>`. Later sheets paint above earlier ones by source order, so no z-index. The list is the sticky containing block, so when the last sheet arrives the whole stack leaves together. No timeline, no listener, no client code: the section is a Server Component.

Three things that are load-bearing:

- **Every sheet is exactly one screen (`100svh`).** CSS cannot pin a box by its bottom edge without knowing its height, so a pinned sheet taller than the screen has its foot covered before anyone reads it. The images give way instead (`min-block-size: 0` on the frames), and `e2e/process.spec.ts` asserts every sheet's content fits on all three devices. New copy that does not fit fails that test; shorten it or drop a picture rather than letting the sheet grow.
- **The stack is gated: `prefers-reduced-motion: no-preference` and `min-height: 32rem`.** Below that height (a phone on its side, or the desktop at 200% zoom) the copy and a picture cannot share one screen, so the sheets become plain sections and the frames take a 4:3 box of their own. Reduced motion gets the same plain layout.
- **Below lg the sheet pads its foot by the floating nav bar**, so copy and pictures stop above it while the ground still runs to the screen edge. From lg it pads its head by the nav capsule.

**It holds the section before it, and the first sheet snaps** (2026-11-14). The homepage hands Process the hardware section (`held`), and the two share one box (`data-process-stack`). The held section pins by its foot once that reaches the screen's, so the first sheet rises over it as every later sheet rises over the one before; CSS cannot pin a box by its foot without its height, so `SheetSnap` measures it into `--held-block`, and until it has, nothing pins. The first sheet rises at 80% and, once its top edge crosses a fifth of the way down the screen, grows to fill it over 600ms with a small overshoot that the screen's edge cuts off (`data-snap`, set by `SheetSnap`'s one IntersectionObserver), and shrinks again on the way back. Off under reduced motion and on a short screen, as the stack is, and without JavaScript the hardware simply scrolls away.

**The ground runs the screen's full width** (2026-11-14): the sheets reach past the page's 1440px column to both edges of any screen, and give the distance back as padding, so their content stays in the column.

**The pictures' parallax** (2026-11-04). In the stack each picture is 22.5% taller than its frame and slides down through it on `animation-timeline: view()`, a tenth shallower than the hero strip's (CSS; still in Firefox). Sheet and frame are `overflow: clip`, because `hidden` is a scroll container and `view()` would watch it. A pinned box's timeline stretches while it stays pinned, so the range is a length, one screen of scroll; browsers start it part of the way up the rise.

### Accessibility

Single-axis now: nothing scrolls sideways, so the 1.4.10 Reflow exception the rail carried is gone, and with it the focusable `role="group"` scroller. Six `<h3>` in a real `<ol>`, with the section's `<h2>` on the first sheet in the slot the steps use for "Step 01".

### Photography

Every Process picture is **placeholder stock**, ticked "Temporary stock image" in the Studio. They do not meet the photography constraint below. `src/sanity/__tests__/seed/process.test.ts` fails once the seed's last mark is cleared, so replacing them is a deliberate act rather than a silent one; in production, untick each as its replacement is uploaded.

---

## The loading splash

`src/components/Loader/Splash.tsx` covers the page on a visitor's **first full load in a tab**, and never again in that tab: not on a reload, and not on a soft navigation, which never re-renders the root layout.

- **Decided before first paint.** `src/lib/splash-boot.ts` runs in `<head>` and sets `data-splash` on `<html>`: `show` on a first load (and records it in `sessionStorage`), `skip` after that. The splash is server-rendered but **hidden by default**, so a repeat visit never flashes it, and with JavaScript off or storage blocked it never shows, since nothing could take it down.
- **Real progress, not a timer.** The bar and percentage follow the page: ready is fonts ready plus the `load` event. It leaves once ready and at least `SPLASH_MIN_MS` (600ms) in, or at `SPLASH_MAX_MS` (2.5s) regardless; before ready the bar eases toward 90% and holds. It then fades (`leaving`) and hides (`done`), by CSS state rather than DOM removal, because the element is React's.
- **Above everything** on `--z-modal`, the consent banner included; the banner is painted underneath from the first frame.
- **e2e marks it seen** for every spec through the product's own `sessionStorage` key (`e2e/fixtures.ts`); `e2e/splash.spec.ts` opts back in with `test.use({ splash: true })`.

## The homepage opening

On every full load the homepage builds itself in order (Shivanshu, 2026-11-04; the hero redesigned 2026-11-14): the title word by word, the subtitle word by word from 533ms; at 800ms the email field, the strip, the nav and the contact bar together, each over about 2.1s; at about 1.1s the four proofs, the makers' marks and the pause button. The last of it lands at about 3.3s. Five seconds is the ceiling: motion that starts by itself and runs past that needs a pause control (WCAG 2.2.2), and a test holds it under. The words fade only, as inline spans, so a screen reader still reads one sentence; their delays are `nth-of-type` rules in the stylesheet, because an inline style would trip the strict CSP twin. The timings are custom properties on `:where(:root[data-intro])` in `HomeHero.module.scss`, so the nav and the bar read the same numbers.

- **The strip comes in like a metro.** A second animation on `.track`, added to the drift (`animation-composition: add`), so the drift keeps its clock: 1.6s on a hard ease-out, from the two lead cards at the screen's right edge, past the left edge, to the first card's place at rest. The lead cards are a third, inert list off the track's start (`data-lead`), clipped at rest; the track's rest and the first card's place, the LCP, are unchanged. Holds on the drift name two play states, so hover and the rest never stop this. CSS only.
- **Then the page's scroll glides it.** While any of it is on screen, scrolling down runs the strip on and scrolling up runs it back (StripControls, `SCROLL_SPEED`), without limit. It never jumps: a scroll adds to the speed of the drift's own animation (`updatePlaybackRate`), and a timer eases that speed away, nine tenths of it within a quarter second, so the strip stops with the page. Going up, the drift stands aside and returns from nothing in about 400ms (`DRIFT_RETURN`), since running back into a full-speed drift read as a bounce. No requestAnimationFrame: the browser still draws the movement, and only the speed is stepped. And each photograph is 25% taller than its card and slides through it on a scroll timeline, as the About page's pictures do (CSS; still in Firefox).
- **From lg a card is up to 30vw wide.** `--hero-strip-block` is that card's height at 4:3 (a width in the strip's own height, `cqb`, since `aspect-ratio` left WebKit a blank gap at the loop's seam), capped at 36svh; below lg the cards keep their size.
- **The strip starts at 95% of the screen** (Shivanshu, 2026-11-14), so only its top shows above the fold and the page asks to be scrolled. The glass fills the screen down to it (`--hero-peek`); the hero is a minimum, not a fixed height, so copy that needs more room pushes the strip down rather than running under it.
- **The hero is dark: reeded glass over a blurred ring**, drawn by the stylesheet first and sharpened by `GlassCanvas` (CLAUDE.md, the third canvas exception). Its text is `--color-text-inverse`; from lg the nav at rest takes the light ink and the light button over it (`Nav.module.scss`, "Over the homepage's dark hero"), and the capsule is unchanged.
- **The email field sends a lead at once** (`HeroLead`, `submitHeroLead`): an address alone, through the same honeypot, rate limit and duplicate guard as the two forms, its subject the address since there is no name. No privacy line beside it, at Shivanshu's call (2026-11-14), confirmed after the risk was raised; recorded in `docs/launch-gate/accepted-risks.md` for counsel's review before launch.
- **The makers' marks** run under the proofs, the strip's CSS pattern (`brands.ts`; in code, not Sanity, since a mark is a file here). The strip's pause button stops them, and a pointer over them slows them to a crawl (`BRANDS_HOVER_RATE`). One tone, light, whatever colours their files carry; their own colours under forced colours.
- **Gated on `data-intro` on `<html>`.** `src/lib/splash-boot.ts` sets it on every full load, before its storage check. StripControls takes it off once the pause row has faded in, the opening's last step (`animationend` of `hero-in` on its own row), so a soft navigation back to `/` finds the hero at rest; never on unmount, which React's development double mount turned into "no opening at all", and a reload plays it again. Without JavaScript it is never set, and nothing waits on an animation. The gate sits in `:where()`, adding no specificity; the nav and the bar also need `:has([data-hero])`, so only the homepage plays it.
- **Paused under the splash** (`data-splash="show"`), so it starts as the splash fades rather than finishing unseen.
- **Fill backwards, never forwards.** Once an animation ends, opacity and translate are the element's own again; the nav's own states depend on that.
- **Never under reduced motion.** Every rule sits inside `prefers-reduced-motion: no-preference`.
- **e2e holds it off** for every spec but `e2e/intro.spec.ts` (`e2e/fixtures.ts`, `intro`), since axe reads half-faded text as low contrast.

## The scroll reveal

Below the hero, the homepage's section headings fade in word by word and sharpen, 400ms after arriving and over 1.2s each, so it is still playing once the scroll has stopped (6px of blur, none on a phone, 60ms apart); the paragraph under a heading follows it; and the groups rise 28px and fade (90ms apart, capped at the sixth), once, as each comes on screen (Shivanshu, 2026-11-04). Homepage only for now: `<ScrollReveal />` is mounted in `src/app/page.tsx`, and `data-reveal` does nothing without it, which is why `/pricing` can share the tier cards. The rules are in `globals.scss`.

- **Hidden late, not early.** Everything is visible in the server HTML. Only once ScrollReveal runs does what is still below the screen get `data-reveal="waiting"`. Nothing on screen waits for JavaScript, a failed script leaves the page standing, and there is no boot-script gate.
- **Animations, not transitions.** They fill backwards and let go, so a card's own hover keeps its timing.
- **Inner content only, never the Process sheets, the hero, the nav, the carousels or the form.** `opacity` and `translate` on a parent break the glass and sticky inside it, and a slide off screen sideways would never come into view.
- **Not in print, and not under reduced motion.** The hidden state is in `@media screen` and `no-preference`.
- **e2e holds it off** for every spec but `e2e/scroll-reveal.spec.ts` (`e2e/fixtures.ts`, `reveal`).

## The standards section

Under the figures, before the hardware (Figma 4914:839, built 2026-11-16): a heading, a line and the site-visit button over a brown ground, and the six standards Smarthaus installs on (CoSS, Matter, Zigbee, Wi-Fi, Z-Wave, Bluetooth) as marks along its foot. `src/components/Connectivity/`, a Server Component; copy in the homepage document's "Connectivity" tab, marks in code (`protocols.ts`, as the hero's are). A 1200px block centred in the column, at least the frame's 594px tall from lg, edge to edge on a phone, 64px from the sections above and below it (Shivanshu, 2026-11-16).

- **The ground is Figma's export, plain, drawn once as a picture.** `scripts/bake-connectivity-ground.mjs` has Chromium draw `bg.svg` (Figma's own export: six ellipses under a 100px blur) at half the frame's size, and writes `ground.webp` (3KB), the section's background in the stylesheet. Painted as the SVG, WebKit redrew the blurs at 3x as the section scrolled in, long enough on a phone to drop the frames the scroll reveal watches for (found 2026-11-16, `e2e/scroll-reveal.spec.ts` on iPhone 17). Not sharp: its blur came out 6 levels darker on average. Re-run the script if `bg.svg` changes. The Figma also has a Dither effect over it, which was built the same day and dropped before it was committed, at Shivanshu's call: nothing else on the site is dithered. If it is ever wanted again: Figma exports the effect only as a WebGPU runtime, its maths is short enough to repeat in an SVG filter, and inside a filter WebKit blends semi-transparent layers in linear light, so the filter needs an opaque picture under it.
- **The crop keeps the copy legible.** The picture covers the section with its top kept and its middle centred (`background-position: center top`). Kept at the left, a phone's tall box showed the bright corner and the line read 4.4:1; centred, 8:1. At the frame's shape nothing is cropped. `e2e/connectivity.spec.ts` measures the heading (3:1, large) and the line (4.5:1) against the ground on every device, since axe cannot see through a picture, and checks the picture paints at all, since the flat brown under it would pass on its own.
- **Forced colours keep the section's own colours** (`forced-color-adjust: none`): the system would recolour the copy but not the picture under it.
- **The copy was drafted for review, and approved as written** (Shivanshu, 2026-11-19). It claims nothing about certification or partnership: five of the marks are certification marks, shown pending counsel (`docs/launch-gate/accepted-risks.md`).

## Nav behaviour

| State                           | Desktop                                                 | Mobile                                       |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Hero landing (phase 1)          | Transparent top bar. Logo left, links center, CTA right | Transparent bottom bar. Logo + hamburger     |
| After scroll or "Explore Villa" | Shrinks to floating capsule, `position: sticky`, top    | Shrinks to floating capsule, stays at bottom |
| Inner pages                     | Solid floating capsule from the start, top              | Solid floating capsule, bottom               |

Capsule transition: CSS `translate`, `border-radius`, `padding` with `--duration-normal`. Triggered by IntersectionObserver sentinel at the bottom of hero phase 1. No scroll event listeners.

**The Solutions menu** (Figma 4678:50257, 2026-10-28). The eight solutions, each to `/solutions` for now, with a picture of the one hovered, focused or swiped to (`Nav/SolutionsMenu.tsx`, content in the site settings' "Nav: Solutions menu" in Sanity).

- **From lg:** a panel hanging from the Solutions item, always exactly the scrolled capsule's width and place (`--nav-stuck-size`, centred on the header). Under the tall bar it floats 8px below with its own frame; once the bar shrinks the gap closes and the frame between them drops, so a menu open during the shrink never changes size and ends as one box with the capsule. It opens on hover (closing 150ms after the pointer leaves) and on focus, closes at once when focus leaves, on Escape (focus back to Solutions) and on a press outside. On a screen with no hover the first tap opens it. It opens by height, as the phone menu does, items arriving once it is 90% open.
- **Below lg:** a tap on Solutions slides the links out to the left, the menu changes height, and the solutions slide in from the right, picture on top; Back reverses it. A sideways swipe on the picture moves through the solutions. Each side has its own `0fr`/`1fr` row: two rows of one grid would size both to the taller content.
- **The capsule and the open panel are one sheet of glass.** The capsule's blur and tint live on its `::after`, inside its frame, and while the menu is open that layer reaches down over the panel (`--nav-menu-block`, measured by NavShell), on the panel's own duration and curve; the joined panel has no glass of its own. It reaches in both states of the bar, faded out on the tall one, so a bar collapsing over an open menu moves nothing: the panel's glass and this one only cross-fade (`--nav-glass-fade`). Reaching only once stuck was a curtain, the panel standing clear while the tint slid down it (found 2026-11-04). The reach is one registered number (`--nav-reach`, 0 to 1) that both the layer's foot and its `clip-path` read, and its foot is exactly the panel's in every frame of the fold: the frame and the gap (`--nav-reach-gap`) do not scale with it, only the height does. Below the bar's foot the layer is clipped to the panel's width: a menu open on the tall bar joins it while the bar is still shrinking, and unclipped the glass hung the bar's full width under it. Two blurs never match at a seam (each invents what lies past its own edge differently), and a header that carries `backdrop-filter` is a backdrop root, so a panel inside it cannot blur the page at all. Do not move the glass back onto `.nav` or give the joined panel its own.
- Without JavaScript, Solutions is a plain link to `/solutions`. `e2e/nav-menu.spec.ts` covers both bands.

Mobile bottom nav must account for `env(safe-area-inset-bottom)` — iOS home indicator and Android gesture bar.

---

## Media pipeline

**Input:** Blender `.blend` scene
**Output:** Optimised assets in `public/hero/`

### Scripts (in `scripts/`)

The three pipeline scripts for hero phases 2 and 3 are **planned, not written**: they arrive with those phases, and nothing in the build calls them yet.

| Script                                 | Purpose                                                      | Status  |
| -------------------------------------- | ------------------------------------------------------------ | ------- |
| `scripts/export-villa.py`              | Blender: export the villa to `public/hero/villa.glb` (Draco) | Exists  |
| `scripts/optimise-process-images.mjs`  | One-shot: shrink the Process photographs in place            | Exists  |
| `scripts/optimise-hardware-images.mjs` | One-shot: shrink the hardware renders in place               | Exists  |
| render-export.sh                       | Wraps Blender CLI render → raw frames/clips                  | Planned |
| encode-video.sh                        | ffmpeg: raw → AV1 (`.mp4` container) + H.264 fallback        | Planned |
| optimise-images.sh                     | Sharp: raw stills → AVIF primary + WebP fallback             | Planned |

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

| File location                              | Import path for `_variables.scss`    |
| ------------------------------------------ | ------------------------------------ |
| `src/styles/globals.scss`                  | `@use 'variables' as *`              |
| `src/app/error.module.scss`                | `@use '../styles/variables' as *`    |
| `src/app/contact/page.module.scss`         | `@use '../../styles/variables' as *` |
| `src/components/Button/Button.module.scss` | `@use '../../styles/variables' as *` |

One more `../` per directory level below these. Every file named here exists; `src/__tests__/docs-consistency.test.ts` fails if one is moved.

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

The CSP in `next.config.ts` is `default-src 'self'` plus the few widenings recorded below, each with its reason (the Draco decoder's `'wasm-unsafe-eval'` and `blob:` worker, and `'unsafe-inline'` for scripts and styles, which is an accepted risk in `docs/launch-gate/accepted-risks.md`). No third-party origin is allowed on the marketing pages; `/studio` has its own policy, below. As third parties are added, update the CSP **in the same PR that adds the dependency**. Never leave a CSP update for later — it will break in production.

The policy is built once, by `csp(strict)` in `next.config.ts`, and sent twice: enforced, and as a `Content-Security-Policy-Report-Only` twin that drops `'unsafe-inline'` from `script-src` and `style-src`, and allows our two inline scripts, the consent boot script (`src/lib/consent-boot.ts`) and the splash boot script (`src/lib/splash-boot.ts`), by their SHA-256 hashes. The hashes are in the strict policy only: a policy that lists a hash makes browsers ignore its `'unsafe-inline'`, which in the enforced policy would block every inline script Next emits. Both report to `/api/csp-report` (`report-uri` for Firefox and Safari, `report-to csp-endpoint` via `Reporting-Endpoints` for Chromium). The endpoint is rate-limited, capped at 16KB, schema-checked, strips query strings, and logs each distinct violation once an hour as one `csp-violation` JSON line. `e2e/headers.spec.ts` asserts the two policies differ only by `'unsafe-inline'` and those hashes, and `e2e/consent-boot.spec.ts` and `e2e/splash.spec.ts` that each hash matches the script the page serves.

**The Studio's policy** (2026-11-11). A second header rule for `/studio/:path*`, after the site-wide one, replaces both CSP headers there with `csp(strict, true)`: `connect-src` adds `https://*.sanity.io wss://*.sanity.io` and `https://sanity-cdn.com` (the Studio's check for a newer Sanity, on load and every 15 minutes; JSON only, and blocked it logged "Failed to fetch version for package", 2026-11-15), `img-src` adds `blob:`, `cdn.sanity.io` and the Google and GitHub avatar hosts, `font-src` adds `design-system-static.sanity.io`, and Clarity and GA4 are left out, so no session recording sees an editor's work. `script-src` gains nothing: the page uses `next-sanity/studio/client-component`, whose Studio does not load Sanity's remote bridge script (`core.sanity-cdn.com`, which only ties the Studio into Sanity's dashboard). `e2e/studio.spec.ts` holds all of it.

### Planned CSP changes (update when implementing)

None. Sanity's images reach visitors through Next's image optimiser on our own domain, so the marketing pages' `img-src` needs no Sanity origin (decided 2026-11-11).

**The hero's Draco decoder is the one CSP widening that has shipped.** It adds
`'wasm-unsafe-eval'` to `script-src` and `worker-src 'self' blob:`, and adds no
new origin — the decoder is served from `public/draco/` under
`default-src 'self'`. Both directives are stated with their reasoning inline in
`next.config.ts`, and the decision is recorded under the three.js section below.

**Vercel Analytics and Speed Insights needed no CSP change, and the rows that said otherwise are gone.** They listed `vitals.vercel-insights.com` and `va.vercel-scripts.com`, which were the v1 external domains. Version 2 of both packages serves from first-party paths — `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` — which `default-src 'self'` already allows. Verified by loading the page with the CSP live and watching for violations: none.

The corollary is that those paths are served by the **platform**, not by this app, so they 404 anywhere but a Vercel deployment. See the note in `src/app/layout.tsx` for why both components are mounted behind `process.env.VERCEL`.

**Each addition must be checked against:**

1. Security System §8 (headers) — new origins expand the attack surface
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

**All of the site's content is in Sanity** (migrated 2026-11-11): every page's copy, pictures and search metadata, the contact details, the footer, the legal pages and the consent wording. The code holds layout, behaviour and what must work without Sanity. Project `nqc5m5ls`, dataset `production`, public; read without a token.

### How the site reads it

- **One read path.** `getDoc(id)` (`src/sanity/fetch.ts`) fetches one document, at build, cached under one tag; one getter per document in `src/sanity/content.ts`, wrapped in React's `cache()`. Every document has a fixed id, and pages and sections are async Server Components that read their own. A missing document fails the build, never renders empty. The one exception is the blog's articles, read as a list (below).
- **Render shape.** `localize()` (`src/sanity/localize.ts`) turns a stored document into what components take: copy as English strings, pictures as `{ src, width, height, alt }` (size read from the asset id, no second query), Sanity's `_` fields gone. Types in `src/sanity/types.ts`.
- **Publishing.** A webhook in sanity.io/manage (production dataset, create/update/delete) posts to `/api/revalidate`, signed with `SANITY_REVALIDATE_SECRET`; a valid call expires the tag (`expire: 0`), an invalid one gets a 401 and changes nothing. If a re-render throws, Next keeps the last good page.
- **Pictures never come from Sanity's CDN in the browser.** `next/image` fetches them on the server (`remotePatterns`, this project's images only) and serves them from our domain, so the marketing CSP stays closed and the privacy policy's "Sanity sees nothing about you" stays true. `e2e/cms.spec.ts` fails on any browser request to a Sanity host.
- **Live preview.** The Studio's Presentation tool frames the site with drafts. `/api/draft-mode/enable` (next-sanity's, checked with the Viewer token `SANITY_API_TOKEN`) sets the draft cookie; in draft mode `getDoc` reads drafts uncached and marks copy for click-to-edit (`shouldMark`: the English of a field, never ids, links, layouts or SEO), and the layout mounts `<VisualEditing />`. A request with the draft cookie gets the Studio's CSP plus `frame-ancestors 'self'` (a `has: cookie` header rule in `next.config.ts`); every other request is unchanged.
- **CI and e2e read the `ci` dataset**, a copy of the seed (`NEXT_PUBLIC_SANITY_DATASET=ci` in `.github/workflows/ci.yml` and the Playwright web server), so copy pins never move under an editor. Unit tests get the seed through a global `getDoc` mock (`jest.setup.ts`); async components render through `src/__tests__/helpers/server.tsx`.

### The seed

`sanity/seed/` is the content as it was migrated, in render shape: the `ci` dataset, the unit tests' content, and the record of what was first published. `to-documents.ts` turns it into documents guided by the schema, strict both ways, and `src/sanity/__tests__/seed.test.ts` round-trips every document through it and `localize()`. It is outside `src/` on purpose: data, not shipped code.

- **Re-seed `ci`** after a schema change: `pnpm sanity:seed`, then `pnpm exec sanity dataset import sanity/seed/out/seed.ndjson ci --replace` (Sanity CLI, Node 22.12 or later, `pnpm exec sanity login` once).
- **Never import the seed into production again.** Production was seeded once; since then the Studio is its source of truth, and an import would overwrite every edit.
- **Three exceptions, each made once and asked for:** the blog's five documents (2026-11-14, `sanity/seed/out/blog.ndjson`, `BLOG_SEED`), the cameras solution page (2026-11-15, `SOLUTION_SEED`; Shivanshu's yes, after the page failed in a dev server reading production) and the other seven solution pages (2026-11-15, the same file less cameras; Shivanshu's yes before they were built). Each was a set of new documents production did not have, imported alone and without `--replace`, so nothing that existed was touched. Do not repeat any of them: those documents are the Studio's now. A new document goes in through the Studio, or through the same kind of import only when Shivanshu says so. One write of another kind, also asked for: the standards section's three fields were set on production's homepage document on 2026-11-16 by a single `setIfMissing` patch, pinned to the document's revision, so nothing that existed could change (there was no draft). A new field on an existing document goes in the same way, only when Shivanshu says so.
- **No prices in the seed.** The dataset is public: a price that is stored is published (Shivanshu, 2026-11-04).

### Studio

Embedded at `/studio` (`src/app/studio/[[...tool]]/page.tsx`, config `src/sanity/config.ts`, sidebar `src/sanity/structure.ts`). One sidebar entry per page; every document is fixed, with no create, duplicate or delete, because a route is code. The articles are the exception (`COLLECTIONS` in `src/sanity/schema/index.ts`): editors create, duplicate and delete them under "Blog". Not indexed, not in the sitemap, drawn without the site's chrome (`data-studio` and one rule in `globals.scss`).

- **CORS origins** are set by hand in sanity.io/manage, with credentials: `http://localhost:3000` (the scheme counts) and the production hosts.
- **Env:** `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` (public); `SANITY_REVALIDATE_SECRET` and `SANITY_API_TOKEN` (a Viewer token, never write access), server-only. `src/lib/runtime-config.ts` reports any missing in production.
- **Jest cannot load `sanity` or `next-sanity`** (ESM). Schemas are plain objects, not `defineType()`, so Jest can read them; the rest is mocked, and e2e covers the real Studio.

### Content rules, enforced in the schema

- **Structured fields only, no page builder.** Layout is code; the CMS fills the slots the code defines. Editors are non-technical and must not be able to break layout: so the primary nav's links and its button stay in code (`src/lib/nav-links.ts`; the capsule is measured around their widths), the hero's title and lede have word limits matched to the stylesheet, a Process sheet must have the pictures its layout has room for, and icons are picked from the files that exist.
- **The claims audit** runs on every copy field (`src/sanity/claims.ts`): tiers ("certified", "authorised dealer"), awards, years of experience, "trusted by", superlatives, exclamation marks and em dashes are refused at publish. Narrow on purpose; legal text is not checked.
- **Search metadata** is checked against SEO System §2's lengths before it can be published (`seoRule`), and `pageMetadata()` still throws at build.
- **Pending facts.** A `{braced}` FAQ answer needs a pending note; any note keeps `/faq` out of search. A stock picture is ticked "Temporary stock image".
- **Field-level translation:** every piece of copy is `{ en, ar }`; `ar` waits for V2. Rich text (the legal bodies) is `localeBlocks`, one Portable Text array per language.
- **`deviceId` join** (hero phases 2 and 3, unbuilt): hotspot copy will live in Sanity, joined to the scene manifest by `deviceId`; the manifest itself stays in code with the Blender pipeline.

### What stays in code

The error, 404 and global-error pages (they render when Sanity may be what failed, with `FALLBACK_CONTACT` in `src/lib/contact.ts`); UI chrome (aria-labels, carousel controls, table headers, the skip link); the form's validation, error and confirmation messages and its interest options (a closed set the server action checks: reading them from Sanity would put a second network call on the lead path); the scene manifest; and the unmounted villa, FluidHero and Maple components.

### Legal pages

Privacy, terms and the accessibility statement are `legalPage` documents (`legal-privacy`, `legal-terms`, `legal-accessibility`) rendered by `LegalDocumentPage` and `LegalBody`, a small server renderer for the Portable Text they use. Each has a version, a status and a changelog; a document with a placeholder mark left cannot be marked effective. Contact details inside them are tokens read from the site settings. A place another page links to (the banner's `/privacy#cookies`) is a "Link target" inside its heading, so renaming the heading never breaks the link; `LegalBody.test.tsx` fails if a seeded `/privacy#` link has no target. The drafting notes and placeholder registers are archived, unpublished, in `docs/legal/`.

**The accuracy gate** (`scripts/legal-accuracy.mjs`) runs before every `pnpm build`: it reads the published privacy policy and fails the build if a processor the code installs is missing from its "in use" table, if an installed one is still listed as planned, or if the Clarity and Google Analytics promises are gone while those tools are wired in. A new processor ships in the same change as its policy row, as before; now the row is published in the Studio first.

---

## Analytics

**Vercel Web Analytics + Speed Insights, installed and live.** Nothing else loading today.

Both are mounted in `src/app/layout.tsx` behind `process.env.VERCEL`, and both are **deliberately not consent-gated**. The banner exists for GA4 and Clarity, which set cookies and build a cross-session profile. These set no cookies at all: Vercel's privacy documentation states there is no cross-site identifier and that a visitor is a hash of the incoming request, discarded after 24 hours. There is nothing to consent to or withdraw. If that ever changes they move behind the banner and the privacy policy is rewritten in the same change.

Their privacy-policy row moved from §4.2 to §4.1 in the same commit that added the dependency, per the accuracy gate, now `scripts/legal-accuracy.mjs`, which every build runs against the published policy in Sanity.

No Meta Pixel. No ad-network tag. No chat widget SDK. No third-party tracking script on initial load, ever — these are the largest sources of JS bloat and CLS on marketing sites.

**GA4 and Microsoft Clarity are wired and switched off.** `src/components/Consent/` renders the banner and preferences panel, `src/lib/consent.ts` holds the record, and `/cookie-preferences` is the permanent withdrawal route. `src/lib/clarity.ts` runs Clarity without cookies until a visitor chooses, with cookies on accept, and not at all on a decline or an opt-out signal (Shivanshu, 2026-11-04; a deliberate exception to "no third-party script on initial load", loaded at idle). `src/lib/ga4.ts` runs GA4 directly, no Tag Manager, only after an accept. `NEXT_PUBLIC_CLARITY_ID` and `NEXT_PUBLIC_GA_ID` are the switches: unset, nothing loads and the CSP stays closed. CI builds have no id, so the Lighthouse script budget does not see Clarity's 73KB. Its form fields are masked by `data-clarity-mask` as well as by the project's own setting, and the project must be set to Strict masking with cookies off.

**Before either tag may fire, and before that id is set**, every blocking item in `src/content/legal/consent-content-deck.md` §13 has to clear. Five are not engineering work: the regime confirmation (client), a DPIA screen for session recording (counsel), the cross-border transfer basis for Google and Microsoft (counsel), counsel review of the deck alongside the privacy policy, and the new-tool intake gate. The sixth is: a real Clarity replay must be watched and the person who watched it named, because the privacy policy promises form input is masked and that promise is unverified until someone has looked.

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

- **Confirmed capabilities:** Security systems, access control, audio — these can be claimed. Lighting control, AC control, garage doors, motorised curtains and blinds, and wall controllers were confirmed on 2026-11-15 (Shivanshu: installed in clients' homes), so each has a solution page; the pages still name no maker and no figure
- **Licences held, and evidenced — these are verifiable facts, not claims:**
  - **Dubai trade licence: 897839**
  - **SIRA licence: SSP202210037219** — the Security Industry Regulatory Agency licence for security systems work. This is the strongest credential the brand currently has: it is state-issued, independently checkable, and directly relevant to the security half of the offer. Use it on the About page and wherever James & Emma are looking for evidence that the company is real and regulated
  - Both numbers are published in the Privacy Policy and Terms identity tables
  - **The licence evidences security work — it is not a warranty of anything else.** Do not stretch it into a general quality or safety claim, and do not imply SIRA endorses Smarthaus
  - **Regulated sector consequence:** a SIRA licence puts Smarthaus in a regulated sector, which Legal System §0 makes a `(counsel)` item — sector rules stack on top of privacy law. Open items are tracked in the privacy policy's placeholder register
- **The About page's promises are confirmed** (Shivanshu, 2026-10-07, as true of every job today): one team designs, installs and maintains; no finished home is photographed, no address published, no plan shared; footage stays on equipment in the house; no quote without a visit. The approach cards' facts were confirmed the same day: a technician and a technical lead spend about 90 minutes at the visit, the price that follows is fixed and itemised, and most jobs are in homes already lived in. Copy in the About page document in Sanity (seed: `sanity/seed/about-page.ts`). Its two photographs (`public/about/`) were chosen by Shivanshu as final after the cold-blue, non-residential look was raised against the visual direction. **Open:** confirm both are licensed for commercial use
- **TIS and Fibaro partnerships are confirmed** (formalised, confirmed by Shivanshu on 2026-10-06). The partner cards (`src/components/Partners/`, copy in the homepage document's Partners tab in Sanity, unmounted since 2026-11-14) say Smarthaus is a partner and installs each maker's systems, and nothing more: no tier ("certified", "authorised"), no figure and no superlative until one is confirmed with a source. The Studio refuses "certified", "authorised dealer", partner tiers, superlatives and the rest of the list in `src/sanity/claims.ts` in every copy field. Any other partner or brand reference still needs asking first, before an editor adds it as a card
- **The solution pages' pairings are confirmed** (Shivanshu, 2026-11-16): every pairing in the "Works with" sections has been delivered on a client's job, one app runs every system on every job, and gates are installed as well as garage doors. So a pair needs no pending mark, and the copy may say "in the same app". A new pairing an editor adds is a new claim: ask first
- **The six standards in the homepage's standards section are confirmed** (Shivanshu, 2026-11-16, as installed in clients' homes): CoSS (LifeSmart's own protocol), Matter, Zigbee, Wi-Fi, Z-Wave and Bluetooth, as marks only. Five are certification marks, shown pending counsel's review (`docs/launch-gate/accepted-risks.md`); the copy beside them claims no certification. `src/components/Connectivity/__tests__/protocols.test.ts` pins the list; a new one is asked first
- **The makers in the hero's rail are confirmed** (by the client, Shivanshu 2026-11-14): Lutron, Shelly, Control4, KNX, LifeSmart, Aqara, Loxone, Crestron, TIS and Fibaro, as marks only. The rail says nothing about any of them beyond the name a screen reader reads. `src/components/HomeHero/__tests__/brands.test.ts` pins the list; a new maker is asked first
- **"180+ Dubai projects" is confirmed** (Shivanshu, 2026-10-28; this wording 2026-11-04) for the hero's proofs, as is the 4.8 Google rating (2026-11-14). Both are the homepage document's proof line in Sanity; `src/components/HomeHero/__tests__/HomeHero.test.tsx` pins the seed's wording. The byline names one SIRA licence, singular
- **The four homepage figures are confirmed** (Shivanshu, 2026-10-07): Smarthaus's own record, not Maple Technologies', backed by its project and maintenance-contract records. They live in the homepage document's Figures tab in Sanity and change only when those records do; `src/components/Stats/__tests__/Stats.test.tsx` pins the seed's
- The company founding year is a placeholder. Never invent one
- "Sustainable Tomorrows" and similar unevidenced claims must not appear
- **If you find yourself writing a claim with no source, stop and ask.** Do not guess, do not interpolate from the brand name

---

## The blog

`/blog` lists every article and `/blog/<slug>` is one article (Figma 4900:2914 and 4898:2609, built 2026-11-14). Components in `src/components/Blog/`, schema in `src/sanity/schema/blog.ts`, seed in `sanity/seed/blog.ts`.

- **The one type editors create.** An article (`post`) is the only document that is not fixed: its route is built from its slug, so a new article needs no code. `getPosts()` reads them all in one list query (`getDocs` in `src/sanity/fetch.ts`, newest first, same cache tag); the index, each article and the sitemap share it. `routes()` in `src/sanity/content.ts` is `ROUTES` plus one route per article, and the sitemap and `llms.txt` read it.
- **What an editor can write.** A slug of lower-case words and hyphens; one to three tags from `BLOG_TAGS` (a fixed list, so the filter never fills with near-duplicates); text in paragraphs, two heading levels, lists, a quote, a box and pictures, nothing else. The claims audit runs over every line of the text.
- **The articles page's search** matches every word typed against titles and tags, and the tag filter narrows to one tag. The search is a line under its words with a button at the end, the filter a framed box with its arrow drawn in from the edge (Shivanshu, 2026-11-14); the list narrows as you type, so the button sends nothing and only puts the field down, closing a phone's keyboard. It chooses among the articles the server sent (`ArticleBrowser`, the one client island); while narrowing, the wide "latest" panel gives way to plain rows so no match hides behind it. No date filter (2026-11-14): with a handful of articles it narrows nothing.
- **Reading time, five minutes at most** (Shivanshu, 2026-11-15). Counted, never typed: the text's words at 238 a minute (Brysbaert, 2019), rounded up, pictures not counted (`src/lib/reading-time.ts`). A card shows it as a second line under the tag and the date, the arrow at its end, since one line does not hold all three on a 245px card; the article's details end with "read:". An article that reads longer than five minutes cannot be published (`readTimeRule`, beside the claims audit in `schema/blog.ts`), so the limit is held where the text is written, and the number shown is always the true one.
- **Related articles** are the three newest others, those sharing a tag first (`related()` in `ArticlePage.tsx`). Never picked by hand.
- **Search and sharing.** Each article has its own title, description and switch, its main picture as its share card (cropped by Sanity's image pipeline, requested only by the crawler of the site it is shared on), `og:type: article`, and BlogPosting structured data with a three-step breadcrumb (`articleGraph`). An article not in search has none of that and is not in the sitemap.
- **The four seed articles.** "One Home, Five Vendors" is Shivanshu's and is in search. The other three were drafted for his review and approved as written (2026-11-19); they stay out of search until each article's "Show in search" is turned on: anything they say about Smarthaus is limited to the confirmed facts in the claims audit below, and `src/sanity/__tests__/seed/blog.test.ts` pins that.
- **Back** on an article goes to `/blog`. The footer's "Articles" link is in the seed, the ci dataset and production (added to production 2026-11-15: no deployed branch read Sanity yet, so it could not show a link to a 404).

## Solution pages

`/solutions/<id>` is one solution from the nav's Solutions menu (Figma 4903:4464, built 2026-11-15): its picture on the screen's left half at full height with its name beside it; nine features round a picture and a dark box that asks for a site visit; the process, visit, install and maintain, a card each over its drawing; then its questions, the enquiry form and three articles, in that order on every solution page. Components in `src/components/Solution/`, schema in `src/sanity/schema/solution.ts`, seed in `sanity/seed/solutions.ts`, route `src/app/solutions/[slug]/page.tsx`.

- **Fixed documents, one per solution with a page.** `FIXED_DOCUMENTS.solutionPage` lists them (`solution-<menu id>`); `SOLUTION_SLUGS` in `src/sanity/content.ts` reads it, and every other address under `/solutions/` is a 404. Every solution in the menu has one since 2026-11-15 (cameras first, the other seven the same day). A new solution gets a page with one line there and a document; until then its menu item goes to `/solutions`, still the coming-soon page (`solutionLinks()` in `Nav.tsx`).
- **The picture is the menu item's** (site settings, "Nav: Solutions menu"), not the page's own, so the menu's picture and the page's are one file and the opening can grow one into the other. A page whose item has left the menu fails its build.
- **The opening** (Shivanshu, 2026-11-15). A click on a solution in the menu, from lg or on a phone, grows its picture into the page's in one native view transition (`openSolution()` in `Nav/SolutionsMenu.tsx`, CSS in `globals.scss`): about 900ms over the page it was opened from, which stays whole until the picture has come 90% of its way (66% of the time, on its curve) and then gives way to the new page in 90ms; the title rises in once the picture has landed (Shivanshu, the same day: the old page used to empty from the first frame). The navigation runs inside the transition, so the browser holds the old screen until the page and its decoded picture are there, at most `OPENING_WAIT_MS` (1.5s), after which the page arrives without the opening. Reaching a link (hover, focus, a finger landing) warms the page's picture at the page's own `sizes` (`src/lib/solution-picture.ts`), so nothing loads in view. While it runs `<html>` carries `data-solution-opening`: from lg the panel hides at once on the new page and the bar is its own layer above the picture. As the old screen is taken it carries `data-solution-leaving` instead, so from lg the old bar, open panel and all, is a layer of its own too, hidden from the first frame. The bar is named in `globals.scss` through `data-site-nav`, never in a CSS Module, which renames a `view-transition-name` as it does a class: until 2026-11-15 that kept every rule for the bar's layer from reaching it. Names are set only while it runs and removed after. No opening without the API, under reduced motion, for a click meant for a new tab, or on the page already open: a plain navigation. React's own `<ViewTransition>` was not used: it pairs elements that unmount and mount, and the menu stays mounted in the layout.
- **"Works with", under the hero** (Shivanshu, 2026-11-16). The page's solution as a square at the diagram's left, the solutions it is paired with (one to three) as sharp tabs in a column to its right, each wired to it, and a panel saying what each pairing does: a title, a When chip, a Then chip, a sentence and a link to that solution's page, pinned to the card's bottom left whatever is above it. Only the pairs are drawn; the other solutions are one menu away. Picking the middle shows its own one-line description and the solutions it pairs with by name ("Works with Smart lock, Garage and Lighting, in the same app"). Smarthaus is one system, not eight gadgets. A dark band, brown-950, from one edge of the screen to the other, its content in the page's column, its heading with no label above it (`data-ground="dark"` brings the light focus ring and cursor). `src/components/WorksWith/`: the header and a plain-text list of the pairs for a screen reader are server-rendered; the diagram and the panel are one client island (`Wiring.tsx`). Copy in each solution page document's "Works with" group (heading, line under it, this solution's own one-line description, the pairs); names are the Solutions menu's; icons are the homepage hardware carousel's (`public/hero/hardware/icons/`), cut from the text colour by CSS mask.
  - **The wiring is CSS, square and symmetrical.** The column always has three rows: three tabs fill them, two take the outer rows, one the middle, so the middle always faces the middle row. A wire has one turn at most: the middle row's runs straight across; the top one rises out of the middle's top edge, from its centre, and turns once into the top tab's middle; the bottom one is the same box set from the foot and turned over (`scale: 1 -1`), so the two are mirror images by construction. Every length comes from four sizes (the middle's side, a tab's height, the gap, the column's width), so nothing is measured. Wires are 2px, so each is centred exactly on the lines it follows. No inline styles: the strict CSP twin reports them.
  - **Motion, with a pause** (WCAG 2.2.2). Once on screen the panel steps down the column every 4.5s (a CSS animation's end is the timer, as the hardware carousel's), and the picked tab's wire fills with a glowing bar in the same time: up out of the middle, then across, brightest at its head, its glow rising until it reaches the tab. The timer, drawn. Transform and opacity only. It loops, so a pause button in the card's foot, opposite the link, stops it; the cycle stops for good once a tab is pointed at, focused or picked, and holds off screen. The diagram draws itself in once, if it was below the screen on load. Under reduced motion none of it starts and the button is never shown.
  - **What a reader gets.** The middle and every tab are buttons with `aria-pressed`, a tab named "Smart lock, works with Cameras"; the arrows walk them in order. Every panel is in the HTML, stacked in one cell, so the box never jumps and the hidden ones are hidden from everyone; a pick is announced in a polite live region of its own, the cycle never is.
  - **Colour, on the dark, and no ring.** The middle and the tabs are lit the same: linen (brown-100) with dark icons, square-cornered. Nothing sits on them: no ring, glow or dot (Shivanshu, 2026-11-16: "it looks very AI"). The pick is shown by its wire, lit bronze end to end once still (5.4:1 on brown-950), against the walnut track; under forced colours, where the system draws the wires, the picked box takes a Highlight border instead. `e2e/works-with.spec.ts` measures the geometry drawn, the symmetry, the icons and the link's place.
- **The grid.** Five by three from lg: the features flow in order round the picture (bottom left, two by two) and the dark box (the bottom row's last two); two columns from md with the box beside the ninth feature; one on a phone. The hairlines are the grid's own 1px gaps over ink at half strength. The dark box's line sits at its top left, left aligned, and its button at its bottom right (Shivanshu, 2026-11-15).
- **The features section is 4px under the design** (Shivanshu, 2026-11-15): a feature's title 20px over a 16px line, the box's line 20px, the icons 28px, the heading 4px under the page's h2. The standfirst went to 16px rather than 14px, so it never sits under the features' own lines.
- **The process, under the features** (Shivanshu, 2026-11-16). A heading and its line, centred, with nothing above them; then three framed cards in an `<ol>`, one column on a phone and a row from md: Site visit, Installation, Maintenance, each with its drawing large and centred at the top and its title and line left aligned at the foot. From md the cards share two rows (CSS subgrid), the drawings' and the words', so every title starts level and the longest line reaches the foot. Copy in each solution page document's "Process" group, exactly three steps; the seed gives all eight the same copy, drafted for review from the About page's confirmed promises (the visit, the record left at handover, maintenance and one number to call). The drawings are code's, not Sanity's (`PROCESS_DRAWINGS` in `SolutionPage.tsx`, files in `public/solutions/process/`), matched to the steps by order, decoration with an empty `alt` since each title says what it shows, lazy and sized 480 by 440.
- **The logo over the picture.** From lg the bar at rest lies on the picture, so the logo takes brown-100 (Shivanshu, 2026-11-15); the links and the button keep the dark ink, since they reach past the picture onto the page. Once the bar shrinks to its glass the logo is dark again. In the opening it turns over the last 40%, with the title, because the picture reaches the logo's corner only as it lands. CSS only (`:has([data-solution-picture])` in `Nav.module.scss`), as the homepage's dark hero does it.
- **Icons are Lucide's** (`lucide-react`, Shivanshu's call), picked in the Studio from `SOLUTION_ICONS`; `src/components/Solution/icons.ts` maps each to its component, and TypeScript holds the two lists together. Server-rendered SVG, no client code. A name the list no longer has fails the build.
- **The articles** are the newest three, those carrying the page's tag first (`byTags()` in `Blog/RelatedArticles.tsx`, shared with an article's related row).
- **All eight pages' copy was drafted for Shivanshu's review** (cameras, then lighting, audio, AC, garage, smart lock, wall controller and curtains, 2026-11-15) and approved as written (Shivanshu, 2026-11-19). Each stays out of search until its "Show in search" is turned on. It names no maker, no figure and no price, and says nothing about Smarthaus beyond the confirmed facts above (one team, the visit, the fixed and itemised price, most homes already lived in, footage kept in the house); the SIRA licence appears only on the two security pages, cameras and smart lock. `src/sanity/__tests__/seed/solutions.test.ts` pins all of that. Each feature picture lives in `public/solutions/<id>/features.(png|jpg)`.
- **All eight in production since 2026-11-15** (cameras, then the other seven, each set imported on its own; see "The seed" above), and the Studio's from then on. A new solution's document must be in production before code routing to it is deployed, or that build fails: a fixed document missing from its dataset always does. A dev server reading production caches the missing answer, so restart it once the document is there.

## Photography constraint

No client photography exists and none will be sourced. Client privacy makes it permanently unavailable — this is positioned as a discretion signal, not an apology.

**Never use stock photography of smart homes.** It is instantly recognisable and destroys credibility with this audience (Nadia and James & Emma will both clock it). The design carries itself on:

- Blender renders
- Typography and confident use of space
- Schematic diagrams
- The brand's visual identity

**One exception, temporary: the homepage hero strip** (`public/hero/hero_carousel/`, decided 2026-10-28). The client asked for lifestyle images there and Shivanshu confirmed they are licensed for our use. They are a stand-in, not a reversal of the rule: every card's picture is ticked "Temporary stock image" in the Studio, and `src/sanity/__tests__/seed/hero-carousel.test.ts` fails once the seed's last mark is cleared.

**The same exception covers the blog's pictures** (`public/blog/`, 2026-11-14): licensed stock, every picture ticked "Temporary stock image", and `src/sanity/__tests__/seed/blog.test.ts` fails once the seed's last mark is cleared. Every picture on the site is temporary: Shivanshu supplies all the replacements at once (2026-11-14).

**The same exception covers the solution pages' feature pictures** (`public/solutions/<id>/`, 2026-11-15): stock, ticked "Temporary stock image", and `src/sanity/__tests__/seed/solutions.test.ts` fails once the seed's last mark is cleared. Some show a maker's product or mark (eufy on cameras, SIFLY on the lock, a Google-style display on the wall controller), which no confirmed maker covers; see `docs/launch-gate/pre-launch-fixes.md`.

**The same exception covers the nav's Solutions menu** (`public/hero/navBar/`, decided 2026-10-28): licensed stock, temporary, every picture is ticked "Temporary stock image" in the Studio, and `src/sanity/__tests__/seed/solutions-menu.test.ts` fails once the seed's last mark is cleared.

---

## Metadata, structured data and crawlers

- **Every page's metadata goes through `pageMetadata()`** (`src/lib/metadata.ts`). Next merges metadata shallowly, so a page's own `openGraph` replaces the layout's whole object; before the helper, pages set none and all inherited the layout's `og:url` of `/`. The helper sets canonical and og:url from one `path`, carries the card images, writes the robots line, and throws at build when an indexable page's title or description is outside SEO System §2's ranges. The layout's metadata is only a fallback for the 404 and error pages, and names no URL.
- **The sitemap is the indexable pages, exactly.** Each page's "Show in search" in the Studio decides both its robots line and its place in the sitemap, and its date is its document's last edit (`ROUTES` in `src/sanity/content.ts`). `src/app/__tests__/sitemap.test.ts` derives the indexable set from every page's metadata and fails on any difference.
- **JSON-LD** (`src/components/Schema/`): the business and website once in the layout, a `WebPage` and `BreadcrumbList` on each indexable page, `FAQPage` on `/faq` once it is publishable. Confirmed facts only; no `sameAs`, `geo`, opening hours or ratings until each is real.
- **Crawlers:** every crawler is allowed, AI training crawlers included (decided by Shivanshu, 2026-09-28; SEO System §0a makes it a per-client call). `src/app/robots.ts` has one allow-all group, and its tests fail if any crawler is singled out. The Vercel Firewall must not block what robots.txt allows.
- **Metadata routes export only what Next allows**, like pages. Data they read lives in `src/content/`.

## Locale routing — no `/en` prefix at V1

The brief suggested building `/en` routing now. **This is deferred.** Rationale:

- Adding a locale prefix to every URL when only one language exists creates a redirect from `/` to `/en/` on every first visit — unnecessary latency
- Every internal link, canonical URL, and OG URL becomes longer for zero user benefit
- When Arabic ships (V2), Next.js i18n routing can add `/ar` as the non-default locale while English remains at `/` (the default locale needs no prefix)
- No existing URLs break. No redirects needed

**What V1 does instead:** CSS logical properties throughout (already done), `dir="ltr"` explicit on `<html>` (already done), Sanity schema with `en`/`ar` field structure (ready at schema time). The routing change is a V2 task that takes an afternoon, not an architecture decision that needs to be baked in now.

---

## Git workflow

- **Branches:** three, and no others (Shivanshu, 2026-11-10). `main` is production, `latest` is staging, and `version/2.0.0` holds everything not yet live on `main`. Work is committed to `version/2.0.0`, which reaches `latest` and then `main` by pull request. Dependabot opens no branches (`.github/dependabot.yml`)
- **Commits:** imperative mood, lowercase, concise. The diff tells what; the message tells why
- **No co-author attribution** on commits or PRs
- **Pre-commit:** Husky runs `lint-staged` — ESLint fix + Prettier + typecheck on staged `.ts`/`.tsx` files
- **PR:** one concern per PR. Title under 70 characters. Body has summary bullets + test plan
- **Deploy:** merge to `main` triggers Vercel production deploy. The Kill List is run by hand after every deploy, not automatically: see `docs/runbooks/deploy-and-rollback.md`. The other runbooks are in `docs/runbooks/`

---

## Dependency policy

Before adding any dependency, answer:

1. **Does it already exist in the codebase or stdlib?** Check first
2. **What does it cost?** Run `npx import-cost` or check bundlephobia. If it's > 10KB gzipped and only used in one place, inline the logic
3. **Does it touch user data?** If yes, check Security System §13 (supply chain) and Legal System §1 (lawful basis, data flow)
4. **Does it need a CSP change?** If yes, the CSP update ships in the same PR
5. **Is it maintained?** Last publish > 12 months with open security issues = no

**Explicitly banned:** GSAP, Framer Motion, Lenis, React Three Fiber, any scroll-hijacking library, GA4 on load, Meta Pixel on load, any chat widget SDK, any CMS page builder plugin.

**`lucide-react`** (2026-11-15, Shivanshu's call for the solution pages' icons). ISC licence, maintained, no data flow, no CSP change. Server Components only: each icon is an inline SVG in the HTML, so it ships no JavaScript, and only the icons `src/components/Solution/icons.ts` imports are bundled.

### three.js — the ban, and why it was lifted for the hero only

three.js was on the list above and is not any more. It is now a dependency, used
by exactly one component, `src/components/Hero/VillaCanvas.tsx`. Everything else
in the motion stack is unchanged, and **React Three Fiber and drei remain
banned** — they are a second React reconciler and a grab-bag, for no capability
the hero needs.

**Why the original reasoning did not hold.** CLAUDE.md's Blender-hero section
rejects runtime 3D on the grounds that "a 10MB WebGL bundle would blow the JS
budget on page one and exclude every mid-range phone in Dubai". That is a sound
argument about a large textured scene. It is not the scene we have. Measured
from the `.blend`:

|                   | Assumed           | Actual                             |
| ----------------- | ----------------- | ---------------------------------- |
| Triangles         | (a full 3D scene) | **30,528**                         |
| Textures          | (implied many)    | **zero**                           |
| Lights            | (implied a rig)   | **zero** — world background only   |
| Model on the wire | ~10MB             | **716KB** gzipped (3.1MB raw glTF) |

The model has since grown past the 304KB this table first recorded: the shipped
export is a richer scene than the one that was measured, and it is Draco-
compressed — see the Draco bullet below, which reverses the decision the earlier
revision of this file recorded.

**Why pre-rendered frames actually failed.** The 45-frame grid this replaced
cross-faded between adjacent viewpoints on pointer move. A cross-fade between
two _different_ camera angles is a double exposure: at 50% opacity every
vertical edge appears twice. The camera moved ~8px per step, far above the ~2px
where a dissolve reads as blur rather than as a ghost. No frame count and no
encoding fixes that — opacity is simply the wrong operator for rotation. The
choice was never "pre-rendered vs. real-time quality"; it was "visible ghosting
vs. no ghosting".

**What the exception is conditional on.** If any of these stops being true, this
decision should be reopened rather than extended:

- **Dynamic import, always.** three.js is in no initial chunk. It loads after
  the page is interactive, and only on a device that will use it.
- **The poster is never removed.** The server-rendered still is the LCP element
  and the first paint; the canvas fades in over it. Touch, `prefers-reduced-
motion`, `Save-Data`, 2g/3g and any WebGL failure keep the poster and load
  **no three.js at all**.
- **Draco, and the CSP change it needs — this reverses an earlier refusal.**
  A previous revision of this file refused Draco on the grounds that it saved
  140KB but cost a "752KB wasm decoder _and_ `wasm-unsafe-eval`". Both figures
  were wrong for what actually shipped. The decoder is **192KB** of wasm plus a
  58KB wrapper, not 752KB, and it is cached independently of the model. The
  model itself is no longer the 1.6MB scene that was measured — the shipped
  export is richer, and uncompressed it is far past the point where gzip alone
  is acceptable on a Dubai mobile connection.

  `public/hero/villa.glb` declares `KHR_draco_mesh_compression` in
  `extensionsRequired`, so this is not a tuning knob: without the decoder the
  model cannot be parsed at all.

  **What it costs in policy, stated plainly.** Two directives in
  `next.config.ts`:
  - `'wasm-unsafe-eval'` in `script-src` — permits WebAssembly compilation
    **only**, and still forbids JavaScript string evaluation. It is not a step
    toward `'unsafe-eval'`.
  - `worker-src 'self' blob:` — DRACOLoader assembles its decoder worker from a
    Blob, so the worker URL is `blob:`. Scoped to workers alone; it does not
    allow `blob:` as a script or frame source.

  Both are reviewed against Security System §8. The decoder is **self-hosted**
  under `public/draco/`, never a public CDN, so the only wasm module that can be
  compiled is one this repo ships. That self-hosting is the condition the
  exception rests on — if the decoder ever moves to a CDN, this decision is
  reopened.

  The decoder is Google's Draco under Apache-2.0, so `public/draco/` carries
  `LICENSE` (the full text) and `NOTICE` (upstream, copyright, and the three.js
  version it was copied from). The two decoder files are byte-identical to
  `three/examples/jsm/libs/draco/gltf/`; `src/components/Hero/__tests__/draco.test.ts`
  fails when a three.js upgrade leaves them stale, and when anything unlicensed
  lands beside them.

- **One consumer.** If a second component wants three.js, that is a new
  decision, not a precedent.

The JS budget in `lighthouserc.json` covers the initial load, which the dynamic
import keeps clear. If the hero's chunk ever starts counting against it,
re-baseline deliberately and record why — see the budget note in CLAUDE.md.

---

## Testing policy: 1:3, enforced

**Every line of code carries three lines of test.** This is a standing rule, set by Shivanshu on 2026-09-26, and it is enforced by machines rather than by review. Missing it is not an option under any condition, including a deadline.

### What is counted

`scripts/test-ratio.mjs` is the only place the counting rules live. In short:

- **Code** is the non-blank lines of `src/**/*.{ts,tsx}`, excluding tests, `index.ts` barrels and `.d.ts` files. `src/content/*.ts` counts as code, because copy and tables ship to users and can be wrong.
- **Tests** are the non-blank lines of `src/**/__tests__/**`, `src/**/*.test.{ts,tsx}` and everything under `e2e/`, fixtures and helpers included.
- Blank lines are dropped on both sides. Finder duplicates (`name 2.ts`) are skipped.

Run it with `pnpm test:ratio`.

### The two gates

**Ratio** (`scripts/test-ratio.mjs --base <ref>`). The repo started at 0.43:1, so an absolute 3:1 check would be red on every PR until the backlog is paid, including the PRs that pay it. A permanently red gate hides real regressions (see the JS budget note in CLAUDE.md). So until the tree reaches 3:1, a PR passes only when both hold:

1. its new code carries three times its lines in new tests;
2. the overall ratio did not fall.

Once the tree is at 3:1 the absolute check applies and the ratchet no longer matters.

**Coverage** (`scripts/coverage-gate.mjs --base <ref>`). Line counts alone can be padded, so coverage proves the tests exercise the code:

1. **Floor:** global line and statement coverage may not fall below `coverage-baseline.json`. Raise it with `pnpm coverage:raise` after adding tests, and commit it. It only ever goes up. Functions and branches are reported but not floored: Jest counts them only in files a test loads, so the first test for an untested file lowers their percentage (measured: lines 30% to 45%, branches 77.9% to 76.7%, in a change that only added tests).
2. **Changed lines:** every executable line a PR adds or changes must be run by a test, and at least 90% of the branch arms on those lines must be taken. Blank and comment-only lines are exempt. Untested old lines in the same file are backlog, measured by the ratio, not a condition on the fix (decided 2026-09-26: holding a one-line fix to the coverage of the whole file around it turned every bug fix into a backfill project).

### What runs where

| Where                           | What                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Pre-commit                      | ESLint, Prettier, whole-project `tsc` on staged files (`lint-staged`)                             |
| Pre-push (`.husky/pre-push`)    | Typecheck, Jest with coverage, both gates against `origin/latest` (override with `PRE_PUSH_BASE`) |
| CI (`.github/workflows/ci.yml`) | Everything, on every PR into `latest` or `main` and every push to them                            |

The CI jobs, which are the required status checks:

- `static`: lint, typecheck, production build, cascade layer order in every CSS chunk (`scripts/assert-layer-order.mjs`)
- `unit`: Jest with coverage, the coverage gate, the ratio gate
- `e2e (Desktop Chrome)`, `e2e (iPhone 17)`, `e2e (Galaxy S24)`: the Playwright suite per device, with axe. iPhone 17 is the current base iPhone width (402 CSS px, WebKit); Galaxy S24 is the narrow Android width (360 CSS px, Chromium). A project name sets screen size, density, user agent and touch only; the engine is Playwright's current build
- `e2e-extra`: specs tagged `@forced-colors` and `@zoom`, in the `forced-colors` and `zoom-200` projects
- `lighthouse`: `lighthouserc.json` against the production build: `/`, `/pricing` and `/contact`, mobile, measured throttling (see the Lighthouse note in CLAUDE.md)

Not required, and visible on every PR: `delivery`, one real email through Resend.

`scripts/__tests__/ci-workflow.test.ts` fails if any of these jobs is renamed, removed, or allowed to fail quietly.

### Branch protection

A repository ruleset, "protect latest and main" (Settings, then Rules, then Rulesets), set 2026-09-26. A ruleset rather than classic branch protection: one ruleset covers both branches, the bypass list is explicit, and each required check is pinned to the GitHub Actions app so nothing else can report it green.

- Enforcement active, bypass list empty: nobody, the owner included, skips it.
- Targets `latest` and `main`.
- Deletions and force pushes blocked.
- Pull request required, 0 approvals (a sole author cannot approve their own PR), conversation resolution required.
- Every check listed above required, source GitHub Actions, and the branch must be up to date before merging.

Required checks are matched by job name. Renaming a job or a Playwright project leaves the ruleset waiting for a check that never reports, and nothing can merge. Change the ruleset in the same sitting as the rename, once the renamed checks have run on the PR.

Repository secrets `RESEND_API_KEY`, `LEAD_EMAIL`, `LEAD_FROM_EMAIL` go to the `delivery` job only. `QERA_SYSTEM_DEPLOY_KEY`, the private half of a read-only deploy key on the private `qera-system` repo, goes to the `unit` job only, so it can check out the submodule that `src/__tests__/docs-consistency.test.ts` reads. Every other e2e job writes the emails its form tests produce to a mail sink (`.e2e-mail/`, read back by `e2e/mail.ts`), because sending them all for real exhausted the Resend account's monthly quota on 2026-09-26. The sink needs both `PLAYWRIGHT=1` and `E2E_MAIL_SINK`, and no deployment sets `PLAYWRIGHT`. The `delivery` job sends one real email per run (`e2e/delivery.spec.ts`, `E2E_REAL_MAIL=1`). It is deliberately not a required check: it fails when Resend refuses a send, which is a fact about the account, not the code. It is visible on every PR.

### When a test fails

**A failing test is a finding, reported to Shivanshu with its output.** It is never fixed by weakening, skipping, retrying or deleting the assertion. If the test is right and the code is wrong, fix the code. If the test encodes a decision that has changed, say which decision and ask. A test that only passes on retry is flaky, and flaky is a failure: CI runs with `failOnFlakyTests`, so a flaky pass blocks the merge.

### Writing tests

- **Unit (Jest + RTL):** behaviour only; jsdom does not apply CSS Modules, so never assert appearance. CSS Module class lookups go through a strict proxy (`__mocks__/strictStyleProxy.js`) that throws on an impossible key.
- **Console guard:** `jest.setup.ts` fails any test that writes `console.error` or `console.warn`. A test that expects a log spies on `console` and asserts on it.
- **E2E (Playwright + axe):** every route loads, has one `<h1>`, and passes axe, on all three devices. The shared checks live in `e2e/checks.ts`: `expectAccessible` (axe with every rule, no tag filter), `expectNoHorizontalOverflow` (against `clientWidth`, no slack) and `expectNoEmDash` (`textContent`, so a closed `<details>` is read too). Specs import axe only through it; ESLint enforces that. Workers are fixed at three locally and two in CI: at the default count WebKit timed out under load, and the CI runner is smaller.
- **Lighthouse:** thresholds live in `lighthouserc.json` and nowhere else.
- **Placeholders:** content carrying a `pending` marker has a test that fails once the marker is cleared, so publishing is a deliberate act.

---

## Known tech debt and open items

| Item                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Action                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_reset.scss` reduced-motion uses `!important` | Works but fights the token system. Design-system architecture spec says zero the duration tokens instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Refactor when token architecture is implemented. The `!important` override will conflict with component-level duration tokens                                                                                                                                                    |
| CSP is restrictive for current scope only      | All `'self'` — will break when third parties are added                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Update per the CSP table above, in the same PR that adds each service                                                                                                                                                                                                            |
| Per-page OG images not built                   | Site-wide cards only (`public/og-image.png` 1200×630 + `public/og-image-square.png` 1200×1200, declared in `layout.tsx`). Inner pages need dynamic OG via `opengraph-image.tsx` (ImageResponse API) or static Blender renders                                                                                                                                                                                                                                                                                                                                                 | Part of launch gate. Being handled separately                                                                                                                                                                                                                                    |
| `twitter:site` / `twitter:creator` not set     | Both need a real @handle and the brand has no X account yet — the footer's X link is a bare `https://x.com/` placeholder. Omitted rather than invented: X silently drops an invalid handle, and a non-resolving claim is worse than none. Affects X only; no other platform reads these tags, and neither renders as visible text on a modern card                                                                                                                                                                                                                            | Post-launch. Add `site: "@handle"` to the `twitter` block in `src/app/layout.tsx` once the account exists. Skip `creator` unless Journal posts get named authors — it is for bylined content                                                                                     |
| Social profile links are placeholders          | `src/components/Footer/socials.ts` points WhatsApp at a real number but Instagram, Facebook, X and LinkedIn at bare domains (`https://x.com/`, etc.), so they land on each platform's homepage rather than on Smarthaus. Each carries `pending` and an accessible name ending "(profile coming soon)", so a screen reader is not told it is the Smarthaus profile                                                                                                                                                                                                             | Replace with real profile URLs before launch. User-facing, not just metadata                                                                                                                                                                                                     |
| `/faq` unconfirmed facts, noindex + no schema  | Five answers in the FAQ document in Sanity carry pending notes, and one a `{braced}` value: the founding year, the visit fee, what the price includes, the payment split, and the three designer commitments. No answer quotes a price: the site discloses none for now (Shivanshu, 2026-11-04). A brace renders through the `<Placeholder>` marker, and the Studio refuses one without a note. While any note is left, `isFaqPublishable` (`src/sanity/content.ts`) keeps the page `noindex`, out of the sitemap and without FAQPage JSON-LD, whatever "Show in search" says | **Launch gate.** Confirm each with Sunil, clear every note and brace in the Studio, and turn on "Show in search" for the FAQ page. Then invert the two assertions in `e2e/faq.spec.ts:78`, and clear the seed the same way (`sanity/seed/faq-page.ts`) so the ci dataset matches |
