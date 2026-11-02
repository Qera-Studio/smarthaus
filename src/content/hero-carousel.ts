/**
 * The image strip under the homepage hero: one card per part of an
 * installation. Each card shows its title, one line and a link to /solutions
 * on hover or focus.
 *
 * The lines restate, in a sentence, what src/content/hardware.ts already
 * publishes about each part. No figure, no track record, no manufacturer.
 * No em dashes: every page suite in e2e/ asserts it.
 *
 * Images are in public/hero/hero_carousel/. They are licensed stock, used with
 * the client's agreement as a stand-in (Shivanshu, 2026-10-28), and every row
 * carries `pendingImage` until they are replaced: the photography constraint
 * in AGENTS.md still stands for everything else.
 */

export type HeroCarouselItem = {
  id: string;
  title: string;
  line: string;
  /** Link text; every card goes to /solutions. */
  cta: string;
  image: {
    /** Filename in public/hero/hero_carousel/. */
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  pendingImage: true;
};

export const HERO_CAROUSEL_HREF = "/solutions";

export const HERO_CAROUSEL_ITEMS: readonly HeroCarouselItem[] = [
  {
    id: "lighting",
    title: "Lighting",
    line: "Light that follows your evening, from warm at dusk to off when you leave.",
    cta: "View lighting",
    image: {
      src: "lighting_hero.png",
      width: 800,
      height: 533,
      alt: "Someone at a wall panel in a room lit warm amber, blinds half drawn",
    },
    pendingImage: true,
  },
  {
    id: "curtains",
    title: "Curtains",
    line: "Curtains that close before the afternoon heat and open with your alarm.",
    cta: "View curtains",
    image: {
      src: "curtains_hero.png",
      width: 400,
      height: 300,
      alt: "Floor-length curtains beside tall windows in a pale sitting room",
    },
    pendingImage: true,
  },
  {
    id: "cameras",
    title: "Cameras",
    line: "Cameras on the boundary that only call you when it matters.",
    cta: "View cameras",
    image: {
      src: "cctv_hero.jpg",
      width: 949,
      height: 427,
      alt: "A camera on an outside wall, looking over a garden",
    },
    pendingImage: true,
  },
  {
    id: "wall-controller",
    title: "Wall controller",
    line: "One panel by the door for the lights, the climate and the music.",
    cta: "View controllers",
    image: {
      src: "controller_hero.jpg",
      width: 1200,
      height: 900,
      alt: "A touch panel mounted on a pale wall",
    },
    pendingImage: true,
  },
  {
    id: "smart-lock",
    title: "Smart lock",
    line: "No keys to lose. A code for everyone, and one for guests that expires.",
    cta: "View smart locks",
    image: {
      src: "smartLock_hero.jpg",
      width: 736,
      height: 414,
      alt: "A keypad lock on a wooden door",
    },
    pendingImage: true,
  },
  {
    id: "garage-door",
    title: "Garage door",
    line: "The garage opens as you turn into the drive and closes behind you.",
    cta: "View garage doors",
    image: {
      src: "garageDoor_hero.jpg",
      width: 736,
      height: 738,
      alt: "A wide garage door at the front of a villa",
    },
    pendingImage: true,
  },
  {
    id: "air-conditioning",
    title: "Air conditioning",
    line: "Every room on its own schedule, cool before you get home.",
    cta: "View air conditioning",
    image: {
      src: "ac_hero.jpg",
      width: 736,
      height: 618,
      alt: "A wall air conditioner above a calm sitting room",
    },
    pendingImage: true,
  },
  {
    id: "audio",
    title: "TV and audio",
    line: "Music that follows you from the kitchen to the terrace.",
    cta: "View audio",
    image: {
      src: "audio_hero.jpg",
      width: 1199,
      height: 403,
      alt: "A speaker on a wooden sideboard in warm light",
    },
    pendingImage: true,
  },
];
