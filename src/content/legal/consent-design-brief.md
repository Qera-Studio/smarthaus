---
title: Cookie Banner — Design Brief
slug: null # design spec, not a page
version: 0.1.0-draft
status: Content locked for design. Copy is final-draft; layout is yours.
lastUpdated: 2026-09-13
companion: consent-content-deck.md # the legal reasoning behind every string here
---

# Cookie Banner — Design Brief

Everything you need to lay this out: every string, every control, every state.
The legal reasoning lives in `consent-content-deck.md` — this document is just
the content and the constraints, so you can design around it.

**Two surfaces to design:**

1. **The banner** — first visit, one decision, three buttons
2. **The preferences panel** — opened from the banner, two rows with toggles

Plus **two small additions** to existing surfaces: a footer link, and two
checkboxes on the contact form.

---

## SURFACE 1 — The banner

### Content inventory

| Slot     | Text                                                                                                                                                                      | Notes for layout                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Heading  | `Cookies`                                                                                                                                                                 | 7 characters. Optional — see below             |
| Body     | `We use cookies that keep this site working, and we would like to use analytics cookies to understand which pages are useful. Analytics stays off unless you turn it on.` | 34 words / ~185 characters. Wraps to 2–3 lines |
| Button 1 | `Accept analytics`                                                                                                                                                        | 16 chars                                       |
| Button 2 | `Decline`                                                                                                                                                                 | 7 chars                                        |
| Button 3 | `Choose what to share`                                                                                                                                                    | 20 chars                                       |
| Link     | `How we use cookies`                                                                                                                                                      | 18 chars → `/privacy#cookies`                  |

**Total: 6 elements.** Nothing else goes in the banner. No logo, no icon, no
illustration, no close X (see "No dismiss button" below).

### The heading is optional

`Cookies` as a heading is almost redundant — the body says it immediately. If
your layout reads better without it, drop it. If you keep it, alternates:

- `Cookies` — plainest
- `A note on cookies` — warmer, more Smarthaus
- `Before you look around` — warmest, slightly precious

**Never** `We value your privacy` or `Your privacy matters to us`. Both are
hollow and appear on every site that means them least.

### Buttons — the one hard design constraint

```
┌──────────────────┐  ┌──────────┐  ┌──────────────────────┐
│ Accept analytics │  │ Decline  │  │ Choose what to share │
└──────────────────┘  └──────────┘  └──────────────────────┘
        equal weight — equal weight — equal weight
```

**All three buttons must carry the same visual weight.** Same size, same
contrast, same treatment. This is not a stylistic preference:

- A greyed-out or ghosted `Decline` against a solid `Accept` is **interface
  interference**, a named dark pattern, and a `[Base]` non-negotiable in the
  Design System.
- **If the three cannot be equal in your layout, reduce `Accept` — never promote
  `Decline`.**

What that rules out:

- ❌ Accept as filled bronze, Decline as a text link
- ❌ Accept 100% opacity, Decline 60%
- ❌ Accept large, Decline small
- ❌ Decline hidden behind `Choose what to share`

What works:

- ✅ Three outline buttons, identical
- ✅ Three filled buttons in the same tone
- ✅ Accept and Decline identical, `Choose what to share` as a third equal peer
- ✅ Accept and Decline as the pair, `Choose what to share` as a link **below**
  them (a link is fine for the _third_ option, since it is not a decline)

### Ordering

`Accept` first reads naturally left-to-right and is what most people want. But
the order is yours as long as weight is equal — `Decline` first is also
defensible and slightly more generous.

**RTL note:** Arabic ships in V2 and the codebase already uses logical
properties. Do not bake left/right into the design language — think
start/end.

### No dismiss button

**There is no ✕ close button.** Reasoning:

- Dismissing without choosing is _not_ consent, so a ✕ would have to behave
  identically to `Decline` — at which point it is a second, less clear decline
  control.
- Two controls that do the same thing, one of them ambiguous, is trick wording.

`Escape` on the keyboard does dismiss it (and counts as decline, nothing
stored), but that needs no visual affordance.

### Layout constraints

| Constraint                  | Value                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not a modal**             | Must not block the page or trap focus. A visitor can read the site and ignore it                                                                                                   |
| **No overlay / scrim**      | Follows from the above — no dimming the page behind it                                                                                                                             |
| **Cannot be a cookie wall** | Content stays reachable. Consent is not free if the site is held hostage                                                                                                           |
| **Mobile: watch the nav**   | Below `lg` the nav is a **fixed bottom bar** — 64px tall, floating 16px off the bottom edge, plus `env(safe-area-inset-bottom)`. A bottom-anchored banner **will collide with it** |
| **Desktop: nav is top**     | From `lg` up the nav is a top capsule, so the bottom edge is free                                                                                                                  |

**The mobile collision is the main layout problem to solve.** Three options:

1. **Banner above the nav** — stack it, so nav sits at the very bottom and the
   banner floats above it. Needs
   `calc(64px + 16px + env(safe-area-inset-bottom))` of clearance.
2. **Banner at the top on mobile**, bottom on desktop. Different anchor per
   breakpoint.
3. **Full-width bottom sheet that temporarily displaces the nav.** Riskiest —
   the nav is primary navigation and should not disappear.

I'd take option 1 — it keeps both anchored and predictable. Your call.

### Sizing suggestion, not a rule

- Desktop: a bar or a card in one corner. The content is short enough for a
  single line of body text at ~600px wide
- Mobile: full width, body wraps to 3 lines, buttons stack or sit in a row of
  three if they fit at 390px — `Accept analytics` + `Decline` fit side by side;
  `Choose what to share` likely needs its own line

### Assembled

> **Cookies**
>
> We use cookies that keep this site working, and we would like to use analytics
> cookies to understand which pages are useful. Analytics stays off unless you
> turn it on.
>
> [ Accept analytics ] [ Decline ] [ Choose what to share ]
>
> How we use cookies →

---

## SURFACE 2 — The preferences panel

Opened by `Choose what to share`, and from the footer link on any page.

### Content inventory

| Slot            | Text                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading         | `Cookie preferences`                                                                                                                                                                                                              |
| Intro           | `Analytics is off until you turn it on, and you can change this at any time. Declining changes nothing about how the site works for you.`                                                                                         |
| **Row 1 label** | `Essential`                                                                                                                                                                                                                       |
| Row 1 control   | `Always on` — a **disabled, visibly-on** state. Not an interactive toggle                                                                                                                                                         |
| Row 1 body      | `Remembering your cookie choice, keeping the site secure, and rejecting spam submissions. The site cannot work without these, so there is no choice to offer — we would rather say that than present a switch that does nothing.` |
| **Row 2 label** | `Analytics`                                                                                                                                                                                                                       |
| Row 2 control   | Toggle, **default OFF**                                                                                                                                                                                                           |
| Row 2 body      | `Google Analytics and Microsoft Clarity. These tell us which pages people read, where they scroll, and where they give up — so we can fix the parts that are not working.`                                                        |
| Row 2 detail    | `Clarity records how a page is used, including clicks and scrolling. Anything typed into a form is masked and never recorded.`                                                                                                    |
| Row 2 retention | `Stored for up to 14 months. Neither tool is used to advertise to you.`                                                                                                                                                           |
| Button 1        | `Save preferences`                                                                                                                                                                                                                |
| Button 2        | `Accept analytics`                                                                                                                                                                                                                |
| Withdrawal note | `Changed your mind? Open cookie preferences from the footer of any page. Turning analytics off stops it immediately.`                                                                                                             |

### Two rows. That is the whole model.

Only two categories, because the tag container holds analytics only — GA4 and
Clarity. **Do not design for three or four categories**; there is no marketing
or advertising category, and inventing empty ones to look thorough would be
mislabelling.

```
┌────────────────────────────────────────────────────────┐
│  Cookie preferences                                    │
│                                                        │
│  Analytics is off until you turn it on, and you can    │
│  change this at any time. Declining changes nothing    │
│  about how the site works for you.                     │
│                                                        │
│  ────────────────────────────────────────────────────  │
│                                                        │
│  Essential                              [ Always on ]  │
│  Remembering your cookie choice, keeping the site      │
│  secure, and rejecting spam submissions. The site      │
│  cannot work without these, so there is no choice      │
│  to offer — we would rather say that than present      │
│  a switch that does nothing.                           │
│                                                        │
│  ────────────────────────────────────────────────────  │
│                                                        │
│  Analytics                                  [  ○──  ]  │
│  Google Analytics and Microsoft Clarity. These tell    │
│  us which pages people read, where they scroll, and    │
│  where they give up — so we can fix the parts that     │
│  are not working.                                      │
│                                                        │
│  Clarity records how a page is used, including         │
│  clicks and scrolling. Anything typed into a form      │
│  is masked and never recorded.                         │
│                                                        │
│  Stored for up to 14 months. Neither tool is used      │
│  to advertise to you.                                  │
│                                                        │
│  ────────────────────────────────────────────────────  │
│                                                        │
│  [ Save preferences ]        [ Accept analytics ]      │
│                                                        │
│  Changed your mind? Open cookie preferences from the   │
│  footer of any page. Turning analytics off stops it    │
│  immediately.                                          │
└────────────────────────────────────────────────────────┘
```

### The Essential row control

**Render as disabled and visibly on.** Not an interactive toggle that silently
refuses — a switch that looks operable but is not is a dark pattern in control
form.

Options that work:

- A text pill reading `Always on`
- A toggle drawn in the on position, visibly disabled (reduced contrast is
  correct _here_, because it genuinely is not interactive)

Either way it must be clear that this is information, not a choice.

### The Analytics row has three paragraphs

This is deliberate and they should stay visually distinct — a designer's
instinct will be to merge them into one block:

1. **What it is** — the two tools and what they tell us
2. **The Clarity disclosure** — session recording, and the masking promise
3. **Retention + the no-advertising statement**

Paragraph 2 is the one a careful reader would object to if they found it
undisclosed. It earns its own visual separation — a slightly indented block, a
lighter weight, or just clear spacing. Do not bury it.

### Buttons

Two buttons, and here the hierarchy **may** differ — neither is a decline, so
interface-interference rules do not bite:

- `Save preferences` — commits whatever the toggles currently say
- `Accept analytics` — a shortcut that turns analytics on and saves

`Save preferences` is the primary action of this panel. `Accept analytics` can
be secondary.

### Panel or page?

Your call. It can be a panel over the page, a sheet from the bottom, or an
expanded state of the banner itself. Requirement: reachable from the **footer of
every page**, permanently, because withdrawal must be as easy as consent.

---

## SURFACE 3 — Returning visitor and edge states

Small, but they need designing or they will be improvised in code.

| State                   | What shows                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Preferences saved, on   | Nothing. No banner. Footer link reads `Cookie preferences`                               |
| Preferences saved, off  | Nothing. Same footer link                                                                |
| Inside the panel, on    | `Analytics is on. Change this in cookie preferences.`                                    |
| Inside the panel, off   | `Analytics is off. Change this in cookie preferences.`                                   |
| Consent expired (12mo)  | Full banner + line: `It has been a while since we asked, so we are checking again.`      |
| New tool added          | Full banner + line: `We have added a tool since you last chose, so we are asking again.` |
| Reduced motion          | Banner simply present — no slide, no fade                                                |
| JavaScript off          | **No banner at all.** Both tools need JS, so the visitor is already untracked            |
| Do Not Track / GPC sent | **No banner.** Treated as a decline automatically                                        |

**The two re-ask lines are the only extra copy in these states.** They sit above
or below the normal body text — your choice.

### Nagging is prohibited

A decline holds for **12 months**. No re-prompt on the next page, no second ask
on a later visit, no reminder. The only two permitted re-asks are the ones in the
table: genuine expiry, and a materially new tool.

Design implication: there is **no "remind me later" state to design**, and no
re-entry nudge. The footer link is the only way back in.

---

## SURFACE 4 — Footer link

| Slot | Text                 |
| ---- | -------------------- |
| Link | `Cookie preferences` |

A real text link with a discernible name. **Not an icon alone.** Sits with the
other legal links — alongside `Privacy Policy` and `Terms and Conditions`.

Relevant: a `Footer` component appears to be in progress in a sibling working
directory. These three links belong together there.

---

## SURFACE 5 — Contact form additions

Two checkboxes above the submit button. Both are **unticked by default** — a
pre-ticked consent box is a named dark pattern.

### Checkbox 1 — required

| Slot        | Text                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Label       | `I would like Smarthaus to contact me about this enquiry.`                                                    |
| Marker      | `(required)` — visible text, **not colour alone**                                                             |
| Helper text | `We use your details to answer your enquiry and nothing else. Read how we handle them in our Privacy Policy.` |
| Error       | `Please confirm you would like us to contact you about your enquiry.`                                         |

`Privacy Policy` in the helper text is a link to `/privacy`.

### Checkbox 2 — optional

| Slot  | Text                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| Label | `Occasionally send me new projects and ideas. No more than a few times a year, and you can stop at any time.` |

Never required, never pre-ticked, never gates submission. Marketing consent has
to be separate from service consent — this box is that separation.

### Success state

| Slot    | Text                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| Heading | `Thank you — we have your enquiry.`                                                                               |
| Body    | `We reply to every enquiry, usually within one working day. If it is easier to talk now, message us on WhatsApp.` |

`WhatsApp` is a link.

### Error styling

The error message attaches to the checkbox, not the whole form. **Do not
red-flash the entire form** — one field failed, and the design should say which.

---

## Design constraints summary

Pin these three above your canvas:

1. **Decline is as prominent as Accept.** Equal size, contrast, treatment. If
   they cannot be equal, shrink Accept.
2. **Not a modal.** No scrim, no focus trap, no blocked content.
3. **Mobile nav is at the bottom** — 64px + 16px float + safe-area. Plan the
   collision.

### Accessibility floor (affects visual decisions)

| Requirement                   | Design consequence                                                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrast 4.5:1 body           | Body text must clear it on whatever ground you choose                                                                                                                                                                                               |
| Contrast 3:1 UI               | Button borders, toggle tracks, focus rings                                                                                                                                                                                                          |
| **Bronze is decorative only** | `--color-accent` is 2.9:1 on canvas. It **cannot** carry button text on light ground. Use `--color-accent-text` where bronze must be readable                                                                                                       |
| Focus visible                 | Every control needs a visible focus ring — 2px, `--color-border-focus`                                                                                                                                                                              |
| Real controls                 | Toggles are `<button role="switch">` or a checkbox. Never a styled `<div>`                                                                                                                                                                          |
| Reduced motion                | No entrance animation under `prefers-reduced-motion`                                                                                                                                                                                                |
| Target size                   | **24×24 CSS px minimum** (WCAG 2.2 · 2.5.8), 44×44 best practice, **44px floor on coarse pointers** — so the mobile toggles and checkboxes are 44px. Owned by the Accessibility System → Input Modalities; quoted here because it is a layout input |

### Tokens available

Existing tokens, so the banner matches the nav rather than inventing a language:
`--color-bg-surface`, `--color-bg-canvas`, `--color-border`,
`--color-text-primary` / `-secondary` / `-muted`, `--radius-md` / `-lg`,
`--shadow-lg`, `--space-*`, `--type-small` / `-body`.

There is also a `glass()` mixin — a brown-tinted frosted panel, used by the nav
capsule. Worth considering for the banner so the two read as one system.

---

## Banned copy — do not reintroduce while redesigning

Every one of these is a named dark pattern or a false claim. Designers reach for
several of them by instinct.

| Never                                         | Why                                          |
| --------------------------------------------- | -------------------------------------------- |
| `We value your privacy`                       | Hollow                                       |
| `Accept all`                                  | Overstates — only analytics is accepted      |
| `Only necessary` as the decline label         | Sounds like a compromise, not a refusal      |
| `No thanks, I don't want a better experience` | Confirm shaming                              |
| `Maybe later` / `Not now`                     | Implies we will ask again — nagging          |
| `By continuing to browse you agree`           | Implied consent is not consent               |
| `This site is PDPL compliant`                 | Warrants an outcome that cannot be warranted |
| `Essential cookies (including analytics)`     | Mislabelling — analytics is never essential  |
| `Required for the best experience`            | Trick wording                                |
| A pre-ticked box                              | Basket sneaking                              |
| A greyed-out Decline                          | Interface interference                       |
| A cookie wall                                 | Consent is not free if content is withheld   |
| An exclamation mark anywhere                  | Brand voice — precise, warm, unhurried       |

---

## What is still open

Content is locked and safe to design against. Two caveats:

- **Copy is counsel-pending.** A UAE lawyer reviews this with the privacy policy.
  Wording could shift slightly; the **structure and control set will not**, so
  designing now is safe.
- **The required checkbox carries a recorded objection** (§6.1 of the content
  deck). It bundles consent with getting a reply, which is why it was narrowed to
  consent for one specific thing. If it is later dropped for the notice-only
  variant, **checkbox 1 becomes a line of static text** and checkbox 2 stays.
  Worth designing the form so that swap is not a rebuild.
