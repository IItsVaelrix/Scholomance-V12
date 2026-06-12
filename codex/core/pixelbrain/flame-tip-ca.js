import { clamp01, clampNumber, hashString } from './shared.js';
import { resolveMaterialId, SOURCE_MATERIAL } from './material-registry.js';

export const FLAME_TIP_CA_ID = 'pixelbrain.flame-tip-ca';
export const FLAME_TIP_CA_VERSION = '1.0.0';

const DEFAULT_OPTIONS = Object.freeze({
  enabled: true,
  iterations: 4,
  topRegionFraction: 0.42,
  paddingCells: 1,
  preserveCore: true,
  apexPruneRadius: 0,
  birthSet: [3, 5, 6, 7, 8],
  survivalSet: [3, 4, 5, 6, 7],
  taperBias: 0.62,
  neighborWeight: 1.0,
  diagonalWeight: 0.85,
  whiteCoreLuminance: 0.9,
  sourceConservative: true,
});

const MATERIAL_CA_PROFILES = Object.freeze({
  icy_fire: Object.freeze({
    iterations: 4,
    taperBias: 0.72,
    apexPruneRadius: 0,
  }),
  void_ice: Object.freeze({
    iterations: 5,
    taperBias: 0.78,
    apexPruneRadius: 0,
  }),
  holy_fire: Object.freeze({
    iterations: 4,
    taperBias: 0.6,
    apexPruneRadius: 1,
  }),
  shadow_fire: Object.freeze({
    iterations: 3,
    taperBias: 0.5,
    apexPruneRadius: 1,
  }),
  poison_flame: Object.freeze({
    iterations: 4,
    taperBias: 0.6,
    apexPruneRadius: 0,
  }),
});

const NEIGHBOR_OFFSETS = Object.freeze([
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
]);

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function coordinateKey(coord) {
  const x = Math.round(toFiniteNumber(coord?.snappedX ?? coord?.x, 0));
  const y = Math.round(toFiniteNumber(coord?.snappedY ?? coord?.y, 0));
  return `${x},${y}`;
}

function parseHexColor(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((char) => `${char}${char}`).join('')
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminance(rgb) {
  if (!rgb) return 0;
  return clamp01(((0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b)) / 255);
}

function resolveOptions(options = {}, materialProfile = null) {
  const profileDefaults = materialProfile
    ? {
        iterations: materialProfile.iterations,
        taperBias: materialProfile.taperBias,
        apexPruneRadius: materialProfile.apexPruneRadius,
      }
    : {};
  return Object.freeze({
    ...DEFAULT_OPTIONS,
    ...profileDefaults,
    ...options,
    iterations: Math.max(0, Math.round(toFiniteNumber(options.iterations, profileDefaults.iterations ?? DEFAULT_OPTIONS.iterations))),
    topRegionFraction: clampNumber(toFiniteNumber(options.topRegionFraction, DEFAULT_OPTIONS.topRegionFraction), 0.05, 0.9),
    paddingCells: Math.max(0, Math.round(toFiniteNumber(options.paddingCells, DEFAULT_OPTIONS.paddingCells))),
    taperBias: clamp01(toFiniteNumber(options.taperBias, profileDefaults.taperBias ?? DEFAULT_OPTIONS.taperBias)),
    apexPruneRadius: Math.max(0, Math.round(toFiniteNumber(options.apexPruneRadius, profileDefaults.apexPruneRadius ?? 0))),
  });
}

function resolveMaterialProfile(material) {
  return MATERIAL_CA_PROFILES[resolveMaterialId(material)] || null;
}

function computeBoundingBox(coordinates) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const coord of coordinates) {
    if (!coord || typeof coord !== 'object') continue;
    const x = Math.round(toFiniteNumber(coord.snappedX ?? coord.x, 0));
    const y = Math.round(toFiniteNumber(coord.snappedY ?? coord.y, 0));
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function buildGrid(coordinates, regionYMin, regionYMax, paddingCells) {
  const cellsByKey = new Map();
  for (const coord of coordinates) {
    if (!coord || typeof coord !== 'object') continue;
    const x = Math.round(toFiniteNumber(coord.snappedX ?? coord.x, 0));
    const y = Math.round(toFiniteNumber(coord.snappedY ?? coord.y, 0));
    if (y < regionYMin || y > regionYMax) continue;
    cellsByKey.set(`${x},${y}`, coord);
  }

  let gridMinX = Infinity;
  let gridMaxX = -Infinity;
  for (const key of cellsByKey.keys()) {
    const [xs] = key.split(',');
    const x = Number(xs);
    if (x < gridMinX) gridMinX = x;
    if (x > gridMaxX) gridMaxX = x;
  }
  if (!Number.isFinite(gridMinX)) {
    return null;
  }

  const originX = gridMinX - paddingCells;
  const originY = regionYMin;
  const gridWidth = (gridMaxX - gridMinX + 1) + (paddingCells * 2);
  const gridHeight = (regionYMax - regionYMin + 1);

  const alive = new Uint8Array(gridWidth * gridHeight);
  const cells = new Array(gridWidth * gridHeight);
  const centerlineByY = new Map();
  const rows = new Map();

  for (const [key, coord] of cellsByKey.entries()) {
    const [xs, ys] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const gx = x - originX;
    const gy = y - originY;
    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) continue;
    const idx = gy * gridWidth + gx;
    alive[idx] = 1;
    cells[idx] = coord;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(x);
  }

  for (const [y, xs] of rows.entries()) {
    let sumX = 0;
    for (const x of xs) sumX += x;
    centerlineByY.set(y, sumX / xs.length);
  }

  return Object.freeze({
    alive,
    cells,
    rows,
    centerlineByY,
    originX,
    originY,
    width: gridWidth,
    height: gridHeight,
    regionYMin,
    regionYMax,
  });
}

function countNeighbors(alive, width, height, gx, gy, diagonalWeight) {
  let cardinal = 0;
  let diagonal = 0;
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (alive[ny * width + nx] === 1) {
      if (dx === 0 || dy === 0) cardinal += 1;
      else diagonal += 1;
    }
  }
  return cardinal + (diagonal * diagonalWeight);
}

function stepGrid(grid, options, apexPrune) {
  const { alive, width, height, originX, originY, centerlineByY, regionYMin, regionYMax } = grid;
  const next = new Uint8Array(alive.length);
  const { birthSet, survivalSet, taperBias, neighborWeight, diagonalWeight, whiteCoreLuminance } = options;
  const birth = new Set(birthSet);
  const survival = new Set(survivalSet);

  for (let gy = 0; gy < height; gy += 1) {
    const y = originY + gy;
    const centerline = centerlineByY.get(y);
    const tHeight = regionYMax > regionYMin ? (y - regionYMin) / (regionYMax - regionYMin) : 0;
    for (let gx = 0; gx < width; gx += 1) {
      const idx = gy * width + gx;
      const wasAlive = alive[idx] === 1;
      const x = originX + gx;
      const distanceFromCenter = centerline === null ? 0 : Math.abs(x - centerline);
      const effectiveTaper = centerline === null ? 1 : Math.max(0, 1 - (taperBias * (distanceFromCenter / Math.max(1, tHeight + 0.25))));
      const neighbors = countNeighbors(alive, width, height, gx, gy, diagonalWeight) * neighborWeight;
      const biased = neighbors * effectiveTaper;
      const rounded = Math.round(biased);

      let isAlive = false;
      if (wasAlive) {
        isAlive = survival.has(rounded);
      } else {
        isAlive = birth.has(rounded);
      }

      let isCore = false;
      if (options.preserveCore) {
        const cell = grid.cells[idx];
        const rgb = parseHexColor(cell?.color);
        if (rgb && luminance(rgb) >= whiteCoreLuminance) {
          isCore = true;
        }
      }

      let isApexPruned = false;
      if (apexPrune && y === regionYMin && isAlive && !isCore) {
        const apexRadius = apexPrune;
        if (centerline !== null && distanceFromCenter > apexRadius) {
          isApexPruned = true;
        }
      }

      next[idx] = isCore || (isAlive && !isApexPruned) ? 1 : 0;
    }
  }

  return next;
}

function buildRefinedCoordinates(grid, nextAlive, coordinates) {
  const { width, originX, originY, regionYMin, regionYMax } = grid;
  const keptKeys = new Set();
  for (let gy = 0; gy < grid.height; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const idx = gy * width + gx;
      if (nextAlive[idx] === 1) {
        const x = originX + gx;
        const y = originY + gy;
        keptKeys.add(`${x},${y}`);
      }
    }
  }
  return coordinates.map((coord) => {
    if (!coord || typeof coord !== 'object') return coord;
    const y = Math.round(toFiniteNumber(coord.snappedY ?? coord.y, 0));
    if (y < regionYMin || y > regionYMax) return coord;
    const key = coordinateKey(coord);
    if (!keptKeys.has(key)) return null;
    return {
      ...coord,
      flameTipCA: 'polished',
    };
  }).filter((coord) => coord !== null);
}

function recomputeCenterlines(grid, aliveMask) {
  const centerlineByY = new Map();
  const rows = new Map();
  const { width, originX, originY, regionYMin, regionYMax } = grid;
  for (let gy = 0; gy < grid.height; gy += 1) {
    const y = originY + gy;
    if (y < regionYMin || y > regionYMax) continue;
    const xs = [];
    for (let gx = 0; gx < width; gx += 1) {
      if (aliveMask[gy * width + gx] === 1) xs.push(originX + gx);
    }
    if (xs.length === 0) continue;
    rows.set(y, xs);
    let sumX = 0;
    for (const x of xs) sumX += x;
    centerlineByY.set(y, sumX / xs.length);
  }
  return { centerlineByY, rows };
}

export function applyFlameTipCellularAutomata(coordinates, options = {}) {
  if (!Array.isArray(coordinates)) return [];
  const materialId = resolveMaterialId(options.material || options.materialId || SOURCE_MATERIAL);
  const materialProfile = resolveMaterialProfile(materialId);
  const resolvedOptions = resolveOptions(options, materialProfile);
  const iterations = resolvedOptions.iterations;
  const taperBias = resolvedOptions.taperBias;
  const apexPruneRadius = resolvedOptions.apexPruneRadius;

  if (!resolvedOptions.enabled || iterations === 0 || coordinates.length === 0) {
    return coordinates.map((coord) => ({ ...coord, flameTipCA: 'passthrough' }));
  }

  const bbox = computeBoundingBox(coordinates);
  if (!bbox) {
    return coordinates.map((coord) => ({ ...coord, flameTipCA: 'passthrough' }));
  }

  const topRegionHeight = Math.max(2, Math.round(bbox.height * resolvedOptions.topRegionFraction));
  const regionYMin = bbox.minY;
  const regionYMax = Math.min(bbox.maxY, bbox.minY + topRegionHeight - 1);

  let grid = buildGrid(coordinates, regionYMin, regionYMax, resolvedOptions.paddingCells);
  if (!grid) {
    return coordinates.map((coord) => ({ ...coord, flameTipCA: 'passthrough' }));
  }

  const caOptions = Object.freeze({
    ...resolvedOptions,
    iterations,
    taperBias,
    apexPrune: apexPruneRadius > 0,
  });

  let aliveMask = grid.alive;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = stepGrid(grid, caOptions, apexPruneRadius);
    const { centerlineByY, rows } = recomputeCenterlines(grid, next);
    grid = Object.freeze({
      ...grid,
      alive: next,
      centerlineByY,
      rows,
    });
    aliveMask = next;
  }

  return buildRefinedCoordinates(grid, aliveMask, coordinates);
}

export function buildFlameTipCellularAutomataPayload({
  coordinates = [],
  materialId = SOURCE_MATERIAL,
  vectorField: _vectorField = [],
  intensityRatings: _intensityRatings = {},
  canvas = null,
  options = {},
  intent = 'polish_flame_tip_with_cellular_automata',
} = {}) {
  const resolvedMaterial = resolveMaterialId(materialId);
  const materialProfile = resolveMaterialProfile(resolvedMaterial);
  const resolvedOptions = resolveOptions(options, materialProfile);
  const iterations = resolvedOptions.iterations;
  const taperBias = resolvedOptions.taperBias;
  const apexPruneRadius = resolvedOptions.apexPruneRadius;

  const bbox = computeBoundingBox(coordinates);
  let outputCoordinates;
  let changedCount = 0;
  let topRegionYMin = null;
  let topRegionYMax = null;
  let gridWidth = 0;
  let gridHeight = 0;
  let iterationsRun = 0;
  let aliveCells = 0;
  let removedCells = 0;
  let apexPruneActive = false;

  if (!resolvedOptions.enabled || iterations === 0 || coordinates.length === 0 || !bbox) {
    outputCoordinates = coordinates.map((coord) => ({ ...coord, flameTipCA: 'passthrough' }));
  } else {
    const topRegionHeight = Math.max(2, Math.round(bbox.height * resolvedOptions.topRegionFraction));
    const regionYMin = bbox.minY;
    const regionYMax = Math.min(bbox.maxY, bbox.minY + topRegionHeight - 1);
    topRegionYMin = regionYMin;
    topRegionYMax = regionYMax;

    let grid = buildGrid(coordinates, regionYMin, regionYMax, resolvedOptions.paddingCells);
    if (!grid) {
      outputCoordinates = coordinates.map((coord) => ({ ...coord, flameTipCA: 'passthrough' }));
    } else {
      gridWidth = grid.width;
      gridHeight = grid.height;
      apexPruneActive = apexPruneRadius > 0;

      const caOptions = Object.freeze({
        ...resolvedOptions,
        iterations,
        taperBias,
        apexPrune: apexPruneActive,
      });

      let aliveMask = grid.alive;
      for (let iteration = 0; iteration < iterations; iteration += 1) {
        const next = stepGrid(grid, caOptions, apexPruneRadius);
        const { centerlineByY, rows } = recomputeCenterlines(grid, next);
        grid = Object.freeze({
          ...grid,
          alive: next,
          centerlineByY,
          rows,
        });
        aliveMask = next;
        iterationsRun = iteration + 1;
      }

      outputCoordinates = buildRefinedCoordinates(grid, aliveMask, coordinates);

      const initialAlive = countAlive(coordinates, regionYMin, regionYMax);
      const finalAlive = countAliveInMask(aliveMask);
      aliveCells = finalAlive;
      removedCells = Math.max(0, initialAlive - finalAlive);
      changedCount = removedCells;
    }
  }

  const finalBbox = computeBoundingBox(outputCoordinates);

  return Object.freeze({
    amp: FLAME_TIP_CA_ID,
    version: FLAME_TIP_CA_VERSION,
    intent,
    material: resolvedMaterial,
    inputHash: hashString(JSON.stringify(coordinates.map((coord) => [coord?.x, coord?.y, coord?.color]))).toString(16),
    canvas,
    sourceCoordinates: coordinates,
    outputCoordinates,
    diagnostics: Object.freeze({
      coordinateCount: coordinates.length,
      outputCount: outputCoordinates.length,
      changedCount,
      enabled: resolvedOptions.enabled,
    }),
    metadata: Object.freeze({
      iterations: iterationsRun,
      iterationsConfigured: iterations,
      taperBias,
      apexPruneRadius,
      apexPruneActive,
      topRegionYMin,
      topRegionYMax,
      gridWidth,
      gridHeight,
      aliveCells,
      removedCells,
      finalBoundingBox: finalBbox,
    }),
  });
}

function countAlive(coordinates, regionYMin, regionYMax) {
  let count = 0;
  for (const coord of coordinates) {
    if (!coord || typeof coord !== 'object') continue;
    const y = Math.round(toFiniteNumber(coord.snappedY ?? coord.y, 0));
    if (y < regionYMin || y > regionYMax) continue;
    count += 1;
  }
  return count;
}

function countAliveInMask(mask) {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 1) count += 1;
  }
  return count;
}
