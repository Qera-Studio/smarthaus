// Seed for the consentCopy document, verbatim from src/content/consent.ts on
// 2026-11-11, which took it from the consent content deck
// (src/content/legal/consent-content-deck.md). The deck is the brief: the
// Clarity paragraph stays its own paragraph, "Back" is the only line not from
// it, and the two re-ask lines are the only two permitted. Counsel has not
// reviewed this wording.
import type { ConsentCopy } from "../../src/sanity/types";

export const CONSENT_COPY: ConsentCopy = {
  seo: {
    title: "Cookie Preferences",
    description:
      "Turn analytics cookies on or off, and see exactly what each category does. Analytics is off until you turn it on.",
    index: false,
  },
  pageTitle: "Cookie preferences",
  banner: {
    heading: "Cookies",
    body: "We use cookies that keep this site working, and Microsoft Clarity, without cookies, to see how pages are used. Accept to add analytics cookies, or decline to turn Clarity off.",
    accept: "Accept analytics",
    decline: "Decline",
    customise: "Choose what to share",
    link: "How we use cookies",
    linkHref: "/privacy#cookies",
  },
  prefs: {
    heading: "Cookie preferences",
    intro:
      "Analytics cookies are off until you turn them on, and you can change this at any time. Declining changes nothing about how the site works for you.",
    essential: {
      label: "Essential",
      state: "Always on",
      body: "Remembering your cookie choice. The site cannot work without it, so there is no choice to offer: we would rather say that than present a switch that does nothing.",
    },
    analytics: {
      label: "Analytics",
      body: "Google Analytics and Microsoft Clarity. These tell us which pages people read, where they scroll, and where they give up, so we can fix the parts that are not working.",
      clarity:
        "Clarity records how a page is used, including clicks and scrolling. Until you choose, it runs without cookies; declining turns it off. Anything typed into a form is masked and never recorded.",
      retention: "Stored for up to 14 months. Neither tool is used to advertise to you.",
    },
    save: "Save preferences",
    back: "Back",
    withdraw:
      "Changed your mind? Open cookie preferences from the footer of any page. Turning analytics off stops it immediately.",
  },
  state: {
    on: "Analytics is on. Change this in cookie preferences.",
    off: "Analytics is off. Change this in cookie preferences.",
    expired: "It has been a while since we asked, so we are checking again.",
    changed: "We have added a tool since you last chose, so we are asking again.",
  },
  form: {
    required: {
      label: "I would like Smarthaus to contact me about this enquiry.",
      marker: "(required)",
      helperLead: "We use your details to answer your enquiry and nothing else. Read how we handle",
      helperLinkText: "them in our Privacy Policy",
      helperHref: "/privacy",
    },
    marketing: {
      label:
        "Occasionally send me new projects and ideas. No more than a few times a year, and you can stop at any time.",
    },
  },
};
