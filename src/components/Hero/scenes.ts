/**
 * The villa tour: where the drone flies, and what it looks at when it lands.
 *
 * This is the contract between the Blender model and the site. It is pure data
 * and pure maths, no three.js and no DOM, so the whole tour can be reasoned
 * about and tested without a canvas — and so the shot list can be tuned by
 * editing numbers rather than code.
 *
 * ## How a shot is described
 *
 * Every shot is a camera POSITION and a LOOK-AT TARGET, both in model space,
 * plus how long the flight to it takes. Positions are expressed RELATIVE to an
 * anchor — either the villa's own centre or a named node in the GLB — so they
 * survive a re-export at a different scale or origin. Nothing here hardcodes a
 * world coordinate that only holds for today's model.
 *
 * ## Why the villa turns as well as the camera
 *
 * A drone that has to fly all the way around a building to show its back takes
 * a long arc, and most of that arc is spent looking at nothing in particular.
 * Splitting the rotation between the two — the camera swings part of the way,
 * the model turns the rest — covers the same change of view in a much shorter
 * path, and the two motions read as one gesture because they are eased on the
 * same curve over the same duration. `modelYaw` is the model's share.
 *
 * ## Interiors
 *
 * `interior: true` shots sit inside the building. The renderer uses it to fade
 * the near walls out, because a camera inside a closed box otherwise sees the
 * inside of the wall it just flew through.
 */

/** Degrees to radians, the one conversion this file needs. */
const DEG = Math.PI / 180;

export type Shot = {
  /** Stable id. Used as the tab value and in the URL hash. */
  id: string;
  /** Tab label. Short — these sit in a vertical rail. */
  label: string;
  /**
   * Join key to hotspot copy in Sanity, per the scene-manifest contract in
   * AGENTS.md. The CMS knows device names and descriptions; it never knows
   * coordinates.
   */
  deviceId: string;
  /**
   * Named node in the GLB this shot frames. When present, the target is that
   * node's world centre, so moving the device in Blender moves the shot with
   * it. Falls back to `target` when the node is missing from the export.
   */
  anchor?: string;
  /**
   * Look-at point, as a fraction of the villa's HALF-WIDTH from its centre.
   * Used when `anchor` is absent or not found.
   *
   * One unit on all three axes, never per-axis half-extents: a per-axis unit
   * silently rescales every shot when the model's proportions change. See
   * ShotResolver in tour.ts for the export that proved it.
   */
  target: [number, number, number];
  /**
   * Camera position relative to the TARGET, in the same unit. The drone's
   * standoff.
   */
  offset: [number, number, number];
  /** The model's share of the turn, in degrees. See the note above. */
  modelYaw: number;
  /** Flight time to this shot, in ms. */
  duration: number;
  /** Inside the building: near walls fade so the camera can see out. */
  interior?: boolean;
  /**
   * The automation to play once the camera settles, if any. Names an entry in
   * ANIMATIONS below rather than describing the motion here, so the shot list
   * stays a shot list.
   */
  animation?: string;
};

/**
 * The tour, in tab order.
 *
 * `landing` is not a tab — it is where the hero rests and where "back" returns
 * to. Everything after it is a service the vertical rail offers.
 *
 * The offsets were chosen to read as a drone: the camera rises as it closes in
 * (y grows with proximity), and approaches from the side it can see the device
 * from rather than head-on, because a flat-on shot of a garage door has no
 * depth in it.
 */
export const SHOTS: readonly Shot[] = [
  {
    id: "landing",
    label: "Overview",
    deviceId: "villa-overview",
    // Dead front, well back, camera level: the composition the static poster
    // was rendered at, so the hand-off from poster to canvas is invisible.
    target: [0, 0, 0],
    offset: [0, 0.073, 1.937],
    modelYaw: 0,
    duration: 2600,
  },
  {
    id: "garage",
    label: "Garage",
    deviceId: "garage-door",
    // v2 renamed the gate: the slatted gate_rail/gate_slat* group became the
    // sv37_* service, whose moving leaf is sv37_gate.
    //
    // NOTE it is the STREET gate, not a garage door: it sits at z = -22.85
    // against a building centred at z = +2.24, i.e. right at the plot
    // boundary, ~25m in front of the house. So this shot looks back along the
    // driveway rather than at the facade, and the camera stands outside the
    // gate looking in — which is also the view an arriving visitor has.
    anchor: "sv37_gate",
    target: [0, 0, 0],
    // Outside the gate and slightly above it. Small numbers: the anchor is
    // already at the gate, so these are metres-ish from it, not from the
    // villa.
    offset: [-0.312, 0.063, -0.469],
    modelYaw: 8,
    duration: 2400,
    animation: "garage",
  },
  {
    id: "climate",
    label: "Climate",
    deviceId: "climate-ac",
    anchor: "ac_frame",
    target: [0, -0.04, 0],
    // Inside: close, a little below the unit, looking up at the louvres.
    offset: [0.212, -0.013, -0.287],
    modelYaw: 18,
    duration: 2800,
    interior: true,
    animation: "climate",
  },
  {
    id: "shading",
    label: "Curtains",
    deviceId: "curtains-shading",
    // v2 ships real cloth: 288 nodes across fabric_sheer and fabric_blackout,
    // which is why this shot finally has something to anchor to.
    anchor: "sv17_sheerlpL_f00",
    target: [0, 0.02, 0],
    // Inside the room, looking at the window wall the curtains hang on.
    offset: [0.187, 0.021, -0.312],
    modelYaw: 26,
    duration: 2600,
    interior: true,
    animation: "shading",
  },
  {
    id: "lighting",
    label: "Lighting",
    deviceId: "lighting-led",
    // No anchor: the LED strips and the warm_interior rooms are spread right
    // across the house, so this frames the BUILDING rather than one device.
    // Fractions of the villa's own half-size, as the landing shot uses.
    target: [0, 0.031, 0.021],
    // Behind and high: the elevation that shows the lighting scheme across
    // the whole rear. The shot needing the most turn, so the model carries
    // the largest share of it.
    offset: [0.344, 0.125, 0.937],
    modelYaw: 52,
    duration: 3200,
    animation: "lighting",
  },
] as const;

export const LANDING = SHOTS[0] as Shot;

/** Every shot that appears in the tab rail, i.e. everything but the landing. */
export const SERVICE_SHOTS: readonly Shot[] = SHOTS.slice(1);

export function shotById(id: string): Shot | undefined {
  return SHOTS.find((s) => s.id === id);
}

/**
 * The automations, described declaratively.
 *
 * Each names the GLB nodes it moves and how. The renderer reads this; nothing
 * here imports three.js, so the whole table is testable as data.
 *
 * `prefix` matches nodes by name prefix, because the model numbers its parts
 * (gate_slat0..8, ac_flap0..3) and the count should not be restated here — a
 * re-export with more slats animates more slats, with no code change.
 */
export type Animation = {
  /** Node-name prefix, matched against the GLB. */
  prefix: string;
  /** What happens to the matched nodes. */
  kind: "slide" | "rotate" | "emit";
  /** Metres for slide, degrees for rotate, unused for emit. */
  amount: number;
  /** Local axis the motion happens on. */
  axis: "x" | "y" | "z";
  /** One cycle, in ms. */
  duration: number;
  /** Per-node delay, in ms, so parts move in sequence rather than together. */
  stagger?: number;
  /** Play out and back rather than holding the end state. */
  pingPong?: boolean;
};

export const ANIMATIONS: Record<string, readonly Animation[]> = {
  // The gate slides open, then closes. Reversible actions need both
  // directions — with real geometry that is just playing the tween backwards,
  // which is the whole advantage over pre-rendered clips, where AGENTS.md
  // notes a second render was required.
  //
  // The site export restored the individual slats (gate_slat0..8) that v2 had
  // collapsed into one leaf, so the stagger is back: the slats pull aside in
  // sequence, which is what a real sliding gate does. sv37_gate is the service
  // marker that rides with them.
  garage: [
    {
      prefix: "gate_slat",
      kind: "slide",
      amount: -2.6,
      axis: "x",
      duration: 2400,
      stagger: 60,
      pingPong: true,
    },
    { prefix: "sv37_gate", kind: "slide", amount: -2.6, axis: "x", duration: 2400, pingPong: true },
  ],
  climate: [
    // Six flaps (ac_flap0..5), each on its own hinge in this export. The
    // prefix match picks up whatever the export contains, so the count is
    // never restated here.
    //
    // The hinges are what actually rotate: turning the flap alone pivots it
    // about its own centre and the louvre appears to float free of its mount.
    {
      prefix: "ac_hinge",
      kind: "rotate",
      amount: 35,
      axis: "x",
      duration: 2200,
      stagger: 120,
      pingPong: true,
    },
    { prefix: "ac_led", kind: "emit", amount: 1, axis: "y", duration: 1600 },
  ],
  // v2 ships real cloth: 144 sheer panels and 132 blackout, each a numbered
  // node. They draw back along their rail with a stagger, which is what makes
  // fabric read as fabric rather than as a sliding board.
  //
  // The stagger is small because there are so many panels: 288 nodes at the
  // 80ms of the old two-curtain version would take almost half a minute.
  shading: [
    {
      prefix: "sv17_sheer",
      kind: "slide",
      amount: -1.6,
      axis: "x",
      duration: 2200,
      stagger: 6,
      pingPong: true,
    },
    {
      prefix: "sv17_black",
      kind: "slide",
      amount: -1.6,
      axis: "x",
      duration: 2200,
      stagger: 6,
      pingPong: true,
    },
  ],
  lighting: [
    { prefix: "sv38_led", kind: "emit", amount: 1, axis: "y", duration: 2400, stagger: 110 },
    { prefix: "sv44_led", kind: "emit", amount: 1, axis: "y", duration: 2400, stagger: 110 },
    // The `warm_interior` rooms (il_atrium, il_living, il_kitchen...) are what
    // make the lighting scene read from outside: v2 models them as emissive
    // room volumes rather than as point lights.
    { prefix: "il_", kind: "emit", amount: 1, axis: "y", duration: 2600, stagger: 90 },
  ],
};

// --- Flight maths ----------------------------------------------------------

/**
 * The drone easing.
 *
 * A cubic in-out, deliberately not one of the token curves: those are tuned
 * for UI transitions of a few hundred ms, and at two to three seconds an
 * `--ease-out` reads as a lurch followed by a crawl. A drone accelerates and
 * decelerates symmetrically, which is exactly what this is.
 */
export function droneEase(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Interpolates an angle the SHORT way round.
 *
 * Plain lerp between 350deg and 10deg takes the long way and spins the villa
 * almost all the way round to move it 20 degrees. Every yaw in the tour goes
 * through this.
 */
export function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return from + delta * t;
}

export const toRadians = (degrees: number): number => degrees * DEG;

/**
 * How long the flight between two shots should take.
 *
 * The shot's own duration is the baseline, scaled by how far the camera
 * actually has to travel: hopping between two adjacent interior shots should
 * not take as long as flying from the landing to the roof. Clamped so nothing
 * is ever instant or interminable.
 */
export function flightDuration(from: Shot, to: Shot): number {
  const distance = Math.hypot(
    to.offset[0] - from.offset[0],
    to.offset[1] - from.offset[1],
    to.offset[2] - from.offset[2],
  );
  const yaw = Math.abs(lerpAngle(from.modelYaw, to.modelYaw, 1) - from.modelYaw) / 180;
  // Distance dominates; the turn adds to it. 1.0 is a typical hop.
  const scale = Math.min(1.6, Math.max(0.45, distance / 1.8 + yaw * 0.5));
  return Math.round(to.duration * scale);
}
