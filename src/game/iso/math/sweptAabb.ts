export type Vec2 = Readonly<{ x: number; y: number }>;

export type Aabb = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

export type SweptAabbHit = Readonly<{
  hit: boolean;
  time: number;
  normal: Vec2;
  obstacle: Aabb | null;
}>;

export type SweptAabbResolution = Readonly<{
  position: Vec2;
  delta: Vec2;
  collisions: readonly SweptAabbHit[];
}>;

const EPSILON = 1e-8;

export function makeAabb(center: Vec2, halfExtents: Vec2): Aabb {
  return Object.freeze({
    minX: center.x - halfExtents.x,
    minY: center.y - halfExtents.y,
    maxX: center.x + halfExtents.x,
    maxY: center.y + halfExtents.y,
  });
}

export function translateAabb(box: Aabb, delta: Vec2): Aabb {
  return Object.freeze({
    minX: box.minX + delta.x,
    minY: box.minY + delta.y,
    maxX: box.maxX + delta.x,
    maxY: box.maxY + delta.y,
  });
}

export function intersectsAabb(a: Aabb, b: Aabb): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function axisSweep(
  movingMin: number,
  movingMax: number,
  staticMin: number,
  staticMax: number,
  delta: number
): { entry: number; exit: number } | null {
  if (Math.abs(delta) <= EPSILON) {
    if (movingMax <= staticMin || movingMin >= staticMax) return null;
    return { entry: Number.NEGATIVE_INFINITY, exit: Number.POSITIVE_INFINITY };
  }

  if (delta > 0) {
    return {
      entry: (staticMin - movingMax) / delta,
      exit: (staticMax - movingMin) / delta,
    };
  }

  return {
    entry: (staticMax - movingMin) / delta,
    exit: (staticMin - movingMax) / delta,
  };
}

export function sweepAabb(moving: Aabb, delta: Vec2, obstacle: Aabb): SweptAabbHit {
  if (intersectsAabb(moving, obstacle)) {
    return Object.freeze({
      hit: true,
      time: 0,
      normal: Object.freeze({ x: 0, y: 0 }),
      obstacle,
    });
  }

  const x = axisSweep(moving.minX, moving.maxX, obstacle.minX, obstacle.maxX, delta.x);
  const y = axisSweep(moving.minY, moving.maxY, obstacle.minY, obstacle.maxY, delta.y);
  if (!x || !y) return noHit();

  const entryTime = Math.max(x.entry, y.entry);
  const exitTime = Math.min(x.exit, y.exit);

  if (
    entryTime > exitTime ||
    entryTime < 0 ||
    entryTime > 1 ||
    (x.entry < 0 && y.entry < 0)
  ) {
    return noHit();
  }

  const normal =
    x.entry > y.entry
      ? { x: delta.x > 0 ? -1 : 1, y: 0 }
      : { x: 0, y: delta.y > 0 ? -1 : 1 };

  return Object.freeze({
    hit: true,
    time: Math.max(0, entryTime),
    normal: Object.freeze(normal),
    obstacle,
  });
}

export function resolveSweptAabb(
  moving: Aabb,
  delta: Vec2,
  obstacles: readonly Aabb[],
  options: { maxIterations?: number; skin?: number } = {}
): SweptAabbResolution {
  const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? 3));
  const skin = Math.max(0, options.skin ?? 0.0001);
  let current = moving;
  let remaining = { x: delta.x, y: delta.y };
  let applied = { x: 0, y: 0 };
  const collisions: SweptAabbHit[] = [];

  for (let i = 0; i < maxIterations; i += 1) {
    if (Math.abs(remaining.x) <= EPSILON && Math.abs(remaining.y) <= EPSILON) break;

    const hit = firstSweptAabbHit(current, remaining, obstacles);
    if (!hit.hit) {
      current = translateAabb(current, remaining);
      applied = { x: applied.x + remaining.x, y: applied.y + remaining.y };
      remaining = { x: 0, y: 0 };
      break;
    }

    collisions.push(hit);
    const travelTime = Math.max(0, hit.time - skin);
    const travel = { x: remaining.x * travelTime, y: remaining.y * travelTime };
    current = translateAabb(current, travel);
    applied = { x: applied.x + travel.x, y: applied.y + travel.y };

    const unspent = {
      x: remaining.x * (1 - hit.time),
      y: remaining.y * (1 - hit.time),
    };

    remaining = {
      x: hit.normal.x !== 0 ? 0 : unspent.x,
      y: hit.normal.y !== 0 ? 0 : unspent.y,
    };
  }

  return Object.freeze({
    position: Object.freeze({
      x: (moving.minX + moving.maxX) / 2 + applied.x,
      y: (moving.minY + moving.maxY) / 2 + applied.y,
    }),
    delta: Object.freeze(applied),
    collisions: Object.freeze(collisions),
  });
}

export function blockedTileAabbs(
  tiles: readonly { col: number; row: number; walkable: boolean }[],
  props: readonly { col: number; row: number; width?: number; blocksMovement: boolean }[] = []
): Aabb[] {
  const boxes = tiles
    .filter((tile) => !tile.walkable)
    .map((tile) => tileCellAabb(tile.col, tile.row, 1));

  for (const prop of props) {
    if (!prop.blocksMovement) continue;
    boxes.push(tileCellAabb(prop.col, prop.row, prop.width ?? 1));
  }

  return boxes;
}

function firstSweptAabbHit(moving: Aabb, delta: Vec2, obstacles: readonly Aabb[]): SweptAabbHit {
  let earliest = noHit();
  for (const obstacle of obstacles) {
    const hit = sweepAabb(moving, delta, obstacle);
    if (hit.hit && hit.time < earliest.time) earliest = hit;
  }
  return earliest;
}

function tileCellAabb(col: number, row: number, size: number): Aabb {
  const half = size / 2;
  return makeAabb({ x: col + 0.5, y: row + 0.5 }, { x: half, y: half });
}

function noHit(): SweptAabbHit {
  return Object.freeze({
    hit: false,
    time: 1,
    normal: Object.freeze({ x: 0, y: 0 }),
    obstacle: null,
  });
}
