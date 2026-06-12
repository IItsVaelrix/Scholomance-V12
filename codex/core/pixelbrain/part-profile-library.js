/**
 * PART PROFILE LIBRARY — parametric archetypes for any item part.
 *
 * A profile is a pure function `(params, options) -> { cells, anchors }` that
 * emits its part's occupancy in a PART-LOCAL coordinate system and declares
 * named attachment points the silhouette-composer can align against a parent.
 *
 * The library is open: callers register new profiles via `registerPartProfile`
 * (used by tests and by future Foundry extensions). Built-in profiles cover
 * every shape the existing scimitar, sword, and amulet scripts emitted.
 *
 * Contract:
 *   cells:   Array<{ x: number, y: number }>  (part-local, integer)
 *   anchors: Object<string, { x: number, y: number }>  (part-local)
 *
 * Profiles MUST be deterministic (no Math.random; the test in item-foundry
 * verifies the QUANT-0101 invariant) and emit only cells within the part's
 * declared width/height. Composers are responsible for connectivity and
 * bridging; profiles are responsible for occupancy and anchor declaration.
 */

import { hashString } from './shared.js';

const REGISTRY = Object.create(null);

export function registerPartProfile(id, profile) {
  if (typeof id !== 'string' || !id) {
    throw new Error('registerPartProfile: id must be a non-empty string');
  }
  if (typeof profile !== 'function') {
    throw new Error('registerPartProfile: profile must be a function');
  }
  REGISTRY[id] = profile;
  return REGISTRY[id];
}

export function getPartProfile(id) {
  const profile = REGISTRY[id];
  if (!profile) {
    throw new Error(`Part profile "${id}" is not registered. Call registerPartProfile() or use a built-in.`);
  }
  return profile;
}

export function listPartProfiles() {
  return Object.freeze(Object.keys(REGISTRY));
}

function roundInt(value) {
  return Math.round(Number(value) || 0);
}

// ── Built-in profiles ──────────────────────────────────────────────────

// BLADE — straight centerline with parametric half-width.
registerPartProfile('blade.straight', (params = {}, options = {}) => {
  const { width, height } = options;
  const span = Array.isArray(params.span) && params.span.length === 2
    ? [roundInt(params.span[0]), roundInt(params.span[1])]
    : [0, Math.max(1, (height || 96) - 1)];
  const cells = [];
  const cx = roundInt(params.cx ?? 0); // straight: cx doesn't curve
  // Anchors must sit on the centerline (cx), matching blade.curved —
  // anchors at x:0 placed attached parts off the blade entirely.
  const anchors = { base: { x: cx, y: span[1] }, tip: { x: cx, y: span[0] } };
  for (let y = span[0]; y <= span[1]; y += 1) {
    const half = pickBladeHalfWidth(y, params);
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }
  return { cells, anchors };
});

// BLADE — curved centerline (scimitar sweep). Half-width follows a yelman
// belly: thin tip → wide belly → narrows back near the guard.
registerPartProfile('blade.curved', (params = {}, options = {}) => {
  const { width, height } = options;
  const cxBase = roundInt(params.cx ?? 0);
  const sweep = Number(params.sweep) || 0;
  const span = Array.isArray(params.span) && params.span.length === 2
    ? [roundInt(params.span[0]), roundInt(params.span[1])]
    : [0, Math.max(1, (height || 96) - 1)];
  const cells = [];
  const anchors = { base: { x: cxBase, y: span[1] }, tip: { x: cxBase, y: span[0] } };
  const spanLen = Math.max(1, span[1] - span[0]);
  for (let y = span[0]; y <= span[1]; y += 1) {
    const t = (span[1] - y) / spanLen;
    const cx = cxBase + Math.round(sweep * options.width * t * t);
    const half = pickBladeHalfWidth(y, params);
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }
  return { cells, anchors };
});

// GUARD — marquise polygon (diamond bezel), centered on (0,0), built in
// part-local Y in [0, height]. Anchors base (top, attach-to-blade) and
// tip (bottom, attach-to-grip).
registerPartProfile('guard.marquise', (params = {}, options = {}) => {
  const profile = params.profile && typeof params.profile === 'object' ? params.profile : null;
  const halfAt = profile
    ? profile
    : { 0: 3, 1: 5, 2: 7, 3: 8, 4: 8, 5: 7, 6: 5, 7: 3 };
  const cx = roundInt(params.cx ?? 0);
  const cells = [];
  const yKeys = Object.keys(halfAt).map((k) => Number(k)).sort((a, b) => a - b);
  for (const y of yKeys) {
    const half = roundInt(halfAt[y]);
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }
  return {
    cells,
    anchors: {
      base: { x: cx, y: yKeys[0] ?? 0 },
      tip: { x: cx, y: yKeys[yKeys.length - 1] ?? 0 },
    },
  };
});

// GUARD — straight crossguard (sword), full width with optional quillons.
registerPartProfile('guard.cross', (params = {}, options = {}) => {
  const width = options.width || 32;
  const cx = roundInt(params.cx ?? width / 2);
  const halfBase = roundInt(params.halfBase ?? Math.floor(width * 0.4));
  const height = roundInt(params.height ?? 6);
  const quillonTip = roundInt(params.quillonTip ?? 1);
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    const isEdge = y === 0 || y === height - 1;
    const half = isEdge ? halfBase - 1 : halfBase;
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
    if (!isEdge && quillonTip > 0) {
      cells.push({ x: cx - halfBase - 1, y });
      cells.push({ x: cx + halfBase + 1, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: 0 }, tip: { x: cx, y: height - 1 } },
  };
});

// GRIP — uniform 3-wide handle with metal rings at top and bottom.
registerPartProfile('grip.uniform', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const half = roundInt(params.half ?? 1);
  const height = roundInt(params.height ?? 18);
  const ringRows = roundInt(params.ringRows ?? 2);
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    const inRing = y < ringRows || y >= height - ringRows;
    const localHalf = inRing ? half + 1 : half;
    for (let dx = -localHalf; dx <= localHalf; dx += 1) cells.push({ x: cx + dx, y });
  }
  return {
    cells,
    anchors: { base: { x: cx, y: 0 }, tip: { x: cx, y: height - 1 } },
  };
});

// GRIP — wrapped handle with periodic flares (scimitar cord wrap).
registerPartProfile('grip.wrapped', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const half = roundInt(params.half ?? 1);
  const height = roundInt(params.height ?? 18);
  const flarePeriod = roundInt(params.flarePeriod ?? 3);
  const cells = [];
  for (let y = 0; y < height; y += 1) {
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
    if (y % flarePeriod === 0) {
      cells.push({ x: cx - half - 1, y });
      cells.push({ x: cx + half + 1, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: 0 }, tip: { x: cx, y: height - 1 } },
  };
});

// POMMEL — symmetric gem polygon. The profile is a per-row half-width map.
registerPartProfile('pommel.gem', (params = {}, options = {}) => {
  const profile = params.profile && typeof params.profile === 'object' ? params.profile : null;
  const halfAt = profile
    ? profile
    : { 0: 1, 1: 2, 2: 3, 3: 4, 4: 4, 5: 4, 6: 3, 7: 2, 8: 1, 9: 1 };
  const cx = roundInt(params.cx ?? 0);
  const cells = [];
  const yKeys = Object.keys(halfAt).map((k) => Number(k)).sort((a, b) => a - b);
  for (const y of yKeys) {
    const half = roundInt(halfAt[y]);
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }
  return {
    cells,
    anchors: { base: { x: cx, y: 0 }, tip: { x: cx, y: yKeys[yKeys.length - 1] ?? 0 } },
  };
});

// POMMEL — round cap with hemicircle profile (rounded bottom).
registerPartProfile('pommel.round', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const radius = roundInt(params.radius ?? 4);
  const cells = [];
  for (let y = 0; y <= radius * 2; y += 1) {
    const ny = (y - radius) / radius;
    const half = Math.max(0, Math.round(radius * Math.sqrt(Math.max(0, 1 - ny * ny))));
    for (let dx = -half; dx <= half; dx += 1) cells.push({ x: cx + dx, y });
  }
  return {
    cells,
    anchors: { base: { x: cx, y: 0 }, tip: { x: cx, y: radius * 2 } },
  };
});

// RING — radial band (closed circle at given radius, hollow).
registerPartProfile('ring.band', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const radius = roundInt(params.radius ?? 8);
  const inner = roundInt(params.inner ?? radius - 2);
  const cells = [];
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius && d >= inner) cells.push({ x, y });
    }
  }
  return {
    cells,
    anchors: { center: { x: cx, y: cy }, edge: { x: cx, y: cy - radius } },
  };
});

// SPIKE — radial arm extending from origin to tip at given angle.
registerPartProfile('spike.radial', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const angle = Number(params.angle) || 0;
  const baseR = roundInt(params.baseR ?? 0);
  const tipR = roundInt(params.tipR ?? 10);
  const baseHalfWidth = roundInt(params.baseHalfWidth ?? 2);
  const cells = [];
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  // 3-vertex triangle: two base vertices + tip
  const baseLeftX = Math.round(cx + cosA * baseR - sinA * baseHalfWidth);
  const baseLeftY = Math.round(cy + sinA * baseR + cosA * baseHalfWidth);
  const baseRightX = Math.round(cx + cosA * baseR + sinA * baseHalfWidth);
  const baseRightY = Math.round(cy + sinA * baseR - cosA * baseHalfWidth);
  const tipX = Math.round(cx + cosA * tipR);
  const tipY = Math.round(cy + sinA * tipR);
  // Scanline-fill the triangle in cell space (deterministic, integer-only).
  const minY = Math.min(baseLeftY, baseRightY, tipY);
  const maxY = Math.max(baseLeftY, baseRightY, tipY);
  const edges = [[baseLeftX, baseLeftY, tipX, tipY], [baseRightX, baseRightY, tipX, tipY], [baseLeftX, baseLeftY, baseRightX, baseRightY]];
  for (let y = minY; y <= maxY; y += 1) {
    const xs = [];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        const t = (y - ay) / (by - ay);
        xs.push(ax + t * (bx - ax));
      }
    }
    if (xs.length >= 2) {
      const xL = Math.min(...xs);
      const xR = Math.max(...xs);
      for (let x = Math.ceil(xL); x <= Math.floor(xR); x += 1) cells.push({ x, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: baseLeftX + Math.round((baseRightX - baseLeftX) / 2), y: Math.round((baseLeftY + baseRightY) / 2) }, tip: { x: tipX, y: tipY } },
  };
});

// VIRTUAL — no geometry of its own. Used for parts whose cells are assigned
// by a later stage (e.g. heraldry emblems retag face cells to this part so
// region-fill colors them with the virtual part's material).
registerPartProfile('none', () => ({
  cells: [],
  anchors: { base: { x: 0, y: 0 }, tip: { x: 0, y: 0 }, center: { x: 0, y: 0 } },
}));

// GEM — solid ellipse.
registerPartProfile('gem.ellipse', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const rx = roundInt(params.rx ?? 4);
  const ry = roundInt(params.ry ?? 4);
  const cells = [];
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const d = Math.hypot((x - cx) / Math.max(1, rx), (y - cy) / Math.max(1, ry));
      if (d <= 1) cells.push({ x, y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// GEM.ROUND
registerPartProfile('gem.round', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 6);
  const cells = [];
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x*x + y*y <= r*r) cells.push({ x: cx + x, y: cy + y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// GEM.OVAL
registerPartProfile('gem.oval', (params = {}, options = {}) => {
  return getPartProfile('gem.ellipse')(params, options);
});

// GEM.SQUARE
registerPartProfile('gem.square', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const size = roundInt(params.size ?? 6);
  const cells = [];
  for (let y = -size; y <= size; y += 1) {
    for (let x = -size; x <= size; x += 1) {
      cells.push({ x: cx + x, y: cy + y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// GEM.EMERALD-CUT
registerPartProfile('gem.emerald-cut', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const rx = roundInt(params.rx ?? 4);
  const ry = roundInt(params.ry ?? 6);
  const corner = roundInt(params.corner ?? 2);
  const cells = [];
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if (Math.abs(x) + Math.abs(y) <= (rx + ry - corner)) {
         cells.push({ x: cx + x, y: cy + y });
      }
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// FRAME.OVAL
registerPartProfile('frame.oval', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? (options.width ? options.width / 2 : 0));
  const cy = roundInt(params.cy ?? (options.height ? options.height / 2 : 0));
  const rx = roundInt(params.rx ?? 26);
  const ry = roundInt(params.ry ?? 28);
  const cells = [];
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if (Math.hypot(x / Math.max(1, rx), y / Math.max(1, ry)) <= 1) {
        cells.push({ x: cx + x, y: cy + y });
      }
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});

// BAIL
registerPartProfile('bail', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? (options.width ? options.width / 2 : 0));
  const cy = roundInt(params.y ?? 14);
  const rOuter = roundInt(params.rOuter ?? 11);
  const rInner = roundInt(params.rInner ?? 8);
  const cells = [];
  for (let y = cy - rOuter; y <= cy + rOuter; y += 1) {
    for (let x = cx - rOuter; x <= cx + rOuter; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rOuter && d >= rInner) cells.push({ x, y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy }, base: { x: cx, y: cy + rOuter } } };
});

// SPIRE
registerPartProfile('spire', (params = {}, options = {}) => {
  return getPartProfile('spike.radial')(params, options);
});

// BAND
registerPartProfile('band', (params = {}, options = {}) => {
  return getPartProfile('ring.band')(params, options);
});

// CHAIN.LINK
registerPartProfile('chain.link', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const rOuter = roundInt(params.rOuter ?? 4);
  const rInner = roundInt(params.rInner ?? 2);
  const cells = [];
  for (let y = cy - rOuter; y <= cy + rOuter; y += 1) {
    for (let x = cx - rOuter; x <= cx + rOuter; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rOuter && d >= rInner) cells.push({ x, y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy }, top: { x: cx, y: cy - rOuter }, bottom: { x: cx, y: cy + rOuter } } };
});

// SETTING.PRONG and SETTING.BEZEL
registerPartProfile('setting.prong', (params, options) => getPartProfile('none')(params, options));
registerPartProfile('setting.bezel', (params, options) => getPartProfile('none')(params, options));

// ── Helpers ────────────────────────────────────────────────────────────

function pickBladeHalfWidth(canvasY, params) {
  if (typeof params.halfWidthAt === 'function') return roundInt(params.halfWidthAt(canvasY));
  // Default scimitar profile, expressed in canvas-y coordinates (matches
  // the scimitar's bladeHalfWidth(y) exactly so the byte-identical
  // reproduction bar holds). Spec authors can pass `halfWidthAt` for any
  // other blade shape.
  const y = roundInt(canvasY);
  if (y <= 1) return 0;
  if (y <= 4) return 1;
  if (y <= 12) return 2;
  if (y <= 15) return 3;
  if (y <= 24) return roundInt(params.belly ?? 4);
  if (y <= 45) return 3;
  return 2;
}

// ── Deterministic jitter (used by motif-engraver) ──────────────────────

export function seededJitter(seed, segment, magnitude) {
  // Stable 2D hash → [-magnitude, +magnitude] offset, NO Math.random.
  const h = hashString(`${seed}::${segment}`);
  const norm = (h / 0xffffffff) - 0.5;
  return norm * 2 * magnitude;
}
