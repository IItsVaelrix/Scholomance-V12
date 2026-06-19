import { registerPartProfile } from './part-profile-library.js';

function roundInt(v) {
  return Math.round(Number(v) || 0);
}

const LONG_STRAIGHT_HAIR_MASKS = Object.freeze({
  south: Object.freeze([
    '00001111111110000',
    '00011111111111000',
    '00111111111111100',
    '01111111111111110',
    '11111111111111111',
    '11111111111111111',
    '11110000000011110',
    '11100000000001110',
    '11100000000001110',
    '11000000000000110',
    '11000000000000110',
    '11000000000000110',
    '10000000000000010',
    '10000000000000010',
    '10000000000000010',
    '10000000000000010',
    '01000000000000100',
    '01000000000000100',
    '00100000000001000',
    '00100000000001000',
    '00010000000010000',
    '00010000000010000',
  ]),
  north: Object.freeze([
    '00001111111110000',
    '00011111111111000',
    '00111111111111100',
    '01111111111111110',
    '11111111111111111',
    '11111111111111111',
    '11111111111111111',
    '11111111111111111',
    '11110000000011110',
    '11100000000001110',
    '11100000000001110',
    '11000000000000110',
    '11000000000000110',
    '11000000000000110',
    '10000000000000010',
    '10000000000000010',
    '01000000000000100',
    '01000000000000100',
    '00100000000001000',
    '00100000000001000',
  ]),
  profileEast: Object.freeze([
    '00011111110',
    '00111111111',
    '01111111111',
    '11111111111',
    '11111111111',
    '00111111111',
    '00000001111',
    '00000001110',
    '00000001110',
    '00000000110',
    '00000000110',
    '00000000110',
    '00000000010',
    '00000000010',
    '00000000010',
    '00000000010',
    '00000000100',
    '00000000100',
  ]),
});

function pushCenteredMask(cells, cx, topY, mask, color, options = {}) {
  const flipX = Boolean(options.flipX);
  const center = Math.floor(String(mask[0] || '').length / 2);
  for (let row = 0; row < mask.length; row += 1) {
    const line = String(mask[row]);
    for (let col = 0; col < line.length; col += 1) {
      const sourceCol = flipX ? line.length - 1 - col : col;
      if (line[sourceCol] !== '1') continue;
      cells.push({ x: cx + col - center, y: topY + row, ...(color ? { color } : {}) });
    }
  }
}

registerPartProfile('character.hair.short', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 5);
  const cells = [];
  const color = params.color || null;

  const topRows = direction === 'north' ? 4 : 3;
  for (let y = topY; y <= topY + topRows; y += 1) {
    const t = (y - topY) / Math.max(1, topRows);
    const halfW = Math.max(2, roundInt(headHalfW * (1 - t * 0.15)));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
    }
  }

  if (direction === 'south') {
    // bangs
    for (let dx = -3; dx <= 3; dx += 1) {
      cells.push({ x: cx + dx, y: topY + 3, ...(color ? { color } : {}) });
    }
    cells.push({ x: cx - 3, y: topY + 4, ...(color ? { color } : {}) });
    cells.push({ x: cx + 3, y: topY + 4, ...(color ? { color } : {}) });
  } else if (direction === 'north') {
    // back of head hair extends lower
    for (let y = topY + 4; y <= topY + 5; y += 1) {
      for (let dx = -roundInt(headHalfW * 0.7); dx <= roundInt(headHalfW * 0.7); dx += 1) {
        cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
      }
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.mediumStraight', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 5);
  const cells = [];
  const color = params.color || null;

  for (let y = topY; y <= topY + 5; y += 1) {
    const t = (y - topY) / 5;
    const halfW = Math.max(3, roundInt(headHalfW * (1 - t * 0.2)));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
    }
  }

  if (direction === 'south' || direction === 'north') {
    const sideExt = direction === 'north' ? 2 : 4;
    for (let dy = 1; dy <= sideExt; dy += 1) {
      for (let dx = -roundInt(headHalfW * 1.2); dx <= -headHalfW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
      for (let dx = headHalfW; dx <= roundInt(headHalfW * 1.2); dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.longStraight', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const cells = [];
  const color = params.color || null;

  if (direction === 'south') {
    pushCenteredMask(cells, cx, topY, LONG_STRAIGHT_HAIR_MASKS.south, color);
  } else if (direction === 'north') {
    pushCenteredMask(cells, cx, topY, LONG_STRAIGHT_HAIR_MASKS.north, color);
  } else {
    pushCenteredMask(cells, cx, topY, LONG_STRAIGHT_HAIR_MASKS.profileEast, color, { flipX: direction === 'west' });
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.ponytail', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 5);
  const tailLength = roundInt(params.tailLength ?? 6);
  const cells = [];
  const color = params.color || null;

  for (let y = topY; y <= topY + 4; y += 1) {
    const t = (y - topY) / 4;
    const halfW = Math.max(3, roundInt(headHalfW * (1 - t * 0.2)));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
    }
  }

  let tailCX, tailCY, tailDirX, tailDirY;
  if (direction === 'south') {
    tailCX = cx;
    tailCY = topY + 4;
    tailDirX = 0;
    tailDirY = 1;
  } else if (direction === 'north') {
    tailCX = cx;
    tailCY = topY;
    tailDirX = 0;
    tailDirY = -1;
  } else {
    const side = direction === 'east' ? 1 : -1;
    tailCX = cx + side * roundInt(headHalfW * 1.2);
    tailCY = topY + 2;
    tailDirX = side;
    tailDirY = 1;
  }

  for (let i = 1; i <= tailLength; i += 1) {
    const tw = i === 1 ? 2 : 1;
    const tx = tailCX + tailDirX * i;
    const ty = tailCY + tailDirY * i;
    cells.push({ x: tx, y: ty, ...(color ? { color } : {}) });
    if (tw > 1) {
      cells.push({ x: tx + 1, y: ty, ...(color ? { color } : {}) });
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.buzzcut', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 5);
  const cells = [];
  const color = params.color || null;

  for (let y = topY; y <= topY + 2; y += 1) {
    for (let dx = -headHalfW; dx <= headHalfW; dx += 1) {
      cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.curly', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 5);
  const volume = Number(params.volume ?? 0.5);
  const cells = [];
  const color = params.color || null;

  const volScale = 1 + volume * 0.4;

  for (let y = topY; y <= topY + 5; y += 1) {
    const t = (y - topY) / 5;
    const halfW = Math.max(3, roundInt(headHalfW * volScale * (1 - t * 0.2)));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: cx + dx, y, ...(color ? { color } : {}) });
    }
  }

  // extra puffiness on sides
  for (let dy = 1; dy <= 4; dy += 1) {
    const puffW = roundInt(headHalfW * volScale * 1.3);
    const skip = dy % 2 === 0;
    if (!skip) {
      cells.push({ x: cx - puffW, y: topY + dy, ...(color ? { color } : {}) });
      cells.push({ x: cx + puffW, y: topY + dy, ...(color ? { color } : {}) });
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});

registerPartProfile('character.hair.bald', () => ({
  cells: [],
  anchors: { base: { x: 16, y: 2 }, top: { x: 16, y: 2 } },
}));

registerPartProfile('character.hair.cometSweep', (params = {}, options = {}) => {
  const direction = String(options.direction || 'south');
  const cx = roundInt(params.cx ?? 16);
  const topY = roundInt(params.topY ?? 2);
  const headHalfW = roundInt(params.headHalfW ?? 6);
  const color = params.color || 'hair_midnight_teal';
  const streak = params.streak || 'neon_mint_signal';
  const cells = [];

  for (let y = topY; y <= topY + 6; y += 1) {
    const t = (y - topY) / 6;
    const halfW = Math.max(4, roundInt(headHalfW * (1.15 - t * 0.35)));
    const sweep = (direction === 'west' || direction === 'north') ? -2 : 2;
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      const isStreak = dx === sweep || (dx === sweep + Math.sign(sweep) && y % 2 === 0);
      cells.push({ x: cx + dx, y, color: isStreak ? streak : color });
    }
  }

  // === COMET WINGS / ENERGY FINS (Starbound Esper signature) ===
  // Professional pixel art notes:
  // - Clean taper + directional sweep so they read as wings/energy at 1x, not blobs or shoulder pads.
  // - 1px tips and deliberate steps for delicacy and motion.
  // - Streak accents (neon energy "veins") on structural pixels so after the foundry shading pass (rim/deep/frost logic)
  //   the wings retain bright readable core instead of flattening or pillowing into the hair ramp.
  // - Tuned Y offsets + widths to attach at the head-to-torso transition without tangents to jacket or arms.
  // - Consistent left/right symmetry and facing-aware sweep.
  if (direction === 'south') {
    // South: only wing tips visible on upper sides. Small, swept, elegant.
    const wingStartY = topY + 9;
    const wingRows = [
      { dxs: [6, 7], useStreak: [7] },
      { dxs: [7, 8], useStreak: [7] },
      { dxs: [7, 8], useStreak: [] },
      { dxs: [8], useStreak: [8] },
    ];
    for (let r = 0; r < wingRows.length; r += 1) {
      const y = wingStartY + r;
      for (const dx of wingRows[r].dxs) {
        const useS = wingRows[r].useStreak.includes(dx);
        cells.push({ x: cx + dx, y, color: useS ? streak : color });
        cells.push({ x: cx - dx, y, color: useS ? streak : color });
      }
    }
  } else if (direction === 'north') {
    // North (back): wings dominant feature. Stepped flare + taper for true wing silhouette.
    // Inner streak lines provide energy structure that the shading ramp will turn into highlights.
    const wingStartY = topY + 9;
    const wingRows = [
      { hw: 3, streaks: [] },
      { hw: 5, streaks: [3] },
      { hw: 7, streaks: [3, 5] },
      { hw: 8, streaks: [4] },
      { hw: 7, streaks: [3] },
      { hw: 5, streaks: [] },
      { hw: 3, streaks: [] },
      { hw: 2, streaks: [] },
    ];
    for (let r = 0; r < wingRows.length; r += 1) {
      const { hw, streaks } = wingRows[r];
      const y = wingStartY + r;
      for (let dx = -hw; dx <= hw; dx += 1) {
        const absD = Math.abs(dx);
        const isStreak = streaks.includes(absD);
        cells.push({ x: cx + dx, y, color: isStreak ? streak : color });
      }
    }
  } else {
    // Profile (east/west): thin, elegant, back-swept single fin. Distinct from torso, good side read.
    const sign = direction === 'east' ? 1 : -1;
    const finStartY = topY + 9;
    const finProfile = [
      [2], [2, 3], [3], [3], [2, 3], [2],
    ];
    for (let r = 0; r < finProfile.length; r += 1) {
      const y = finStartY + r;
      for (const d of finProfile[r]) {
        cells.push({ x: cx + sign * d, y, color });
      }
    }
  }

  return {
    cells,
    anchors: { base: { x: cx, y: topY }, top: { x: cx, y: topY } },
  };
});
