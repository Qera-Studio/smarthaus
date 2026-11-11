// Seed for the pricingPage document, from src/content/pricing.ts and the
// pricing components on 2026-11-11.
//
// No prices. The tiers carried AED figures that were never rendered; they are
// left out here because the dataset is public, and the site discloses no
// prices for now (Shivanshu, 2026-11-04). /pricing stays out of search.
import type { PricingPage } from "../../src/sanity/types";

export const PRICING_PAGE: PricingPage = {
  seo: {
    title: "Pricing",
    description:
      "Four levels of Smarthaus automation, from a single room to a fully engineered residence, with every feature compared side by side.",
    index: false,
  },
  title: "Pricing",
  standfirst:
    "Four levels, from a single room to a fully engineered residence. Every one is quoted against your own drawings after a site visit.",
  tierCta: "Get started",
  includes: "includes:",
  tiers: [
    {
      id: "essential",
      name: "Essential",
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
  ],
  compareHeading: "Compare all features",
  comparison: [
    {
      id: "lighting",
      title: "Lighting",
      rows: [
        {
          id: "smart-lighting-control",
          feature: "Smart lighting control",
          description:
            "Every light in the scope on a switch you can reach from the app, a wall panel or your voice.",
          values: [
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "whole-home-lighting",
          feature: "Whole-home lighting",
          description: "Every circuit in the house, not only the rooms you chose to start with.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "dimming-scenes",
          feature: "Dimming and scene control",
          description:
            "Levels rather than on and off, and named scenes that set several rooms at once.",
          values: [
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "occupancy-lighting",
          feature: "Occupancy-based lighting",
          description:
            "Lights come on when someone walks in and go off once a room has been empty for a while.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "exterior-lighting",
          feature: "Exterior lighting",
          description:
            "Garden, facade and pathway lighting on the same schedules and scenes as the inside.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "architectural-circadian",
          feature: "Architectural and circadian lighting",
          description:
            "Colour temperature that follows the time of day, and fittings specified with your designer rather than around them.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
              note: "Advanced",
            },
            {
              included: true,
              note: "Multi-zone",
            },
            {
              included: true,
              note: "Full integration",
            },
          ],
        },
        {
          id: "thermostats",
          feature: "Smart thermostats",
          description:
            "A thermostat per zone that learns the house, rather than a single setpoint for everything.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "temp-humidity",
          feature: "Temperature and humidity sensors",
          description:
            "Sensors in the rooms you use, so the system responds to how a room feels rather than to the thermostat's own corner.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "hvac-bms",
          feature: "HVAC and BMS integration",
          description:
            "Plant-level control of chillers, fresh-air units and the building management system where the villa has one.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "blinds",
          feature: "Motorised blinds",
          description: "Roller and venetian blinds on the same control as the curtains.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "scheduled-shading",
          feature: "Scheduled and sunlight-based shading",
          description:
            "Shading that tracks the sun through the day, so a west-facing room is not an oven by four.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "outdoor-shading",
          feature: "Outdoor shading and pergolas",
          description:
            "Louvred pergolas, awnings and external screens brought onto the same schedules.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "smart-locks",
          feature: "Smart locks",
          description:
            "Keyless entry on the doors you choose, with a code or a phone, and a log of who came in when.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "video-doorbell",
          feature: "Video doorbell",
          description: "See and speak to whoever is at the door from wherever you are.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "door-window-sensors",
          feature: "Door and window sensors",
          description:
            "Know which doors and windows are open before you arm the house or leave it.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "cctv",
          feature: "CCTV",
          description:
            "Cameras on the platform, from bringing your existing ones in to a full new system designed for the property.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Integration",
            },
            {
              included: true,
              note: "Full system",
            },
          ],
        },
        {
          id: "video-intercom",
          feature: "Video intercom",
          description:
            "A wired intercom at the gate and the door, answered from any panel or the app.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "intrusion",
          feature: "Intrusion detection",
          description: "Sensors, sirens and alerts, with the coverage growing as the tier does.",
          values: [
            {
              included: false,
            },
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
              note: "Advanced",
            },
            {
              included: true,
              note: "Complete",
            },
          ],
        },
        {
          id: "gate-garage",
          feature: "Gate and garage automation",
          description: "Gates and garage doors that open for you, on a schedule, or on a tap.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "perimeter-visitor",
          feature: "Perimeter security and visitor management",
          description:
            "Beam and fence sensors around the plot, and a way to give visitors and staff their own timed access.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "tv-streaming",
          feature: "TV and streaming control",
          description:
            "Every screen and source on the same remote, and in the scenes with the lights and blinds.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "outdoor-audio",
          feature: "Outdoor audio",
          description:
            "Weatherproof speakers by the pool and in the garden, on the same system as inside.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "home-cinema",
          feature: "Dedicated home cinema",
          description:
            "A room designed for it: projection, surround sound, acoustic treatment and one button that sets it all.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "voice",
          feature: "Voice assistant integration",
          description: "Your voice assistant wired into the system rather than bolted onto it.",
          values: [
            {
              included: true,
            },
            {
              included: true,
              note: "Multi-room",
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "scenes-routines",
          feature: "Scenes and routines",
          description:
            "Welcome Home, Good Night, Away and the rest, written for how you actually live in the house.",
          values: [
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
              note: "Advanced",
            },
            {
              included: true,
              note: "Custom",
            },
            {
              included: true,
              note: "Bespoke",
            },
          ],
        },
        {
          id: "wall-panels",
          feature: "Wall panels",
          description:
            "Keypads on the wall for the things you do without a phone, like turning the lights off on the way out.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "touch-panels",
          feature: "Touch panels",
          description:
            "A screen at the front door and in the main rooms that shows the whole house at a glance.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "remote-access",
          feature: "Remote access and monitoring",
          description: "Check on the house and change anything from anywhere with a connection.",
          values: [
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "dashboards-profiles",
          feature: "Custom dashboards and user profiles",
          description:
            "A layout per person and per room, so the children's panel does not show the plant room.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
              note: "Structured",
            },
            {
              included: true,
              note: "Enterprise",
            },
          ],
        },
        {
          id: "wifi",
          feature: "Wi-Fi optimisation",
          description: "Access points placed for the building's walls, not left at the router.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "iot-network",
          feature: "Dedicated IoT network",
          description:
            "The house's devices on their own network, away from your laptops and guests.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "device-management",
          feature: "Device management",
          description:
            "Every device inventoried, updated and monitored, so a dead sensor is noticed by us before it is by you.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
              note: "Advanced",
            },
            {
              included: true,
              note: "Full",
            },
          ],
        },
        {
          id: "solar",
          feature: "Solar integration",
          description: "Panels brought onto the platform so the house uses its own power first.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "battery",
          feature: "Battery integration",
          description:
            "Storage that keeps the essentials running through an outage and shifts the load off peak.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "ev-charging",
          feature: "EV charging",
          description:
            "A charger that knows the tariff, the solar and the rest of the house's load.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "load-generator",
          feature: "Load and generator management",
          description:
            "Priority circuits, automatic shedding and a generator that starts itself when it should.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "garden-lighting",
          feature: "Garden and landscape lighting",
          description:
            "Path, tree and feature lighting that comes on at dusk and dims when the house goes to bed.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "irrigation",
          feature: "Irrigation automation",
          description:
            "Watering that follows the forecast and the season rather than a fixed timer.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
              note: "Optional",
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "automation-logic",
          feature: "Advanced automation logic",
          description:
            "Rules with conditions: if it is after sunset and someone is home and the AC is on, then close the blinds.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "predictive",
          feature: "Predictive routines",
          description:
            "Routines that adjust to how the house is actually used over time, rather than to a schedule set on day one.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "air-quality",
          feature: "Air quality and environmental monitoring",
          description:
            "CO2, particulates and humidity per room, feeding the ventilation and the climate rather than only a chart.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
          ],
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
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "installation-commissioning",
          feature: "Installation and commissioning",
          description:
            "Fitted by our own engineers, then every device tested in place before handover.",
          values: [
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "project-management",
          feature: "Project management",
          description:
            "One named person coordinating with your contractor, your designer and our engineers.",
          values: [
            {
              included: false,
            },
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "documentation",
          feature: "System documentation",
          description:
            "A record of what was installed and how it is wired, so the next person can pick it up.",
          values: [
            {
              included: false,
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
              note: "As-built",
            },
          ],
        },
        {
          id: "training",
          feature: "Training",
          description:
            "A walkthrough of the system with whoever lives in the house, and again once you have lived with it.",
          values: [
            {
              included: true,
              note: "Basic",
            },
            {
              included: true,
            },
            {
              included: true,
            },
            {
              included: true,
            },
          ],
        },
        {
          id: "support",
          feature: "Support",
          description:
            "Who answers when something needs attention, and how fast. The care packages set the response windows.",
          values: [
            {
              included: true,
              note: "Standard",
            },
            {
              included: true,
              note: "Priority",
            },
            {
              included: true,
              note: "Premium",
            },
            {
              included: true,
              note: "Dedicated",
            },
          ],
        },
      ],
    },
  ],
  faqHeading: "Frequently Asked Questions",
  faqs: [
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
        "The assessment is a paid visit, credited in full against any installation you go ahead with. You get a fixed, itemised proposal within 48 hours of it. If you decide not to proceed you keep the report and owe nothing further.",
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
  ],
  closing: {
    heading: "Not sure which level?",
    body: "Most people are between two. Tell us about the property and we will say which one fits, and why.",
    cta: "Book a site visit",
    secondary: "Read the full FAQ",
  },
};
