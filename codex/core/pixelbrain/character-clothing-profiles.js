import { registerPartProfile } from './part-profile-library.js';

function roundInt(v) {
  return Math.round(Number(v) || 0);
}

registerPartProfile('character.clothing.top.beginnerRobe', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 12);
  const waistY = roundInt(params.waistY ?? 24);
  const shoulderHalfW = roundInt(params.shoulderHalfW ?? 7);
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    for (let y = shoulderY; y <= waistY + 4; y += 1) {
      const t = (y - shoulderY) / Math.max(1, waistY + 4 - shoulderY);
      const halfW = Math.round(shoulderHalfW * (1 - t * 0.2));
      for (let dx = 0; dx <= halfW; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: waistY + 4 }, top: { x: cx, y: shoulderY } } };
  }

  for (let y = shoulderY; y <= waistY + 4; y += 1) {
    const t = (y - shoulderY) / Math.max(1, waistY + 4 - shoulderY);
    const halfW = Math.round(shoulderHalfW * (1 - t * 0.15));
    const waistExt = t > 0.7 ? roundInt(shoulderHalfW * 0.2 * ((t - 0.7) / 0.3)) : 0;
    const actualW = halfW + waistExt;
    for (let dx = -actualW; dx <= actualW; dx += 1) {
      cells.push({ x: cx + dx, y });
    }
  }

  for (let y = waistY + 5; y <= waistY + 8; y += 1) {
    const t = (y - waistY - 4) / 4;
    const halfW = roundInt(shoulderHalfW * (1 - t * 0.3));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y });
    }
  }

  return { cells, anchors: { base: { x: cx, y: shoulderY }, top: { x: cx, y: shoulderY } } };
});

registerPartProfile('character.clothing.top.beginnerTunic', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 12);
  const waistY = roundInt(params.waistY ?? 24);
  const shoulderHalfW = roundInt(params.shoulderHalfW ?? 7);
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    for (let y = shoulderY; y <= waistY; y += 1) {
      const t = (y - shoulderY) / Math.max(1, waistY - shoulderY);
      const halfW = Math.round(shoulderHalfW * (1 - t * 0.4));
      for (let dx = 0; dx <= halfW; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: shoulderY }, top: { x: cx, y: shoulderY } } };
  }

  for (let y = shoulderY; y <= waistY; y += 1) {
    const t = (y - shoulderY) / Math.max(1, waistY - shoulderY);
    const halfW = Math.round(shoulderHalfW * (1 - t * 0.4));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y });
    }
  }

  // collar
  for (let dx = -2; dx <= 2; dx += 1) {
    cells.push({ x: cx + dx, y: shoulderY - 1 });
  }

  return { cells, anchors: { base: { x: cx, y: shoulderY }, top: { x: cx, y: shoulderY } } };
});

registerPartProfile('character.clothing.top.beginnerShirt', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 13);
  const waistY = roundInt(params.waistY ?? 22);
  const shoulderHalfW = roundInt(params.shoulderHalfW ?? 6);
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    for (let y = shoulderY; y <= waistY; y += 1) {
      const halfW = Math.round(shoulderHalfW * 0.9);
      for (let dx = 0; dx <= halfW; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: waistY }, top: { x: cx, y: shoulderY } } };
  }

  for (let y = shoulderY; y <= waistY; y += 1) {
    const halfW = Math.round(shoulderHalfW * (1 - ((y - shoulderY) / Math.max(1, waistY - shoulderY)) * 0.25));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y });
    }
  }

  return { cells, anchors: { base: { x: cx, y: waistY }, top: { x: cx, y: shoulderY } } };
});

registerPartProfile('character.clothing.bottom.beginnerPants', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const waistY = roundInt(params.waistY ?? 24);
  const legBot = roundInt(params.legBot ?? 40);
  const cells = [];

  const legGap = roundInt(params.legGap ?? 2);
  const legHalfW = roundInt(params.legHalfW ?? 2);

  if (direction === 'east' || direction === 'west') {
    for (let y = waistY; y <= legBot; y += 1) {
      for (let dx = -legHalfW - 1; dx <= legHalfW + 1; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: legBot } } };
  }

  for (const side of [-1, 1]) {
    const lx = cx + side * (legGap + legHalfW);
    for (let y = waistY; y <= legBot; y += 1) {
      for (let dx = -legHalfW - 1; dx <= legHalfW + 1; dx += 1) {
        cells.push({ x: lx + dx, y });
      }
    }
  }

  return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: legBot } } };
});

registerPartProfile('character.clothing.bottom.beginnerSkirt', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const waistY = roundInt(params.waistY ?? 24);
  const kneeY = roundInt(params.kneeY ?? 34);
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    for (let y = waistY; y <= kneeY; y += 1) {
      const t = (y - waistY) / Math.max(1, kneeY - waistY);
      const halfW = roundInt(5 * (1 + t * 0.3));
      for (let dx = 0; dx <= halfW; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: kneeY } } };
  }

  for (let y = waistY; y <= kneeY; y += 1) {
    const t = (y - waistY) / Math.max(1, kneeY - waistY);
    const halfW = roundInt(5 * (1 + t * 0.3));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y });
    }
  }

  return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: kneeY } } };
});

registerPartProfile('character.clothing.bottom.beginnerLeggings', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const waistY = roundInt(params.waistY ?? 24);
  const legBot = roundInt(params.legBot ?? 40);
  const cells = [];

  const legGap = roundInt(params.legGap ?? 2);
  const legHalfW = roundInt(params.legHalfW ?? 1);

  if (direction === 'east' || direction === 'west') {
    for (let y = waistY; y <= legBot; y += 1) {
      for (let dx = -legHalfW; dx <= legHalfW; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: legBot } } };
  }

  for (const side of [-1, 1]) {
    const lx = cx + side * (legGap + legHalfW);
    for (let y = waistY; y <= legBot; y += 1) {
      for (let dx = -legHalfW; dx <= legHalfW; dx += 1) {
        cells.push({ x: lx + dx, y });
      }
    }
  }

  return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: legBot } } };
});

registerPartProfile('character.clothing.shoes.beginnerBoots', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const ankleY = roundInt(params.ankleY ?? 40);
  const footBot = roundInt(params.footBot ?? 44);
  const cells = [];

  const legGap = roundInt(params.legGap ?? 2);

  if (direction === 'east' || direction === 'west') {
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
  }

  for (const side of [-1, 1]) {
    const fx = cx + side * legGap;
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        cells.push({ x: fx + dx, y });
      }
    }
  }

  return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
});

registerPartProfile('character.clothing.shoes.beginnerSandals', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const ankleY = roundInt(params.ankleY ?? 42);
  const footBot = roundInt(params.footBot ?? 44);
  const cells = [];

  const legGap = roundInt(params.legGap ?? 2);

  if (direction === 'east' || direction === 'west') {
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
  }

  for (const side of [-1, 1]) {
    const fx = cx + side * legGap;
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        cells.push({ x: fx + dx, y });
      }
    }
  }

  return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
});

registerPartProfile('character.clothing.shoes.beginnerSlippers', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const ankleY = roundInt(params.ankleY ?? 43);
  const footBot = roundInt(params.footBot ?? 44);
  const cells = [];

  const legGap = roundInt(params.legGap ?? 2);

  if (direction === 'east' || direction === 'west') {
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        cells.push({ x: cx + dx, y });
      }
    }
    return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
  }

  for (const side of [-1, 1]) {
    const fx = cx + side * legGap;
    for (let y = ankleY; y <= footBot; y += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        cells.push({ x: fx + dx, y });
      }
    }
  }

  return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
});
