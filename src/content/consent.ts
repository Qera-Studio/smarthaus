/**
 * Every string in the consent UI, in one place.
 *
 * Transcribed from `src/content/legal/consent-content-deck.md` §14, which is
 * the canonical copy summary and the handoff point for Arabic in V2. The keys
 * here mirror the deck's keys exactly, so a string can be traced back to the
 * legal reasoning that produced it.
 *
 * ---------------------------------------------------------------------------
 * DO NOT EDIT THESE STRINGS CASUALLY
 *
 * The copy is counsel-pending: a UAE lawyer reviews it alongside the privacy
 * policy, as one review rather than two. It is also the subject of a banned-copy
 * list (deck §15 and the design brief) covering named dark patterns — confirm
 * shaming, nagging, mislabelling, implied consent. Several of the obvious
 * "improvements" a copy edit would reach for are on that list.
 *
 * Two specific traps:
 *   - "Accept all" is banned. Only analytics is being accepted, so it overstates.
 *   - "Only necessary" as the decline label is banned. It reads as a compromise
 *     rather than a refusal.
 *
 * Editing copy must NOT bump CONSENT_VERSION in src/lib/consent.ts. That bump
 * re-asks every visitor, and re-asking over a reworded sentence is the nagging
 * the deck prohibits. Bump it only for a new tool, category, or purpose.
 * ---------------------------------------------------------------------------
 *
 * ## Two deliberate deviations from the deck
 *
 * 1. **Em dashes are replaced.** Three deck strings use them
 *    (`prefs.essential.body`, `prefs.analytics.body`, `form.success.heading`).
 *    Every page suite in e2e/ asserts that visible copy contains no em dash,
 *    and asserts it via `textContent` so a collapsed element cannot hide one.
 *    The punctuation is reworked; not one word is changed.
 *
 * 2. **There is no "Default Off" label.** It appears in a design mock but in
 *    neither source document, and inventing copy for a counsel-pending legal
 *    surface is not ours to do. The switch's off position plus `prefs.intro`
 *    already say it.
 */

export const CONSENT_COPY = {
  banner: {
    /**
     * The brief calls this optional and offers two warmer alternates. Kept,
     * because the banner is a region rather than a modal and the heading is
     * what `aria-label` points at, so the region announces as something.
     */
    heading: "Cookies",
    body: "We use cookies that keep this site working, and we would like to use analytics cookies to understand which pages are useful. Analytics stays off unless you turn it on.",
    accept: "Accept analytics",
    decline: "Decline",
    customise: "Choose what to share",
    link: "How we use cookies",
    /**
     * Target of `banner.link`. The anchor is created by the privacy policy
     * rewrite that ships with this work; linking to it before that existed
     * would have pointed at nothing.
     */
    linkHref: "/privacy#cookies",
  },

  prefs: {
    heading: "Cookie preferences",
    intro:
      "Analytics is off until you turn it on, and you can change this at any time. Declining changes nothing about how the site works for you.",

    essential: {
      label: "Essential",
      /** Lowercase "on", as the deck specifies. */
      state: "Always on",
      // Deck em dash ("no choice to offer — we would rather") reworked to a
      // colon. Same sentence, same claim.
      body: "Remembering your cookie choice, keeping the site secure, and rejecting spam submissions. The site cannot work without these, so there is no choice to offer: we would rather say that than present a switch that does nothing.",
    },

    analytics: {
      label: "Analytics",
      /**
       * Three separate paragraphs, and they stay separate. The design brief is
       * explicit that a designer's instinct is to merge them and that
       * paragraph 2 in particular must not be buried: it is the disclosure a
       * careful reader would object to if they found it hidden.
       */
      // Deck em dash ("give up — so we can fix") reworked to a comma.
      body: "Google Analytics and Microsoft Clarity. These tell us which pages people read, where they scroll, and where they give up, so we can fix the parts that are not working.",
      /**
       * Still its own paragraph, and still visually distinct from the body
       * above it. What changed is only HOW: it was set off by a start border
       * (a pull-quote rule), which read as decoration on a legal disclosure.
       * It is now separated by ink weight and spacing instead. The brief's
       * requirement is that it not be buried, not that it carry a rule.
       */
      clarity:
        "Clarity records how a page is used, including clicks and scrolling. Anything typed into a form is masked and never recorded.",
      retention: "Stored for up to 14 months. Neither tool is used to advertise to you.",
    },

    save: "Save preferences",
    /**
     * Not from the deck, and the only string here that is not.
     *
     * The deck's panel had no back control because it specified the panel as an
     * expansion of the banner, where the banner's own toggle stayed visible and
     * closed it again. The panel now replaces the banner, so that control is
     * gone and without this a visitor who opened preferences to read them can
     * only leave by deciding. Adding the control is the fix; the label is as
     * plain as it can be, and it claims nothing about cookies or consent.
     */
    back: "Back",
    withdraw:
      "Changed your mind? Open cookie preferences from the footer of any page. Turning analytics off stops it immediately.",
  },

  /**
   * Returning-visitor lines.
   *
   * `on` / `off` show inside the panel, not as a toast: the specified behaviour
   * after a choice is that the banner disappears and nothing else is announced.
   *
   * `expired` and `changed` are the ONLY two permitted re-ask lines, matching
   * the only two permitted re-asks. There is no "remind me later" state and no
   * re-entry nudge, by design.
   */
  state: {
    on: "Analytics is on. Change this in cookie preferences.",
    off: "Analytics is off. Change this in cookie preferences.",
    expired: "It has been a while since we asked, so we are checking again.",
    changed: "We have added a tool since you last chose, so we are asking again.",
  },
} as const;

/**
 * Contact-form consent strings.
 *
 * Separate export because they belong to a different surface with a different
 * lifecycle: the deck records a standing objection to the required checkbox
 * (it bundles consent with getting a reply, which makes the consent weak) and
 * notes it may be replaced by static notice text. Keeping these apart means
 * that swap does not touch the banner's copy.
 */
export const CONSENT_FORM_COPY = {
  required: {
    label: "I would like Smarthaus to contact me about this enquiry.",
    /** Visible text, never colour alone. */
    marker: "(required)",
    helperLead: "We use your details to answer your enquiry and nothing else. Read how we handle",
    helperLinkText: "them in our Privacy Policy",
    helperHref: "/privacy",
    error: "Please confirm you would like us to contact you about your enquiry.",
  },
  marketing: {
    label:
      "Occasionally send me new projects and ideas. No more than a few times a year, and you can stop at any time.",
  },
} as const;
