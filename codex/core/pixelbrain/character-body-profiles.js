import { registerPartProfile } from './part-profile-library.js';

const CW = 32;
const CH = 48;

function roundInt(v) {
  return Math.round(Number(v) || 0);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function buildSkeleton(headTop, headCenter, headChin, eyeL, eyeR, nose, mouth, earL, earR, shoulderL, shoulderR, hipL, hipR, kneeL, kneeR, ankleL, ankleR) {
  return {
    head: { top: headTop, center: headCenter, chin: headChin },
    face: { eyeLeft: eyeL, eyeRight: eyeR, nose, mouth, earLeft: earL, earRight: earR },
    torso: { shoulderL, shoulderR, hipL, hipR },
    legs: { kneeL, kneeR, ankleL, ankleR },
  };
}

function bodyCells_south(params) {
  const { heightScale = 1, widthScale = 1 } = params;
  const cells = [];
  const hs = clamp(heightScale, 0.85, 1.15);
  const ws = clamp(widthScale, 0.85, 1.3);

  // Read height offsets from params or compute from scale
  const headTopY = roundInt(2 * hs);
  const headBotY = roundInt(10 * hs);
  const headMidY = roundInt((headTopY + headBotY) / 2);
  const headCx = roundInt(CW / 2);
  const headHalfW = roundInt(4 * ws);

  // Head (oval)
  for (let y = headTopY; y <= headBotY; y += 1) {
    const t = (y - headTopY) / Math.max(1, headBotY - headTopY);
    const halfW = Math.max(2, roundInt(headHalfW * Math.sin(Math.PI * (t + 0.08))));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  // Neck
  const neckTop = headBotY;
  const neckBot = roundInt(12 * hs);
  const neckHalfW = Math.max(1, roundInt(2 * ws));
  for (let y = neckTop; y <= neckBot; y += 1) {
    for (let dx = -neckHalfW; dx <= neckHalfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  // Torso (shoulders → waist)
  const shoulderY = neckBot;
  const waistY = roundInt(24 * hs);
  const shoulderHalfW = Math.max(3, roundInt(7 * ws));
  const waistHalfW = Math.max(2, roundInt(4 * ws));
  for (let y = shoulderY; y <= waistY; y += 1) {
    const t = (y - shoulderY) / Math.max(1, waistY - shoulderY);
    const halfW = Math.round(shoulderHalfW + (waistHalfW - shoulderHalfW) * t);
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  // Arms
  const armTop = shoulderY + 1;
  const armBot = roundInt(28 * hs);
  const armHalfW = Math.max(1, roundInt(1.5 * ws));
  for (const side of [-1, 1]) {
    const ax = headCx + side * shoulderHalfW - side * armHalfW;
    for (let y = armTop; y <= armBot; y += 1) {
      const t = (y - armTop) / Math.max(1, armBot - armTop);
      const sway = roundInt(2 * ws * Math.sin(t * Math.PI * 0.5));
      for (let dx = -armHalfW; dx <= armHalfW; dx += 1) {
        cells.push({ x: ax + sway + dx, y });
      }
    }
  }

  // Legs
  const legTop = waistY;
  const legBot = roundInt(40 * hs);
  const legHalfW = Math.max(1, roundInt(2 * ws));
  const legGap = roundInt(2 * ws);
  for (const side of [-1, 1]) {
    const lx = headCx + side * legGap + side * legHalfW;
    for (let y = legTop; y <= legBot; y += 1) {
      for (let dx = -legHalfW; dx <= legHalfW; dx += 1) {
        cells.push({ x: lx + dx, y });
      }
    }
  }

  // Feet
  const footTop = legBot;
  const footBot = roundInt(44 * hs);
  const footHalfW = Math.max(2, roundInt(3 * ws));
  for (const side of [-1, 1]) {
    const fx = headCx + side * legGap;
    for (let y = footTop; y <= footBot; y += 1) {
      for (let dx = -footHalfW; dx <= footHalfW; dx += 1) {
        cells.push({ x: fx + dx, y });
      }
    }
  }

  return {
    cells,
    headCx,
    headMidY,
    headTopY,
    headBotY,
    shoulderY,
    shoulderHalfW,
    waistY,
    waistHalfW,
    legTop,
    legBot,
    legGap,
    legHalfW,
    footBot,
    armBot,
  };
}

function bodyCells_east(params) {
  const { heightScale = 1, widthScale = 1 } = params;
  const cells = [];
  const hs = clamp(heightScale, 0.85, 1.15);
  const ws = clamp(widthScale, 0.85, 1.3);

  const headTopY = roundInt(2 * hs);
  const headBotY = roundInt(10 * hs);
  const headCx = roundInt(CW * 0.55);
  const headHalfW = roundInt(3 * ws);

  // Head (profile - narrower)
  for (let y = headTopY; y <= headBotY; y += 1) {
    const t = (y - headTopY) / Math.max(1, headBotY - headTopY);
    const halfW = Math.max(2, roundInt(headHalfW * Math.sin(Math.PI * (t + 0.08))));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  // Neck
  const neckBot = roundInt(12 * hs);
  for (let y = headBotY; y <= neckBot; y += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  // Torso
  const shoulderY = neckBot;
  const waistY = roundInt(24 * hs);
  const shoulderHalfW = Math.max(3, roundInt(5 * ws));
  const waistHalfW = Math.max(2, roundInt(3 * ws));
  const torsoCx = headCx;
  for (let y = shoulderY; y <= waistY; y += 1) {
    const t = (y - shoulderY) / Math.max(1, waistY - shoulderY);
    const halfW = Math.round(shoulderHalfW + (waistHalfW - shoulderHalfW) * t);
    for (let dx = 0; dx <= halfW; dx += 1) {
      cells.push({ x: torsoCx + dx, y });
    }
  }

  // Arm (right side, visible in profile)
  const armTop = shoulderY + 1;
  const armBot = roundInt(28 * hs);
  for (let y = armTop; y <= armBot; y += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      cells.push({ x: torsoCx + shoulderHalfW + dx, y });
    }
  }

  // Legs
  const legTop = waistY;
  const legBot = roundInt(40 * hs);
  const legCx = torsoCx;
  for (let y = legTop; y <= legBot; y += 1) {
    for (let dx = -roundInt(2 * ws); dx <= roundInt(2 * ws); dx += 1) {
      cells.push({ x: legCx + dx, y });
    }
  }

  // Feet
  for (let y = legBot; y <= roundInt(44 * hs); y += 1) {
    for (let dx = -roundInt(3 * ws); dx <= roundInt(3 * ws); dx += 1) {
      cells.push({ x: legCx + dx, y });
    }
  }

  return { cells, headCx, headMidY: roundInt((headTopY + headBotY) / 2), headTopY, headBotY, shoulderY, shoulderHalfW, waistY, legTop, legBot, torsoCx };
}

function bodyCells_north(params) {
  // North = back view, similar to south but without face features
  const { heightScale = 1, widthScale = 1 } = params;
  const cells = [];
  const hs = clamp(heightScale, 0.85, 1.15);
  const ws = clamp(widthScale, 0.85, 1.3);

  const headTopY = roundInt(2 * hs);
  const headBotY = roundInt(10 * hs);
  const headCx = roundInt(CW / 2);
  const headHalfW = roundInt(4 * ws);

  for (let y = headTopY; y <= headBotY; y += 1) {
    const t = (y - headTopY) / Math.max(1, headBotY - headTopY);
    const halfW = Math.max(2, roundInt(headHalfW * Math.sin(Math.PI * (t + 0.08))));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  const neckBot = roundInt(12 * hs);
  for (let y = headBotY; y <= neckBot; y += 1) {
    for (let dx = -roundInt(2 * ws); dx <= roundInt(2 * ws); dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  const shoulderY = neckBot;
  const waistY = roundInt(24 * hs);
  const shoulderHalfW = Math.max(3, roundInt(7 * ws));
  const waistHalfW = Math.max(2, roundInt(4 * ws));
  for (let y = shoulderY; y <= waistY; y += 1) {
    const t = (y - shoulderY) / Math.max(1, waistY - shoulderY);
    const halfW = Math.round(shoulderHalfW + (waistHalfW - shoulderHalfW) * t);
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      cells.push({ x: headCx + dx, y });
    }
  }

  const armBot = roundInt(28 * hs);
  for (const side of [-1, 1]) {
    for (let y = shoulderY + 1; y <= armBot; y += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        cells.push({ x: headCx + side * shoulderHalfW + dx, y });
      }
    }
  }

  const legTop = waistY;
  const legBot = roundInt(40 * hs);
  const legHalfW = Math.max(1, roundInt(2 * ws));
  const legGap = roundInt(2 * ws);
  for (const side of [-1, 1]) {
    const lx = headCx + side * legGap + side * legHalfW;
    for (let y = legTop; y <= legBot; y += 1) {
      for (let dx = -legHalfW; dx <= legHalfW; dx += 1) {
        cells.push({ x: lx + dx, y });
      }
    }
  }

  const footBot = roundInt(44 * hs);
  for (const side of [-1, 1]) {
    const fx = headCx + side * legGap;
    for (let y = legBot; y <= footBot; y += 1) {
      for (let dx = -roundInt(3 * ws); dx <= roundInt(3 * ws); dx += 1) {
        cells.push({ x: fx + dx, y });
      }
    }
  }

  return { cells, headCx, headMidY: roundInt((headTopY + headBotY) / 2), headTopY, headBotY, shoulderY, shoulderHalfW, waistY, legTop, legBot };
}

function makeBodyProfile(type) {
  return (params = {}, options = {}) => {
    const direction = String(options.direction || 'south');
    const heightClass = String(params.heightClass || 'average');
    const buildClass = String(params.buildClass || 'average');

    const heightScale = heightClass === 'short' ? 0.9 : heightClass === 'tall' ? 1.1 : 1;
    const widthScale = buildClass === 'slender' ? 0.85 : buildClass === 'stocky' ? 1.2 : 1;

    const typeScale = type === 'masculine' ? 1.05 : type === 'androgynous' ? 1 : 1;

    const effectiveWS = widthScale * typeScale;
    const effectiveHS = heightScale;

    const bodyParams = { heightScale: effectiveHS, widthScale: effectiveWS };

    let result;
    if (direction === 'east' || direction === 'west') {
      result = bodyCells_east(bodyParams);
    } else if (direction === 'north') {
      result = bodyCells_north(bodyParams);
    } else {
      result = bodyCells_south(bodyParams);
    }

    const cells = result.cells;
    const hc = result.headCx !== undefined ? result.headCx : roundInt(CW / 2);
    const hm = result.headMidY !== undefined ? result.headMidY : roundInt(6 * effectiveHS);
    const ht = result.headTopY !== undefined ? result.headTopY : roundInt(2 * effectiveHS);
    const hb = result.headBotY !== undefined ? result.headBotY : roundInt(10 * effectiveHS);
    const sy = result.shoulderY !== undefined ? result.shoulderY : roundInt(12 * effectiveHS);
    const sw = result.shoulderHalfW !== undefined ? result.shoulderHalfW : roundInt(7 * effectiveWS);
    const wy = result.waistY !== undefined ? result.waistY : roundInt(24 * effectiveHS);
    const lt = result.legTop !== undefined ? result.legTop : roundInt(24 * effectiveHS);
    const lb = result.legBot !== undefined ? result.legBot : roundInt(40 * effectiveHS);
    const lg = result.legGap !== undefined ? result.legGap : roundInt(2 * effectiveWS);
    const lhw = result.legHalfW !== undefined ? result.legHalfW : roundInt(2 * effectiveWS);
    const fb = result.footBot !== undefined ? result.footBot : roundInt(44 * effectiveHS);

    let eyeL, eyeR, nose, mouth, earL, earR;
    if (direction !== 'north') {
      if (direction === 'east' || direction === 'west') {
        const eo = direction === 'west' ? -1 : 1;
        eyeL = { x: hc + eo, y: hm };
        eyeR = null;
        nose = { x: hc + eo * 2, y: hm + 2 };
        mouth = { x: hc + eo, y: hm + 3 };
        earL = { x: hc - 2, y: hm };
        earR = null;
      } else {
        eyeL = { x: hc - 2, y: hm };
        eyeR = { x: hc + 2, y: hm };
        nose = { x: hc, y: hm + 2 };
        mouth = { x: hc, y: hm + 3 };
        earL = { x: hc - 4, y: hm + 1 };
        earR = { x: hc + 4, y: hm + 1 };
      }
    } else {
      eyeL = null; eyeR = null; nose = null; mouth = null; earL = null; earR = null;
    }

    const skeleton = buildSkeleton(
      { x: hc, y: ht },
      { x: hc, y: hm },
      { x: hc, y: hb },
      eyeL, eyeR, nose, mouth, earL, earR,
      { x: hc - sw, y: sy },
      { x: hc + sw, y: sy },
      { x: hc - lg - lhw, y: wy },
      { x: hc + lg + lhw, y: wy },
      { x: hc - lg - lhw, y: roundInt((wy + lb) / 2) },
      { x: hc + lg + lhw, y: roundInt((wy + lb) / 2) },
      { x: hc - lg - lhw, y: fb - 2 },
      { x: hc + lg + lhw, y: fb - 2 },
    );

    return {
      cells,
      anchors: {
        base: { x: hc, y: fb },
        tip: { x: hc, y: ht },
        center: { x: hc, y: roundInt(CH / 2) },
        headTop: skeleton.head.top,
        headCenter: skeleton.head.center,
        headChin: skeleton.head.chin,
        ...Object.fromEntries(
          Object.entries(skeleton.face).filter(([_, v]) => v !== null).map(([k, v]) => [k, v])
        ),
        ...Object.fromEntries(
          Object.entries(skeleton.torso).map(([k, v]) => [k, v])
        ),
        ...Object.fromEntries(
          Object.entries(skeleton.legs).map(([k, v]) => [k, v])
        ),
      },
      skeleton,
    };
  };
}

registerPartProfile('character.body.human.feminine', makeBodyProfile('feminine'));
registerPartProfile('character.body.human.masculine', makeBodyProfile('masculine'));
registerPartProfile('character.body.human.androgynous', makeBodyProfile('androgynous'));
