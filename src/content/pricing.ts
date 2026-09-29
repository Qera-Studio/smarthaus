/**
 * The four package tiers and the feature comparison between them.
 *
 * Read by the homepage pricing section (the cards), the /pricing page (the
 * cards and the full comparison) and the unit suite. Lives here rather than in
 * a component because it has more than one consumer, which is the repo's
 * threshold for moving content out.
 *
 * ## Claims status, read this before editing any number
 *
 * Every price and every feature line here is PLACEHOLDER. They came from a
 * design reference and a first-draft package sheet, and none is sourced in
 * this repo. They print plainly rather than through <Placeholder> because that
 * was an explicit product decision, not an oversight.
 *
 * Two consequences, both load-bearing:
 *
 * 1. Nothing that renders this emits structured data. No Offer, no Product, no
 *    PriceSpecification. /faq withholds its FAQPage schema for exactly this
 *    reason, and an unconfirmed price quoted back by an answer engine as fact
 *    is the failure that rule exists to prevent. The unit suites assert the
 *    absence.
 * 2. Several features named below sit outside the confirmed capability audit
 *    in AGENTS.md: CCTV as a full system, pool automation, solar and battery,
 *    KNX/BMS, home cinema. Saying a tier includes them is a claim about scope
 *    of work. The comparison table roughly doubles that surface.
 *
 * Clearing this means confirming every price and every line with Sunil, at
 * which point PRICING_IS_PUBLISHABLE in src/app/pricing/page.tsx flips and
 * structured data can be reconsidered as one change.
 *
 * No em dashes anywhere in these strings: the unit and e2e suites assert none
 * appear in visible copy.
 */

export type PricingTier = {
  /** Stable key, and the anchor the comparison uses. */
  id: string;
  name: string;
  /** Rendered exactly as written, "+" included. */
  price: string;
  description: string;
  includes: readonly string[];
  /**
   * The card's ground. Separate from `ctaVariant` rather than derived: the
   * image card takes a solid button and the dark card a bone one, so the
   * mapping is not one-to-one and a lookup would say less than two fields do.
   */
  tone: "sand" | "image" | "dark";
  ctaVariant: "solid" | "inverse" | "outline";
};

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: "AED 4,999+",
    description:
      "For apartments, single rooms, and a first step into automation that does not need rewiring.",
    includes: [
      "Smart lighting control",
      "Basic AC and climate control",
      "Smart plugs and switches",
      "Motion and occupancy sensors",
      "Mobile app control",
      "Voice assistant integration",
      "Scenes and routines",
      "Remote access",
      "Setup and commissioning",
      "User training",
      "Standard installation",
    ],
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    id: "smart",
    name: "Smart",
    price: "AED 14,999+",
    description:
      "For homes where several systems should work together rather than sit behind separate apps.",
    includes: [
      "Everything in Essential",
      "Whole-home lighting control",
      "Motorised curtain integration",
      "Smart door locks and video doorbell",
      "Security sensors",
      "Multi-room voice control",
      "Presence detection",
      "Wall panels alongside the app",
      "Energy monitoring",
      "Custom automation routines",
      "System documentation",
    ],
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    id: "connected",
    name: "Connected",
    price: "AED 39,999+",
    description:
      "Whole-home automation: lighting, climate, shading, security and audio on one platform.",
    includes: [
      "Everything in Smart",
      "Multi-zone climate control",
      "Motorised blinds and shading",
      "CCTV and video intercom",
      "Intrusion detection",
      "Multi-room audio",
      "Central control platform",
      "Touch panels throughout",
      "Structured networking",
      "Remote monitoring",
      "Device management",
    ],
    tone: "image",
    ctaVariant: "solid",
  },
  {
    id: "signature",
    name: "Signature",
    price: "AED 99,999+",
    description:
      "A fully engineered residence, from site survey and system design through to handover.",
    includes: [
      "Everything in Connected",
      "Architectural and circadian lighting",
      "HVAC and BMS integration",
      "Gate, garage and access control",
      "Dedicated home cinema",
      "Pool, garden and irrigation automation",
      "Solar, battery and EV charging",
      "Air quality monitoring",
      "Custom dashboards and user profiles",
      "Project management and commissioning",
      "As-built documentation and training",
    ],
    tone: "dark",
    ctaVariant: "inverse",
  },
];

/**
 * One cell of the comparison. `true` renders as a tick, `false` as a short
 * rule, and a string prints as written: the level at which the tier has the
 * feature, where a tick alone would flatten a real difference.
 */
export type CellValue = true | false | string;

export type ComparisonRow = {
  /** Unique across the whole table, not just its section. */
  id: string;
  feature: string;
  /**
   * One sentence, revealed when the row is expanded. Names the actual thing
   * the way Care's copy does: what happens in the house, not the category it
   * belongs to.
   */
  description: string;
  /** One per tier, in PRICING_TIERS order. The unit suite asserts the length. */
  values: readonly CellValue[];
};

export type ComparisonSection = {
  id: string;
  title: string;
  rows: readonly ComparisonRow[];
};

/**
 * Grouped by system rather than by tier, so a visitor who cares about one
 * thing (security, say) reads one section across all four columns instead of
 * hunting for it in four lists.
 */
export const COMPARISON: readonly ComparisonSection[] = [
  {
    id: "lighting",
    title: "Lighting",
    rows: [
      {
        id: "smart-lighting-control",
        feature: "Smart lighting control",
        description:
          "Every light in the scope on a switch you can reach from the app, a wall panel or your voice.",
        values: [true, true, true, true],
      },
      {
        id: "whole-home-lighting",
        feature: "Whole-home lighting",
        description: "Every circuit in the house, not only the rooms you chose to start with.",
        values: [false, true, true, true],
      },
      {
        id: "dimming-scenes",
        feature: "Dimming and scene control",
        description:
          "Levels rather than on and off, and named scenes that set several rooms at once.",
        values: ["Basic", true, true, true],
      },
      {
        id: "occupancy-lighting",
        feature: "Occupancy-based lighting",
        description:
          "Lights come on when someone walks in and go off once a room has been empty for a while.",
        values: [false, true, true, true],
      },
      {
        id: "exterior-lighting",
        feature: "Exterior lighting",
        description:
          "Garden, facade and pathway lighting on the same schedules and scenes as the inside.",
        values: [false, false, true, true],
      },
      {
        id: "architectural-circadian",
        feature: "Architectural and circadian lighting",
        description:
          "Colour temperature that follows the time of day, and fittings specified with your designer rather than around them.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "climate",
    title: "Climate",
    rows: [
      {
        id: "ac-climate",
        feature: "AC and climate control",
        description: "Your AC on a schedule, from your phone, and inside the scenes you set.",
        values: ["Basic", "Advanced", "Multi-zone", "Full integration"],
      },
      {
        id: "thermostats",
        feature: "Smart thermostats",
        description:
          "A thermostat per zone that learns the house, rather than a single setpoint for everything.",
        values: [false, true, true, true],
      },
      {
        id: "temp-humidity",
        feature: "Temperature and humidity sensors",
        description:
          "Sensors in the rooms you use, so the system responds to how a room feels rather than to the thermostat's own corner.",
        values: [false, false, true, true],
      },
      {
        id: "hvac-bms",
        feature: "HVAC and BMS integration",
        description:
          "Plant-level control of chillers, fresh-air units and the building management system where the villa has one.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "shading",
    title: "Shading",
    rows: [
      {
        id: "curtains",
        feature: "Motorised curtains",
        description:
          "Curtains that open with the morning scene and close with the evening one, on tracks fitted to your fabric.",
        values: [false, true, true, true],
      },
      {
        id: "blinds",
        feature: "Motorised blinds",
        description: "Roller and venetian blinds on the same control as the curtains.",
        values: [false, false, true, true],
      },
      {
        id: "scheduled-shading",
        feature: "Scheduled and sunlight-based shading",
        description:
          "Shading that tracks the sun through the day, so a west-facing room is not an oven by four.",
        values: [false, false, true, true],
      },
      {
        id: "outdoor-shading",
        feature: "Outdoor shading and pergolas",
        description:
          "Louvred pergolas, awnings and external screens brought onto the same schedules.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "security",
    title: "Security and access",
    rows: [
      {
        id: "motion-occupancy",
        feature: "Motion and occupancy sensors",
        description:
          "The sensors that tell the house whether anyone is home, used by lighting, climate and security alike.",
        values: [true, true, true, true],
      },
      {
        id: "smart-locks",
        feature: "Smart locks",
        description:
          "Keyless entry on the doors you choose, with a code or a phone, and a log of who came in when.",
        values: [false, true, true, true],
      },
      {
        id: "video-doorbell",
        feature: "Video doorbell",
        description: "See and speak to whoever is at the door from wherever you are.",
        values: [false, true, true, true],
      },
      {
        id: "door-window-sensors",
        feature: "Door and window sensors",
        description: "Know which doors and windows are open before you arm the house or leave it.",
        values: [false, true, true, true],
      },
      {
        id: "cctv",
        feature: "CCTV",
        description:
          "Cameras on the platform, from bringing your existing ones in to a full new system designed for the property.",
        values: [false, false, "Integration", "Full system"],
      },
      {
        id: "video-intercom",
        feature: "Video intercom",
        description:
          "A wired intercom at the gate and the door, answered from any panel or the app.",
        values: [false, false, true, true],
      },
      {
        id: "intrusion",
        feature: "Intrusion detection",
        description: "Sensors, sirens and alerts, with the coverage growing as the tier does.",
        values: [false, "Basic", "Advanced", "Complete"],
      },
      {
        id: "gate-garage",
        feature: "Gate and garage automation",
        description: "Gates and garage doors that open for you, on a schedule, or on a tap.",
        values: [false, false, true, true],
      },
      {
        id: "perimeter-visitor",
        feature: "Perimeter security and visitor management",
        description:
          "Beam and fence sensors around the plot, and a way to give visitors and staff their own timed access.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "entertainment",
    title: "Entertainment",
    rows: [
      {
        id: "multiroom-audio",
        feature: "Multi-room audio",
        description:
          "Music in any room or every room, from one app, with the speakers built in rather than on the shelf.",
        values: [false, false, true, true],
      },
      {
        id: "tv-streaming",
        feature: "TV and streaming control",
        description:
          "Every screen and source on the same remote, and in the scenes with the lights and blinds.",
        values: [false, false, true, true],
      },
      {
        id: "outdoor-audio",
        feature: "Outdoor audio",
        description:
          "Weatherproof speakers by the pool and in the garden, on the same system as inside.",
        values: [false, false, false, true],
      },
      {
        id: "home-cinema",
        feature: "Dedicated home cinema",
        description:
          "A room designed for it: projection, surround sound, acoustic treatment and one button that sets it all.",
        values: [false, false, "Optional", true],
      },
    ],
  },
  {
    id: "control",
    title: "Control and interface",
    rows: [
      {
        id: "mobile-app",
        feature: "Mobile app control",
        description: "One app for everything in the scope, at home and away.",
        values: [true, true, true, true],
      },
      {
        id: "voice",
        feature: "Voice assistant integration",
        description: "Your voice assistant wired into the system rather than bolted onto it.",
        values: [true, "Multi-room", true, true],
      },
      {
        id: "scenes-routines",
        feature: "Scenes and routines",
        description:
          "Welcome Home, Good Night, Away and the rest, written for how you actually live in the house.",
        values: ["Basic", "Advanced", "Custom", "Bespoke"],
      },
      {
        id: "wall-panels",
        feature: "Wall panels",
        description:
          "Keypads on the wall for the things you do without a phone, like turning the lights off on the way out.",
        values: [false, true, true, true],
      },
      {
        id: "touch-panels",
        feature: "Touch panels",
        description:
          "A screen at the front door and in the main rooms that shows the whole house at a glance.",
        values: [false, false, true, true],
      },
      {
        id: "remote-access",
        feature: "Remote access and monitoring",
        description: "Check on the house and change anything from anywhere with a connection.",
        values: [true, true, true, true],
      },
      {
        id: "dashboards-profiles",
        feature: "Custom dashboards and user profiles",
        description:
          "A layout per person and per room, so the children's panel does not show the plant room.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking and infrastructure",
    rows: [
      {
        id: "home-networking",
        feature: "Home networking",
        description:
          "The wiring and Wi-Fi the rest of the system stands on, sized for the number of devices rather than for a laptop.",
        values: [false, "Basic", "Structured", "Enterprise"],
      },
      {
        id: "wifi",
        feature: "Wi-Fi optimisation",
        description: "Access points placed for the building's walls, not left at the router.",
        values: [false, false, true, true],
      },
      {
        id: "iot-network",
        feature: "Dedicated IoT network",
        description: "The house's devices on their own network, away from your laptops and guests.",
        values: [false, false, true, true],
      },
      {
        id: "device-management",
        feature: "Device management",
        description:
          "Every device inventoried, updated and monitored, so a dead sensor is noticed by us before it is by you.",
        values: [false, false, true, true],
      },
    ],
  },
  {
    id: "energy",
    title: "Energy",
    rows: [
      {
        id: "energy-monitoring",
        feature: "Energy monitoring",
        description:
          "See what the house is drawing, by circuit, and where the electricity bill is actually going.",
        values: [false, true, "Advanced", "Full"],
      },
      {
        id: "solar",
        feature: "Solar integration",
        description: "Panels brought onto the platform so the house uses its own power first.",
        values: [false, false, "Optional", true],
      },
      {
        id: "battery",
        feature: "Battery integration",
        description:
          "Storage that keeps the essentials running through an outage and shifts the load off peak.",
        values: [false, false, "Optional", true],
      },
      {
        id: "ev-charging",
        feature: "EV charging",
        description: "A charger that knows the tariff, the solar and the rest of the house's load.",
        values: [false, false, "Optional", true],
      },
      {
        id: "load-generator",
        feature: "Load and generator management",
        description:
          "Priority circuits, automatic shedding and a generator that starts itself when it should.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "outdoor",
    title: "Outdoor",
    rows: [
      {
        id: "pool",
        feature: "Pool automation",
        description: "Pumps, heating, lighting and chemistry on schedules, checked from the app.",
        values: [false, false, "Optional", true],
      },
      {
        id: "garden-lighting",
        feature: "Garden and landscape lighting",
        description:
          "Path, tree and feature lighting that comes on at dusk and dims when the house goes to bed.",
        values: [false, false, "Optional", true],
      },
      {
        id: "irrigation",
        feature: "Irrigation automation",
        description: "Watering that follows the forecast and the season rather than a fixed timer.",
        values: [false, false, "Optional", true],
      },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence",
    rows: [
      {
        id: "presence",
        feature: "Presence detection",
        description:
          "The house knows who is in, from phones and sensors together, and behaves accordingly.",
        values: [false, true, true, true],
      },
      {
        id: "automation-logic",
        feature: "Advanced automation logic",
        description:
          "Rules with conditions: if it is after sunset and someone is home and the AC is on, then close the blinds.",
        values: [false, false, true, true],
      },
      {
        id: "predictive",
        feature: "Predictive routines",
        description:
          "Routines that adjust to how the house is actually used over time, rather than to a schedule set on day one.",
        values: [false, false, false, true],
      },
      {
        id: "air-quality",
        feature: "Air quality and environmental monitoring",
        description:
          "CO2, particulates and humidity per room, feeding the ventilation and the climate rather than only a chart.",
        values: [false, false, false, true],
      },
    ],
  },
  {
    id: "services",
    title: "Professional services and support",
    rows: [
      {
        id: "survey-design",
        feature: "Site survey and system design",
        description:
          "A technician walks the property and the system is designed to it, with drawings, before anything is ordered.",
        values: [false, true, true, true],
      },
      {
        id: "installation-commissioning",
        feature: "Installation and commissioning",
        description:
          "Fitted by our own engineers, then every device tested in place before handover.",
        values: [true, true, true, true],
      },
      {
        id: "project-management",
        feature: "Project management",
        description:
          "One named person coordinating with your contractor, your designer and our engineers.",
        values: [false, false, true, true],
      },
      {
        id: "documentation",
        feature: "System documentation",
        description:
          "A record of what was installed and how it is wired, so the next person can pick it up.",
        values: [false, true, true, "As-built"],
      },
      {
        id: "training",
        feature: "Training",
        description:
          "A walkthrough of the system with whoever lives in the house, and again once you have lived with it.",
        values: ["Basic", true, true, true],
      },
      {
        id: "support",
        feature: "Support",
        description:
          "Who answers when something needs attention, and how fast. The care packages set the response windows.",
        values: ["Standard", "Priority", "Premium", "Dedicated"],
      },
    ],
  },
];

/**
 * The questions people ask once they have seen a number.
 *
 * Short on purpose: the full FAQ page is the place for everything else, and
 * the pricing page links there. The one figure quoted, the assessment fee,
 * matches what the contact page prints; the two must move together. Same
 * FaqEntry shape as faq.ts so FaqAccordion renders it unchanged.
 */
export const PRICING_FAQS: readonly {
  id: string;
  question: string;
  answer: readonly string[];
}[] = [
  {
    id: "why-plus",
    question: "Why does every price end in a plus?",
    answer: [
      "Because the number is where a quote starts, not where it lands. Every system is priced against your own drawings after a site visit, and the figure on the card is the least a home in that tier has cost. A three-bedroom apartment and a six-bedroom villa can both be Connected and will not pay the same.",
    ],
  },
  {
    id: "what-moves-the-price",
    question: "What decides where in a tier a home lands?",
    answer: [
      "Three things, in order: how many rooms and circuits are in scope, what cabling is already in the walls, and which devices you choose within the tier. A house that is being renovated is usually cheaper to do well than a finished one, because the cabling can go in while the walls are open.",
    ],
  },
  {
    id: "site-visit",
    question: "Is the site visit included?",
    answer: [
      "The assessment is a paid visit, AED 1,500, credited in full against any installation you go ahead with. You get a fixed, itemised proposal within 48 hours of it. If you decide not to proceed you keep the report and owe nothing further.",
    ],
  },
  {
    id: "start-small",
    question: "Can I start with Essential and move up later?",
    answer: [
      "Yes. The four tiers are one platform with more on it, not four products, so what you install first is kept when you add to it. Most people who start small do it room by room, and the cabling we run in the first phase is sized for where the house is going rather than for where it starts.",
    ],
  },
  {
    id: "what-is-included",
    question: "Does the price include the devices?",
    answer: [
      "It includes the devices, the installation, the commissioning and the training. It does not include civil works, major electrical rewiring, or decorative fittings such as curtain fabric and architectural light fixtures, unless the proposal names them. Where your project needs those we will say so before you commit, and we will not bury them in a later invoice.",
    ],
  },
  {
    id: "after-handover",
    question: "What does support cost after handover?",
    answer: [
      "Ongoing care is a separate annual package, chosen after the installation rather than bundled into it, so a one-room system is not paying for a villa's cover. The two packages and what each promises are on the homepage.",
    ],
  },
];
