/**
 * The FAQ content.
 *
 * One array, read three times: the ToC rail renders the categories, the page
 * body renders the questions, and the FAQPage JSON-LD is built from the same
 * rows. A question cannot exist in the schema but not on the page, and the
 * anchor id used in a shared URL is declared once.
 *
 * `answer` is a string array, not a string: several answers run to two
 * paragraphs and the schema needs them joined while the page needs them
 * separated. Keeping the split here means neither consumer has to parse.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDERS
 *
 * `pending` marks an answer whose facts are not yet confirmed. Every one of
 * them renders through the <Placeholder> marker and is the reason the page
 * ships `robots: noindex` — per AGENTS.md's claims audit, an unconfirmed
 * figure must not read as though it were settled, and the founding year in
 * particular must never be invented.
 *
 * Clearing them all is what flips FAQ_IS_PUBLISHABLE in faq-page.ts.
 * ---------------------------------------------------------------------------
 */

export type FaqEntry = {
  /** Scroll anchor. Stable — these appear in shared URLs. */
  id: string;
  question: string;
  /** One entry per paragraph. */
  answer: readonly string[];
  /**
   * Set when the answer contains a fact still to be confirmed. The string is
   * the reviewer-facing note, rendered as a placeholder marker under the
   * answer and stripped from the schema output.
   */
  pending?: string;
};

export type FaqCategory = {
  /** Scroll anchor and ToC target. */
  id: string;
  title: string;
  /** Optional shorter label for the ToC rail. Falls back to `title`. */
  short?: string;
  entries: readonly FaqEntry[];
};

export const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: "about-the-company",
    title: "About the company",
    short: "The company",
    entries: [
      {
        id: "new-company",
        question: "Is Smarthaus a new company?",
        answer: [
          "No. Smarthaus is the home division of Maple Technologies Security Systems LLC, a SIRA-licensed Dubai company operating since {YEAR}. Same team, same licence, same accountability.",
        ],
        pending: "Founding year unconfirmed. Do not invent one.",
      },
      {
        id: "separate-name",
        question: "Why the separate name?",
        answer: [
          "Maple Technologies works across commercial and residential security. Smarthaus is the part of the business built specifically for villas, with its own packages, documentation and care plans.",
        ],
      },
      {
        id: "company-longevity",
        question: "What if the company closes in a few years?",
        answer: [
          "It's a fair question, and the reason we're clear about who we are. Smarthaus isn't a startup with one product. It's a division of a licensed Dubai company with an established security business behind it. Your system is also documented at handover, so any competent integrator could take it over.",
        ],
      },
      {
        id: "licensed",
        question: "Are you licensed?",
        answer: [
          "Yes. Maple Technologies holds an active SIRA licence, which is required in Dubai for security installation, and our technicians carry SIRA cards.",
        ],
      },
      {
        id: "where-you-work",
        question: "Where do you work?",
        answer: ["Across Dubai."],
      },
      {
        id: "team-size",
        question: "How big is the team?",
        answer: [
          "Small and deliberately so. Every job is run by people who've been in the business for years, not passed to whoever is free.",
        ],
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started",
    entries: [
      {
        id: "how-it-begins",
        question: "How does it begin?",
        answer: [
          "With a site assessment. A technician and a technical salesperson spend about 90 minutes in your home, check what you already have, and send a fixed, itemised proposal within 48 hours.",
        ],
      },
      {
        id: "paid-visit",
        question: "Why is the visit paid?",
        answer: [
          "AED 1,500, credited in full against any installation. A proper assessment takes two people and half a day including the write-up. Charging for it means you get a real technical survey rather than a salesperson's guess, and it's free the moment you go ahead.",
        ],
        pending: "Fee pending Sunil's approval.",
      },
      {
        id: "commitment",
        question: "Am I committing to anything?",
        answer: ["No. If you decide not to proceed, you keep the report and owe nothing further."],
      },
      {
        id: "visit-lead-time",
        question: "How soon can you visit?",
        answer: ["Usually within a few days. Tell us your community when you get in touch."],
      },
      {
        id: "quote-without-visiting",
        question: "Can you quote without visiting?",
        answer: [
          "No. Every villa is different, and a price given without seeing your cabling and layout is a number we'd have to change later. We'd rather be accurate once.",
        ],
      },
      {
        id: "proposal-timing",
        question: "How long until the proposal arrives?",
        answer: ["Within 48 hours of the visit."],
      },
    ],
  },
  {
    id: "what-it-costs",
    title: "What it costs",
    short: "Cost",
    entries: [
      {
        id: "system-cost",
        question: "What does a system cost?",
        answer: [
          "Most villas land between AED {18,000} and AED {60,000} depending on how much of the house is covered. The packages page sets out what sits in each range.",
        ],
        pending: "Price range unconfirmed, awaiting final package pricing.",
      },
      {
        id: "price-range",
        question: "Why the wide range?",
        answer: [
          "A four-bedroom villa with existing cabling costs far less than a larger home needing new runs. The assessment is what turns the range into a number.",
        ],
      },
      {
        id: "fixed-price",
        question: "Is the price fixed?",
        answer: [
          "Yes. Your proposal is itemised line by line: every device, every hour of work. If something changes mid-job, we agree it with you in writing before we do it.",
        ],
      },
      {
        id: "whats-included",
        question: "What's included in the price?",
        answer: [
          "Equipment, installation, setup, a training session, documentation of what was installed, 12 months of hardware warranty, and your first year of Standard Care.",
        ],
        pending: "Confirm against final package pricing.",
      },
      {
        id: "payments",
        question: "How do payments work?",
        answer: ["Part on order, the balance on completion. The exact split is in your proposal."],
        pending: "Payment terms to be confirmed with Sunil.",
      },
    ],
  },
  {
    id: "the-system",
    title: "The system itself",
    short: "The system",
    entries: [
      {
        id: "brands",
        question: "Which brands do you use?",
        answer: [
          "We choose professional-grade equipment to suit each home, and every choice is named and explained in your proposal. We don't install consumer kit bought off a marketplace.",
        ],
      },
      {
        id: "brand-lock-in",
        question: "Will I be locked into one brand?",
        answer: [
          "No. We plan systems so devices can be added or replaced later without starting again.",
        ],
      },
      {
        id: "one-app",
        question: "Is it one app?",
        answer: ["Yes. Cameras, doors, audio and home controls run from one place."],
      },
      {
        id: "internet-down",
        question: "Does it work if the internet goes down?",
        answer: [
          "The parts that matter locally keep working. Locks, switches and panels don't depend on the connection. Remote access and phone alerts need internet, as they would with any system.",
        ],
      },
      {
        id: "power-cuts",
        question: "What about power cuts?",
        answer: [
          "The network cabinet can be fitted with backup power so the core system stays up. It's included in some packages and available in all of them.",
        ],
      },
      {
        id: "obsolescence",
        question: "Will the system get out of date?",
        answer: [
          "Software updates are part of your care plan. Hardware lasts several years, and because the system isn't closed, you can replace one piece rather than the whole thing.",
        ],
      },
    ],
  },
  {
    id: "your-existing-home",
    title: "Your existing home",
    short: "Your home",
    entries: [
      {
        id: "renovating",
        question: "Do I need to be renovating?",
        answer: [
          "No. Most of our work is in homes people are living in. Some features need new cabling, and we'll tell you exactly which ones before you commit.",
        ],
      },
      {
        id: "reuse-existing",
        question: "Can you use what I already have?",
        answer: [
          "Usually. At the assessment we check your cameras, intercom and network and keep whatever is sound.",
        ],
      },
      {
        id: "existing-maple-client",
        question: "Maple installed my cameras. Does that help?",
        answer: [
          "Considerably. We already know your setup, which means less discovery and less disruption. Tell us at enquiry and we'll route you to the right person.",
        ],
      },
      {
        id: "another-companys-system",
        question: "What if another company installed my system?",
        answer: [
          "We take over other companies' systems regularly. The honest answer is that it depends on what was installed and how well it was documented. The assessment is where we find out.",
        ],
      },
      {
        id: "damage",
        question: "Will there be damage to walls and ceilings?",
        answer: [
          "Some work needs drilling and chasing. We tell you where, before we start, and we make good afterwards. Anything that would mean significant work gets flagged at the proposal stage, not on the day.",
        ],
      },
      {
        id: "installation-duration",
        question: "How long does installation take?",
        answer: [
          "Two to three days for a smaller system, four to five for a full villa. Larger projects are scoped individually.",
        ],
      },
      {
        id: "access",
        question: "Do you need access while we're living there?",
        answer: [
          "Yes, during working hours. We agree the schedule with you in advance and work room by room rather than opening up the whole house at once.",
        ],
      },
    ],
  },
  {
    id: "after-installation",
    title: "After it's installed",
    short: "After install",
    entries: [
      {
        id: "handover",
        question: "What happens at handover?",
        answer: [
          "We set the system up with you, train everyone who'll use it including staff, and leave a full record of what was installed and where.",
        ],
      },
      {
        id: "family-usability",
        question: "Will my family be able to use it?",
        answer: [
          "That's the test we set ourselves. Anything that needs an expert to operate isn't finished. The handover session covers everyone in the house, not just whoever bought it.",
        ],
      },
      {
        id: "support-response",
        question: "What if something stops working?",
        answer: [
          "You call one number. On Standard Care we respond the next business day. On Premium Care, within {6} hours, seven days a week.",
        ],
        pending: "Premium Care response window to be confirmed with Sunil.",
      },
      {
        id: "warranty",
        question: "What's the warranty?",
        answer: [
          "12 months on hardware. Manufacturer warranties on some equipment run longer and we pass those through.",
        ],
      },
      {
        id: "care-plan-optional",
        question: "Do I have to take a care plan?",
        answer: [
          "Your first year of Standard Care is included. After that it's your choice, though systems that go unmaintained are the ones that generate the call-outs.",
        ],
      },
      {
        id: "adding-later",
        question: "Can I add to the system later?",
        answer: [
          "Yes, and it's planned for. Most clients start with part of the house and extend.",
        ],
      },
    ],
  },
  {
    id: "privacy-and-security",
    title: "Privacy and security",
    short: "Privacy",
    entries: [
      {
        id: "no-client-photos",
        question: "Why aren't there photos of your clients' homes?",
        answer: [
          "Because they don't want strangers looking at their front door. We don't photograph finished homes, publish addresses or share plans. If you want to see a system working, we'll show you in person.",
        ],
      },
      {
        id: "camera-footage",
        question: "Who can see my camera footage?",
        answer: [
          "You. Footage is recorded to equipment in your home. We don't access it unless you ask us to for a support issue.",
        ],
      },
      {
        id: "your-data",
        question: "What happens to my data?",
        answer: [
          "We keep what we need to do the work and support you afterwards, and we don't sell or pass on client details.",
        ],
      },
    ],
  },
  {
    id: "for-designers",
    title: "For designers and project managers",
    short: "For designers",
    entries: [
      {
        id: "design-practices",
        question: "Do you work with design practices?",
        answer: [
          "Yes. Brief us once and we'll update your PM at agreed milestones, hand over full documentation, and never contact your client without you.",
        ],
        pending: "All three commitments to be confirmed with Sunil before publishing.",
      },
      {
        id: "drawings-and-programme",
        question: "Can you work to our drawings and programme?",
        answer: [
          "Yes. We'd rather be in the conversation early, while cabling routes are still decisions rather than problems.",
        ],
      },
      {
        id: "attribution",
        question: "Will your name appear in front of our client?",
        answer: [
          "Only if you want it to. We're comfortable working as a named sub-contractor or in the background.",
        ],
      },
    ],
  },
] as const;
