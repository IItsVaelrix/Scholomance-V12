// VOIDMETAL PICKAXE as a TRUE-3D sculpt — the authored counterpart to the
// silhouette lift (PDR SCHOL-ENC-PDR-STRUCT-ENERGY-LIFT-v1.0).
//
// The lift inflates one 2D view: front == back, and it can never punch a hole.
// This module sculpts the pickaxe directly in (x, y, z) the way the void scholar
// was authored (scratch/scholar-cells.mjs) — so it gets real depth AND the eye
// hole through the head. Output flows through the same PB-VOXEL-ITEM packet and
// the same Godot voxel renderer as the scholar.
//
// Frame: x = right, y = up, z = depth (front/back). Pure + deterministic.

const WOOD = 1; // haft — dark, matte
const METAL = 2; // voidmetal head + arms
const RUNE = 3; // glowing eye inlay

const WIDTH = 42;
const HEIGHT = 48;
const DEPTH = 13;

const CX = 21; // haft / head centre (x)
const CZ = 6; // depth centre (z)
const EYE_Y = 38; // head centre (y)

/** The centre of the pickaxe eye — empty through the whole depth. */
export const EYE_CENTER = Object.freeze({ x: CX, y: EYE_Y, z: CZ });

export const PICKAXE_MATERIALS = Object.freeze({
  [WOOD]: { colorHint: '#15121C', roughness: 0.92, metallic: 0.0 },
  [METAL]: { colorHint: '#5A6480', roughness: 0.28, metallic: 0.92 },
  [RUNE]: { colorHint: '#9EE6FF', roughness: 0.30, metallic: 0.20 },
});

/**
 * Sculpt the pickaxe as tagged voxel cells.
 * @returns {{ cells: Array<{x,y,z,m,energy?,energyType?}>, dims:{width,height,depth}, materials:object }}
 */
export function buildPickaxeCells() {
  const cells = [];
  const set = new Set();

  const put = (x, y, z, m, extra) => {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    if (x < 0 || y < 0 || z < 0 || x >= WIDTH || y >= HEIGHT || z >= DEPTH) return;
    const key = `${x},${y},${z}`;
    if (set.has(key)) return; // first writer wins (matches the volume overwrite intent)
    set.add(key);
    cells.push({ x, y, z, m, ...(extra || {}) });
  };

  // Haft — a round rod up the Y axis (a 3×3 disc in XZ), not a wire.
  for (let y = 3; y <= 35; y += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (dx * dx + dz * dz <= 2.25) put(CX + dx, y, CZ + dz, WOOD);
      }
    }
  }

  // Rune eye — a glowing square outline flush on the front & back faces of the
  // head, drawn FIRST so it wins those cells from the metal housing below.
  for (const zFace of [CZ - 2, CZ + 2]) {
    for (let dx = -3; dx <= 3; dx += 1) {
      for (let dy = -3; dy <= 3; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) {
          put(CX + dx, EYE_Y + dy, zFace, RUNE, { energy: 1.0, energyType: 7 /* RADIANT */ });
        }
      }
    }
  }

  // Head housing — a solid square annulus around the eye, extruded through the
  // depth. The inner 3×3 column (|dx|,|dy| ≤ 1) is left EMPTY: the eye hole.
  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) {
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      if (ring < 2 || ring > 3) continue; // ring<2 = the hole; ring>3 = outside
      for (let z = CZ - 2; z <= CZ + 2; z += 1) {
        put(CX + dx, EYE_Y + dy, z, METAL);
      }
    }
  }

  // Twin pick arms — sweep out in ±x, curving down, tapering in both depth and
  // height to a single-voxel point. Broad at the base (real Z), sharp at the tip.
  for (const s of [-1, 1]) {
    for (let t = 0; t < 8; t += 1) {
      const ax = CX + s * (4 + t);
      const baseY = EYE_Y + 1 - t; // the silhouette curves downward as it extends
      const zr = Math.max(0, 2 - Math.floor(t / 3)); // depth half-thickness: 2 → 0
      const hy = Math.max(0, 1 - Math.floor(t / 4)); // height half-thickness: 1 → 0
      for (let dy = -hy; dy <= hy; dy += 1) {
        for (let dz = -zr; dz <= zr; dz += 1) {
          put(ax, baseY + dy, CZ + dz, METAL);
        }
      }
    }
  }

  return {
    cells,
    dims: { width: WIDTH, height: HEIGHT, depth: DEPTH },
    materials: PICKAXE_MATERIALS,
  };
}
