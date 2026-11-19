// Seed for the homePage document, from the content files and components it
// replaced on 2026-11-11 (src/content/hero-carousel.ts, partners.ts,
// hardware.ts, stats.ts, process.ts, and the copy in HomeHero, Hardware,
// Stats, Process, Care, Pricing and HomeEnquiry).
//
// Claims, as confirmed (AGENTS.md, claims audit): the rating and "180+ Dubai
// projects" (Shivanshu, 2026-10-28 and 2026-11-04); the four figures are
// Smarthaus's own record (2026-10-07); TIS and Fibaro are formalised
// partnerships (2026-10-06), claimed as a partnership and nothing more;
// Premium Care's six-hour window (2026-09-28). Every hero, process and menu
// picture is licensed stock standing in for our own work, marked stock.
import type { HomePage } from "../../src/sanity/types";

export const HOME_PAGE: HomePage = {
  seo: {
    title: "Smarthaus | Home Automation and Security in Dubai",
    absolute: true,
    description:
      "Cameras, entry, audio and home automation for Dubai villas, installed, connected and looked after by one licensed team. Book a site visit.",
    index: true,
  },
  hero: {
    title: "Home at your fingertips",
    lede: "Cameras, entry, audio and home automation for Dubai villas. Installed, connected and looked after by one licensed team.",
    visitCta: "Book a site visit",
    whatsappCta: "WhatsApp",
    whatsappMessage: "Hi, I'm interested in home automation for my villa.",
    proof: [
      "4.8 on Google reviews",
      "180+ Dubai projects",
      "SIRA Licence",
      "by Maple Technologies",
    ],
    stripLabel: "What we install",
    cardsHref: "/solutions",
    cards: [
      {
        id: "lighting",
        title: "Lighting",
        line: "Light that follows your evening, from warm at dusk to off when you leave.",
        cta: "View lighting",
        image: {
          src: "/hero/hero_carousel/lighting_hero.png",
          width: 800,
          height: 533,
          alt: "Someone at a wall panel in a room lit warm amber, blinds half drawn",
          stock: true,
        },
      },
      {
        id: "curtains",
        title: "Curtains",
        line: "Curtains that close before the afternoon heat and open with your alarm.",
        cta: "View curtains",
        image: {
          src: "/hero/hero_carousel/curtains_hero.png",
          width: 400,
          height: 300,
          alt: "Floor-length curtains beside tall windows in a pale sitting room",
          stock: true,
        },
      },
      {
        id: "cameras",
        title: "Cameras",
        line: "Cameras on the boundary that only call you when it matters.",
        cta: "View cameras",
        image: {
          src: "/hero/hero_carousel/cctv_hero.jpg",
          width: 949,
          height: 427,
          alt: "A camera on an outside wall, looking over a garden",
          stock: true,
        },
      },
      {
        id: "wall-controller",
        title: "Wall controller",
        line: "One panel by the door for the lights, the climate and the music.",
        cta: "View controllers",
        image: {
          src: "/hero/hero_carousel/controller_hero.jpg",
          width: 1200,
          height: 900,
          alt: "A touch panel mounted on a pale wall",
          stock: true,
        },
      },
      {
        id: "smart-lock",
        title: "Smart lock",
        line: "No keys to lose. A code for everyone, and one for guests that expires.",
        cta: "View smart locks",
        image: {
          src: "/hero/hero_carousel/smartLock_hero.jpg",
          width: 736,
          height: 414,
          alt: "A keypad lock on a wooden door",
          stock: true,
        },
      },
      {
        id: "garage-door",
        title: "Garage door",
        line: "The garage opens as you turn into the drive and closes behind you.",
        cta: "View garage doors",
        image: {
          src: "/hero/hero_carousel/garageDoor_hero.jpg",
          width: 736,
          height: 738,
          alt: "A wide garage door at the front of a villa",
          stock: true,
        },
      },
      {
        id: "air-conditioning",
        title: "Air conditioning",
        line: "Every room on its own schedule, cool before you get home.",
        cta: "View air conditioning",
        image: {
          src: "/hero/hero_carousel/ac_hero.jpg",
          width: 736,
          height: 618,
          alt: "A wall air conditioner above a calm sitting room",
          stock: true,
        },
      },
      {
        id: "audio",
        title: "TV and audio",
        line: "Music that follows you from the kitchen to the terrace.",
        cta: "View audio",
        image: {
          src: "/hero/hero_carousel/audio_hero.jpg",
          width: 1199,
          height: 403,
          alt: "A speaker on a wooden sideboard in warm light",
          stock: true,
        },
      },
    ],
  },
  partners: {
    heading: "Our partners",
    visit: "Visit",
    items: [
      {
        id: "tis",
        name: "TIS",
        title: "A TIS partner",
        body: "TIS makes wired home control: the wall panels, keypads and modules that run a villa's lighting, climate and scenes from one system. As a TIS partner, Smarthaus installs and sets up TIS systems.",
        href: "https://www.tiscontrol.com/",
        logo: {
          src: "/hero/partners/tis.png",
          width: 1152,
          height: 451,
          alt: "TIS",
        },
      },
      {
        id: "fibaro",
        name: "Fibaro",
        title: "A Fibaro partner",
        body: "Fibaro, a Nice brand, makes wireless smart home devices: sensors, switches and a central controller that add automation without rewiring. As a Fibaro partner, Smarthaus installs and sets up Fibaro systems where the walls are already finished.",
        href: "https://www.fibaro.com/en/",
        logo: {
          src: "/hero/partners/fibaro.png",
          width: 1152,
          height: 364,
          alt: "Fibaro",
        },
      },
    ],
  },
  hardware: {
    heading: "One stop, full house",
    lead: "Cameras, locks, lighting, climate and sound on one system. The team that installs it is the team you call when something needs attention.",
    href: "/solutions",
    items: [
      {
        id: "smart-lock",
        title: "Smart lock",
        description:
          "No keys to cut or lose. Everyone in the house has their own code, and staff or guests get one that works on the days you choose and stops working after. The lock keeps a record of who came in and when, and locks itself from your phone if you left in a hurry.",
        cta: "View smart locks",
        icon: "smartLock.svg",
        image: {
          src: "/hero/hardware/smartLock.jpg",
          width: 2560,
          height: 1440,
          alt: "A keypad smart lock set into a dark front door",
        },
      },
      {
        id: "wall-controller",
        title: "Wall controller",
        description:
          "One panel in each room replaces the bank of switches by the door. Lighting scenes, climate, curtains and audio sit on a single screen at eye level, so the house works for a guest or a child with no phone and no app.",
        cta: "View controllers",
        icon: "smartScreen.svg",
        image: {
          src: "/hero/hardware/wallController.jpg",
          width: 1707,
          height: 2560,
          alt: "A wall-mounted touch controller beside a doorway",
        },
      },
      {
        id: "lighting",
        title: "Lighting",
        description:
          "Scenes instead of switches. The lights warm as the evening comes in, dim for a film, and go off when the last person leaves a room. One press by the bed turns off the whole house, and one at the front door welcomes you home after dark.",
        cta: "View lighting",
        icon: "lighting.svg",
        image: {
          src: "/hero/hardware/lighting.jpg",
          width: 2560,
          height: 1707,
          alt: "Recessed lights washing a textured wall at dusk",
        },
      },
      {
        id: "garage-door",
        title: "Garage door",
        description:
          "The door opens as your car turns into the drive and closes behind you without a remote to find. If it is still open twenty minutes later, your phone tells you, and you can close it from wherever you are.",
        cta: "View garage doors",
        icon: "garageDoor.svg",
        image: {
          src: "/hero/hardware/garageDoor.jpg",
          width: 2560,
          height: 1707,
          alt: "A sectional garage door on a villa at golden hour",
        },
      },
      {
        id: "curtains",
        title: "Curtains",
        description:
          "Motorised tracks follow the sun. Curtains close before the afternoon heat reaches the glass and open with your morning alarm, quietly enough that they do not wake anyone. Every track is on the same panel and the same schedule as the lights.",
        cta: "View curtains",
        icon: "curtains.svg",
        image: {
          src: "/hero/hardware/curtains.jpg",
          width: 2560,
          height: 1870,
          alt: "Floor-length curtains drawn across a tall window",
        },
      },
      {
        id: "air-conditioning",
        title: "Air conditioning",
        description:
          "Each room runs on its own schedule instead of one thermostat for the whole floor. The house cools before you arrive rather than all day, pauses when a window is opened, and stops chilling empty rooms to eighteen degrees while nobody is home.",
        cta: "View air conditioning",
        icon: "ac.svg",
        image: {
          src: "/hero/hardware/ac.jpg",
          width: 2560,
          height: 1707,
          alt: "A ceiling-mounted air conditioning unit in a white room",
        },
      },
      {
        id: "tv",
        title: "TV and audio",
        description:
          "One remote for the television, the sound and the room. Music follows you from the kitchen to the terrace, and a single press for a film dims the lights and closes the curtains before the first scene.",
        cta: "View audio",
        icon: "tv.svg",
        image: {
          src: "/hero/hardware/tv.jpg",
          width: 2496,
          height: 1400,
          alt: "A wall-mounted television in a dim living room",
        },
      },
      {
        id: "cameras",
        title: "Cameras",
        description:
          "The cameras watch the boundary, not just the doorway. They tell people and vehicles apart from moving branches and cats, so your phone only buzzes when it matters. When you are away, the same cameras are what let you check the house in three seconds instead of calling someone.",
        cta: "View cameras",
        icon: "cctv.svg",
        image: {
          src: "/hero/hardware/cctv.jpg",
          width: 2560,
          height: 1422,
          alt: "A bullet camera mounted on a plain wall in low afternoon light",
        },
      },
    ],
  },
  stats: {
    heading: "By the numbers",
    items: [
      {
        value: "150+",
        label: "Residential clients served",
      },
      {
        value: "200+",
        label: "Homes fitted in residential deals",
      },
      {
        value: "350+",
        label: "Systems installed in all segments",
      },
      {
        value: "90%",
        label: "Contract renewal rate for annual maintenance packages",
      },
    ],
  },
  // Drafted for Shivanshu's review (2026-11-16). The six standards under it
  // are confirmed as installed in clients' homes the same day.
  connectivity: {
    heading: "One system, whatever your devices speak",
    lead: "Your lights, locks, cameras and climate rarely share a maker. We install equipment on each of these standards and connect it, so all of it answers to one system.",
    cta: "Book a site visit",
  },
  process: {
    heading: "Our Process",
    stepLabel: "Step",
    pages: [
      {
        id: "cycle",
        title: "Complete home automation cycle",
        body: [
          "Five steps, from the first visit to the years after it. A technician assesses the house, you get a fixed itemised price within 48 hours, and the installation happens while you carry on living there.",
          "At handover we set the system up with you and train everyone who will use it, then leave a full record of what went in and where. After that you have one number to call.",
          "You see the price before the work starts and the documentation before we leave. Nothing in this process arrives as a surprise.",
        ],
        duration: "[3 days]",
        layout: "intro",
        images: [],
      },
      {
        id: "site-assessment",
        step: "01",
        title: "Site Assessment",
        body: [
          "A technician visits, checks your cabling, network and existing systems, and listens to how you use the house.",
        ],
        duration: "[90 minutes]",
        layout: "portraitLead",
        images: [
          {
            src: "/hero/process/1.1.jpg",
            width: 1708,
            height: 2560,
            alt: "A surveyor kneeling on a bare floor, writing up findings on a clipboard",
            stock: true,
          },
          {
            src: "/hero/process/1.2.jpg",
            width: 2560,
            height: 1710,
            alt: "Engineers measuring a wall together, checking what is behind it before any work starts",
            stock: true,
          },
        ],
      },
      {
        id: "proposal",
        step: "02",
        title: "Proposal",
        body: [
          "A fixed, itemised price within 48 hours. Every device, every hour of work, written down.",
        ],
        duration: "[48 hours]",
        layout: "wideRight",
        images: [
          {
            src: "/hero/process/2.1.jpg",
            width: 2560,
            height: 1707,
            alt: "A room sketched out on squared paper by hand, one element at a time",
            stock: true,
          },
        ],
      },
      {
        id: "installation",
        step: "03",
        title: "Installation",
        body: [
          "Two to three days for a smaller system, four to five for a full villa. You stay in the house throughout.",
        ],
        duration: "[2 to 5 days]",
        layout: "bannerSplit",
        images: [
          {
            src: "/hero/process/3.1.jpg",
            width: 2560,
            height: 1396,
            alt: "An installer fitting an access control panel to a wall beside a glazed door",
            stock: true,
          },
          {
            src: "/hero/process/3.2.jpg",
            width: 2560,
            height: 1706,
            alt: "A technician working on a roof, harnessed and fixing equipment into place",
            stock: true,
          },
        ],
      },
      {
        id: "handover",
        step: "04",
        title: "Handover",
        body: [
          "We set it up with you, train everyone who'll use it, and leave a full record of what was installed and where.",
        ],
        duration: "[1 day]",
        layout: "stacked",
        images: [
          {
            src: "/hero/process/4.1.jpg",
            width: 2560,
            height: 1708,
            alt: "Two people over a printed plan, one walking the other through it point by point",
            stock: true,
          },
        ],
      },
      {
        id: "care",
        step: "05",
        title: "Care",
        body: ["Maintenance, updates and one number to call, for as long as you want us."],
        duration: "[365 days]",
        layout: "offsetPair",
        images: [
          {
            src: "/hero/process/5.1.jpg",
            width: 2560,
            height: 1707,
            alt: "A technician on a ladder opening a ceiling hatch to reach the equipment above it",
            stock: true,
          },
          {
            src: "/hero/process/5.2.jpg",
            width: 2560,
            height: 1707,
            alt: "An engineer reaching up to check a fixing overhead during a routine inspection",
            stock: true,
          },
        ],
      },
    ],
  },
  care: {
    heading: "Looked after, long after installation.",
    lead: "With Smarthaus Premium Care you call one number, day or night, and someone who knows your installation picks up.",
    packagesHeading: "Annual maintenance packages",
    packages: [
      {
        name: "Standard Care",
        description:
          "Two planned visits a year, remote monitoring between them, and software kept current. When something needs attention, we respond the next business day.",
        tone: "light",
      },
      {
        name: "Premium Care",
        description:
          "Everything in Standard Care, plus priority response within 6 hours, seven days a week, including evenings and weekends. One number, a named engineer who knows your installation, and no triage queue.",
        tone: "dark",
      },
    ],
  },
  // From the package deck (2026-11-19): its heading, its four homes.
  pricing: {
    heading: "Designed around your home",
    standfirst:
      "Four packages, from one bedroom to four, each a clear starting point. The final price is fixed after a site survey.",
    compareCta: "Compare the packages",
  },
  enquiry: {
    title: "Book a site visit",
    standfirst: "Tell us a little about your home and we’ll call you back during business hours.",
  },
};
