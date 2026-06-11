/**
 * TEMPLATE GRID ENGINE
 *
 * Provides Aseprite-style grid/template system for manual pixel art editing.
 * Supports multiple grid types, anchor points, symmetry, and onion skinning.
 */

import { GOLDEN_RATIO, roundTo } from './shared.js';

/**
 * Grid types
 */
export const GRID_TYPES = {
  RECTANGULAR: 'rectangular',
  ISOMETRIC: 'isometric',
  HEXAGONAL: 'hexagonal',
  CIRCULAR: 'circular',
  FIBONACCI: 'fibonacci',
};

const SQRT3 = Math.sqrt(3);

/**
 * Hexagonal lattice metrics (pointy-top, odd-r offset rows).
 *
 * Centres sit `cellSize` apart horizontally with odd rows shifted right by
 * half a cell; row pitch is cellSize·√3/2. A pointy-top hexagon of
 * circumradius cellSize/√3 tiles exactly that lattice, so snap, preview and
 * hit-testing all derive from these two numbers.
 */
function hexMetrics(cellSize) {
  return {
    rowPitch: cellSize * SQRT3 / 2,
    radius: cellSize / SQRT3,
  };
}

function hexRowOffset(row, cellSize) {
  return (((row % 2) + 2) % 2) * cellSize / 2;
}

function hexCenter(col, row, cellSize) {
  return {
    x: col * cellSize + hexRowOffset(row, cellSize),
    y: row * hexMetrics(cellSize).rowPitch,
  };
}

/**
 * Nearest hex centre to a point — the single authority every hexagonal
 * code path (snap, hit-test, fill) resolves through.
 */
function nearestHexCell(x, y, cellSize) {
  const { rowPitch } = hexMetrics(cellSize);
  const baseRow = Math.round(y / rowPitch);
  let best = null;

  for (let row = baseRow - 1; row <= baseRow + 1; row++) {
    const offset = hexRowOffset(row, cellSize);
    const col = Math.round((x - offset) / cellSize);
    const center = hexCenter(col, row, cellSize);
    const d = (x - center.x) ** 2 + (y - center.y) ** 2;
    if (!best || d < best.d) {
      best = { d, col, row, x: center.x, y: center.y };
    }
  }

  return best;
}

/**
 * Create a new template grid
 *
 * @param {Object} options - Grid options
 * @returns {Object} Template grid object
 */
export function createTemplateGrid(options = {}) {
  const {
    width = 160,
    height = 144,
    cellSize = 8,
    gridType = GRID_TYPES.RECTANGULAR,
    snapStrength = 0.85,
  } = options;

  // Calculate grid dimensions (hex rows are √3/2·cellSize apart)
  const rowPitch = gridType === GRID_TYPES.HEXAGONAL
    ? hexMetrics(cellSize).rowPitch
    : cellSize;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / rowPitch);

  // Generate anchor points
  const anchorPoints = generateDefaultAnchorPoints(width, height, gridType);

  // Generate symmetry axes
  const symmetryAxes = [];

  const grid = {
    width,
    height,
    cellSize,
    gridType,
    cols,
    rows,
    snapStrength,
    anchorPoints,
    symmetryAxes,
    layers: [],
    frames: [],
    currentFrame: 0,
    currentLayer: 0,
  };

  // Initialize with default frame and layer
  const firstFrame = createFrame();
  const firstLayer = createLayer('Base Layer');
  firstFrame.layers.push(firstLayer);
  grid.frames.push(firstFrame);
  grid.layers.push(firstLayer); // For convenience

  return grid;
}

/**
 * Generate default anchor points for a grid
 */
function generateDefaultAnchorPoints(width, height, gridType) {
  const anchors = [
    // Corners
    { x: 0, y: 0, label: 'topLeft', locked: false, visible: true },
    { x: width, y: 0, label: 'topRight', locked: false, visible: true },
    { x: 0, y: height, label: 'bottomLeft', locked: false, visible: true },
    { x: width, y: height, label: 'bottomRight', locked: false, visible: true },

    // Center
    { x: width / 2, y: height / 2, label: 'center', locked: true, visible: true },

    // Golden ratio point
    {
      x: width * (1 - 1 / GOLDEN_RATIO),
      y: height * (1 - 1 / GOLDEN_RATIO),
      label: 'goldenPoint',
      locked: true,
      visible: true,
    },
  ];

  // Add grid-type-specific anchors
  if (gridType === GRID_TYPES.ISOMETRIC) {
    anchors.push({
      x: width / 2,
      y: height * 0.3,
      label: 'isoTop',
      locked: false,
      visible: true,
    });
  }

  if (gridType === GRID_TYPES.HEXAGONAL) {
    anchors.push({
      x: width / 2,
      y: height * 0.25,
      label: 'hexTop',
      locked: false,
      visible: true,
    });
  }

  if (gridType === GRID_TYPES.FIBONACCI) {
    const fibPoints = generateFibonacciAnchors(width, height);
    anchors.push(...fibPoints);
  }

  return anchors;
}

/**
 * Generate recursive Fibonacci anchors for golden subdivision
 */
function generateFibonacciAnchors(width, height) {
  const points = [];
  let x = 0, y = 0, w = width, h = height;
  let side = 0; // 0: left, 1: bottom, 2: right, 3: top

  // Generate 7 levels of recursive subdivision
  for (let i = 0; i < 7; i++) {
    // Current subdivision square size based on golden ratio
    const size = side % 2 === 0 ? w / GOLDEN_RATIO : h / GOLDEN_RATIO;
    
    // Add anchor at the center of the current rectangle
    points.push({ 
      x: roundTo(x + w / 2, 1), 
      y: roundTo(y + h / 2, 1), 
      label: `phi_${i}`, 
      locked: false, 
      visible: true 
    });
    
    // Subdivide the rectangle
    if (side === 0) { x += size; w -= size; }
    else if (side === 1) { y += size; h -= size; }
    else if (side === 2) { w -= size; }
    else { h -= size; }
    side = (side + 1) % 4;
  }
  return points;
}

/**
 * Toggle a symmetry axis
 *
 * @param {Object} grid - Template grid
 * @param {string} axis - Axis to toggle (vertical, horizontal, diagonal)
 * @returns {Object} Updated grid
 */
export function toggleSymmetryAxis(grid, axis) {
  if (!grid.symmetryAxes) grid.symmetryAxes = [];

  const index = grid.symmetryAxes.indexOf(axis);
  if (index === -1) {
    grid.symmetryAxes.push(axis);
  } else {
    grid.symmetryAxes.splice(index, 1);
  }

  return grid;
}

/**
 * Snap coordinate to grid
 *
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} grid - Template grid
 * @returns {Object} Snapped coordinates
 */
export function snapToGrid(x, y, grid) {
  const { cellSize, gridType, snapStrength } = grid;

  let snappedX, snappedY;

  switch (gridType) {
    case GRID_TYPES.RECTANGULAR:
      snappedX = Math.round(x / cellSize) * cellSize;
      snappedY = Math.round(y / cellSize) * cellSize;
      break;

    case GRID_TYPES.ISOMETRIC: {
      // Isometric snapping (diamond grid)
      const isoHalf = cellSize / 2;
      snappedX = Math.round(x / isoHalf) * isoHalf;
      snappedY = Math.round(y / isoHalf) * isoHalf;
      break;
    }

    case GRID_TYPES.HEXAGONAL: {
      // Snap to the nearest hex centre (odd rows are offset half a cell)
      const cell = nearestHexCell(x, y, cellSize);
      snappedX = cell.x;
      snappedY = cell.y;
      break;
    }

    case GRID_TYPES.CIRCULAR: {
      // Circular snapping (radial grid)
      const centerX = grid.width / 2;
      const centerY = grid.height / 2;
      const dx = x - centerX;
      const dy = y - centerY;
      const angle = Math.atan2(dy, dx);
      const radius = Math.sqrt(dx * dx + dy * dy);
      const snappedRadius = Math.round(radius / cellSize) * cellSize;
      snappedX = centerX + Math.cos(angle) * snappedRadius;
      snappedY = centerY + Math.sin(angle) * snappedRadius;
      break;
    }

    default:
      snappedX = Math.round(x / cellSize) * cellSize;
      snappedY = Math.round(y / cellSize) * cellSize;
  }

  // Blend with original based on snapStrength
  const blendX = x + (snappedX - x) * snapStrength;
  const blendY = y + (snappedY - y) * snapStrength;

  return {
    x: roundTo(blendX, 1),
    y: roundTo(blendY, 1),
    snappedX: roundTo(snappedX, 1),
    snappedY: roundTo(snappedY, 1),
  };
}

/**
 * Add anchor point to grid
 */
export function addAnchorPoint(grid, x, y, label = '', locked = false) {
  const anchor = {
    x: roundTo(x, 1),
    y: roundTo(y, 1),
    label: label || `anchor_${grid.anchorPoints.length}`,
    locked,
    visible: true,
  };

  grid.anchorPoints.push(anchor);
  return anchor;
}

/**
 * Remove anchor point from grid
 */
export function removeAnchorPoint(grid, index) {
  if (index >= 0 && index < grid.anchorPoints.length) {
    grid.anchorPoints.splice(index, 1);
  }
}

/**
 * Apply symmetry to coordinates
 */
export function applySymmetry(coordinates, grid) {
  if (!grid.symmetryAxes || grid.symmetryAxes.length === 0) {
    return coordinates;
  }

  let result = [...coordinates];

  grid.symmetryAxes.forEach(axis => {
    const mirrored = [];

    result.forEach(coord => {
      let mirroredCoord = { ...coord };

      if (axis === 'vertical') {
        mirroredCoord.x = grid.width - coord.x;
        mirroredCoord.source = 'mirror_v';
      } else if (axis === 'horizontal') {
        mirroredCoord.y = grid.height - coord.y;
        mirroredCoord.source = 'mirror_h';
      } else if (axis === 'diagonal') {
        // Anti-diagonal mirror, scale-normalized so non-square grids map
        // onto themselves (reduces to height−y / width−x when square)
        const temp = mirroredCoord.x;
        mirroredCoord.x = (1 - coord.y / grid.height) * grid.width;
        mirroredCoord.y = (1 - temp / grid.width) * grid.height;
        mirroredCoord.source = 'mirror_d';
      }

      mirrored.push(mirroredCoord);
    });

    result = [...result, ...mirrored];
  });

  // Remove duplicates
  const seen = new Set();
  return result.filter(coord => {
    const key = `${coord.x},${coord.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Create new layer
 */
export function createLayer(name = '') {
  return {
    name: name || `Layer ${Date.now()}`, // EXEMPT
    visible: true,
    locked: false,
    opacity: 1,
    cells: new Map(), // Map<"x,y", {color, emphasis}>
  };
}

/**
 * Set cell in layer
 */
export function setCell(layer, x, y, color, emphasis = 1) {
  const key = `${x},${y}`;
  layer.cells.set(key, { x, y, color, emphasis });
}

/**
 * Get cell from layer
 */
export function getCell(layer, x, y) {
  const key = `${x},${y}`;
  return layer.cells.get(key);
}

/**
 * Clear cell in layer
 */
export function clearCell(layer, x, y) {
  const key = `${x},${y}`;
  layer.cells.delete(key);
}

/**
 * Create new frame (for animation)
 */
export function createFrame() {
  return {
    duration: 100, // ms
    layers: [],
  };
}

/**
 * Onion skinning - get adjacent frames for preview
 */
export function getOnionSkins(frames, currentIndex, beforeCount = 1, afterCount = 1) {
  const skins = {
    before: [],
    after: [],
  };

  // Get frames before current
  for (let i = 1; i <= beforeCount; i++) {
    const index = currentIndex - i;
    if (index >= 0 && index < frames.length) {
      skins.before.push({
        frame: frames[index],
        index,
        opacity: 0.3 * (1 - i / (beforeCount + 1)),
      });
    }
  }

  // Get frames after current
  for (let i = 1; i <= afterCount; i++) {
    const index = currentIndex + i;
    if (index >= 0 && index < frames.length) {
      skins.after.push({
        frame: frames[index],
        index,
        opacity: 0.3 * (1 - i / (afterCount + 1)),
      });
    }
  }

  return skins;
}

/**
 * Export grid to Aseprite-compatible JSON
 */
export function exportToAseprite(grid) {
  const frames = [];

  grid.frames.forEach((frame, frameIndex) => {
    const frameData = {
      frame: frameIndex,
      duration: frame.duration,
      layers: [],
    };

    frame.layers.forEach((layer, _layerIndex) => {
      const layerData = {
        name: layer.name,
        cells: [],
      };

      layer.cells.forEach(cell => {
        layerData.cells.push({
          x: cell.x,
          y: cell.y,
          color: cell.color,
          emphasis: cell.emphasis,
        });
      });

      frameData.layers.push(layerData);
    });

    frames.push(frameData);
  });

  return {
    width: grid.width,
    height: grid.height,
    cellSize: grid.cellSize,
    gridType: grid.gridType,
    snapStrength: grid.snapStrength,
    frames,
    anchorPoints: grid.anchorPoints,
    symmetryAxes: grid.symmetryAxes,
  };
}

/**
 * Import grid from Aseprite-compatible JSON
 */
export function importFromAseprite(data) {
  const grid = createTemplateGrid({
    width: data.width,
    height: data.height,
    cellSize: data.cellSize,
    gridType: data.gridType,
    snapStrength: data.snapStrength,
  });

  grid.anchorPoints = data.anchorPoints || [];
  grid.symmetryAxes = data.symmetryAxes || [];

  // The imported document replaces the seed frame entirely
  grid.frames = [];

  (data.frames || []).forEach(frameData => {
    const frame = createFrame();
    frame.duration = frameData.duration;

    frameData.layers.forEach(layerData => {
      const layer = createLayer(layerData.name);

      layerData.cells.forEach(cell => {
        setCell(layer, cell.x, cell.y, cell.color, cell.emphasis);
      });

      frame.layers.push(layer);
    });

    grid.frames.push(frame);
  });

  if (grid.frames.length === 0) {
    const frame = createFrame();
    frame.layers.push(createLayer('Base Layer'));
    grid.frames.push(frame);
  }

  grid.layers = grid.frames[0].layers;

  return grid;
}

/**
 * Generate grid preview coordinates (for rendering)
 */
export function generateGridPreview(grid) {
  const { width, height, cellSize, gridType } = grid;
  const lines = [];

  switch (gridType) {
    case GRID_TYPES.RECTANGULAR:
      // Vertical lines
      for (let x = 0; x <= width; x += cellSize) {
        lines.push({
          x1: x,
          y1: 0,
          x2: x,
          y2: height,
          type: 'vertical',
        });
      }
      // Horizontal lines
      for (let y = 0; y <= height; y += cellSize) {
        lines.push({
          x1: 0,
          y1: y,
          x2: width,
          y2: y,
          type: 'horizontal',
        });
      }
      break;

    case GRID_TYPES.ISOMETRIC: {
      // Diagonal lines (45° and 135°)
      const step = cellSize / Math.sqrt(2);
      for (let i = -width; i <= width * 2; i += step) {
        lines.push({
          x1: i,
          y1: 0,
          x2: i - height,
          y2: height,
          type: 'diag1',
        });
        lines.push({
          x1: i,
          y1: 0,
          x2: i + height,
          y2: height,
          type: 'diag2',
        });
      }
      break;
    }

    case GRID_TYPES.HEXAGONAL: {
      // Pointy-top hexagons of circumradius cellSize/√3 tile the snap
      // lattice exactly; shared edges are emitted once.
      const { rowPitch, radius } = hexMetrics(cellSize);
      const seenEdges = new Set();
      for (let row = 0; row * rowPitch <= height; row++) {
        const cy = row * rowPitch;
        for (let cx = hexRowOffset(row, cellSize); cx <= width; cx += cellSize) {
          for (let i = 0; i < 6; i++) {
            // Vertices every 60°, starting at 30° (pointy-top orientation)
            const a1 = Math.PI / 6 + (i / 6) * Math.PI * 2;
            const a2 = Math.PI / 6 + ((i + 1) / 6) * Math.PI * 2;
            const x1 = cx + Math.cos(a1) * radius;
            const y1 = cy + Math.sin(a1) * radius;
            const x2 = cx + Math.cos(a2) * radius;
            const y2 = cy + Math.sin(a2) * radius;
            const key = [
              `${x1.toFixed(2)},${y1.toFixed(2)}`,
              `${x2.toFixed(2)},${y2.toFixed(2)}`,
            ].sort().join('|');
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);
            lines.push({ x1, y1, x2, y2, type: 'hex' });
          }
        }
      }
      break;
    }

    case GRID_TYPES.FIBONACCI: {
      // Recursive golden subdivision lines
      let fx = 0, fy = 0, fw = width, fh = height;
      let fside = 0;
      for (let i = 0; i < 8; i++) {
        const size = fside % 2 === 0 ? fw / GOLDEN_RATIO : fh / GOLDEN_RATIO;
        
        if (fside === 0) {
          lines.push({ x1: fx + size, y1: fy, x2: fx + size, y2: fy + fh, type: 'fib' });
          fx += size; fw -= size;
        } else if (fside === 1) {
          lines.push({ x1: fx, y1: fy + size, x2: fx + fw, y2: fy + size, type: 'fib' });
          fy += size; fh -= size;
        } else if (fside === 2) {
          lines.push({ x1: fx + fw - size, y1: fy, x2: fx + fw - size, y2: fy + fh, type: 'fib' });
          fw -= size;
        } else {
          lines.push({ x1: fx, y1: fy + fh - size, x2: fx + fw, y2: fy + fh - size, type: 'fib' });
          fh -= size;
        }
        fside = (fside + 1) % 4;
      }
      break;
    }
  }

  return lines;
}

/**
 * Get cell at screen position
 */
export function getCellAtPosition(grid, screenX, screenY) {
  const { cellSize, gridType } = grid;

  switch (gridType) {
    case GRID_TYPES.RECTANGULAR:
      return {
        col: Math.floor(screenX / cellSize),
        row: Math.floor(screenY / cellSize),
        x: Math.floor(screenX / cellSize) * cellSize,
        y: Math.floor(screenY / cellSize) * cellSize,
      };

    case GRID_TYPES.ISOMETRIC: {
      const isoHalf = cellSize / 2;
      return {
        col: Math.floor(screenX / isoHalf),
        row: Math.floor(screenY / isoHalf),
        x: Math.floor(screenX / isoHalf) * isoHalf,
        y: Math.floor(screenY / isoHalf) * isoHalf,
      };
    }

    case GRID_TYPES.HEXAGONAL: {
      // Hex cells are addressed by centre, not top-left corner
      const cell = nearestHexCell(screenX, screenY, cellSize);
      return { col: cell.col, row: cell.row, x: cell.x, y: cell.y };
    }

    case GRID_TYPES.FIBONACCI: {
      // Nearest phi-point snapping
      let minD = Infinity;
      let nearest = { x: screenX, y: screenY, col: 0, row: 0 };
      (grid.anchorPoints || []).filter(p => p.label.startsWith('phi')).forEach(p => {
        const d = Math.sqrt((p.x - screenX)**2 + (p.y - screenY)**2);
        if (d < minD) { minD = d; nearest = { x: p.x, y: p.y, col: 0, row: 0 }; }
      });
      return nearest;
    }

    default:
      return {
        col: Math.floor(screenX / cellSize),
        row: Math.floor(screenY / cellSize),
        x: Math.floor(screenX / cellSize) * cellSize,
        y: Math.floor(screenY / cellSize) * cellSize,
      };
  }
}

/**
 * Resolve a cell address back to its canvas anchor point — the inverse of
 * getCellAtPosition. Rectangular/isometric cells anchor at their top-left
 * corner; hexagonal cells are addressed by centre.
 */
export function getCellOrigin(grid, col, row) {
  const { cellSize, gridType } = grid;

  switch (gridType) {
    case GRID_TYPES.HEXAGONAL:
      return hexCenter(col, row, cellSize);

    case GRID_TYPES.ISOMETRIC: {
      const isoHalf = cellSize / 2;
      return { x: col * isoHalf, y: row * isoHalf };
    }

    default:
      return { x: col * cellSize, y: row * cellSize };
  }
}

/**
 * Renderer-facing lattice metrics, so UI surfaces never re-derive the
 * geometry the engine owns. hexRadius is null for non-hex grids.
 */
export function getGridMetrics(grid) {
  const { cellSize, gridType } = grid;

  if (gridType === GRID_TYPES.HEXAGONAL) {
    const { rowPitch, radius } = hexMetrics(cellSize);
    return { cellSize, rowPitch, hexRadius: radius };
  }

  return { cellSize, rowPitch: cellSize, hexRadius: null };
}

/**
 * Flood fill cells (for bucket tool)
 */
export function floodFill(grid, layer, startX, startY, color) {
  const { cellSize, gridType } = grid;
  if (!Number.isFinite(cellSize) || cellSize <= 0) return;

  const isHex = gridType === GRID_TYPES.HEXAGONAL;
  const rowPitch = isHex ? hexMetrics(cellSize).rowPitch : cellSize;

  const maxCols = Math.ceil((grid.cols ?? grid.width / cellSize) || 0);
  const maxRows = Math.ceil((grid.rows ?? grid.height / rowPitch) || 0);

  const cellPoint = (col, row) =>
    isHex ? hexCenter(col, row, cellSize) : { x: col * cellSize, y: row * cellSize };

  const start = isHex
    ? nearestHexCell(startX, startY, cellSize)
    : { col: Math.floor(startX / cellSize), row: Math.floor(startY / cellSize) };

  const isInBounds = (col, row) =>
    col >= 0 && row >= 0 && col < maxCols && row < maxRows;

  if (!isInBounds(start.col, start.row)) return;

  // Get target color (null = empty cell)
  const startPoint = cellPoint(start.col, start.row);
  const targetCell = getCell(layer, startPoint.x, startPoint.y);
  const targetColor = targetCell ? targetCell.color : null;

  if (targetColor === color) return; // Same color, nothing to do

  const neighborsOf = (col, row) => {
    if (!isHex) {
      return [
        { col: col + 1, row }, { col: col - 1, row },
        { col, row: row + 1 }, { col, row: row - 1 },
      ];
    }
    // odd-r offset layout: 6 neighbours; diagonal columns depend on row parity
    const shift = hexRowOffset(row, cellSize) === 0 ? -1 : 0;
    return [
      { col: col + 1, row }, { col: col - 1, row },
      { col: col + shift, row: row - 1 }, { col: col + shift + 1, row: row - 1 },
      { col: col + shift, row: row + 1 }, { col: col + shift + 1, row: row + 1 },
    ];
  };

  // BFS flood fill
  const queue = [{ col: start.col, row: start.row }];
  const visited = new Set();

  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { col, row } = queue[cursor];
    const key = `${col},${row}`;

    if (!isInBounds(col, row) || visited.has(key)) continue;
    visited.add(key);

    const point = cellPoint(col, row);
    const cell = getCell(layer, point.x, point.y);
    const cellColor = cell ? cell.color : null;

    // Fill only cells that exactly match the start cell's colour —
    // an empty cell matches only an empty start
    if (cellColor === targetColor) {
      setCell(layer, point.x, point.y, color);
      queue.push(...neighborsOf(col, row));
    }
  }
}
