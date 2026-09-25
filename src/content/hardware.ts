/**
 * The hardware carousel on the homepage: the eight components a Smarthaus
 * installation is made of, one slide each.
 *
 * Copy describes what each component DOES in the house. It makes no claim
 * about track record, names no manufacturer (TIS and Fibaro are unconfirmed,
 * see AGENTS.md), and states no figure that is not already published
 * elsewhere on the site. No em dashes: every page suite in e2e/ asserts it.
 *
 * Images are renders in public/hero/hardware/, shrunk once by
 * scripts/optimise-hardware-images.mjs. Icons are 24-unit SVGs beside them,
 * filled brown-900 in the file so they can be served as plain <img>.
 */

export type HardwareItem = {
  id: string;
  title: string;
  description: string;
  /** Filename in public/hero/hardware/icons/. */
  icon: string;
  image: {
    /** Filename in public/hero/hardware/. */
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export const HARDWARE_ITEMS: readonly HardwareItem[] = [
  {
    id: "cameras",
    title: "Cameras",
    description:
      "The cameras watch the boundary, not just the doorway. They tell people and vehicles apart from moving branches and cats, so your phone only buzzes when it matters. When you are away, the same cameras are what let you check the house in three seconds instead of calling someone.",
    icon: "cctv.svg",
    image: {
      src: "cctv.jpg",
      width: 2560,
      height: 1422,
      alt: "A bullet camera mounted on a plain wall in low afternoon light",
    },
  },
  {
    id: "smart-lock",
    title: "Smart lock",
    description:
      "No keys to cut or lose. Everyone in the house has their own code, and staff or guests get one that works on the days you choose and stops working after. The lock keeps a record of who came in and when, and locks itself from your phone if you left in a hurry.",
    icon: "smartLock.svg",
    image: {
      src: "smartLock.jpg",
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
    icon: "smartScreen.svg",
    image: {
      src: "wallController.jpg",
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
    icon: "lighting.svg",
    image: {
      src: "lighting.jpg",
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
    icon: "garageDoor.svg",
    image: {
      src: "garageDoor.jpg",
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
    icon: "curtains.svg",
    image: {
      src: "curtains.jpg",
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
    icon: "ac.svg",
    image: {
      src: "ac.jpg",
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
    icon: "tv.svg",
    image: {
      src: "tv.jpg",
      width: 2496,
      height: 1400,
      alt: "A wall-mounted television in a dim living room",
    },
  },
];
