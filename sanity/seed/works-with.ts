import type { SolutionPage } from "../../src/sanity/types";

type WorksWith = SolutionPage["worksWith"];

/**
 * Each solution page's "Works with" section (Shivanshu, 2026-11-16): the
 * solutions it is paired with, and what happens when the two work together.
 * Every pairing here has been delivered on a client's job, one app runs all
 * of it, and gates are installed as well as garage doors (each confirmed by
 * Shivanshu the same day, AGENTS.md claims audit). The copy is his brief's.
 */
export const WORKS_WITH: Record<string, WorksWith> = {
  cameras: {
    heading: "Cameras that do more than watch",
    subtext:
      "Connected to the rest of your home, your cameras open doors, light paths and only alert you when it matters.",
    line: "See home from anywhere",
    pairs: [
      {
        with: "smart-lock",
        title: "See them, then let them in",
        trigger: "Someone rings the door",
        action: "Live video on your phone, unlock in one tap",
        body: "Talk to a visitor or a delivery driver from anywhere, and open the door only when you’ve seen who it is.",
      },
      {
        with: "garage",
        title: "Know who’s at the gate",
        trigger: "A car stops at the gate",
        action: "Gate camera opens on your phone",
        body: "See the car and driver first, then open the gate from the same screen.",
      },
      {
        with: "lighting",
        title: "Light up movement",
        trigger: "Movement outside after dark",
        action: "Driveway and garden lights turn on",
        body: "The house looks occupied, and your cameras get a clearer picture.",
      },
    ],
  },
  lighting: {
    heading: "Lighting that works with the whole house",
    subtext:
      "Your lights follow the time of day, your curtains and your cameras, so each room is lit right without you thinking about it.",
    line: "The house sets the mood for you",
    pairs: [
      {
        with: "curtains",
        title: "Mornings, done properly",
        trigger: "7:00am on weekdays",
        action: "Curtains open, lights fade off",
        body: "Wake up to daylight, not a light switch.",
      },
      {
        with: "wall-controller",
        title: "One button per mood",
        trigger: "You tap “Dinner” on the panel",
        action: "Dining lights dim, the rest turn off",
        body: "Every room gets a few set moods, so the right light is always one tap away.",
      },
      {
        with: "cameras",
        title: "Lights that keep watch",
        trigger: "Movement outside after dark",
        action: "Garden and driveway lights turn on",
        body: "Outdoor lights react to movement, so the house never looks empty.",
      },
    ],
  },
  audio: {
    heading: "Sound that fits the moment",
    subtext:
      "Your audio works with your lights, curtains and wall panel, so music and movies start with the right setting, all in one tap.",
    line: "Music in any room, from one tap",
    pairs: [
      {
        with: "lighting",
        title: "Dinner, set in one tap",
        trigger: "You tap “Dinner”",
        action: "Lights dim, soft music starts",
        body: "Light and sound change together, so hosting takes no setup.",
      },
      {
        with: "curtains",
        title: "Movie night",
        trigger: "You tap “Movie”",
        action: "Curtains close, sound switches to the TV",
        body: "The room goes dark and the sound comes up. Ready in seconds.",
      },
      {
        with: "wall-controller",
        title: "Music from the wall",
        trigger: "You pick a room on the panel",
        action: "Music plays there, volume on the panel",
        body: "Guests and family can play music in any room without needing your phone.",
      },
    ],
  },
  ac: {
    heading: "Cooling that thinks ahead",
    subtext:
      "Your AC works with your gate, curtains and wall panel, so rooms are comfortable when you need them and not before.",
    line: "Cool rooms on your schedule",
    pairs: [
      {
        with: "garage",
        title: "Cool on arrival",
        trigger: "Your gate opens",
        action: "Living areas switch to comfort mode",
        body: "The house starts cooling the moment you’re home, instead of running all day for an empty house.",
      },
      {
        with: "curtains",
        title: "Shade first, then cool",
        trigger: "Afternoon sun on west windows",
        action: "Curtains close before the AC ramps up",
        body: "Blocking the sun first means the AC has less work to do in the hottest hours.",
      },
      {
        with: "wall-controller",
        title: "Every room, one place",
        trigger: "You tap “Goodnight” on the panel",
        action: "Bedrooms to sleep mode, the rest to eco",
        body: "Set the right temperature for the whole house from one panel before bed.",
      },
    ],
  },
  garage: {
    heading: "A gate that knows who’s coming home",
    subtext:
      "Your garage and gate work with your cameras, lock and lights, so arriving home is smooth and leaving is secure.",
    line: "Arrive without stopping the car",
    pairs: [
      {
        with: "cameras",
        title: "See before you open",
        trigger: "A car stops at the gate",
        action: "Gate camera on your phone",
        body: "Check who’s there before you open, from anywhere in the world.",
      },
      {
        with: "lighting",
        title: "Arrive to a lit driveway",
        trigger: "The gate opens after dark",
        action: "Driveway and entrance lights turn on",
        body: "No pulling into a dark driveway. The path to the door is lit before you step out.",
      },
      {
        with: "smart-lock",
        title: "One tap to leave",
        trigger: "You tap “Leaving home”",
        action: "Gate closes, front door locks",
        body: "Drive away knowing the gate and the front door are both shut.",
      },
    ],
  },
  "smart-lock": {
    heading: "A lock that knows the rest of the house",
    subtext:
      "Your front door works with your cameras, your gate and your wall panel, so locking up is one tap, not a walk around the house.",
    line: "No keys, and a record of every entry",
    pairs: [
      {
        with: "cameras",
        title: "Every entry, on record",
        trigger: "The door is unlocked",
        action: "Camera clip saved with the time",
        body: "See who came in and when, whether it was family, staff or a delivery.",
      },
      {
        with: "garage",
        title: "Leave in one tap",
        trigger: "You tap “Leaving home”",
        action: "Door locks, gate closes",
        body: "No checking every door on your way out. One tap secures the front of the house.",
      },
      {
        with: "wall-controller",
        title: "Lock up from the hallway",
        trigger: "You tap “Goodnight” on the panel",
        action: "Every door locks",
        body: "Before bed, one button checks and locks every door in the house.",
      },
    ],
  },
  "wall-controller": {
    heading: "One panel. The whole house.",
    subtext:
      "Your wall panel connects every Smarthaus system, so anyone in the home can control lights, climate, doors and music without an app.",
    line: "One panel runs the whole house",
    pairs: [
      {
        with: "smart-lock",
        title: "Goodnight, in one tap",
        trigger: "You tap “Goodnight”",
        action: "Doors lock, lights off, AC to sleep",
        body: "The whole house gets ready for the night from one button by the bedroom door.",
      },
      {
        with: "lighting",
        title: "Moods for every room",
        trigger: "You tap “Relax” in the living room",
        action: "Lights soften, the rest of the floor dims",
        body: "Set moods once, then use them every day without opening an app.",
      },
      {
        with: "ac",
        title: "Climate without the remote",
        trigger: "You tap a room’s temperature",
        action: "That room adjusts, the rest stays as is",
        body: "No hunting for remotes. Every room’s AC is on the panel.",
      },
    ],
  },
  curtains: {
    heading: "Curtains that move with the day",
    subtext:
      "Your curtains work with your lights and AC, keeping rooms bright, private and cooler without you touching them.",
    line: "Light and privacy on a schedule",
    pairs: [
      {
        with: "ac",
        title: "Keep the heat out",
        trigger: "Afternoon sun on west windows",
        action: "Curtains close, AC works less",
        body: "Blocking direct sun in the hottest hours keeps rooms cooler and the AC under less strain.",
      },
      {
        with: "lighting",
        title: "Movie mode",
        trigger: "You tap “Movie”",
        action: "Curtains close, lights dim to low",
        body: "The living room gets ready for a film in one tap.",
      },
      {
        with: "wall-controller",
        title: "Every window, one panel",
        trigger: "You tap “Close all” on the panel",
        action: "Every curtain in the house closes",
        body: "No walking room to room. Close the whole house from the hallway.",
      },
    ],
  },
};
