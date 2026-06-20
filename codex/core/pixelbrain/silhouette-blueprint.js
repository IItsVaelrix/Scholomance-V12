import { sha256Hex } from './sha256.js';
import { fillShapeWithEvenOddWinding } from './image-to-pixel-art.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_CODES,
  ERROR_SEVERITY,
  MODULE_IDS,
} from './bytecode-error.js';

export const SILH_CONTRACT = 'PB-SILH-BLUEPRINT-v1';
export const SILH_SCHEMA_VERSION = '0.1.0';
export const SILH_VIEWS = Object.freeze(['front', 'side', 'top']);

export const VIEW_DIMS = Object.freeze({
  front: (grid) => ({ width: grid.width, height: grid.height }),
  side: (grid) => ({ width: grid.depth, height: grid.height }),
  top: (grid) => ({ width: grid.width, height: grid.depth }),
});

/** Deterministic, key-sorted JSON. Arrays preserve order; objects sort keys. */
export function canonicalStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** sha256 hex over the canonical form. Callers omit `digest` before hashing. */
export function digestBlueprint(blueprintWithoutDigest) {
  return sha256Hex(canonicalStringify(blueprintWithoutDigest));
}

function fail(reason, extra = {}, category = ERROR_CATEGORIES.VALUE, code = ERROR_CODES.INVALID_VALUE) {
  throw new BytecodeError(category, ERROR_SEVERITY.CRIT, MODULE_IDS.IMMUNITY, code, {
    reason,
    ...extra,
  });
}

function stripComment(line) {
  const index = line.indexOf('#');
  return (index === -1 ? line : line.slice(0, index)).trim();
}

function parseInteger(value, field) {
  if (!/^-?\d+$/.test(String(value))) {
    fail(`invalid integer for ${field}`, { field, value });
  }
  return Number(value);
}

function parseNonNegativeInteger(value, field) {
  const parsed = parseInteger(value, field);
  if (parsed < 0) {
    fail(`negative integer for ${field}`, { field, value });
  }
  return parsed;
}

function parsePoint(token) {
  const match = /^(-?\d+),(-?\d+)$/.exec(token);
  if (!match) {
    fail('malformed CONTOUR point', { token });
  }
  return [Number(match[1]), Number(match[2])];
}

function pointOnSegment(px, py, ax, ay, bx, by) {
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  if (cross !== 0) return false;
  return px >= Math.min(ax, bx) && px <= Math.max(ax, bx)
    && py >= Math.min(ay, by) && py <= Math.max(ay, by);
}

function pointInPolygon(px, py, contour) {
  let inside = false;
  for (let index = 0, prev = contour.length - 1; index < contour.length; prev = index, index += 1) {
    const [x1, y1] = contour[index];
    const [x2, y2] = contour[prev];
    if (pointOnSegment(px, py, x1, y1, x2, y2)) return true;
    const intersects = (y1 > py) !== (y2 > py)
      && px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}

function addExistingFillHelperMask(mask, contour, dims) {
  const outline = contour.map(([x, y]) => ({ x, y, snappedX: x, snappedY: y }));
  const result = fillShapeWithEvenOddWinding(outline, {
    width: dims.width,
    height: dims.height,
    gridSize: 1,
  }, {
    preserveBoundary: true,
  });

  if (!result?.ok) return;
  for (const cell of result.coordinates || []) {
    if (cell.x >= 0 && cell.x < dims.width && cell.y >= 0 && cell.y < dims.height) {
      mask.add(`${cell.x},${cell.y}`);
    }
  }
}

/** Fill a closed integer contour into a Set of "a,b" keys clipped to view dims. */
export function fillContourMask(contour, dims) {
  if (!Array.isArray(contour) || contour.length < 3) {
    fail('missing or degenerate CONTOUR');
  }
  const width = dims.width ?? dims.w;
  const height = dims.height ?? dims.h;
  const normalizedDims = { width, height };
  const mask = new Set();

  addExistingFillHelperMask(mask, contour, normalizedDims);

  for (let y = 0; y < normalizedDims.height; y += 1) {
    for (let x = 0; x < normalizedDims.width; x += 1) {
      if (pointInPolygon(x, y, contour)) {
        mask.add(`${x},${y}`);
      }
    }
  }

  return mask;
}

function parseTolerance(tokens) {
  if (tokens.length !== 6) {
    fail('TOLERANCE must define front, side, and top values');
  }
  const tolerance = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const view = tokens[index];
    if (!SILH_VIEWS.includes(view)) {
      fail('unknown TOLERANCE view', { view });
    }
    tolerance[view] = parseNonNegativeInteger(tokens[index + 1], `TOLERANCE ${view}`);
  }
  for (const view of SILH_VIEWS) {
    if (!Object.hasOwn(tolerance, view)) {
      fail('missing TOLERANCE view', { view });
    }
  }
  return tolerance;
}

function findAnimBounds(lines) {
  const start = lines.indexOf('ANIM_START');
  const end = lines.indexOf('ANIM_END');
  if (start === -1 && end === -1) return null;
  if (start === -1 || end === -1 || end <= start) {
    fail('malformed ANIM block');
  }
  return { start, end };
}

function parseAnimation(lines) {
  const bounds = findAnimBounds(lines);
  if (!bounds) return null;

  const block = lines.slice(bounds.start + 1, bounds.end);
  const animation = { id: 'unknown', durationMs: 400, loop: 1, poses: [] };
  let phase = null;

  for (const line of block) {
    const [directive, ...rest] = line.split(/\s+/);
    switch (directive) {
      case 'ID':
        animation.id = rest.join(' ') || 'unknown';
        break;
      case 'DURATION':
        animation.durationMs = parseNonNegativeInteger(rest[0], 'DURATION');
        break;
      case 'LOOP':
        animation.loop = String(rest[0]).toLowerCase() === 'infinite'
          ? 'infinite'
          : parseNonNegativeInteger(rest[0], 'LOOP');
        break;
      case 'PHASE':
        phase = rest[0] || null;
        if (!phase) fail('PHASE requires a name');
        break;
      case 'ROTATE': {
        if (!phase) fail('ROTATE before PHASE');
        const peakIndex = rest.indexOf('peak');
        if (peakIndex === -1 || rest[peakIndex + 1] === undefined) {
          fail('ROTATE requires peak value', { phase });
        }
        animation.poses.push({
          phase,
          rotateDeg: parseInteger(rest[peakIndex + 1], `ROTATE peak for ${phase}`),
        });
        break;
      }
      case 'TARGET':
      case 'EASE':
      case 'SCALE':
      case 'TRANSLATE_X':
      case 'TRANSLATE_Y':
      case 'OPACITY':
      case 'GLOW':
      case 'BLUR':
      case 'CONSTRAINT':
      case 'QA':
        break;
      default:
        fail('unknown ANIM directive', { directive });
    }
  }

  return animation;
}

/** Parse a .silh form block into the PB-SILH-BLUEPRINT-v1 IR. */
export function parseSilhouetteBlueprint(text) {
  const lines = String(text || '')
    .split('\n')
    .map(stripComment)
    .filter(Boolean);

  if (lines[0] !== 'SILH_START' || lines[lines.length - 1] !== 'SILH_END') {
    fail('blueprint must be wrapped in SILH_START/SILH_END');
  }

  const body = lines.slice(1, -1);
  const animBounds = findAnimBounds(body);
  const animation = parseAnimation(body);
  const out = {
    id: null,
    source: null,
    grid: null,
    snap: 'integer',
    tolerance: null,
    views: {},
  };
  let currentView = null;

  for (let index = 0; index < body.length; index += 1) {
    if (animBounds && index >= animBounds.start && index <= animBounds.end) continue;
    const line = body[index];
    const [directive, ...rest] = line.split(/\s+/);

    switch (directive) {
      case 'ID':
        out.id = rest.join(' ');
        break;
      case 'SOURCE':
        out.source = rest.join(' ') || null;
        break;
      case 'GRID':
        if (rest.length !== 3) fail('GRID requires width height depth');
        out.grid = {
          width: parseNonNegativeInteger(rest[0], 'GRID width'),
          height: parseNonNegativeInteger(rest[1], 'GRID height'),
          depth: parseNonNegativeInteger(rest[2], 'GRID depth'),
        };
        if (out.grid.width === 0 || out.grid.height === 0 || out.grid.depth === 0) {
          fail('GRID dimensions must be positive', { grid: out.grid });
        }
        break;
      case 'SNAP':
        if (rest[0] !== 'integer') fail('SNAP must be integer', { snap: rest[0] });
        out.snap = 'integer';
        break;
      case 'TOLERANCE':
        out.tolerance = parseTolerance(rest);
        break;
      case 'VIEW':
        if (!SILH_VIEWS.includes(rest[0])) fail('unknown VIEW', { view: rest[0] });
        if (out.views[rest[0]]) fail('duplicate VIEW', { view: rest[0] });
        currentView = rest[0];
        out.views[currentView] = { contour: [] };
        break;
      case 'CONTOUR':
        if (!currentView) fail('CONTOUR before VIEW');
        out.views[currentView].contour = rest.map(parsePoint);
        break;
      case 'CONSTRAINT':
        if (rest[0] !== 'DETERMINISTIC' || rest[1] !== 'true') {
          fail('unsupported CONSTRAINT', { directive: line });
        }
        break;
      case 'QA':
        if (rest[0] !== 'INVARIANT' || !rest[1]) {
          fail('unsupported QA directive', { directive: line });
        }
        break;
      default:
        fail('unknown SILH directive', { directive });
    }
  }

  if (!out.id) fail('missing ID');
  if (!out.grid) fail('missing GRID');
  if (!out.tolerance) fail('missing TOLERANCE');

  for (const view of SILH_VIEWS) {
    const viewSpec = out.views[view];
    if (!viewSpec || viewSpec.contour.length < 3) {
      fail('missing or degenerate VIEW', { view });
    }
    const mask = fillContourMask(viewSpec.contour, VIEW_DIMS[view](out.grid));
    viewSpec.maskDigest = digestBlueprint([...mask].sort());
  }

  const blueprintWithoutDigest = {
    contract: SILH_CONTRACT,
    schemaVersion: SILH_SCHEMA_VERSION,
    id: out.id,
    source: out.source,
    grid: out.grid,
    snap: out.snap,
    tolerance: out.tolerance,
    views: out.views,
    animation,
  };

  return {
    ...blueprintWithoutDigest,
    digest: digestBlueprint(blueprintWithoutDigest),
  };
}
