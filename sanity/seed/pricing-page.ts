// Seed for the pricingPage document, from the package deck ("Smart Haus_Smart
// Home Packages.pdf"), which Shivanshu made the source for every package,
// device count and price on 2026-11-19: Starter, Aura, Elevate and Luxe,
// sized by the home, with starting prices.
//
// Prices are shown from 2026-11-19 (Shivanshu). Until then the site disclosed
// none (2026-11-04), and this file held the brief's placeholder tiers.
//
// From the same answers: every maker the deck names is confirmed, the switches
// and thermostats come in both finishes in every package, the CCTV count is a
// count of cameras, and both controllers in Elevate and Luxe are intended.
// Smoke and CO sensors are worded as alerts, not as fire protection.
import type { ComparisonSection, PricingPage, PricingTier } from "../../src/sanity/types";

/** Starter, Aura, Elevate, Luxe: the deck's order, and the cells' order. */
type Counts = readonly [number, number, number, number];

type Device = {
  id: string;
  /** The row's name in the table. */
  feature: string;
  description: string;
  /** On a card: "3 lighting keypads", or the name alone where `many` is unset. */
  one: string;
  many?: string;
  counts: Counts;
};

type System = { id: string; title: string; devices: Device[] };

/** The deck's bill of quantities, by system. */
const SYSTEMS: System[] = [
  {
    id: "lighting",
    title: "Lighting",
    devices: [
      {
        id: "lighting-keypads",
        feature: "Lighting keypads",
        description:
          "Apex Z-Wave keypad switches in crystal glass or classic metal, with one to five touch layouts for lights and scenes.",
        one: "lighting keypad",
        many: "lighting keypads",
        counts: [3, 6, 13, 20],
      },
      {
        id: "colour-lighting",
        feature: "Colour lighting controllers",
        description: "Smart RGBW modules that set the colour and brightness of lighting strips.",
        one: "colour lighting controller",
        many: "colour lighting controllers",
        counts: [0, 2, 4, 3],
      },
    ],
  },
  {
    id: "climate",
    title: "Climate",
    devices: [
      {
        id: "ac-thermostats",
        feature: "AC thermostats",
        description:
          "Apex Z-Wave thermostat keypads in crystal glass or classic metal, which set the AC from the wall or the app.",
        one: "AC thermostat",
        many: "AC thermostats",
        counts: [2, 3, 4, 6],
      },
    ],
  },
  {
    id: "curtains",
    title: "Curtains and shutters",
    devices: [
      {
        id: "curtains",
        feature: "Motorised curtains",
        description:
          "NICE Era Track Plus motorised tracks with a remote, quiet, and stopped at any position.",
        one: "motorised curtain",
        many: "motorised curtains",
        counts: [2, 3, 5, 7],
      },
      {
        id: "roller-shutters",
        feature: "Roller shutter controllers",
        description:
          "Fibaro modules that open, close and stop motorised blinds, shutters and awnings, and report the power they use.",
        one: "roller shutter controller",
        many: "roller shutter controllers",
        counts: [0, 0, 0, 2],
      },
    ],
  },
  {
    id: "safety",
    title: "Safety sensors",
    devices: [
      {
        id: "flood-sensors",
        feature: "Flood sensors",
        description: "Fibaro sensors that find a water leak early and alert your phone.",
        one: "flood sensor",
        many: "flood sensors",
        counts: [2, 3, 4, 5],
      },
      {
        id: "smoke-sensors",
        feature: "Smoke sensors",
        description:
          "Fibaro optical smoke sensors that send smoke and temperature alerts to your phone. They sit alongside a home's fire alarm, not in place of it.",
        one: "smoke sensor",
        many: "smoke sensors",
        counts: [0, 2, 3, 5],
      },
      {
        id: "co-sensors",
        feature: "Carbon monoxide sensors",
        description:
          "Fibaro sensors that detect carbon monoxide, with a light, an 85 dB siren and an alert to your phone.",
        one: "carbon monoxide sensor",
        many: "carbon monoxide sensors",
        counts: [0, 0, 3, 3],
      },
    ],
  },
  {
    id: "security",
    title: "Security and access",
    devices: [
      {
        id: "door-window-sensors",
        feature: "Door and window sensors",
        description:
          "Fibaro sensors for doors, windows and garage gates that report each opening, and alert you if one is tampered with.",
        one: "door and window sensor",
        many: "door and window sensors",
        counts: [2, 3, 4, 5],
      },
      {
        id: "motion-sensors",
        feature: "Motion sensors",
        description:
          "Fibaro infrared motion sensors with adjustable sensitivity, for security alerts.",
        one: "motion sensor",
        many: "motion sensors",
        counts: [0, 0, 0, 3],
      },
      {
        id: "smart-lock",
        feature: "Smart door lock",
        description:
          "An Akubela lock that opens by fingerprint, code or card, with temporary codes for guests and alarms for tampering and repeated wrong attempts.",
        one: "smart door lock",
        many: "smart door locks",
        counts: [1, 1, 1, 1],
      },
      {
        id: "cctv",
        feature: "CCTV cameras",
        description:
          "Dahua cameras with infrared night vision, recorded to a recorder in your home and viewed on your phone.",
        one: "CCTV camera",
        many: "CCTV cameras",
        counts: [1, 1, 1, 4],
      },
    ],
  },
  {
    id: "control",
    title: "Control",
    devices: [
      {
        id: "yubii",
        feature: "Yubii home controller",
        description:
          "The controller that runs every device, its scenes and schedules, from the app and with compatible voice assistants.",
        one: "Yubii home controller",
        counts: [1, 1, 1, 1],
      },
      {
        id: "home-center",
        feature: "Fibaro Home Center 3",
        description:
          "A central automation hub for the larger home, alongside the Yubii controller.",
        one: "Fibaro Home Center 3",
        counts: [0, 0, 1, 1],
      },
      {
        id: "key-fob",
        feature: "Scene key fob",
        description: "A Fibaro key fob with six buttons, each setting a scene with one press.",
        one: "scene key fob",
        many: "scene key fobs",
        counts: [0, 0, 0, 1],
      },
      {
        id: "smart-plugs",
        feature: "Smart plugs",
        description:
          "Fibaro plugs that switch an appliance on a schedule or from the app, report the power it uses, and cut out on overload.",
        one: "smart plug",
        many: "smart plugs",
        counts: [0, 0, 0, 5],
      },
    ],
  },
];

/** Not a device: every package carries it, so the table shows a tick. */
const INSTALLATION = {
  id: "installation",
  feature: "Installation and configuration",
  description: "Every device installed, integrated and tested.",
};

/** A card's line for one device: "3 lighting keypads", or its name alone. */
export function cardLine(device: Device, count: number): string {
  if (!device.many) return device.one;
  return `${count} ${count === 1 ? device.one : device.many}`;
}

const PACKAGES: (Omit<PricingTier, "includes"> & { index: number })[] = [
  {
    index: 0,
    id: "starter",
    name: "Starter",
    tagline: "Smart essentials",
    description: "One living room and one bedroom.",
    price: 16000,
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    index: 1,
    id: "aura",
    name: "Aura",
    tagline: "Smart comfort",
    description: "One living room and two bedrooms.",
    price: 25000,
    tone: "sand",
    ctaVariant: "outline",
  },
  {
    index: 2,
    id: "elevate",
    name: "Elevate",
    tagline: "Smart prestige",
    description: "One living room and three bedrooms.",
    price: 42000,
    tone: "image",
    ctaVariant: "solid",
  },
  {
    index: 3,
    id: "luxe",
    name: "Luxe",
    tagline: "Smart signature",
    description: "One living room and four bedrooms.",
    price: 68000,
    tone: "dark",
    ctaVariant: "inverse",
  },
];

const DEVICES = SYSTEMS.flatMap((system) => system.devices);

const TIERS: PricingTier[] = PACKAGES.map(({ index, ...tier }) => ({
  ...tier,
  includes: [
    ...DEVICES.filter((d) => d.counts[index]! > 0).map((d) => cardLine(d, d.counts[index]!)),
    INSTALLATION.feature,
  ],
}));

const COMPARISON: ComparisonSection[] = [
  ...SYSTEMS.map((system) => ({
    id: system.id,
    title: system.title,
    rows: system.devices.map((d) => ({
      id: d.id,
      feature: d.feature,
      description: d.description,
      values: d.counts.map((n) =>
        n > 0 ? { included: true, note: String(n) } : { included: false },
      ),
    })),
  })),
  {
    id: "services",
    title: "Installation",
    rows: [{ ...INSTALLATION, values: PACKAGES.map(() => ({ included: true })) }],
  },
];

export const PRICING_PAGE: PricingPage = {
  seo: {
    title: "Smart Home Packages and Prices",
    description:
      "Four Smarthaus packages for Dubai homes, from one bedroom to four, starting from AED 16,000. Every device is listed, installed and configured by one team.",
    index: true,
  },
  title: "Smart home packages",
  standfirst:
    "Four packages, from one bedroom to four, each a clear starting point for a connected home. The final price is fixed after a site survey.",
  tierCta: "Book a site visit",
  includes: "includes:",
  priceLabel: "Starting from",
  tiers: TIERS,
  compareHeading: "What each package includes",
  comparison: COMPARISON,
  notesHeading: "Package notes",
  // The deck's notes, in its order, in the site's words.
  notes: [
    "Each price is for the whole package as listed.",
    "The final price follows a site survey, the scope we confirm with you and the approved proposal.",
    "Final product models, quantities, compatibility and stock are confirmed in the proposal.",
    "The number of cameras, the recorder, how long footage is kept and how it is recorded are set for each home.",
    "AC control depends on the AC units installed and a compatible control interface.",
    "Curtain prices and installation depend on the curtains' sizes, the tracks and the site.",
    "Civil works, electrical changes, authority approvals and anything not listed may be quoted separately.",
  ],
  faqHeading: "Frequently Asked Questions",
  faqs: [
    {
      id: "what-moves-the-price",
      question: "What decides the final price?",
      answer: [
        "Each package price is a starting point. The final price follows the site survey and the scope we confirm with you: the sizes of the curtains and their tracks, the AC units already in the house, the cameras the home needs, and any civil or electrical work, which is quoted separately.",
      ],
    },
    {
      id: "site-visit",
      question: "Is the site visit free?",
      answer: [
        "Yes. A technician and a technical lead spend about 90 minutes in your home, and you get a fixed, itemised proposal within 48 hours. If you decide not to go ahead, you owe nothing.",
      ],
    },
    {
      id: "start-small",
      question: "Can I start with Starter and add more later?",
      answer: [
        "Yes. Every package is built from the same devices on the same controller, so what you install first stays when you add to it. Most people start with part of the house and extend.",
      ],
    },
    {
      id: "what-is-included",
      question: "What does the price include?",
      answer: [
        "The devices listed for your package, and their installation, configuration, integration and testing. Civil works, electrical changes, authority approvals and anything not listed may be quoted separately, and we tell you before you commit.",
      ],
    },
    {
      id: "after-handover",
      question: "What does support cost after handover?",
      answer: [
        "Ongoing care is a separate annual package, chosen after the installation rather than bundled into it, so a one-room system is not paying for a villa's cover. The two packages and what each promises are on the homepage.",
      ],
    },
  ],
  closing: {
    heading: "Not sure which package?",
    body: "Most homes sit between two. Tell us about the property and we will say which one fits, and why.",
    cta: "Book a site visit",
    secondary: "Read the full FAQ",
  },
};
