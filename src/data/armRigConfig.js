/**
 * armRigConfig.js — data-only joint definition for the two-arm rig.
 *
 * Pivots are SCDL canvas coordinates (64x128). restAngleDeg is 0 because each
 * segment sprite is drawn in its rest position; poses supply angle DELTAS.
 * Tune pivots against the running arena (see plan Task 8). New poses/weapons
 * drop in here without touching the scene.
 */

export const ARM_RIG = {
  right: {
    shoulder: { x: 43, y: 30 },
    mirror: false,
    segments: [
      { key: 'upper', spriteKey: 'armR-upper', pivot: { x: 43, y: 30 }, childOffset: { x: 44, y: 44 }, restAngleDeg: 0 },
      { key: 'fore', spriteKey: 'armR-fore', pivot: { x: 44, y: 44 }, childOffset: { x: 44, y: 58 }, restAngleDeg: 0 },
      { key: 'hand', spriteKey: 'armR-hand', pivot: { x: 44, y: 58 }, childOffset: { x: 44, y: 64 }, restAngleDeg: 0, gripPoint: { x: 45, y: 62 } },
    ],
  },
  left: {
    shoulder: { x: 21, y: 30 },
    mirror: true,
    segments: [
      { key: 'upper', spriteKey: 'armL-upper', pivot: { x: 21, y: 30 }, childOffset: { x: 20, y: 44 }, restAngleDeg: 0 },
      { key: 'fore', spriteKey: 'armL-fore', pivot: { x: 20, y: 44 }, childOffset: { x: 19, y: 58 }, restAngleDeg: 0 },
      { key: 'hand', spriteKey: 'armL-hand', pivot: { x: 19, y: 58 }, childOffset: { x: 19, y: 64 }, restAngleDeg: 0, gripPoint: { x: 19, y: 62 } },
    ],
  },
};

// Pose = per-arm array of angle DELTAS (deg) applied to [upper, fore, hand].
export const ARM_POSES = {
  carry: { right: [0, 0, 0], left: [0, 0, 0] },
  // Windup back and a downward strike come from animating between these at runtime;
  // the pose here is the strike endpoint used as the animation target.
  swing: { right: [40, 25, 0], left: [0, 0, 0] },
  // Left forearm raises across the body to bring the shield up.
  block: { right: [0, 0, 0], left: [-35, 60, 0] },
};

export function getPose(name) {
  return ARM_POSES[name] || ARM_POSES.carry;
}
