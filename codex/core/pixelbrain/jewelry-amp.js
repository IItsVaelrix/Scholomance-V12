/**
 * jewelry-amp.js
 * Template pre-processor: Generates chains, gem settings, and manipulates volumes for jewelry.
 */

export function applyJewelryTemplate(template, silhouette, spec) {
  if (!['amulet', 'ring'].includes(spec.class)) return template;

  const updatedCoords = [...template.coordinates];
  const coordMap = new Map();
  updatedCoords.forEach((c, idx) => coordMap.set(`${c.x},${c.y}`, idx));

  // 1. Chains
  // The silhouette composer already creates chain link cells if the parts are in the spec,
  // but if we need automatic chaining, we would do it here. For now, rely on part profiles.

  // 2. Gem Settings and Volume
  const gems = spec.parts.filter(p => p.profile && p.profile.startsWith('gem.'));
  for (const gem of gems) {
    // find gem cells
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const gemCells = [];
    updatedCoords.forEach((c, idx) => {
      if (silhouette.partOf.get(`${c.x},${c.y}`) === gem.id) {
        gemCells.push({ c, idx });
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
      }
    });

    if (gemCells.length === 0) continue;
    
    // give gem volume (dome shape)
    const cx = Math.round((minX + maxX) / 2);
    const cy = Math.round((minY + maxY) / 2);
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    
    gemCells.forEach(({ c, idx }) => {
      const nx = (c.x - cx) / Math.max(1, rx);
      const ny = (c.y - cy) / Math.max(1, ry);
      const dist = Math.hypot(nx, ny);
      
      let slotMod = 2; // base elevate
      if (dist < 0.5) slotMod += 1; // center higher
      if (ny < -0.3) slotMod += 1; // top highlight
      if (ny > 0.5) slotMod -= 1; // bottom shadow
      
      updatedCoords[idx] = { ...c, slot: Math.max(0, c.slot + slotMod) };
    });

    // Handle setting attached to this gem
    const setting = spec.parts.find(p => p.attach && p.attach.parent === gem.id && p.profile.startsWith('setting.'));
    if (setting) {
      const edgeCells = [];
      gemCells.forEach(({ c, idx }) => {
        let isEdge = false;
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nPart = silhouette.partOf.get(`${c.x+dx},${c.y+dy}`);
          if (nPart !== gem.id) isEdge = true;
        }
        if (isEdge) edgeCells.push({ c, idx });
      });

      if (setting.profile === 'setting.prong') {
        const prongs = [
          { x: minX, y: minY }, { x: maxX, y: minY },
          { x: minX, y: maxY }, { x: maxX, y: maxY }
        ];
        prongs.forEach(p => {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const k = `${Math.round(p.x)+dx},${Math.round(p.y)+dy}`;
              const pIdx = coordMap.get(k);
              if (pIdx !== undefined) {
                silhouette.partOf.set(k, setting.id);
                updatedCoords[pIdx] = { ...updatedCoords[pIdx], slot: updatedCoords[pIdx].slot + 2 };
              }
            }
          }
        });
      } else if (setting.profile === 'setting.bezel') {
        edgeCells.forEach(({ c, idx }) => {
          silhouette.partOf.set(`${c.x},${c.y}`, setting.id);
          updatedCoords[idx] = { ...c, slot: c.slot + 1 };
        });
      }
    }
  }

  return { ...template, coordinates: updatedCoords };
}
