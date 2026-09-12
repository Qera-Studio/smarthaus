import { existsSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import manifestJson from "@/content/scene-manifest.json";

/**
 * Scene manifest — the contract between the Blender export pipeline and the site.
 * Swapping placeholder renders for final renders is a file drop plus a manifest
 * edit; no code changes. See AGENTS.md "Scene manifest contract".
 *
 * A malformed manifest fails the build, not the browser.
 */

const HERO_ROOT = join(process.cwd(), "public", "hero");

/** Asset paths are relative to `public/hero/`. */
const assetPath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith("/"), {
    message: "Path must be relative to public/hero/, not absolute",
  })
  .refine((p) => existsSync(join(HERO_ROOT, p)), {
    message: "File does not exist under public/hero/",
  });

/** Desktop (16:9) and mobile (4:5) are separate compositions, never a CSS crop. */
const responsiveAsset = z.object({
  desktop: assetPath,
  mobile: assetPath,
});

/** A clip degrades to its poster when not yet rendered. */
const optionalClip = responsiveAsset.nullable();

const service = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Join key to hotspot copy in Sanity. */
  deviceId: z.string().min(1),
  cameraMove: optionalClip,
  demo: optionalClip,
  /** Never optional — this is the reduced-motion and adaptive-loading fallback. */
  poster: responsiveAsset,
});

const sceneManifest = z.object({
  landing: z.object({
    /** Rendered at 110% of the display area; the extra 10% is the parallax travel. */
    still: responsiveAsset,
    /** Max px shift on each axis. */
    parallax: z.object({
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
    }),
  }),
  approach: z.object({
    clip: optionalClip,
    poster: responsiveAsset,
  }),
  explorer: z.object({
    base: responsiveAsset,
    services: z
      .array(service)
      .min(1)
      .refine((list) => new Set(list.map((s) => s.id)).size === list.length, {
        message: "Duplicate service id",
      }),
  }),
});

export type SceneManifest = z.infer<typeof sceneManifest>;
export type Service = z.infer<typeof service>;

/** Exported for tests. Prefer the parsed `manifest` export in app code. */
export const sceneManifestSchema = sceneManifest;

export const manifest: SceneManifest = sceneManifest.parse(manifestJson);
