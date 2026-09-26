---
title: Consent & Cookie Banner — Content Deck
slug: null # not a page; this is the source deck for the banner component
version: 0.1.0-draft
status: DRAFT — copy for review. Component not yet built (content-first, by request).
lastUpdated: 2026-09-13
governingRegime: UAE Federal PDPL (Decree-Law 45/2021) — see Legal Basis below
---

<!--
================================================================================
READ THIS FIRST — WHAT THIS DOCUMENT IS, AND THE PREMISE IT CORRECTS
================================================================================

This is the complete content set for a consent banner, a preferences centre, and
the form-consent copy, for a site adding Google Tags (GA4) and Microsoft Clarity.

THE PREMISE CORRECTION. This deck was requested as content "according to the UAE
privacy act." Two things are wrong with that framing, and the deck is built on
the corrected version:

  1. There is no "UAE Privacy Act." The instrument is the federal PDPL, Federal
     Decree-Law 45/2021. Per the Legal System's September 2026 re-verification,
     its EXECUTIVE REGULATIONS ARE STILL NOT LOCATABLE ON OFFICIAL UAE SOURCES.
     The 6-month compliance clock has not started. Secondary commentary claiming
     otherwise is specifically flagged as unreliable on this exact question.

  2. UAE LAW DOES NOT MANDATE A COOKIE BANNER. Legal System §6 states that none
     of India/UAE/Australia currently mandates an EU-style cookie consent banner
     the way GDPR/ePrivacy does, and warns in BOTH directions: "Don't over-apply
     GDPR cookie law where it doesn't bind; don't under-apply transparency where
     it does."

So no copy in this deck may be labelled "PDPL-compliant" or presented as
required by a named UAE rule. Doing so would invent a legal basis — the anti-
pattern the Legal System bans outright ("We are GDPR/PDPL compliant" claims).

WHAT THE BANNER IS ACTUALLY FOR. The requirement is real, but it comes from the
PRINCIPLES rather than from banner-specific rules:

  - PDPL/Legal §1: processing needs a LAWFUL BASIS, and consent must be free,
    specific, informed, unambiguous, and as easy to withdraw as to give.
  - Legal §6: "where the regime requires consent for non-essential tracking,
    obtain it BEFORE FIRING." Analytics is not essential to serving the site.
  - Legal §6: consent RECORDS kept — what was consented to, when, which notice
    version.
  - Legal §5: the policy must NAME every third party that receives data.

THE ACTUAL TRIGGER IS CLARITY, NOT GOOGLE. Google Tags loading GA4 is ordinary
analytics. Microsoft Clarity is SESSION RECORDING — it replays real sessions
including scroll, clicks, and pointer movement. On a site with an enquiry form,
an unmasked replay can capture what a person typed into a form field: name,
phone number, property address. That is personal data reaching Microsoft for a
purpose the user never agreed to, and it is why:
  - consent must gate Clarity before it loads, AND
  - Clarity masking is a hard configuration requirement, not a preference, AND
  - this likely trips a DPIA screen (Legal §1 names "new tracking technology"
    and "large-scale or systematic processing" as triggers) → (counsel).

DECISIONS TAKEN (recorded so the reasoning survives):
  - GTM scope: ANALYTICS ONLY (GA4 + Clarity). No ad or remarketing tags. So the
    banner has TWO categories, not three. §"Adding a marketing category" below
    states exactly what must change if that ever arrives.
  - Clarity: MASK ALL FORM INPUT. Strictest masking. Heatmaps and scroll still
    work; typed content is never captured.
  - Form consent: REQUIRED CHECKBOX, at the client's explicit direction, built in
    the defensible form. See the pushback note in §6 — this is the one choice in
    this deck that carries a live objection, and the alternative copy is supplied
    so switching is a copy change, not a rebuild.

COUNSEL STATUS: this deck is (co-counsel) like the policy it extends. The DPIA
screen and the Clarity data-flow are (counsel). Do not ship the banner as
"legally approved" until the same lawyer reviewing the privacy policy has seen
this too — they are one review, not two.
================================================================================
-->

# Consent & Cookie Banner — Content Deck

Everything the banner, the preferences centre, and the form need to say. Copy is
final-draft quality and written to the Smarthaus voice: precise, warm, unhurried,
no exclamation marks, no urgency, no pressure.

---

## 1. Legal basis — what this is and is not built on

**Do not put this section on the website.** It exists so the reasoning is on the
record and so nobody later claims a basis the site does not have.

| Question                                        | Answer                                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is a cookie banner legally mandated in the UAE? | **No.** Legal System §6 — no UAE/India/AU regime currently mandates an EU-style banner.                                                                                                                 |
| Then why build one?                             | Because analytics and session recording need a **lawful basis** and **informed consent before firing** (PDPL principles, Legal §1/§6), and because Clarity records sessions on pages that carry a form. |
| Which law governs?                              | Federal PDPL (Decree-Law 45/2021) — **assumed**, pending confirmation the entity is not DIFC/ADGM. Same open item as the privacy policy.                                                                |
| Are the PDPL executive regulations published?   | **Not locatable on official sources** as of the Legal System's September 2026 check. Publication starts a 6-month clock — watch it.                                                                     |
| Do GDPR rules apply?                            | **No** — confirmed UAE-residents-only scope. If EU/UK marketing ever starts, this is out of scope entirely → escalate.                                                                                  |
| What must never be claimed?                     | That the banner makes the site "PDPL compliant." Describe practices, never warrant outcomes.                                                                                                            |

**The honest public framing**, used throughout the copy below: we ask because we
would rather ask than assume — not because a regulation forces a pop-up.

---

## 2. The category model

Two categories. Only two, because the tag container holds analytics only.

### 2.1 Essential — always on, no consent asked

Nothing in this category may be consent-gated, and the banner must not imply a
choice that does not exist.

| What                          | Why it is essential                                   | Consent   |
| ----------------------------- | ----------------------------------------------------- | --------- |
| Your cookie preference itself | Remembering your choice is what stops us asking again | Always on |
| Core site function            | Serving pages, remembering nothing else               | Always on |

A "Security and abuse prevention" row stood here until 2026-09-26, when it was
cut: no cookie does either job. Spam is rejected by a honeypot field, which sets
nothing, so the consent record is the only essential cookie there is.

**Essential does not include analytics.** A site works perfectly without knowing
who visited. Anyone classifying GA4 or Clarity as "essential" is mislabelling,
and mislabelling is the most common way a banner becomes a misrepresentation.

### 2.2 Analytics — off until you turn it on

| Tool                                        | Provider  | What it does                                                                 | What it collects                                                                                                     |
| ------------------------------------------- | --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Google Analytics 4 (via Google Tag Manager) | Google    | Counts visits, shows which pages are read and which are not                  | Pages viewed, approximate location from IP, device and browser type, referring site                                  |
| Microsoft Clarity                           | Microsoft | Heatmaps and session replay — shows where people scroll, click, and hesitate | Scroll depth, clicks, pointer movement, session replay. **Form fields are masked — what you type is never recorded** |

**Default state: OFF.** Nothing in this category loads until consent is given.

---

## 3. Banner copy — first visit

### 3.1 Heading

```
Cookies
```

Alternates, if "Cookies" reads too bare next to the brand: `A note on cookies` ·
`Before you look around`. Never `We value your privacy` (hollow) or
`Your privacy matters to us` (hollow and everywhere).

### 3.2 Body

```
We use cookies that keep this site working, and we would like to use
analytics cookies to understand which pages are useful. Analytics stays
off unless you turn it on.
```

Notes on why this wording:

- Names the two categories without jargon.
- "would like to" is honest — it is a request, not a notification.
- Last sentence states the default plainly, which is the single most useful
  thing a banner can tell someone.
- 34 words. Anything longer does not get read.

### 3.3 Buttons — all three the same visual weight

```
[ Accept analytics ]   [ Decline ]   [ Choose what to share ]
```

**Non-negotiable design constraint (Design System §12a, "interface
interference"):** Decline must be exactly as prominent as Accept — same size,
same contrast, same treatment. A greyed-out Decline against a solid Accept is a
named dark pattern and a `[Base]` non-negotiable. If the three buttons cannot be
equal weight in the layout, reduce Accept rather than promoting Decline.

Button copy rules applied:

- `Accept analytics` not `Accept all` — states what is actually accepted.
- `Decline` not `Reject all` / `No thanks` — neutral, no guilt, no drama.
- Never `Only necessary` as the decline label; it sounds like a compromise
  rather than a full refusal.
- **Banned copy (confirm shaming, Design §12a):** "No thanks, I don't want a
  better experience", "Maybe later", "Not now" (implies we will ask again).

### 3.4 Link

```
How we use cookies →  /privacy#cookies
```

### 3.5 Full assembled banner

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

## 4. Preferences centre copy

Reached from `Choose what to share`, and from a permanent footer link.

### 4.1 Heading and intro

```
Cookie preferences

Analytics is off until you turn it on, and you can change this at any
time. Declining changes nothing about how the site works for you.
```

That last sentence is doing real work: the most common reason people accept is
fear that declining breaks something.

### 4.2 Essential row

```
Essential                                          [ Always on ]

Remembering your cookie choice. The site cannot work without it, so
there is no choice to offer — we would rather say that than present a
switch that does nothing.
```

The control must be rendered as a **disabled, visibly-on** state with
`aria-disabled`, never as an interactive toggle that silently refuses. A switch
that appears operable but is not is trick wording in control form.

### 4.3 Analytics row

```
Analytics                                              [ toggle: off ]

Google Analytics and Microsoft Clarity. These tell us which pages people
read, where they scroll, and where they give up — so we can fix the
parts that are not working.

Clarity records how a page is used, including clicks and scrolling.
Anything typed into a form is masked and never recorded.

Stored for up to 14 months. Neither tool is used to advertise to you.
```

The Clarity paragraph is separate and specific on purpose. Session recording is
the thing a careful reader would object to if they found it undisclosed, and
James & Emma are exactly the persona who reads this far.

### 4.4 Buttons

```
[ Save preferences ]        [ Accept analytics ]
```

### 4.5 Withdrawal note

```
Changed your mind? Open cookie preferences from the footer of any page.
Turning analytics off stops it immediately.
```

Legal §6 requires withdrawal be as easy as consent and actually stop the
processing — hence the permanent footer entry point, not a buried one.

---

## 5. Returning-visitor and edge-case states

| State                                      | Copy                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preferences saved, analytics on            | `Analytics is on. Change this in cookie preferences.`                                                                                                             |
| Preferences saved, analytics off           | `Analytics is off. Change this in cookie preferences.`                                                                                                            |
| Consent expired (12 months)                | Re-show the full banner with: `It has been a while since we asked, so we are checking again.`                                                                     |
| Notice version changed materially          | Re-show with: `We have added a tool since you last chose, so we are asking again.`                                                                                |
| `prefers-reduced-motion`                   | No slide or fade — banner simply present.                                                                                                                         |
| JavaScript disabled                        | **No banner, and no analytics.** Both tools require JS, so a no-JS visitor is already untracked; showing an inert banner would be theatre.                        |
| Do Not Track / Global Privacy Control sent | Treat as a decline, do not show the banner, and record the basis as `signal`. Honouring it costs nothing and is the privacy-preserving default Legal §6 asks for. |

**Nagging is prohibited** (Design §12a). A decline is honoured for the full 12
months. No re-prompt on the next page, no second ask on a later visit, no
"reminder." The only re-asks permitted are the two named above: genuine expiry,
and a materially changed notice.

---

## 6. Form consent copy

### 6.1 The objection, recorded

**A required consent checkbox was chosen at the client's explicit direction, and
is built below. The objection stands and is recorded here rather than argued
again:**

- Legal §6 prohibits **bundled consent**. Design §12a lists **forced action** —
  "requiring an unrelated purchase, signup, or data disclosure to complete the
  intended task" — as a `[Base]` non-negotiable.
- A tick that bundles _"reply to my enquiry"_ with _"I consent to processing"_ is
  the textbook bundled-consent form.
- It is also **self-defeating**: consent that must be given to get a reply is not
  freely given, so it is a weak basis — while _"steps toward a contract"_, the
  basis already stated in the privacy policy, is strong and needs no tick at all.

**What was built instead:** the tick is kept, but narrowed so it consents to
_one specific thing_ — being contacted about this enquiry — with marketing split
into a separate, optional, unticked box. That keeps the client's checkbox and
keeps it out of bundled-consent territory. §6.4 supplies the notice-only variant;
switching is a copy change, not a rebuild.

### 6.2 Required checkbox — as built

```
[ ] I would like Smarthaus to contact me about this enquiry.     (required)
```

Helper text directly beneath:

```
We use your details to answer your enquiry and nothing else. Read how we
handle them in our Privacy Policy.
```

Rules:

- **Never pre-ticked.** Pre-checked anything is basket sneaking, Design §12a.
- The word `(required)` is visible, not colour-only, and the field is
  programmatically `required` with a clear validation message.
- Validation message: `Please confirm you would like us to contact you about
your enquiry.` — never scolding, never red-flashing the whole form.

### 6.3 Optional marketing checkbox — separate, unticked

```
[ ] Occasionally send me new projects and ideas. No more than a few
    times a year, and you can stop at any time.
```

Legal §6 requires marketing consent be **distinct from service consent**. This
box is the mechanism. It must never be required, never pre-ticked, and never
gate submission.

### 6.4 Notice-only variant — the recommended alternative

If the checkbox is dropped later, this replaces §6.2 entirely:

```
We use your details to answer your enquiry and nothing else. Read how we
handle them in our Privacy Policy.
```

No tick, no gate. The optional marketing box in §6.3 stays either way.

### 6.5 Post-submission confirmation

```
Thank you — we have your enquiry.

We reply to every enquiry, usually within one working day. If it is
easier to talk now, message us on WhatsApp.
```

No guarantees of response time beyond "usually" — the Terms say response time is
not guaranteed, and the two documents must not contradict each other.

---

## 7. Privacy policy changes required

The current policy states there is **no** analytics and **no** tracking.
**Adding these tools makes that section false**, and Legal §5 is explicit that an
inaccurate policy is a misrepresentation — worse than none.

**These edits ship in the same PR as the tags. Not after.**

**Two files carry the same text and both must change together** — the markdown
is the review trail, the `.tsx` is what actually ships:

| File                                  | Line (at time of writing)                |
| ------------------------------------- | ---------------------------------------- |
| `src/content/legal/privacy-policy.md` | §3.3, from line 140                      |
| `src/app/privacy/page.tsx`            | §3 "Cookies and tracking", from line 204 |

Editing only the markdown leaves the false claim live on the site. Editing only
the `.tsx` breaks the counsel-review trail.

### 7.1 Replace §3.3 "Cookies and tracking"

Current text to remove:

> This website does not set advertising or tracking cookies, and there is no
> advertising or social media tracking pixel on it. There is no Google Analytics,
> no Meta Pixel, and no third-party chat widget. Because we do not set
> non-essential cookies, there is no cookie consent banner.

Replacement, with a new `#cookies` anchor for the banner to link to:

> ### Cookies and analytics
>
> **Essential cookies** keep the site working. There is one: it remembers your
> cookie choice. It is always active.
>
> **Analytics cookies are off until you turn them on.** If you accept them, we
> use Google Analytics and Microsoft Clarity to understand which pages are read
> and where people get stuck.
>
> Microsoft Clarity records how pages are used — scrolling, clicks, and pointer
> movement — and can replay a session. **Anything you type into a form is masked
> and is never recorded.**
>
> We do not use advertising or remarketing cookies. There is no Meta Pixel, no
> ad-network tag, and no third-party chat widget on this site.
>
> You can change your choice at any time from **Cookie preferences** in the
> footer of any page. Turning analytics off stops it immediately.

### 7.2 Move two rows in §4, "Who else sees your information"

Google and Microsoft move from **4.2 Not yet active** into **4.1 Currently in
use**:

| Provider                          | What it does                | What it sees                                                      |
| --------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| Google (Analytics 4, Tag Manager) | Aggregate usage analytics   | Pages viewed, approximate location from IP, device type, referrer |
| Microsoft (Clarity)               | Heatmaps and session replay | Scroll, clicks, pointer movement. Form input masked               |

### 7.3 Add to §6 retention

| Information                  | Retention                                                                                  | Why                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| Analytics data (Google)      | Up to 14 months                                                                            | Year-on-year comparison, then deletion  |
| Session recordings (Clarity) | Per Microsoft's retention period — **[PLACEHOLDER: confirm from Microsoft documentation]** | Diagnosing where pages fail             |
| Cookie consent record        | 12 months from the choice                                                                  | Proving what was consented to, and when |

### 7.4 Amend §5 "Where your information goes"

Google and Microsoft both process outside the UAE. This is a **cross-border
transfer**, and Legal §9 marks the mechanism `(counsel)`. Add both to the
transfer mapping and record the basis in writing — Appendix A's warning applies
exactly: the transfer fires without anyone consciously "sending data abroad."

### 7.5 §10 "Automated decision-making" — still accurate

Neither tool makes decisions about individuals. Leave as is.

---

## 8. CSP additions

AGENTS.md: **the CSP update ships in the same PR as the dependency.** Current
policy is `default-src 'self'` throughout, so every one of these is required or
the tools silently fail.

```
script-src   https://www.googletagmanager.com
             https://www.google-analytics.com
             https://www.clarity.ms
connect-src  https://www.google-analytics.com
             https://*.google-analytics.com
             https://*.analytics.google.com
             https://www.clarity.ms
             https://*.clarity.ms
img-src      https://www.google-analytics.com
             https://*.google-analytics.com
             https://c.clarity.ms
```

Notes:

- **`'unsafe-inline'` is already present in `script-src`** for the Next.js
  bootstrap, so GTM's inline snippet will run. Worth stating because it means no
  nonce work is needed — and worth flagging that this is a pre-existing widening
  of the policy, not something these tools introduced.
- Clarity uses wildcard subdomains for its ingest endpoints. `*.clarity.ms` is
  broader than ideal; it is what the tool requires.
- **Load the CSP changes behind consent too where possible** — a CSP entry does
  not fire a request, but keeping the domains listed while the tags are gated
  means a declined visitor still sends nothing.
- Each addition must be checked against Security §5, Engineering Part C, and
  Legal §10 per the AGENTS.md CSP table. Both tools have a data flow and both
  touch personal data, so all three apply.

---

## 9. Clarity configuration — not optional

Chosen: **mask all form input.** This is a configuration requirement, not a
preference, and the copy in §4.3 and §7.1 _promises_ it — so if the
configuration is wrong, the privacy policy becomes false.

- Enable Clarity's strictest masking mode so **all** input content is masked.
- Add explicit masking to every enquiry-form field as a second layer, rather
  than relying on the global setting alone.
- **Verify by recording a real test session and watching the replay.** The
  promise in §7.1 is only true if this check has actually been done.
- Do not enable any Clarity feature that captures text content of inputs.

**Ship-blocking check:** a replay must be watched, and the person who watched it
named, before the tags go live. Assumed masking is how form data ends up in a
third party's systems.

---

## 10. Consent record schema

Legal §6 requires a record of what was consented to, when, and which notice
version. Stored client-side in a single first-party cookie or `localStorage`
entry — there is no database, and this must not become a reason to add one.

```json
{
  "version": "1.0.0",
  "timestamp": "2026-09-13T09:41:22Z",
  "analytics": false,
  "basis": "explicit"
}
```

| Field       | Meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| `version`   | Notice version consented to. Bumping it materially re-asks.    |
| `timestamp` | ISO 8601, UTC. When the choice was made.                       |
| `analytics` | The choice itself. Absent record = `false`, always.            |
| `basis`     | `explicit` (banner interaction) or `signal` (DNT/GPC honoured) |

Rules:

- **Cookie name:** `smarthaus_consent`. First-party, `SameSite=Lax`, `Secure`,
  12-month expiry. Not `httpOnly` — the client script must read it.
- **No identifiers.** No visitor ID, no fingerprint, no IP. The record proves a
  choice was made; it does not need to say by whom.
- **Absence means decline.** A missing or unparseable record is treated as
  analytics-off, never as consent.
- Bump `version` only for **material** changes — a new tool, a new category, a
  new purpose. Not for copy edits, which would re-ask for no reason and edge
  toward nagging.

---

## 11. Accessibility requirements

The banner is an interactive component on every first visit, so the
`[Floor]` items in CLAUDE.md apply in full.

- **Not a focus trap.** The banner must not trap focus or block the page. It is
  a region, not a modal — a visitor who wants to read the site while ignoring it
  must be able to. (Legal note: this also means it cannot be a cookie _wall_.)
- **Keyboard operable end to end**, including Escape to dismiss without choosing
  — dismissal is **not** consent, and the record stays absent, which means off.
- Semantic `<section>` with `aria-label="Cookie preferences"`; **not**
  `role="alertdialog"`, which would hijack focus.
- Announce with `aria-live="polite"` on appearance — never `assertive`, which
  interrupts.
- **Every control reachable, all three buttons equal weight** (see §3.3 — this
  is an a11y requirement _and_ a dark-pattern requirement at once).
- Contrast: 4.5:1 body text, 3:1 UI and large text, per the AA floor. The bronze
  accent is **decorative only** here — it may not carry button text on light
  ground.
- Toggles are real `<button role="switch">` with `aria-checked`, or
  `<input type="checkbox">`. Never a styled `<div>`.
- `prefers-reduced-motion`: no entrance animation.
- The footer re-entry point is a real link with a discernible name —
  `Cookie preferences`, not an icon alone.

---

## 12. Adding a marketing category later

Recorded now so it is not improvised later. If any ad, remarketing, or
conversion tag is ever added, **all** of these fire:

1. A **third category** in the banner and preferences centre, defaulted off and
   independent of Analytics — never bundled with it.
2. **New CSP entries** for every ad domain, in the same PR.
3. **Privacy policy §3.3 rewritten again** — the sentence "We do not use
   advertising or remarketing cookies" becomes false the moment a pixel lands.
4. **Notice `version` bumped**, which re-asks everyone. Consent to analytics is
   not consent to advertising.
5. **AGENTS.md revisited** — it currently states "No GA4. No Meta Pixel. No
   third-party tracking scripts on initial load." GA4 is now arriving via
   consent-gated GTM; that line needs updating to match reality rather than
   being quietly contradicted by the code.
6. **Re-screen for a DPIA** (Legal §1) — profiling and targeted advertising are
   named triggers, and this moves further into `(counsel)`.

---

## 13. Open items before this ships

| #   | Item                                                                                                                 | Owner       | Blocking?                   |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------- |
| 1   | **Regime confirmed** — federal PDPL vs DIFC/ADGM. Same open item as the privacy policy; settled by the trade licence | Client      | **Yes**                     |
| 2   | **DPIA screen** for session recording — Legal §1 names new tracking technology as a trigger                          | Counsel     | **Yes**                     |
| 3   | **Cross-border transfer basis** for Google and Microsoft, documented in writing (Legal §9)                           | Counsel     | **Yes**                     |
| 4   | **Clarity masking verified** by watching a real replay — §9. The policy text is false until this is done             | Engineering | **Yes**                     |
| 5   | Privacy policy §3.3, §4, §5, §6 edits merged in the same PR as the tags                                              | Engineering | **Yes**                     |
| 6   | Microsoft Clarity retention period confirmed from Microsoft's own documentation                                      | Engineering | No — placeholder until then |
| 7   | GA4 retention set to 14 months in the property settings, to match what §7.3 claims                                   | Engineering | No                          |
| 8   | Google and Microsoft run through the **new-tool intake gate** (Legal §16)                                            | Qera        | **Yes**                     |
| 9   | AGENTS.md "No GA4" line reconciled with reality                                                                      | Qera        | No                          |
| 10  | Counsel review of this deck alongside the privacy policy — one review, not two                                       | Counsel     | **Yes**                     |

---

## 14. Copy summary — every string in one place

For handing to the component build, or to a translator when Arabic lands in V2.

| Key                         | String                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `banner.heading`            | Cookies                                                                                                                                                                  |
| `banner.body`               | We use cookies that keep this site working, and we would like to use analytics cookies to understand which pages are useful. Analytics stays off unless you turn it on.  |
| `banner.accept`             | Accept analytics                                                                                                                                                         |
| `banner.decline`            | Decline                                                                                                                                                                  |
| `banner.customise`          | Choose what to share                                                                                                                                                     |
| `banner.link`               | How we use cookies                                                                                                                                                       |
| `prefs.heading`             | Cookie preferences                                                                                                                                                       |
| `prefs.intro`               | Analytics is off until you turn it on, and you can change this at any time. Declining changes nothing about how the site works for you.                                  |
| `prefs.essential.label`     | Essential                                                                                                                                                                |
| `prefs.essential.state`     | Always on                                                                                                                                                                |
| `prefs.essential.body`      | Remembering your cookie choice. The site cannot work without it, so there is no choice to offer — we would rather say that than present a switch that does nothing.      |
| `prefs.analytics.label`     | Analytics                                                                                                                                                                |
| `prefs.analytics.body`      | Google Analytics and Microsoft Clarity. These tell us which pages people read, where they scroll, and where they give up — so we can fix the parts that are not working. |
| `prefs.analytics.clarity`   | Clarity records how a page is used, including clicks and scrolling. Anything typed into a form is masked and never recorded.                                             |
| `prefs.analytics.retention` | Stored for up to 14 months. Neither tool is used to advertise to you.                                                                                                    |
| `prefs.save`                | Save preferences                                                                                                                                                         |
| `prefs.withdraw`            | Changed your mind? Open cookie preferences from the footer of any page. Turning analytics off stops it immediately.                                                      |
| `state.on`                  | Analytics is on. Change this in cookie preferences.                                                                                                                      |
| `state.off`                 | Analytics is off. Change this in cookie preferences.                                                                                                                     |
| `state.expired`             | It has been a while since we asked, so we are checking again.                                                                                                            |
| `state.changed`             | We have added a tool since you last chose, so we are asking again.                                                                                                       |
| `footer.link`               | Cookie preferences                                                                                                                                                       |
| `form.consent.required`     | I would like Smarthaus to contact me about this enquiry.                                                                                                                 |
| `form.consent.helper`       | We use your details to answer your enquiry and nothing else. Read how we handle them in our Privacy Policy.                                                              |
| `form.consent.error`        | Please confirm you would like us to contact you about your enquiry.                                                                                                      |
| `form.marketing.optional`   | Occasionally send me new projects and ideas. No more than a few times a year, and you can stop at any time.                                                              |
| `form.success.heading`      | Thank you — we have your enquiry.                                                                                                                                        |
| `form.success.body`         | We reply to every enquiry, usually within one working day. If it is easier to talk now, message us on WhatsApp.                                                          |

---

## 15. Banned copy — do not reintroduce

Each of these is a named dark pattern or a false claim.

| Never write                                   | Why                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| "We value your privacy"                       | Hollow. Says nothing, appears on every site that means it least. |
| "Accept all"                                  | Overstates: only analytics is being accepted.                    |
| "No thanks, I don't want a better experience" | Confirm shaming (Design §12a).                                   |
| "Maybe later" / "Not now"                     | Implies we will ask again — nagging (Design §12a).               |
| "By continuing to browse you agree"           | Implied consent is not free, specific consent.                   |
| "This site is PDPL compliant"                 | Warrants an outcome; the Legal System bans it outright.          |
| "Essential cookies (including analytics)"     | Mislabelling. Analytics is never essential.                      |
| "Required for the best experience"            | Trick wording — conflates optional with required.                |
| A pre-ticked consent box                      | Basket sneaking (Design §12a).                                   |
| A greyed-out Decline                          | Interface interference (Design §12a).                            |
| A cookie wall blocking content                | Consent is not free if the site is held hostage.                 |
