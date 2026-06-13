/**
 * CELL-BOUNDARY-TRACER
 * Traces the outer boundary of a set of occupied cells into a polygon.
 * Optionally converts the polygon to smooth Catmull-Rom bezier segments.
 *
 * Cell at (cx,cy) occupies grid square from corner (cx,cy) to (cx+1,cy+1).
 * Output vertices are in cell-corner space (integer coordinates).
 */

function addEdge(adj, x1, y1, x2, y2) {
  const k1 = `${x1},${y1}`, k2 = `${x2},${y2}`;
  if (!adj.has(k1)) adj.set(k1, []);
  if (!adj.has(k2)) adj.set(k2, []);
  adj.get(k1).push(k2);
  adj.get(k2).push(k1);
}

function buildEdgeAdjacency(cellSet) {
  const adj = new Map();
  for (const key of cellSet) {
    const [cx, cy] = key.split(',').map(Number);
    if (!cellSet.has(`${cx - 1},${cy}`)) addEdge(adj, cx, cy,     cx, cy + 1);
    if (!cellSet.has(`${cx + 1},${cy}`)) addEdge(adj, cx + 1, cy, cx + 1, cy + 1);
    if (!cellSet.has(`${cx},${cy - 1}`)) addEdge(adj, cx, cy,     cx + 1, cy);
    if (!cellSet.has(`${cx},${cy + 1}`)) addEdge(adj, cx, cy + 1, cx + 1, cy + 1);
  }
  return adj;
}

function findStart(cellSet) {
  let sx = Infinity, sy = Infinity;
  for (const key of cellSet) {
    const [cx, cy] = key.split(',').map(Number);
    if (cy < sy || (cy === sy && cx < sx)) { sx = cx; sy = cy; }
  }
  return `${sx},${sy}`; // top-left corner of topmost-leftmost cell
}

function walkChain(adj, startKey) {
  const vertices = [];
  const visited = new Set();
  let current = startKey;
  let prev = null;

  for (let i = 0; i < adj.size * 4; i++) {
    if (visited.has(current)) break;
    visited.add(current);
    const [x, y] = current.split(',').map(Number);
    vertices.push([x, y]);

    const neighbors = adj.get(current) || [];
    // Prefer not backtracking; among valid choices pick lowest key for determinism
    const candidates = neighbors.filter(n => n !== prev).sort();
    const next = candidates[0];
    if (!next) break;
    prev = current;
    current = next;
  }

  return vertices;
}

function simplifyPolygon(vertices) {
  if (vertices.length < 4) return vertices;

  const simplified = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    // Check if curr is collinear with prev and next
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];

    // If cross product is non-zero, there's a direction change (keep point)
    const cross = dx1 * dy2 - dy1 * dx2;
    if (cross !== 0) {
      simplified.push(curr);
    }
  }

  return simplified.length >= 3 ? simplified : vertices;
}

function catmullRomSegments(vertices, tension) {
  const n = vertices.length;
  if (n < 3) return [];
  const segments = [];
  for (let i = 0; i < n; i++) {
    const p0 = vertices[(i - 1 + n) % n];
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    const p3 = vertices[(i + 2) % n];
    segments.push({
      p1,
      cp1: [
        p1[0] + (p2[0] - p0[0]) * tension / 3,
        p1[1] + (p2[1] - p0[1]) * tension / 3,
      ],
      cp2: [
        p2[0] - (p3[0] - p1[0]) * tension / 3,
        p2[1] - (p3[1] - p1[1]) * tension / 3,
      ],
      p2,
    });
  }
  return segments;
}

/**
 * Trace the outer boundary of an occupied cell set.
 *
 * @param {Set<string>} cellSet   — Set of "x,y" cell keys
 * @param {object}      [options]
 * @param {boolean}     [options.smooth=true]    — emit Catmull-Rom segments
 * @param {number}      [options.tension=0.4]    — curve tension (0=sharp, 1=loose)
 * @returns {{ vertices: [number,number][], segments: object[] }}
 */
export function traceBoundary(cellSet, options = {}) {
  const { smooth = true, tension = 0.4 } = options;

  if (!cellSet || cellSet.size === 0) return { vertices: [], segments: [] };

  const adj = buildEdgeAdjacency(cellSet);
  if (adj.size === 0) return { vertices: [], segments: [] };

  const startKey = findStart(cellSet);
  let vertices = walkChain(adj, startKey);
  vertices = simplifyPolygon(vertices);

  const segments = smooth && vertices.length >= 3
    ? catmullRomSegments(vertices, tension)
    : [];

  return { vertices, segments };
}
