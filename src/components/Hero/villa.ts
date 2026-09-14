/**
 * The villa scene: camera framing, lighting, and the cursor-to-camera mapping.
 *
 * Pure maths and pure three.js setup, no React and no DOM events, so the
 * framing can be reasoned about (and tested) without a canvas.
 *
 * ## Why these numbers
 *
 * The Blender scene has NO lights — it is lit entirely by a world background,
 * and every material is an untextured Principled BSDF at roughness ~0.6 with
 * zero metallic. That is what makes a real-time match possible rather than
 * approximate: hemisphere ambient plus one soft key reproduces it, because
 * there is no specular highlight or texture detail to lose.
 *
 * The camera arc matches the frame grid it replaces (manifest.json):
 * azimuth -4deg to +4deg, elevation 0 to +5deg, one-sided vertically so the
 * camera never looks up from below ground.
 */
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  type Object3D,
  type WebGLRenderer,
} from "three";

import { DEG } from "./camera";

/** The page ground, so the canvas dissolves into it rather than sitting on it. */
export const CANVAS_BG = 0xf0e9dd;

/**
 * Places the camera on the arc at the given angles, always looking at `target`.
 * Orbit rather than pan: the villa rotates in place, which is the whole point
 * of moving to real geometry.
 */
export function placeCamera(
  camera: PerspectiveCamera,
  target: Vector3,
  radius: number,
  azimuth: number,
  elevation: number,
): void {
  const a = azimuth * DEG;
  const e = elevation * DEG;
  camera.position.set(
    target.x + radius * Math.sin(a) * Math.cos(e),
    target.y + radius * Math.sin(e),
    target.z + radius * Math.cos(a) * Math.cos(e),
  );
  camera.lookAt(target);
}

/**
 * Frames a loaded model: finds its bounds, centres the camera target on the
 * facade, and returns the orbit radius that fits it to the viewport.
 *
 * Derived from the model rather than hardcoded, so a re-export with different
 * scale or origin needs no code change — the same contract the scene manifest
 * has.
 */
export function frameModel(
  model: Object3D,
  camera: PerspectiveCamera,
): { target: Vector3; radius: number } {
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());

  // FRAME THE HOUSE, NOT THE PLOT.
  //
  // The scene's bounding box is 60m x 60m x 11.5m: boundary walls, driveway
  // and landscaping spread across the whole plot, with a house barely a fifth
  // of that. Fitting the bounding box therefore solves for the plot and leaves
  // the villa a sliver in the middle of the band — measured at ~90px tall in a
  // 358px canvas, which is the "too small" this replaced.
  //
  // The house's own extent is not something the model states, so it is derived
  // from the one dimension that only the building contributes to: HEIGHT. The
  // plot is flat, so 11.5m of vertical extent is the villa and its palms, and
  // a subject roughly three times as wide as it is tall is the composition the
  // reference frames had. Deriving it rather than hardcoding a metre value
  // keeps a re-export at a different scale working with no code change.
  const subjectWidth = size.y * 3;

  // Aim ABOVE the middle of the building, which pushes the villa DOWN in
  // frame. That is deliberate: the ground-floor slab (gf_slab) is real
  // structure the house stands on and cannot be deleted, so its cut edge has
  // to land inside the bottom mask instead of above it. At 0.42 the villa
  // floated mid-band and the slab's edge read as a hard line in clear space.
  //
  // The plot's ground sits at box.min.y, so this is a fraction of the villa's
  // own height, not of a box dominated by empty land.
  const target = new Vector3(centre.x, box.min.y + size.y * 0.78, centre.z);

  // Fit the WIDTH only. The hero band is roughly 16:4 and the subject is far
  // wider than it is tall, so width always binds. Letting height overflow is
  // correct rather than a compromise: the bottom of the band masks into the
  // page and the top is open canvas, so anything past the vertical extent is
  // exactly what should be dissolving anyway.
  const fov = camera.fov * DEG;
  const radius = (subjectWidth / (2 * Math.tan(fov / 2) * camera.aspect)) * 1.05;

  return { target, radius };
}

/**
 * Lighting that reproduces the Cycles look.
 *
 * The source scene is lit by a world background at strength 1.0 with a dimmer
 * 0.16 secondary, mixed by a light path node — i.e. flat ambient with a slight
 * directional bias, and no hard shadows anywhere. Hemisphere + ambient is that,
 * and the single directional light only exists to keep the facade's planes
 * readable; at this intensity it reads as sky occlusion, not as a sun.
 */
export function addLighting(scene: Scene): void {
  // THE BALANCE MATTERS MORE THAN THE ABSOLUTE LEVELS.
  //
  // The villa's walls are near-white (0.871, 0.815, 0.723) against a
  // near-white page (#F0E9DD). If ambient dominates, every face renders at the
  // same value and the building dissolves into the background — measured on
  // the first two passes, where it was legible only as a faint outline.
  // Contrast here comes from directional light making adjacent planes DIFFER,
  // not from making the whole model darker.
  //
  // So: ambient low enough to leave shaded faces genuinely darker, one strong
  // key to light the facade, and a dim sky term that keeps the shadow side
  // from going muddy.
  scene.add(new HemisphereLight(0xfff4e4, 0xb9a98f, 0.85));
  scene.add(new AmbientLight(0xffffff, 0.18));

  // Front-left and high: the render's warm afternoon key, and the light that
  // separates the wings from the main block.
  const key = new DirectionalLight(0xfff0d6, 2.6);
  key.position.set(-5, 6, 8);
  scene.add(key);

  // Cool counter-fill from behind right, so recessed faces keep some shape
  // rather than falling to flat ambient.
  const fill = new DirectionalLight(0xd6e0ff, 0.5);
  fill.position.set(7, 2.5, -6);
  scene.add(fill);
}

/** Renderer settings that match the render's warm, low-contrast grade. */
export function configureRenderer(renderer: WebGLRenderer): void {
  renderer.toneMapping = ACESFilmicToneMapping;
  // Under 1: ACES lifts midtones, and on a near-white subject against a
  // near-white page that is exactly the wrong direction. Pulling exposure down
  // is what lets the facade's planes separate from the background at all.
  renderer.toneMappingExposure = 0.92;
  // Transparent: the page ground shows through, so the mask in Hero.module.scss
  // dissolves the villa into the page exactly as it did with the PNGs.
  renderer.setClearColor(new Color(CANVAS_BG), 0);
}
