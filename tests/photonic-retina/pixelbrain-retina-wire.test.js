import { describe, expect, it } from 'vitest';
import { buildPixelBrainPhotonicRoute } from '../../src/lib/pixelbrain.adapter.js';

const coordinates = [
  { snappedX: 4, snappedY: 8, color: '#44ccff', emphasis: 0.5 },
  { x: 12, y: 16, color: '#ffffff', emphasis: 1 },
  { x: 24, y: 32, color: '#111111', pressure: 0.25 },
];

describe('PixelBrain Photonic Retina wire', () => {
  it('routes PixelBrain coordinates through the Retina bridge', () => {
    const route = buildPixelBrainPhotonicRoute({
      coordinates,
      palettes: [{ key: 'void', colors: ['#44ccff'] }],
      canvas: { width: 64, height: 64 },
    });

    expect(route.ok).toBe(true);
    expect(route.packet.sourceKind).toBe('coordinates');
    expect(route.packet.metadata.generatedBy).toBe('photonic-retina');
    expect(route.bridgeReport.packetId).toBe(route.packet.packetId);
    expect(route.preview.values.length).toBeGreaterThan(0);
    expect(route.opticalSimulation.softwareOnly).toBe(true);
  });

  it('returns null for empty PixelBrain coordinate payloads', () => {
    const route = buildPixelBrainPhotonicRoute({
      coordinates: [],
      palettes: [],
      canvas: { width: 64, height: 64 },
    });

    expect(route).toBeNull();
  });

  it('uses previous packets to emit compressed deltas', () => {
    const first = buildPixelBrainPhotonicRoute({
      coordinates,
      palettes: [],
      canvas: { width: 64, height: 64 },
    });

    const second = buildPixelBrainPhotonicRoute(
      {
        coordinates: [
          ...coordinates,
          { x: 44, y: 48, color: '#ffcc44', emphasis: 1 },
        ],
        palettes: [],
        canvas: { width: 64, height: 64 },
      },
      { previousPacket: first.packet }
    );

    expect(second.delta.ok).toBe(true);
    expect(second.delta.fromPacketId).toBe(first.packet.packetId);
    expect(second.delta.changedCount).toBeGreaterThan(0);
    expect(second.delta.runs.length).toBeGreaterThan(0);
  });
});
