import type { SolutionPage } from "../../src/sanity/types";
import { WORKS_WITH } from "./works-with";

type Feature = SolutionPage["features"]["items"][number];
type Faq = SolutionPage["faqs"][number];

// What every page says the same way: confirmed facts (AGENTS.md), so they are
// written once.
const BUTTON = "Book a site visit";
const ENQUIRY = "Tell us a little about your home and we’ll call you back during business hours.";
const ARTICLES = "Related articles";
const ONE_TEAM: Feature = {
  icon: "wrench",
  title: "One team",
  text: "Designed, installed and looked after by us.",
};
const PRICED: Faq = {
  id: "how-is-it-priced",
  question: "How is it priced?",
  answer: [
    "After a site visit, where a technician and a technical lead go through the house with you. The price that follows is fixed and itemised.",
  ],
};
// The process under the features (2026-11-16), drafted for review from the
// About page's confirmed promises: the visit, the record left at handover,
// and maintenance with one number to call.
const PROCESS: SolutionPage["process"] = {
  heading: "One team, start to finish",
  subtext:
    "We visit, install and look after the whole system ourselves, so you have one team and one number to call.",
  steps: [
    {
      title: "Site visit",
      text: "A technician and a technical lead spend about 90 minutes in your home. The price that follows is fixed and itemised.",
    },
    {
      title: "Installation",
      text: "The same team installs it, then hands over a record of what went in, where it sits and how it is set up.",
    },
    {
      title: "Maintenance",
      text: "Maintenance, updates and one number to call, for as long as you want us.",
    },
  ],
};

/**
 * The solution pages, by their id in the Solutions menu and in its order
 * (Shivanshu, 2026-11-15): cameras first, the other seven the same day, each
 * a service Smarthaus has installed in clients' homes (confirmed by Shivanshu,
 * 2026-11-15). The copy was drafted for his review: it names no maker, no
 * figure and no price, says nothing about Smarthaus beyond the confirmed facts
 * in AGENTS.md (one team, the visit by a technician and a technical lead, the
 * fixed and itemised price, most homes already lived in, footage kept in the
 * house, the SIRA licence for security work), and each page stays out of
 * search until he has read it.
 */
export const SOLUTION_PAGES: Record<string, SolutionPage> = {
  cameras: {
    seo: {
      title: "Cameras and CCTV for Dubai homes",
      description:
        "Home cameras planned at a site visit, recorded on equipment inside your house, and quiet until something matters. Installed under a SIRA licence.",
      index: false,
    },
    title: "Cameras & CCTV",
    lede: "See home from anywhere, without false alerts",
    worksWith: WORKS_WITH.cameras!,
    features: {
      heading: "How the cameras work",
      standfirst:
        "Placed at a site visit, recorded inside your home, and quiet until something matters.",
      items: [
        {
          icon: "globe-lock",
          title: "Recorded at home",
          text: "Footage stays on a recorder in your house.",
        },
        {
          icon: "scan-eye",
          title: "Fewer false alerts",
          text: "Alerts for people and cars, not palm fronds.",
        },
        {
          icon: "moon",
          title: "Clear at night",
          text: "Infrared night vision, no floodlights needed.",
        },
        {
          icon: "sun",
          title: "Built for summer",
          text: "Outdoor cameras chosen for heat and dust.",
        },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Live view and playback, wherever you are.",
        },
        {
          icon: "eye-off",
          title: "Privacy zones",
          text: "Neighbours’ windows masked out of the picture.",
        },
        {
          icon: "cable",
          title: "One cable each",
          text: "Power and picture on one wire, no batteries.",
        },
        {
          icon: "map-pinned",
          title: "Planned on site",
          text: "Gates, walls and parking mapped at the visit.",
        },
        {
          icon: "shield-check",
          title: "SIRA licensed",
          text: "Installed under our SIRA security licence.",
        },
      ],
      image: {
        src: "/solutions/cameras/features.png",
        width: 528,
        height: 528,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the cameras with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about cameras",
    faqs: [
      {
        id: "where-is-footage-kept",
        question: "Where is the footage kept?",
        answer: [
          "On a recorder inside your house. The footage stays on equipment in your home, and you watch it on your phone through that recorder.",
        ],
      },
      {
        id: "neighbours",
        question: "Can a camera see my neighbour’s villa?",
        answer: [
          "Cameras are aimed at your own property. Where a view takes in a neighbour’s window or garden, that part of the picture is masked out when the camera is set up.",
        ],
      },
      {
        id: "summer",
        question: "Will the cameras cope with a Dubai summer?",
        answer: [
          "Outdoor cameras are chosen for heat and dust, and placed out of the direct afternoon sun wherever the view allows.",
        ],
      },
      {
        id: "wifi",
        question: "Do the cameras need Wi-Fi?",
        answer: [
          "No. Each camera is wired to the recorder by one cable that carries its power and its picture, so recording carries on if the Wi-Fi drops.",
        ],
      },
      {
        id: "how-many",
        question: "How many cameras does a villa need?",
        answer: [
          "It depends on the entrances, the boundary walls and where the cars park. A technician and a technical lead count them with you at the site visit, and the price that follows is fixed and itemised.",
        ],
      },
    ],
    enquiry: {
      title: "Plan your cameras with us",
      standfirst: ENQUIRY,
    },
    articlesHeading: ARTICLES,
    articlesTag: "Security",
  },

  lighting: {
    seo: {
      title: "Lighting control for Dubai homes",
      description:
        "Lighting scenes for every room, dimmed and timed to the day, planned at a site visit and looked after by the one team that installs it.",
      index: false,
    },
    title: "Lighting control",
    lede: "Light that suits the hour, set with one touch",
    worksWith: WORKS_WITH.lighting!,
    features: {
      heading: "How the lighting works",
      standfirst:
        "Planned room by room at a site visit, then set into scenes you change with one touch.",
      items: [
        {
          icon: "sliders-horizontal",
          title: "Scenes, not switches",
          text: "Dinner, a film or bedtime, set with one touch.",
        },
        {
          icon: "sun-dim",
          title: "Dimmed to suit",
          text: "Each light as bright as the room needs.",
        },
        {
          icon: "sunrise",
          title: "Timed to the day",
          text: "Lights that change with sunrise and sunset.",
        },
        {
          icon: "footprints",
          title: "Night paths",
          text: "Low light to the kitchen, without waking anyone.",
        },
        {
          icon: "power",
          title: "All off at once",
          text: "One touch at the door turns the house off.",
        },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Check and change any light, wherever you are.",
        },
        {
          icon: "plane",
          title: "Away from home",
          text: "Lights come on and off while you travel.",
        },
        {
          icon: "tag",
          title: "Labelled keypads",
          text: "Each button named for the scene it sets.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/lighting/features.png",
        width: 720,
        height: 1280,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the lighting with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about lighting",
    faqs: [
      {
        id: "switches",
        question: "Do we keep switches on the wall?",
        answer: [
          "Yes. Every room keeps controls on the wall, so anyone in the house can turn a light on without the app.",
        ],
      },
      {
        id: "rewiring",
        question: "Does it mean rewiring the house?",
        answer: [
          "Usually not. Most of the homes we work in are already lived in, so the system is fitted to the wiring that is there wherever it can be. What each room needs is settled at the site visit.",
        ],
      },
      {
        id: "internet",
        question: "What happens if the internet goes down?",
        answer: [
          "The lights and their switches carry on working inside the house. The internet is needed only to reach them from outside it.",
        ],
      },
      {
        id: "scenes",
        question: "Can we change the scenes later?",
        answer: ["Yes. Scenes can be changed after handover, by the team that installed them."],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your lighting with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Design",
  },

  audio: {
    seo: {
      title: "Multi-room audio for Dubai homes",
      description:
        "Music in the rooms you choose, from speakers set into ceilings and walls, planned at a site visit and looked after by the team that installs it.",
      index: false,
    },
    title: "Multi-room audio",
    lede: "Music in every room, or just the one you’re in",
    worksWith: WORKS_WITH.audio!,
    features: {
      heading: "How the audio works",
      standfirst:
        "Speakers placed at a site visit, set into the house, and played from your phone or the wall.",
      items: [
        {
          icon: "house",
          title: "Room by room",
          text: "Play one room, a few, or the whole house.",
        },
        { icon: "speaker", title: "Out of sight", text: "Speakers set into ceilings and walls." },
        {
          icon: "audio-lines",
          title: "Your own music",
          text: "Play from the apps you already use.",
        },
        {
          icon: "trees",
          title: "Outdoors too",
          text: "Garden and pool speakers chosen for the heat.",
        },
        { icon: "moon", title: "Quiet at night", text: "Volume limits for bedrooms after dark." },
        {
          icon: "sliders-horizontal",
          title: "On the wall",
          text: "A keypad in each room for play and volume.",
        },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Choose the music and the rooms in one app.",
        },
        {
          icon: "map-pinned",
          title: "Planned on site",
          text: "Speakers placed for how each room is used.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/audio/features.jpg",
        width: 1176,
        height: 1380,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the audio with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about audio",
    faqs: [
      {
        id: "speakers",
        question: "Will I see the speakers?",
        answer: [
          "Not much. Most are set into the ceiling or the wall behind a grille that can be painted to match, so the room keeps its look.",
        ],
      },
      {
        id: "existing-speakers",
        question: "Can you use the speakers I already have?",
        answer: [
          "Sometimes. If they are in the right places and in good order, they can often be connected. That is checked at the site visit.",
        ],
      },
      {
        id: "different-music",
        question: "Can two rooms play different music?",
        answer: [
          "Yes. Each room, or each group of rooms, can play its own music at its own volume.",
        ],
      },
      {
        id: "pool",
        question: "Can there be music by the pool?",
        answer: [
          "Yes. Outdoor speakers are chosen for heat, sun and water, and aimed at your garden rather than your neighbours’.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your audio with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Everyday use",
  },

  ac: {
    seo: {
      title: "Air conditioning control for Dubai homes",
      description:
        "Air conditioning set room by room and hour by hour, from the wall or your phone, planned at a site visit and looked after by one team.",
      index: false,
    },
    title: "Air conditioning",
    lede: "Cool rooms when you need them, not all day",
    worksWith: WORKS_WITH.ac!,
    features: {
      heading: "How the AC control works",
      standfirst:
        "Every room on its own schedule, run from the wall or your phone, and eased off when no one is in.",
      items: [
        { icon: "house", title: "Room by room", text: "Each room at its own temperature." },
        {
          icon: "calendar-clock",
          title: "On a schedule",
          text: "Cool before you wake and before you get home.",
        },
        {
          icon: "door-closed",
          title: "Leaving home",
          text: "One touch at the door eases every room off.",
        },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Check and set any room, wherever you are.",
        },
        {
          icon: "thermometer",
          title: "One per room",
          text: "A controller on the wall, not a remote per unit.",
        },
        {
          icon: "wind",
          title: "Open windows",
          text: "Cooling pauses while a door or window is open.",
        },
        { icon: "moon", title: "Night setting", text: "A quieter, steadier setting for sleep." },
        {
          icon: "leaf",
          title: "Less wasted cooling",
          text: "Empty rooms are not cooled all afternoon.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/ac/features.jpg",
        width: 736,
        height: 1308,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the AC control with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about AC control",
    faqs: [
      {
        id: "my-units",
        question: "Does it work with the AC units I have?",
        answer: [
          "Many split and ducted systems can be connected. Which of yours can is checked at the site visit, before any price is given.",
        ],
      },
      {
        id: "new-units",
        question: "Do I need new AC units?",
        answer: [
          "Usually not. The control is added to the units already in the house, and a unit is replaced only if it cannot be connected and you choose to replace it.",
        ],
      },
      {
        id: "remotes",
        question: "What happens to the remotes?",
        answer: [
          "You can keep them, but you will not need them. Each room has a controller on the wall, and the whole house is on your phone.",
        ],
      },
      {
        id: "electricity",
        question: "Will it lower our electricity bill?",
        answer: [
          "It can, by not cooling rooms that no one is in. How much depends on the house and how it is lived in, so we do not promise a figure.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your AC control with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Everyday use",
  },

  garage: {
    seo: {
      title: "Garage door automation for Dubai homes",
      description:
        "Garage doors that open from your phone, show whether they are shut from anywhere, and close behind you. Planned at a site visit, installed by one team.",
      index: false,
    },
    title: "Garage doors",
    lede: "Open on arrival, and know it’s shut",
    worksWith: WORKS_WITH.garage!,
    features: {
      heading: "How the garage works",
      standfirst:
        "Your door connected to the house: opened from your phone, checked from anywhere, and closed behind you.",
      items: [
        {
          icon: "smartphone",
          title: "Open from your phone",
          text: "No remote to find in the car.",
        },
        { icon: "eye", title: "Open or shut", text: "See the door’s state from anywhere." },
        {
          icon: "bell-ring",
          title: "Left open",
          text: "A reminder, or a close, if it stays open.",
        },
        {
          icon: "lightbulb",
          title: "Lights on arrival",
          text: "The garage lights up as you pull in.",
        },
        {
          icon: "clipboard-list",
          title: "Who came and went",
          text: "A record of each time the door opened.",
        },
        {
          icon: "key-round",
          title: "Access for others",
          text: "Let a driver or a delivery in, just once.",
        },
        {
          icon: "sun",
          title: "Built for summer",
          text: "Motors and sensors chosen for heat and dust.",
        },
        {
          icon: "map-pinned",
          title: "Planned on site",
          text: "Your door and its motor checked at the visit.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/garage/features.jpg",
        width: 832,
        height: 1248,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the garage with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about garage doors",
    faqs: [
      {
        id: "my-door",
        question: "Does it work with my garage door?",
        answer: [
          "Most motorised doors can be connected. If yours has no motor, or one that cannot be connected, that is found at the site visit, before any price is given.",
        ],
      },
      {
        id: "power-cut",
        question: "What if the power goes off?",
        answer: [
          "The door can still be opened by hand, as it can today, and the system picks up again when the power returns.",
        ],
      },
      {
        id: "left-open",
        question: "What if I leave it open?",
        answer: [
          "Your phone can remind you, or the door can close on its own after a set time. Which you prefer is set up with you.",
        ],
      },
      {
        id: "others",
        question: "Can someone else open it?",
        answer: [
          "Yes. Family can have access for good, and a driver or a delivery just once, and each time the door is used is recorded.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your garage with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Everyday use",
  },

  "smart-lock": {
    seo: {
      title: "Smart locks for Dubai homes",
      description:
        "Smart locks opened by code, fingerprint or phone, with a record of every entry. Fitted to your doors and installed under our SIRA security licence.",
      index: false,
    },
    title: "Smart locks",
    lede: "Keys you can’t lose, and entry you can see",
    worksWith: WORKS_WITH["smart-lock"]!,
    features: {
      heading: "How the locks work",
      standfirst:
        "Opened by code, fingerprint or phone, with a record of every entry, and fitted to your own doors.",
      items: [
        {
          icon: "fingerprint-pattern",
          title: "Fingerprint entry",
          text: "Your finger opens the door, nothing to carry.",
        },
        {
          icon: "key-round",
          title: "Codes for guests",
          text: "A code for the cleaner, on their days only.",
        },
        {
          icon: "clipboard-list",
          title: "Who came in",
          text: "A record of every entry, by name and time.",
        },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Open for a visitor, wherever you are.",
        },
        { icon: "lock", title: "Locks behind you", text: "The door locks itself once it closes." },
        {
          icon: "lock-keyhole",
          title: "Never locked out",
          text: "More than one way in, so one always works.",
        },
        { icon: "bell-ring", title: "Left unlocked", text: "A message if a door is not locked." },
        {
          icon: "door-closed",
          title: "Fits your doors",
          text: "Chosen to fit the doors you already have.",
        },
        {
          icon: "shield-check",
          title: "SIRA licensed",
          text: "Installed under our SIRA security licence.",
        },
      ],
      image: {
        src: "/solutions/smart-lock/features.jpg",
        width: 736,
        height: 1180,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We choose the locks with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about smart locks",
    faqs: [
      {
        id: "battery",
        question: "What happens when the battery runs low?",
        answer: [
          "The lock warns you well before it runs out, on the lock and on your phone. Changing the batteries takes a minute.",
        ],
      },
      {
        id: "doors",
        question: "Will it fit our front door?",
        answer: [
          "Most doors can take one. The lock is chosen to fit your door at the site visit, and if a door needs work first, you are told before any price is given.",
        ],
      },
      {
        id: "guests",
        question: "Can I give a code to a guest or a cleaner?",
        answer: [
          "Yes. A code can work for a day, for set hours, or until you remove it, and each use shows in the lock’s record.",
        ],
      },
      {
        id: "internet",
        question: "Does the lock need the internet?",
        answer: [
          "No. Codes and fingerprints work at the door without it. The internet is needed only to open or check the lock from away.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your locks with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Security",
  },

  "wall-controller": {
    seo: {
      title: "Wall controllers for Dubai homes",
      description:
        "One panel on the wall for a room’s lights, AC, curtains and music, so nobody in the house needs the app. Planned with you at a site visit.",
      index: false,
    },
    title: "Wall controllers",
    lede: "The whole room from one panel on the wall",
    worksWith: WORKS_WITH["wall-controller"]!,
    features: {
      heading: "How the controllers work",
      standfirst:
        "One panel per room for everything in it, so guests, staff and family never need the app.",
      items: [
        {
          icon: "layout-grid",
          title: "One panel",
          text: "Lights, AC, curtains and music in one place.",
        },
        { icon: "users", title: "No app needed", text: "Anyone in the house can use it." },
        {
          icon: "sliders-horizontal",
          title: "Scenes",
          text: "Morning, evening and night, one touch each.",
        },
        { icon: "tag", title: "Labelled clearly", text: "Every button says what it does." },
        {
          icon: "palette",
          title: "Matched to the room",
          text: "Finishes chosen with you, to suit the room.",
        },
        {
          icon: "power",
          title: "All off",
          text: "The whole house off from the door as you leave.",
        },
        {
          icon: "bed-double",
          title: "At the bedside",
          text: "Lights and curtains, without getting up.",
        },
        {
          icon: "smartphone",
          title: "Also on your phone",
          text: "The same controls, wherever you are.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/wall-controller/features.jpg",
        width: 1000,
        height: 1000,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the controls with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about wall controllers",
    faqs: [
      {
        id: "switches",
        question: "Do the panels replace my light switches?",
        answer: [
          "Often, yes. A panel usually sits where a room’s switches were, so the wall gains nothing. What goes where is settled at the site visit.",
        ],
      },
      {
        id: "what-it-controls",
        question: "What can one panel control?",
        answer: [
          "Whatever in that room is connected: the lights, the AC, the curtains and the music. It shows only what the room has.",
        ],
      },
      {
        id: "guests-and-staff",
        question: "Can guests and staff use them?",
        answer: [
          "Yes. That is what they are for: every button is labelled, and nobody needs an app or an account.",
        ],
      },
      {
        id: "changes",
        question: "Can the buttons change later?",
        answer: [
          "Yes. Scenes and labels can be changed after handover, by the team that installed them.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your controls with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Everyday use",
  },

  curtains: {
    seo: {
      title: "Motorised curtains for Dubai homes",
      description:
        "Motorised curtains and blinds that open with the morning and close against the afternoon sun, from the wall or your phone. Planned at a site visit.",
      index: false,
    },
    title: "Curtains & blinds",
    lede: "Open with the morning, closed against the afternoon sun",
    worksWith: WORKS_WITH.curtains!,
    features: {
      heading: "How the curtains work",
      standfirst:
        "Motors fitted to your curtains and blinds, timed to the sun, and run from the wall or your phone.",
      items: [
        {
          icon: "sunrise",
          title: "Timed to the sun",
          text: "Open at sunrise, closed before the heat.",
        },
        {
          icon: "thermometer-sun",
          title: "Cooler rooms",
          text: "Afternoon sun kept off glass and furniture.",
        },
        { icon: "moon", title: "Quiet motors", text: "Chosen to run quietly, even at night." },
        {
          icon: "blinds",
          title: "Every window at once",
          text: "One touch for a room, or the whole house.",
        },
        { icon: "eye-off", title: "Privacy at dusk", text: "Sheers close as the lights come on." },
        {
          icon: "smartphone",
          title: "On your phone",
          text: "Open or close them, wherever you are.",
        },
        { icon: "plane", title: "Away from home", text: "Curtains that move while you travel." },
        {
          icon: "palette",
          title: "Your own fabrics",
          text: "Motors fitted to the curtains you choose.",
        },
        ONE_TEAM,
      ],
      image: {
        src: "/solutions/curtains/features.jpg",
        width: 683,
        height: 1024,
        alt: "",
        stock: true,
      },
      ctaText: "Every home is different. We plan the curtains with you at a site visit.",
      ctaLabel: BUTTON,
    },
    process: PROCESS,
    faqHeading: "Questions about curtains",
    faqs: [
      {
        id: "existing-curtains",
        question: "Can you motorise the curtains I have?",
        answer: [
          "Often, yes. Whether yours can take a motor, or need a new track, is checked at the site visit, before any price is given.",
        ],
      },
      {
        id: "noise",
        question: "Are the motors loud?",
        answer: [
          "They are chosen to run quietly, so curtains can close at night without waking anyone.",
        ],
      },
      {
        id: "blinds",
        question: "Do blinds work the same way?",
        answer: [
          "Yes. Roller blinds and curtains can share the same scenes, schedules and switches.",
        ],
      },
      {
        id: "wiring",
        question: "Do the motors need new wiring?",
        answer: [
          "Each motor needs power near the top of the window. Where there is none, the way to bring it there is worked out at the site visit.",
        ],
      },
      PRICED,
    ],
    enquiry: { title: "Plan your curtains with us", standfirst: ENQUIRY },
    articlesHeading: ARTICLES,
    articlesTag: "Design",
  },
};
