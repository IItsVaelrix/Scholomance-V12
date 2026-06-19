import { describe, expect, it } from 'vitest';

import {
  blockedTileAabbs,
  makeAabb,
  resolveSweptAabb,
  sweepAabb,
  translateAabb,
} from '../../../src/game/iso/math/sweptAabb';

describe('sweptAabb', () => {
  it('detects a wall hit across a large single-frame delta', () => {
    const actor = makeAabb({ x: 0, y: 0 }, { x: 0.25, y: 0.25 });
    const wall = makeAabb({ x: 2, y: 0 }, { x: 0.25, y: 1 });

    const hit = sweepAabb(actor, { x: 4, y: 0 }, wall);

    expect(hit.hit).toBe(true);
    expect(hit.time).toBeCloseTo(0.375);
    expect(hit.normal).toEqual({ x: -1, y: 0 });
  });

  it('does not report a collision when the swept box misses on the other axis', () => {
    const actor = makeAabb({ x: 0, y: 0 }, { x: 0.25, y: 0.25 });
    const wall = makeAabb({ x: 2, y: 3 }, { x: 0.25, y: 0.25 });

    expect(sweepAabb(actor, { x: 4, y: 0 }, wall).hit).toBe(false);
  });

  it('slides along a blocking wall by preserving the unblocked axis', () => {
    const actor = makeAabb({ x: 0, y: 0 }, { x: 0.25, y: 0.25 });
    const wall = makeAabb({ x: 1, y: 0.5 }, { x: 0.25, y: 2 });

    const result = resolveSweptAabb(actor, { x: 2, y: 1 }, [wall], { skin: 0 });

    expect(result.collisions).toHaveLength(1);
    expect(result.delta.x).toBeCloseTo(0.5);
    expect(result.delta.y).toBeCloseTo(1);
    expect(result.position).toEqual({ x: 0.5, y: 1 });
  });

  it('reports time zero for an initial overlap', () => {
    const actor = makeAabb({ x: 0, y: 0 }, { x: 0.5, y: 0.5 });
    const wall = translateAabb(actor, { x: 0.25, y: 0 });

    const hit = sweepAabb(actor, { x: 1, y: 0 }, wall);

    expect(hit.hit).toBe(true);
    expect(hit.time).toBe(0);
  });

  it('builds collision boxes from blocked tiles and movement-blocking props', () => {
    const boxes = blockedTileAabbs(
      [
        { col: 0, row: 0, walkable: true },
        { col: 1, row: 0, walkable: false },
      ],
      [
        { col: 2, row: 0, width: 1, blocksMovement: true },
        { col: 3, row: 0, width: 1, blocksMovement: false },
      ]
    );

    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({ minX: 1, minY: 0, maxX: 2, maxY: 1 });
    expect(boxes[1]).toEqual({ minX: 2, minY: 0, maxX: 3, maxY: 1 });
  });
});
