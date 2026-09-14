/**
 * Plays the device automations: the gate sliding, the AC louvres turning, the
 * lights coming up.
 *
 * Reads the declarative table in scenes.ts and binds it to whatever nodes the
 * GLB actually contains. A prefix that matches nothing is a no-op, never a
 * throw: the tour must survive a re-export that renames or drops a part, and
 * an interaction that silently does nothing is far better than a hero that
 * white-screens.
 *
 * ## Why this is not the third rAF exception
 *
 * CLAUDE.md documents two deliberate exceptions to the motion stack and says
 * neither licenses a third. This is not one. The canvas already owns a render
 * loop — it must, to draw at all — and these automations are sampled inside
 * that existing loop rather than starting one. No new timer, no new driver.
 */
import { MathUtils, type Object3D } from "three";

import { ANIMATIONS, toRadians, type Animation } from "./scenes";

type Bound = {
  node: Object3D;
  step: Animation;
  /** Rest pose, so every cycle starts from where the model was exported. */
  base: { x: number; y: number; z: number };
  delay: number;
  emissive?: { intensity: number };
};

/**
 * Binds one named animation to the model.
 *
 * Returns null when nothing matched, which the caller uses to skip the play
 * entirely rather than run an empty clock.
 */
export function bindAnimation(model: Object3D, name: string): AutomationPlayer | null {
  const steps = ANIMATIONS[name];
  if (!steps) return null;

  const bound: Bound[] = [];
  for (const step of steps) {
    const matches: Object3D[] = [];
    model.traverse((node) => {
      if (node.name.toLowerCase().startsWith(step.prefix.toLowerCase())) matches.push(node);
    });
    // Sorted by name so a numbered series (gate_slat0..8) staggers in the
    // order the parts are laid out, not in traversal order.
    matches.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));

    matches.forEach((node, index) => {
      const base =
        step.kind === "rotate"
          ? { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z }
          : { x: node.position.x, y: node.position.y, z: node.position.z };
      bound.push({ node, step, base, delay: (step.stagger ?? 0) * index });
    });
  }

  return bound.length ? new AutomationPlayer(bound) : null;
}

export class AutomationPlayer {
  /** Total run time, including the longest stagger. */
  readonly duration: number;

  constructor(private readonly bound: Bound[]) {
    this.duration = bound.reduce((max, b) => Math.max(max, b.delay + b.step.duration), 0);
  }

  /**
   * Samples every bound node at `elapsed` ms.
   *
   * Called from the canvas's existing render loop; it does not own a clock.
   */
  sample(elapsed: number): void {
    for (const { node, step, base, delay } of this.bound) {
      const local = elapsed - delay;
      // Before its stagger, a node sits at rest rather than snapping to the
      // start of its own tween.
      const raw = local <= 0 ? 0 : MathUtils.clamp(local / step.duration, 0, 1);
      // Out and back for reversible actions. The gate opening and closing is
      // one tween played forwards then backwards, which is the advantage real
      // geometry has over video: AGENTS.md notes a clip needs a second render
      // to run in reverse.
      const t = step.pingPong ? 1 - Math.abs(raw * 2 - 1) : raw;
      const eased = t * t * (3 - 2 * t);

      if (step.kind === "rotate") {
        node.rotation[step.axis] = base[step.axis] + toRadians(step.amount) * eased;
      } else if (step.kind === "slide") {
        node.position[step.axis] = base[step.axis] + step.amount * eased;
      } else {
        // emit: brighten the material rather than move anything. Guarded
        // because not every matched node necessarily carries a standard
        // material.
        const mesh = node as { material?: { emissiveIntensity?: number } };
        if (mesh.material && typeof mesh.material.emissiveIntensity === "number") {
          mesh.material.emissiveIntensity = eased * step.amount * 2;
        }
      }
    }
  }

  /** Returns every node to the pose it was exported in. */
  reset(): void {
    for (const { node, step, base } of this.bound) {
      if (step.kind === "rotate") node.rotation.set(base.x, base.y, base.z);
      else if (step.kind === "slide") node.position.set(base.x, base.y, base.z);
      else {
        const mesh = node as { material?: { emissiveIntensity?: number } };
        if (mesh.material && typeof mesh.material.emissiveIntensity === "number") {
          mesh.material.emissiveIntensity = 0;
        }
      }
    }
  }
}
