/**
 * voxel-keyframe — D1 (keyframe transform about pivot) + D2 (timeline units).
 *
 * This is the spatial primitive the existing animation pipeline binds to (see
 * 2026-06-15-pixelbrain-animation-encoding-white-paper.md). A keyframe is
 * `{ t, translate, rotateDeg, scale }`; composed about a pivot it applies, in
 * order: T(−pivot) → S → R(XYZ) → T(+pivot) → T(translate).
 *
 * Timeline (D2): canonical 12 fps; keyframe `t` is in seconds.
 *
 * See PDR SCHOL-ENC-PDR-VOXEDIT-CONVENTIONS-v1.0 §D.
 */

import { rotatePointAboutPivot } from './voxel-rig.js';

export const FPS_DEFAULT = 12;

/** Frame index for a time in seconds (D2). */
export function frameAt(t, fps = FPS_DEFAULT) {
  return Math.round(t * fps);
}

function vec(v, fallback) {
  return {
    x: typeof v?.x === 'number' ? v.x : fallback,
    y: typeof v?.y === 'number' ? v.y : fallback,
    z: typeof v?.z === 'number' ? v.z : fallback,
  };
}

/**
 * Normalize a keyframe into a transform bound to `pivot`, filling defaults
 * (scale 1, rotation 0, translation 0).
 */
export function composeTransform(keyframe, pivot) {
  return {
    pivot: { ...pivot },
    scale: vec(keyframe.scale, 1),
    rotateDeg: vec(keyframe.rotateDeg, 0),
    translate: vec(keyframe.translate, 0),
  };
}

/**
 * Apply a composed transform to a point: scale and rotate about the pivot,
 * then translate. Pure; returns a new point.
 */
export function applyTransform(point, t) {
  const v = {
    x: (point.x - t.pivot.x) * t.scale.x,
    y: (point.y - t.pivot.y) * t.scale.y,
    z: (point.z - t.pivot.z) * t.scale.z,
  };
  const r = rotatePointAboutPivot(v, t.rotateDeg, { x: 0, y: 0, z: 0 });
  return {
    x: r.x + t.pivot.x + t.translate.x,
    y: r.y + t.pivot.y + t.translate.y,
    z: r.z + t.pivot.z + t.translate.z,
  };
}
