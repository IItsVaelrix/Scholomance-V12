// VOID Scholar geometry as TAGGED cells: each voxel carries an animation block
// id ('body' | 'armR' | 'armL' | 'staff' | 'orb'). Same shapes as void-scholar v6.
const ROBE = 4, VOIDFACE = 1, TRIM = 2, STAFF = 3, ORB = 4, LEG = 2, SHOE = 1, HAND = 1;
const lerp = (a, b, t) => a + (b - a) * t;

export function buildScholarCells() {
  const cx = 30, cz = 30, stx = cx + 19, stz = cz;
  const cells = [];
  const set = new Set();
  const put = (x, y, z, m, block) => {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (x < 0 || y < 0 || z < 0 || x >= 64 || y >= 64 || z >= 64) return;
    const key = `${x},${y},${z}`;
    if (set.has(key)) return; // first writer wins (matches volume overwrite order intent)
    set.add(key);
    cells.push({ x, y, z, m, block });
  };
  const disc = (xc, y, zc, r, m, block) => {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
      for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++)
        if (dx * dx + dz * dz <= r * r) put(xc + dx, y, zc + dz, m, block);
  };

  // legs + obsidian shoes (block: body)
  const FEET = [{ x: cx + 5, z: cz + 0 }, { x: cx + 0, z: cz + 5 }];
  for (const f of FEET) {
    for (let y = 4; y <= 14; y++) disc(f.x, y, f.z, 2.0, LEG, 'body');
    for (let y = 2; y <= 3; y++)
      for (let dx = -1; dx <= 3; dx++) for (let dz = -1; dz <= 3; dz++)
        put(f.x + dx, y, f.z + dz, SHOE, 'body');
  }

  // arms FIRST so the sleeves win their cells over the robe (block: armR/armL)
  const buildArm = (axc, azc, block) => {
    for (let y = 28; y <= 44; y++) disc(axc, y, azc, y <= 30 ? 2.4 : 3.0, ROBE, block);
    for (let y = 27; y <= 28; y++)
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const d2 = dx * dx + dz * dz; if (d2 <= 9 && d2 >= 3) put(axc + dx, y, azc + dz, TRIM, block);
      }
    for (let y = 24; y <= 26; y++) disc(axc, y, azc, 1.6, HAND, block);
  };
  buildArm(cx + 10, cz, 'armR');
  buildArm(cx, cz + 10, 'armL');

  // robe body (block: body)
  const robeRadius = (y) =>
    y <= 22 ? 7.5 : y <= 40 ? lerp(7.5, 8.5, (y - 22) / 18) : y <= 45 ? lerp(8.5, 10, (y - 40) / 5) : 9;
  for (let y = 8; y <= 45; y++) {
    const base = robeRadius(y);
    for (let x = 0; x < 64; x++) for (let z = 0; z < 64; z++) {
      const dx = x - cx, dz = z - cz, theta = Math.atan2(dz, dx);
      const r = base * (1 + 0.03 * Math.cos(6 * theta + 0.5));
      if (dx * dx + dz * dz <= r * r) put(x, y, z, y <= 9 ? TRIM : ROBE, 'body');
    }
  }

  // neck + hood + void face + eyes (block: body)
  for (let y = 46; y <= 48; y++) disc(cx, y, cz, 4.5, ROBE, 'body');
  const FACE_LO = 51, FACE_HI = 58, hoodInner = (y) => lerp(8, 3.2, (y - 49) / 13) - 2.6;
  for (let y = 49; y <= 62; y++) {
    const t = (y - 49) / 13, rO = lerp(8, 3.2, t), rI = rO - 2.6;
    for (let x = 0; x < 64; x++) for (let z = 0; z < 64; z++) {
      const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 <= rO * rO && d2 >= rI * rI) {
        const front = dx >= 0 && dz >= 0 && (dx + dz) > rI * 0.5;
        if (y >= FACE_LO && y <= FACE_HI && front) continue;
        put(x, y, z, ROBE, 'body');
      }
    }
  }
  for (let y = FACE_LO; y <= FACE_HI; y++) disc(cx, y, cz, hoodInner(y), VOIDFACE, 'body');
  const eyes = [{ x: cx + 3, y: 55, z: cz + 1 }, { x: cx + 1, y: 55, z: cz + 3 }];
  for (const e of eyes) put(e.x, e.y, e.z, ORB, 'body');

  // staff column (block: staff) + orb (block: orb)
  for (let y = 2; y <= 50; y++) put(stx, y, stz, STAFF, 'staff');
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++)
    if (dx * dx + dy * dy + dz * dz <= 9.5) put(stx + dx, 54 + dy, stz + dz, ORB, 'orb');

  return {
    cells,
    meta: { cx, cz, stx, stz, faceMid: (FACE_LO + FACE_HI) / 2, eyes, orbCenter: { x: stx, y: 54, z: stz } },
  };
}
