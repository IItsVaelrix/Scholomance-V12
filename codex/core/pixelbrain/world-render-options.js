/**
 * world-render-options — one source of truth for how world-gen voxels render.
 *
 * Before this, the DivWand portals called `renderFacesToSVG(faces)` with bare
 * defaults: no ambient occlusion, no antialiasing, and the photonic seed glow
 * the pipeline computes was discarded. This restores depth (AO), clean edges
 * (antialias), and a *tasteful* glow — tuned as an environmental CUE, not a
 * prop, by holding the light-point opacity well below the renderer default.
 *
 * See PDR/notes: world fidelity pass (2026-06-18).
 */

import { project } from './iso-projector.js';

// Renderer default is 0.45 (reads as a spotlight prop). A third of that lets the
// school color tint the environment near energy sources without dominating it.
export const WORLD_GLOW_OPACITY = 0.14;

/**
 * The shared render options for world-gen surfaces. Pass the world's light
 * points (or omit for AO+antialias only); `overrides` win over the defaults.
 */
export function worldRenderOptions(lightPoints = [], overrides = {}) {
  return {
    background: '#0b1020',
    ambientOcclusion: true,
    ambientOcclusionStrength: 0.38,
    lighting: true,
    antialias: true,
    lightPoints,
    lightPointOpacity: WORLD_GLOW_OPACITY,
    ...overrides,
  };
}

/**
 * Turn energy seeds into soft, *local* glow descriptors. Accepts seeds in
 * either `{vx,vy,vz}` (pipeline) or `{x,y,z}` form. Radius is contained to
 * ~half the world span so the glow pools near its source (a cue) rather than
 * washing the whole frame; energy is clamped to [0,1].
 */
export function seedsToLightPoints(seeds, { schoolId, size = 32, tileSize = 16 } = {}) {
  const r = Math.round(size * tileSize * 0.5);
  return Object.freeze(
    (seeds ?? []).map((seed) => {
      const vx = seed.vx ?? seed.x ?? 0;
      const vy = seed.vy ?? seed.y ?? 0;
      const vz = seed.vz ?? seed.z ?? 0;
      const { sx, sy } = project(vx, vy, vz);
      const energy = Math.min(1, Math.max(0, seed.energy ?? 1));
      return Object.freeze({ sx, sy, r, energy, schoolId });
    }),
  );
}
