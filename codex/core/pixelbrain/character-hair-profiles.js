import { registerPartProfile } from './part-profile-library.js';

function roundInt(v) {
  return Math.round(Number(v) || 0);
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

  if (direction === 'south') {
    for (let dy = 1; dy <= 10; dy += 1) {
      const extW = roundInt(headHalfW * 1.3);
      for (let dx = -extW; dx <= -headHalfW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
      for (let dx = headHalfW; dx <= extW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
    }
    for (let dy = 11; dy <= 16; dy += 1) {
      const extW = roundInt(headHalfW * 1.0);
      for (let dx = -extW; dx <= -headHalfW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
      for (let dx = headHalfW; dx <= extW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
    }
  } else if (direction === 'north') {
    for (let dy = 1; dy <= 14; dy += 1) {
      const extW = roundInt(headHalfW * 1.2);
      for (let dx = -extW; dx <= -headHalfW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
      for (let dx = headHalfW; dx <= extW; dx += 1) {
        cells.push({ x: cx + dx, y: topY + 5 + dy, ...(color ? { color } : {}) });
      }
    }
  } else {
    // east/west: hair falls on visible side
    const sideDir = direction === 'east' ? 1 : -1;
    for (let dy = 1; dy <= 12; dy += 1) {
      cells.push({ x: cx + sideDir * roundInt(headHalfW * 1.3), y: topY + 5 + dy, ...(color ? { color } : {}) });
      cells.push({ x: cx + sideDir * roundInt(headHalfW * 1.3) + sideDir, y: topY + 5 + dy, ...(color ? { color } : {}) });
    }
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
