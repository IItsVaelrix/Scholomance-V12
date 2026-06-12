import { describe, it, expect } from 'vitest';
import {
  applyFlameTipCellularAutomata,
  buildFlameTipCellularAutomataPayload,
  FLAME_TIP_CA_ID,
} from '../../../codex/core/pixelbrain/flame-tip-ca.js';

function buildFlameCoordinates() {
  const coords = [];
  for (let y = 0; y < 10; y += 1) {
    const radius = Math.max(0, 4 - y);
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = 5 + dx;
      const isCenter = dx === 0;
      const isEdge = Math.abs(dx) === radius;
      const color = isCenter
        ? '#F8FCFF'
        : isEdge
          ? '#F59E0B'
          : '#FDE68A';
      coords.push({ x, y, color });
    }
  }
  return coords;
}

function buildJaggedTipCoordinates() {
  const coords = [];
  for (let y = 4; y < 12; y += 1) {
    const radius = Math.max(0, 3 - Math.floor((y - 4) / 2));
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = 6 + dx;
      coords.push({ x, y, color: dx === 0 ? '#FFFFFF' : '#F59E0B' });
    }
  }
  coords.push({ x: 4, y: 0, color: '#F59E0B' });
  coords.push({ x: 8, y: 0, color: '#F59E0B' });
  coords.push({ x: 5, y: 0, color: '#F8FCFF' });
  return coords;
}

describe('FlameTipCellularAutomata', () => {
  it('removes jagged isolated cells and refines the tip silhouette', () => {
    const coordinates = buildJaggedTipCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({
      coordinates,
      materialId: 'holy_fire',
    });

    expect(payload.amp).toBe(FLAME_TIP_CA_ID);
    expect(payload.metadata.iterations).toBeGreaterThan(0);
    expect(payload.diagnostics.changedCount).toBeGreaterThanOrEqual(0);
    expect(payload.outputCoordinates.length).toBeLessThanOrEqual(coordinates.length);
  });

  it('runs the configured iteration count from the material profile', () => {
    const coordinates = buildFlameCoordinates();
    const icy = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'icy_fire' });
    const shadow = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'shadow_fire' });

    expect(icy.metadata.iterationsConfigured).toBe(4);
    expect(shadow.metadata.iterationsConfigured).toBe(3);
    expect(icy.metadata.iterations).toBe(4);
    expect(shadow.metadata.iterations).toBe(3);
  });

  it('returns deterministic output for the same input', () => {
    const coordinates = buildFlameCoordinates();
    const payloadA = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });
    const payloadB = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });

    expect(payloadA.inputHash).toBe(payloadB.inputHash);
    expect(payloadA.outputCoordinates).toEqual(payloadB.outputCoordinates);
    expect(payloadA.metadata).toEqual(payloadB.metadata);
  });

  it('records the top-region span in metadata', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });

    expect(payload.metadata.topRegionYMin).toBe(0);
    expect(payload.metadata.topRegionYMax).toBeGreaterThan(0);
    expect(payload.metadata.gridWidth).toBeGreaterThan(0);
    expect(payload.metadata.gridHeight).toBeGreaterThan(0);
  });

  it('skips CA processing when disabled and tags every cell as passthrough', () => {
    const coordinates = buildFlameCoordinates();
    const output = applyFlameTipCellularAutomata(coordinates, { enabled: false, material: 'holy_fire' });

    expect(output.length).toBe(coordinates.length);
    for (let i = 0; i < output.length; i += 1) {
      expect(output[i].flameTipCA).toBe('passthrough');
      expect(output[i].x).toBe(coordinates[i].x);
      expect(output[i].y).toBe(coordinates[i].y);
    }
  });

  it('skips CA processing when iterations=0', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({
      coordinates,
      materialId: 'holy_fire',
      options: { iterations: 0 },
    });

    expect(payload.metadata.iterations).toBe(0);
    expect(payload.diagnostics.changedCount).toBe(0);
    expect(payload.outputCoordinates.length).toBe(coordinates.length);
  });

  it('preserves white-core cells even when CA would otherwise prune them', () => {
    const coordinates = buildJaggedTipCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({
      coordinates,
      materialId: 'holy_fire',
    });

    const apexCore = coordinates.filter((c) => c.color === '#F8FCFF' || c.color === '#FFFFFF');
    expect(apexCore.length).toBeGreaterThan(0);
    for (const core of apexCore) {
      const kept = payload.outputCoordinates.some(
        (c) => c.x === core.x && c.y === core.y
      );
      expect(kept).toBe(true);
    }
  });

  it('enables apex pruning for holy_fire and shadow_fire', () => {
    const coordinates = buildFlameCoordinates();
    const holy = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });
    const shadow = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'shadow_fire' });
    const icy = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'icy_fire' });

    expect(holy.metadata.apexPruneActive).toBe(true);
    expect(shadow.metadata.apexPruneActive).toBe(true);
    expect(icy.metadata.apexPruneActive).toBe(false);
  });

  it('exposes a frozen payload with the canonical amp id and version', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });

    expect(payload.amp).toBe('pixelbrain.flame-tip-ca');
    expect(payload.version).toBe('1.0.0');
    expect(payload.material).toBe('holy_fire');
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.metadata)).toBe(true);
  });

  it('handles empty coordinates safely', () => {
    const payload = buildFlameTipCellularAutomataPayload({ coordinates: [], materialId: 'holy_fire' });
    expect(payload.outputCoordinates).toEqual([]);
    expect(payload.metadata.iterations).toBe(0);
    expect(payload.diagnostics.coordinateCount).toBe(0);
  });

  it('shrinks or refines the top region but does not touch body cells', () => {
    const coordinates = buildFlameCoordinates();
    const bodyBefore = coordinates.filter((c) => c.y >= 6);
    const payload = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });
    const bodyAfter = payload.outputCoordinates.filter((c) => c.y >= 6);

    expect(bodyAfter.length).toBe(bodyBefore.length);
  });

  it('produces a smaller or equal top region after CA iterations', () => {
    const coordinates = buildJaggedTipCoordinates();
    const payload = buildFlameTipCellularAutomataPayload({ coordinates, materialId: 'holy_fire' });
    const topBefore = coordinates.filter((c) => c.y < 4).length;
    const topAfter = payload.outputCoordinates.filter((c) => c.y < 4).length;
    expect(topAfter).toBeLessThanOrEqual(topBefore);
  });
});
