/**
 * The drone. Flies the camera between shots and turns the villa underneath it.
 *
 * Imports three.js, so it is loaded only from VillaCanvas's dynamic import and
 * never reaches an initial chunk. The maths it depends on lives in scenes.ts,
 * which imports nothing — that is the part with tests.
 *
 * ## One clock, two motions
 *
 * A flight moves four things at once: camera position, look-at target, the
 * model's yaw, and (on interior shots) how transparent the near walls are. All
 * four are driven from a single normalised `t` through the same easing curve,
 * which is what makes the camera swing and the villa's turn read as one
 * gesture rather than two animations that happen to overlap. Splitting them
 * onto separate timelines is the classic way to make this look mechanical.
 *
 * ## Why the model turns at all
 *
 * To see the back of a building a drone must fly around it, and most of that
 * arc is spent looking at nothing. Giving the model a share of the rotation
 * covers the same change of view over a much shorter path. The split per shot
 * is `modelYaw` in scenes.ts.
 *
 * ## Interiors
 *
 * A camera inside a closed box sees the inside of the wall it flew through.
 * Interior shots fade the exterior shell out as the camera crosses in, which
 * is cheaper and steadier than near-plane clipping (which pops as the camera
 * grazes geometry).
 */
import {
  Box3,
  MathUtils,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
} from "three";

import { LANDING, droneEase, flightDuration, lerpAngle, toRadians, type Shot } from "./scenes";

/** How see-through the shell goes on an interior shot. */
const SHELL_OPACITY = 0.12;

/** Nodes whose name starts with any of these stay opaque inside interiors. */
const KEEP_OPAQUE = [
  "ac_",
  "tv_",
  "static_tv",
  "sv17_",
  "sv19_",
  "sv07_",
  "sv38_",
  "sv44_",
  "il_",
  "furn",
];

/**
 * Ground and site geometry, excluded from the bounds the camera frames
 * against.
 *
 * The v2 export carries a `static_slab` spanning 400x400 metres — a backdrop
 * plane, not part of the building. Fitting the raw bounding box therefore
 * solves for a 400m square and leaves the villa an invisible speck. `plot`
 * (60x60) and `static_green` (a 50m planting bed) have the same effect in
 * smaller measure.
 *
 * Excluded by NAME rather than by a size threshold: a threshold would quietly
 * start dropping the building itself if a future export changed scale, and
 * silently reframing on someone is worse than a shot that needs re-aiming.
 */
const GROUND_NODES = ["plot", "podium_n", "static_slab", "static_green"];

/**
 * The model's extent, ignoring the site plane.
 *
 * Falls back to the whole model if the exclusions leave nothing — an export
 * that renames everything should still produce a working, if badly framed,
 * hero rather than a NaN camera.
 */
function boundsWithoutGround(model: Object3D): Box3 {
  const box = new Box3();
  model.traverse((node) => {
    if (!(node as Mesh).isMesh) return;
    if (GROUND_NODES.includes(node.name)) return;
    box.expandByObject(node);
  });
  return box.isEmpty() ? new Box3().setFromObject(model) : box;
}

type Materialish = Material & { opacity: number; transparent: boolean };

export type TourState = {
  /** Where the camera is now. */
  position: Vector3;
  /** What it is looking at now. */
  target: Vector3;
  /** The model's yaw now, in degrees. */
  yaw: number;
  /** 0 = shell solid, 1 = shell faded out. */
  reveal: number;
};

/**
 * Resolves a shot's abstract offsets into world coordinates.
 *
 * Offsets are multiples of the villa's own half-size and targets are either a
 * named GLB node or a fraction from centre, so a re-export at a different
 * scale or origin needs no code change. Everything below works in world units
 * once this has run.
 */
export class ShotResolver {
  private readonly centre: Vector3;
  private readonly half: Vector3;
  private readonly anchors = new Map<string, Vector3>();

  constructor(model: Object3D) {
    const box = boundsWithoutGround(model);
    const size = box.getSize(new Vector3());
    this.centre = box.getCenter(new Vector3());

    // THE UNIT EVERY SHOT IS EXPRESSED IN.
    //
    // One number, taken from the model's own WIDTH, and used on all three
    // axes. Every offset in scenes.ts is a multiple of it.
    //
    // A uniform unit rather than per-axis half-extents, because a per-axis
    // unit silently rescales shots whenever the model's proportions change:
    // an earlier export bundled palms and landscaping, and deriving the
    // horizontal unit from HEIGHT (at an assumed 3:1) worked only while those
    // palms were setting the height. The site export dropped them, the real
    // ratio turned out to be 4.8:1, and every shot pulled back by roughly
    // 60% — the villa rendered as a distant speck. The bug was not the ratio
    // being wrong; it was inferring one dimension from another at all.
    //
    // Width is the right basis: it is the dimension the hero's 16:4 band is
    // fitted to, and it is dominated by the building itself rather than by
    // whatever incidental geometry an export happens to include.
    const unit = size.x * 0.5;
    this.half = new Vector3(unit, unit, unit);

    // Cache every named node's world centre once, so a shot can anchor to the
    // device it frames and follow it if the model moves.
    model.traverse((node) => {
      if (!node.name) return;
      const nodeBox = new Box3().setFromObject(node);
      if (nodeBox.isEmpty()) return;
      this.anchors.set(node.name, nodeBox.getCenter(new Vector3()));
    });
  }

  /** True if the export actually contains this node. */
  has(name: string): boolean {
    return this.anchors.has(name);
  }

  target(shot: Shot): Vector3 {
    if (shot.anchor) {
      const anchor = this.anchors.get(shot.anchor);
      // A missing anchor is a re-export that renamed or dropped the node. Fall
      // through to the fractional target rather than throwing: the tour still
      // works, it just frames the area instead of the device.
      if (anchor) return anchor.clone();
    }
    return new Vector3(
      this.centre.x + shot.target[0] * this.half.x,
      this.centre.y + shot.target[1] * this.half.y,
      this.centre.z + shot.target[2] * this.half.z,
    );
  }

  position(shot: Shot): Vector3 {
    const target = this.target(shot);
    return new Vector3(
      target.x + shot.offset[0] * this.half.x,
      target.y + shot.offset[1] * this.half.y,
      target.z + shot.offset[2] * this.half.z,
    );
  }

  /** The villa's centre, which the model rotates about. */
  get pivot(): Vector3 {
    return this.centre.clone();
  }

  /** The derived subject size, exposed for tests and for debugging framing. */
  get subject(): Vector3 {
    return this.half.clone();
  }
}

/**
 * Splits a model's meshes into the exterior shell and everything else, so
 * interior shots can fade the shell without dissolving the furniture.
 *
 * Every material is cloned first: the export joins to one mesh per material,
 * so mutating a shared material would fade every object using it.
 */
export class ShellFader {
  private readonly shell: Materialish[] = [];

  constructor(model: Object3D) {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const name = node.name.toLowerCase();
      if (KEEP_OPAQUE.some((prefix) => name.startsWith(prefix))) return;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = Array.isArray(mesh.material)
        ? materials.map((m) => this.prepare(m))
        : this.prepare(materials[0]!);
    });
  }

  private prepare(material: Material): Material {
    const clone = material.clone() as Materialish;
    clone.transparent = true;
    this.shell.push(clone);
    return clone;
  }

  /** 0 leaves the shell solid; 1 fades it to SHELL_OPACITY. */
  apply(reveal: number): void {
    const opacity = MathUtils.lerp(1, SHELL_OPACITY, MathUtils.clamp(reveal, 0, 1));
    for (const material of this.shell) material.opacity = opacity;
  }

  dispose(): void {
    for (const material of this.shell) material.dispose();
  }
}

/**
 * A flight in progress.
 *
 * Constructed with a from-shot and a to-shot; `sample` returns the state at a
 * given elapsed time. It holds no timer of its own, so the caller owns the
 * frame loop and can drive it from rAF, from a test, or from a scrub.
 */
export class Flight {
  readonly duration: number;
  private readonly fromPos: Vector3;
  private readonly toPos: Vector3;
  private readonly fromTarget: Vector3;
  private readonly toTarget: Vector3;
  private readonly fromYaw: number;
  private readonly toYaw: number;
  private readonly fromReveal: number;
  private readonly toReveal: number;
  /** Lifts the arc so the drone rises between shots instead of sliding. */
  private readonly lift: number;

  constructor(resolver: ShotResolver, from: Shot, to: Shot, startedFrom?: TourState) {
    this.duration = flightDuration(from, to);
    this.fromPos = startedFrom?.position.clone() ?? resolver.position(from);
    this.toPos = resolver.position(to);
    this.fromTarget = startedFrom?.target.clone() ?? resolver.target(from);
    this.toTarget = resolver.target(to);
    this.fromYaw = startedFrom?.yaw ?? from.modelYaw;
    this.toYaw = to.modelYaw;
    this.fromReveal = startedFrom?.reveal ?? (from.interior ? 1 : 0);
    this.toReveal = to.interior ? 1 : 0;

    // A drone gains height over the middle of a move and settles at the end.
    // Proportional to the distance travelled, so a short hop stays flat.
    this.lift = this.fromPos.distanceTo(this.toPos) * 0.12;
  }

  sample(elapsed: number): TourState {
    const t = this.duration > 0 ? MathUtils.clamp(elapsed / this.duration, 0, 1) : 1;
    const e = droneEase(t);

    const position = this.fromPos.clone().lerp(this.toPos, e);
    // A half-sine is 0 at both ends and 1 in the middle: the arc, with no
    // discontinuity at either end of the flight.
    position.y += Math.sin(t * Math.PI) * this.lift;

    return {
      position,
      target: this.fromTarget.clone().lerp(this.toTarget, e),
      yaw: lerpAngle(this.fromYaw, this.toYaw, e),
      // The shell fades on the same curve, so walls clear exactly as the
      // camera crosses them rather than before or after.
      reveal: MathUtils.lerp(this.fromReveal, this.toReveal, e),
    };
  }

  get done(): (elapsed: number) => boolean {
    return (elapsed: number) => elapsed >= this.duration;
  }
}

/** Applies a sampled state to the camera and model. */
export function applyState(
  state: TourState,
  camera: PerspectiveCamera,
  model: Object3D,
  pivot: Vector3,
  fader?: ShellFader,
): void {
  camera.position.copy(state.position);
  camera.lookAt(state.target);

  // Rotate about the villa's centre, not the model's origin, which the export
  // leaves wherever Blender had it.
  model.position.set(0, 0, 0);
  model.rotation.y = toRadians(state.yaw);
  const offset = pivot.clone().applyAxisAngle(new Vector3(0, 1, 0), toRadians(state.yaw));
  model.position.copy(pivot.clone().sub(offset));

  fader?.apply(state.reveal);
}

/** The state a shot rests at, with no flight in progress. */
export function restState(resolver: ShotResolver, shot: Shot = LANDING): TourState {
  return {
    position: resolver.position(shot),
    target: resolver.target(shot),
    yaw: shot.modelYaw,
    reveal: shot.interior ? 1 : 0,
  };
}
