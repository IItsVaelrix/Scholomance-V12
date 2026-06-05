import { describe, expect, it } from 'vitest';
import {
  encodeToPhotonicRetina,
  routeRetinaPacketToPhotonicBridge,
} from '../../src/lib/photonic-retina/index.js';

const coordinateInput = {
  sourceKind: 'coordinates',
  dimensions: { width: 64, height: 64 },
  payload: [
    { x: 4, y: 8, color: '#44ccff', emphasis: 0.5 },
    { x: 12, y: 16, color: '#ffffff', emphasis: 1 },
    { x: 24, y: 32, color: '#111111', emphasis: 0.25 },
  ],
};

describe('retina bridge phase 3 routing', () => {
  it('routes raw Retina input into the Photonic Quantization Bridge', () => {
    const route = routeRetinaPacketToPhotonicBridge(coordinateInput, {
      retina: { targetDimension: 16, bitWidth: 4 },
      bridge: { mode: 'shadow' },
    });

    expect(route.ok).toBe(true);
    expect(route.packet.packetId).toMatch(/^retina_v1_/);
    expect(route.bridgeReport.packetId).toBe(route.packet.packetId);
    expect(route.bridgeReport.operationGraph).not.toBeNull();
    expect(route.routeId).toMatch(/^retina_bridge_[A-F0-9]+$/);
  });

  it('keeps route artifacts deterministic for identical input', () => {
    const options = {
      retina: { targetDimension: 16, bitWidth: 4 },
      bridge: { mode: 'shadow' },
      previewLength: 8,
    };

    const first = routeRetinaPacketToPhotonicBridge(coordinateInput, options);
    const second = routeRetinaPacketToPhotonicBridge(coordinateInput, options);

    expect(first.routeId).toBe(second.routeId);
    expect(first.preview.previewHash).toBe(second.preview.previewHash);
    expect(first.opticalSimulation.simulationHash).toBe(second.opticalSimulation.simulationHash);
  });

  it('accepts an already encoded Retina packet without re-encoding', () => {
    const packet = encodeToPhotonicRetina(coordinateInput, {
      targetDimension: 16,
      bitWidth: 4,
    });
    const route = routeRetinaPacketToPhotonicBridge(packet, {
      bridge: { mode: 'shadow' },
    });

    expect(route.packet).toBe(packet);
    expect(route.bridgeReport.packetId).toBe(packet.packetId);
  });

  it('creates bounded low-bit previews from packet data', () => {
    const route = routeRetinaPacketToPhotonicBridge(coordinateInput, {
      retina: { targetDimension: 16, bitWidth: 4 },
      previewLength: 6,
    });

    expect(route.preview.ok).toBe(true);
    expect(route.preview.values).toHaveLength(6);
    expect(
      route.preview.buckets.negative
      + route.preview.buckets.zero
      + route.preview.buckets.positive
    ).toBe(6);
    expect(route.preview.previewHash).toMatch(/^[A-F0-9]+$/);
  });

  it('compresses packet deltas into nonzero runs', () => {
    const previousPacket = encodeToPhotonicRetina(coordinateInput, {
      targetDimension: 16,
      bitWidth: 4,
    });
    const route = routeRetinaPacketToPhotonicBridge(
      {
        ...coordinateInput,
        payload: [
          ...coordinateInput.payload,
          { x: 48, y: 51, color: '#ffcc44', emphasis: 1 },
        ],
      },
      {
        retina: { targetDimension: 16, bitWidth: 4 },
        previousPacket,
      }
    );

    expect(route.delta.ok).toBe(true);
    expect(route.delta.fromPacketId).toBe(previousPacket.packetId);
    expect(route.delta.toPacketId).toBe(route.packet.packetId);
    expect(route.delta.changedCount).toBeGreaterThan(0);
    expect(route.delta.runs.length).toBeGreaterThan(0);
    expect(route.delta.deltaHash).toMatch(/^[A-F0-9]+$/);
  });

  it('marks optical operation simulation as software-only', () => {
    const route = routeRetinaPacketToPhotonicBridge(coordinateInput, {
      retina: { targetDimension: 16, bitWidth: 4 },
    });

    expect(route.opticalSimulation.softwareOnly).toBe(true);
    expect(route.opticalSimulation.hardwareBacked).toBe(false);
    expect(route.opticalSimulation.operationCount).toBeGreaterThan(0);
    expect(route.opticalSimulation.opticalFit).toBeGreaterThanOrEqual(0);
    expect(route.opticalSimulation.opticalFit).toBeLessThanOrEqual(1);
    expect(route.opticalSimulation.simulationHash).toMatch(/^[A-F0-9]+$/);
  });
});
