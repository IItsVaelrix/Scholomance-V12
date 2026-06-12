import { describe, it, expect } from 'vitest';
import {
  applyFlameTipGeometry,
  buildFlameTipAmpPayload,
  FLAME_TIP_AMP_ID,
} from '../../../codex/core/pixelbrain/flame-tip-amp.js';

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
          ? '#0EA5E9'
          : '#7DD3FC';
      coords.push({ x, y, color });
    }
  }
  return coords;
}

describe('FlameTipAmp', () => {
  it('classifies top-region coordinates as tip-core, taper-shoulder, or tip-edge', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'icy_fire',
    });

    const tipCoreCoords = payload.taperField.filter((c) => c.role === 'tip-core');
    const shoulderCoords = payload.taperField.filter((c) => c.role === 'taper-shoulder');
    const bodyCoords = payload.taperField.filter((c) => c.role === 'body');

    expect(tipCoreCoords.length).toBeGreaterThan(0);
    expect(shoulderCoords.length).toBeGreaterThan(0);
    expect(bodyCoords.length).toBeGreaterThan(0);
    expect(
      payload.metadata.tipCoreCount
        + payload.metadata.taperShoulderCount
        + payload.metadata.tipEdgeCount
        + payload.metadata.bodyCount
    ).toBe(coordinates.length);
  });

  it('preserves white core highlights at the tip', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'icy_fire',
    });

    const tipCoreOutputs = payload.outputCoordinates.filter((c) => c.flameTipRole === 'tip-core');
    const whiteCoreOutputs = tipCoreOutputs.filter((c) => c.preFlameTipColor === '#F8FCFF');

    expect(whiteCoreOutputs.length).toBeGreaterThan(0);
    for (const coord of whiteCoreOutputs) {
      const afterRgb = hexToRgb(coord.color);
      const afterLuma = (0.2126 * afterRgb.r + 0.7152 * afterRgb.g + 0.0722 * afterRgb.b) / 255;
      expect(afterLuma).toBeGreaterThan(0.85);
    }
  });

  it('records bounding box and top-region span in metadata', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'holy_fire',
    });

    const bbox = payload.metadata.boundingBox;
    expect(bbox).not.toBeNull();
    expect(bbox.minX).toBe(1);
    expect(bbox.maxX).toBe(9);
    expect(bbox.minY).toBe(0);
    expect(bbox.maxY).toBe(9);
    expect(payload.metadata.topRegionYMin).toBe(bbox.minY);
    expect(payload.metadata.topRegionYMax).toBeGreaterThan(bbox.minY);
    expect(payload.metadata.topRegionYMax).toBeLessThanOrEqual(bbox.maxY);
    expect(payload.metadata.taperProfile).toBe('normal');
  });

  it('returns deterministic output for the same input', () => {
    const coordinates = buildFlameCoordinates();
    const payloadA = buildFlameTipAmpPayload({ coordinates, materialId: 'icy_fire' });
    const payloadB = buildFlameTipAmpPayload({ coordinates, materialId: 'icy_fire' });

    expect(payloadA.inputHash).toBe(payloadB.inputHash);
    expect(payloadA.outputCoordinates).toEqual(payloadB.outputCoordinates);
    expect(payloadA.taperField).toEqual(payloadB.taperField);
    expect(payloadA.metadata).toEqual(payloadB.metadata);
  });

  it('uses material-specific profile and tapers differently per material', () => {
    const coordinates = buildFlameCoordinates();
    const narrow = buildFlameTipAmpPayload({ coordinates, materialId: 'icy_fire' });
    const wide = buildFlameTipAmpPayload({ coordinates, materialId: 'shadow_fire' });

    expect(narrow.metadata.taperProfile).toBe('narrow');
    expect(wide.metadata.taperProfile).toBe('wide');
    expect(narrow.metadata.taperPower).toBeGreaterThan(wide.metadata.taperPower);
  });

  it('leaves body cells unchanged when bodyPassthrough is true', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'icy_fire',
    });

    const bodyOutputs = payload.outputCoordinates.filter((c) => c.flameTipRole === 'body');
    for (const coord of bodyOutputs) {
      expect(coord.preFlameTipColor).toBe(coord.color);
    }
  });

  it('is conservative for source material and never crushes dark cells', () => {
    const coordinates = buildFlameCoordinates().map((c) => ({ ...c, color: '#7DD3FC' }));
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'source',
    });

    for (const coord of payload.outputCoordinates) {
      const rgb = hexToRgb(coord.color);
      const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
      expect(luma).toBeGreaterThan(0.05);
    }
  });

  it('skips taper processing when disabled and tags every cell as body', () => {
    const coordinates = buildFlameCoordinates();
    const output = applyFlameTipGeometry(coordinates, { enabled: false, material: 'icy_fire' });

    for (let i = 0; i < output.length; i += 1) {
      expect(output[i].flameTipRole).toBe('body');
      expect(output[i].color).toBe(coordinates[i].color);
      expect(output[i].flameTipMaterial).toBe('icy_fire');
    }
  });

  it('exposes a frozen payload with the canonical amp id and version', () => {
    const coordinates = buildFlameCoordinates();
    const payload = buildFlameTipAmpPayload({ coordinates, materialId: 'holy_fire' });

    expect(payload.amp).toBe(FLAME_TIP_AMP_ID);
    expect(payload.amp).toBe('pixelbrain.flame-tip-amp');
    expect(payload.version).toBe('1.0.0');
    expect(payload.material).toBe('holy_fire');
    expect(payload.diagnostics.coordinateCount).toBe(coordinates.length);
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.metadata)).toBe(true);
  });

  it('handles empty coordinates safely', () => {
    const payload = buildFlameTipAmpPayload({ coordinates: [], materialId: 'icy_fire' });
    expect(payload.outputCoordinates).toEqual([]);
    expect(payload.taperField).toEqual([]);
    expect(payload.metadata.boundingBox).toBeNull();
    expect(payload.diagnostics.coordinateCount).toBe(0);
  });

  it('uses spark-drift awareness to dampen tip-core mixing for isolated cells', () => {
    const coordinates = buildFlameCoordinates();
    const isolatedVector = [
      { x: 5, y: 0, direction: { x: 0, y: -1 }, normal: { x: 0, y: -1 }, role: 'spark-drift', confidence: 0.6 },
    ];
    const payload = buildFlameTipAmpPayload({
      coordinates,
      materialId: 'icy_fire',
      vectorField: isolatedVector,
    });
    const sparkCoord = payload.outputCoordinates.find((c) => c.x === 5 && c.y === 0);
    expect(sparkCoord.flameTipRole).toBe('tip-core');
    expect(sparkCoord.preFlameTipColor).toBeDefined();
  });
});

function hexToRgb(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const value = parseInt(raw, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}
