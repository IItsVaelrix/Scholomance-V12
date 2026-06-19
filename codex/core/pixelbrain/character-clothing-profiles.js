import { registerPartProfile } from './part-profile-library.js';

function roundInt(v) {
  return Math.round(Number(v) || 0);
}

function pushCell(cells, x, y, color) {
  cells.push({ x: roundInt(x), y: roundInt(y), ...(color ? { color } : {}) });
}

const STARBOUND_CLOTHING_MASKS = Object.freeze({
  // Narrowed to match body shoulderHalfW=5; curved not trapezoidal; trailing 1-px rows removed to avoid pointed hem
  jacketSouth: Object.freeze([3, 4, 5, 5, 5, 4, 4, 3, 3, 2]),
  jacketProfile: Object.freeze([2, 3, 4, 4, 4, 3, 3, 2, 2]),
  shortsSouth: Object.freeze([5, 4, 4, 3, 3, 2, 2]),
  shortsProfile: Object.freeze([3, 3, 3, 2, 2, 2, 1, 1]),
  sleeveLeftSouth: Object.freeze(['011', '111', '110', '110']),
  sleeveRightSouth: Object.freeze(['110', '111', '011', '011']),
  bootLeftSouth: Object.freeze(['0110', '1111', '1110', '0100']),
  bootRightSouth: Object.freeze(['0110', '1111', '0111', '0010']),
  bootProfile: Object.freeze(['0110', '1111', '1110', '0100']),
});

function pushMaskedRows(cells, cx, topY, halfWidths, colorForCell, options = {}) {
  const shiftX = roundInt(options.shiftX ?? 0);
  const clipLeft = Number.isFinite(options.clipLeft) ? options.clipLeft : -Infinity;
  const clipRight = Number.isFinite(options.clipRight) ? options.clipRight : Infinity;

  for (let row = 0; row < halfWidths.length; row += 1) {
    const halfW = Math.max(0, roundInt(halfWidths[row]));
    const y = topY + row;
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      if (dx < clipLeft || dx > clipRight) continue;
      const color = colorForCell({ row, dx, halfW, y });
      if (color) pushCell(cells, cx + shiftX + dx, y, color);
    }
  }
}

function pushBitmapMask(cells, originX, originY, mask, colorForCell, options = {}) {
  const flipX = Boolean(options.flipX);
  for (let row = 0; row < mask.length; row += 1) {
    const line = String(mask[row]);
    for (let col = 0; col < line.length; col += 1) {
      const sourceCol = flipX ? line.length - 1 - col : col;
      if (line[sourceCol] !== '1') continue;
      const color = colorForCell({ row, col, width: line.length });
      if (color) pushCell(cells, originX + col, originY + row, color);
    }
  }
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

registerPartProfile('character.clothing.top.starboundJacket', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const shoulderY = roundInt(params.shoulderY ?? 21);
  const waistY = roundInt(params.waistY ?? 29);
  const shoulderHalfW = roundInt(params.shoulderHalfW ?? 7);
  const base = params.color || 'cloth_star_jacket';
  const trim = params.trim || 'trim_comet_gold';
  const signal = params.signal || 'neon_mint_signal';
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    pushMaskedRows(cells, cx, shoulderY, STARBOUND_CLOTHING_MASKS.jacketProfile, ({ row, dx, halfW }) => {
      if (row >= STARBOUND_CLOTHING_MASKS.jacketProfile.length - 1 && Math.abs(dx) === halfW) return null;
      if (dx === halfW) return trim;
      if (dx <= -1 && row > 2) return trim;
      return base;
    }, {
      shiftX: direction === 'east' ? 1 : -1,
      clipLeft: direction === 'east' ? -1 : undefined,
      clipRight: direction === 'west' ? 1 : undefined,
    });
    pushCell(cells, cx + 2, shoulderY + 2, signal);
    pushCell(cells, cx + 3, shoulderY + 3, signal);
    // Profile cuff stub: angled 2-pixel cuff at sleeve end
    const cuffSign = direction === 'east' ? 1 : -1;
    const armEndY = shoulderY + STARBOUND_CLOTHING_MASKS.jacketProfile.length;
    pushCell(cells, cx + cuffSign * 2, armEndY,     trim);
    pushCell(cells, cx + cuffSign * 3, armEndY + 1, trim);
    return { cells, anchors: { base: { x: cx, y: waistY + 2 }, top: { x: cx, y: shoulderY } } };
  }

  pushMaskedRows(cells, cx, shoulderY, STARBOUND_CLOTHING_MASKS.jacketSouth, ({ row, dx, halfW }) => {
    const isOpenFront = Math.abs(dx) <= 1 && row > 1;
    if (row < 3 && Math.abs(dx) >= halfW - 1) return null;
    if (Math.abs(dx) === halfW && row > 2) return trim;
    return isOpenFront ? trim : base;
  });

  pushBitmapMask(cells, cx - 8, shoulderY + 1, STARBOUND_CLOTHING_MASKS.sleeveLeftSouth, ({ row, col }) => {
    if (row === STARBOUND_CLOTHING_MASKS.sleeveLeftSouth.length - 1) return trim;
    if (row === 0 && col === 1) return trim;
    return base;
  });
  pushBitmapMask(cells, cx + 6, shoulderY + 1, STARBOUND_CLOTHING_MASKS.sleeveRightSouth, ({ row, col }) => {
    if (row === STARBOUND_CLOTHING_MASKS.sleeveRightSouth.length - 1) return trim;
    if (row === 0 && col === 1) return trim;
    return base;
  });

  for (let dx = -2; dx <= 2; dx += 1) pushCell(cells, cx + dx, shoulderY - 1, trim);
  for (const [dx, dy] of [[-3, 2], [-2, 3], [2, 3], [3, 2], [0, 4]]) {
    pushCell(cells, cx + dx, shoulderY + dy, signal);
  }

  return { cells, anchors: { base: { x: cx, y: waistY + 2 }, top: { x: cx, y: shoulderY } } };
});

registerPartProfile('character.clothing.bottom.psychicStreetShorts', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const waistY = roundInt(params.waistY ?? 28);
  const kneeY = roundInt(params.kneeY ?? 35);
  const base = params.color || 'cloth_psychic_denim';
  const trim = params.trim || 'trim_comet_gold';
  const cells = [];

  if (direction === 'east' || direction === 'west') {
    pushMaskedRows(cells, cx, waistY, STARBOUND_CLOTHING_MASKS.shortsProfile, ({ row, dx, halfW }) => {
      if (row === 0 || row >= STARBOUND_CLOTHING_MASKS.shortsProfile.length - 2) return trim;
      if (Math.abs(dx) === halfW) return trim;
      return base;
    }, { shiftX: direction === 'east' ? 1 : -1 });
    return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: kneeY } } };
  }

  for (let dx = -5; dx <= 5; dx += 1) pushCell(cells, cx + dx, waistY, trim);
  for (const side of [-1, 1]) {
    const lx = cx + side * 3;
    pushMaskedRows(cells, lx, waistY + 1, STARBOUND_CLOTHING_MASKS.shortsSouth.slice(1), ({ row, dx, halfW }) => {
      if (row >= STARBOUND_CLOTHING_MASKS.shortsSouth.length - 3) return trim;
      if (dx === side * halfW) return trim;
      return base;
    });
  }

  return { cells, anchors: { base: { x: cx, y: waistY }, bottom: { x: cx, y: kneeY } } };
});

registerPartProfile('character.clothing.shoes.cometBoots', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const ankleY = roundInt(params.ankleY ?? 39);
  const footBot = roundInt(params.footBot ?? 43);
  const base = params.color || 'leather_brown';
  const trim = params.trim || 'trim_comet_gold';
  const cells = [];
  const legGap = roundInt(params.legGap ?? 2);

  if (direction === 'east' || direction === 'west') {
    pushBitmapMask(cells, cx - 1, ankleY, STARBOUND_CLOTHING_MASKS.bootProfile, ({ row, col, width }) => {
      if (row === STARBOUND_CLOTHING_MASKS.bootProfile.length - 1) return trim;
      if (col === width - 1) return trim;
      return base;
    }, { flipX: direction === 'west' });
    return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
  }

  for (const side of [-1, 1]) {
    const fx = cx + side * legGap;
    const mask = side < 0 ? STARBOUND_CLOTHING_MASKS.bootLeftSouth : STARBOUND_CLOTHING_MASKS.bootRightSouth;
    pushBitmapMask(cells, fx + side - 2, ankleY, mask, ({ row, col, width }) => {
      if (row === mask.length - 1) return trim;
      if ((side < 0 && col === 0) || (side > 0 && col === width - 1)) return trim;
      return base;
    });
  }

  return { cells, anchors: { base: { x: cx, y: ankleY }, bottom: { x: cx, y: footBot } } };
});
