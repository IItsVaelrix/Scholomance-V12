import { getPartProfile } from './part-profile-library.js';

export function composeFaceFeatures({ silhouette, spec, direction = 'south', skeleton } = {}) {
  if (!silhouette || !spec || !Array.isArray(spec.face)) {
    return { cells: [], partOf: new Map(), diagnostics: { ok: true, failures: [] } };
  }

  const cells = [];
  const partOf = new Map(silhouette.partOf || []);
  const diagnostics = { ok: true, failures: [] };
  const seen = new Set();

  for (const facePart of spec.face) {
    if (!facePart.profile) continue;

    if (direction === 'north') {
      continue;
    }

    const isEastWest = direction === 'east' || direction === 'west';
    if (isEastWest) {
      if (facePart.id === 'leftEye' && direction === 'east') continue;
      if (facePart.id === 'rightEye' && direction === 'west') continue;
      if (facePart.id === 'nose' && direction !== 'east') continue;
    }

    let anchorPoint = null;
    if (facePart.attach && skeleton) {
      const at = facePart.attach.at || '';
      const parts = at.split('.');
      if (parts.length === 2) {
        const region = skeleton[parts[0]];
        if (region) anchorPoint = region[parts[1]];
      }
    }

    if (!anchorPoint) continue;

    try {
      const profileFn = getPartProfile(facePart.profile);
      const side = facePart.id.includes('Left') || facePart.id === 'leftEye' || facePart.id === 'leftEar'
        ? 'left'
        : facePart.id.includes('Right') || facePart.id === 'rightEye' || facePart.id === 'rightEar'
          ? 'right'
          : 'center';

      const result = profileFn(facePart.params || {}, {
        ...(silhouette.canvas ? { canvas: silhouette.canvas } : { width: 32, height: 48 }),
        side,
        direction,
      });

      const dx = anchorPoint.x;
      const dy = anchorPoint.y;

      for (const c of result.cells) {
        const gx = c.x + dx;
        const gy = c.y + dy;
        if (gx < 0 || gx >= 32 || gy < 0 || gy >= 48) continue;
        const key = `${gx},${gy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cells.push({ x: gx, y: gy });
        if (!partOf.has(key)) {
          partOf.set(key, facePart.id);
        }
      }
    } catch (e) {
      diagnostics.ok = false;
      diagnostics.failures.push({
        code: 'FACE_PROFILE_ERROR',
        partId: facePart.id,
        profile: facePart.profile,
        message: e.message,
      });
    }
  }

  return { cells, partOf, diagnostics };
}
