import { describe, expect, it } from 'vitest';
import {
  createRetinaDiagnosticsSnapshot,
  createRetinaReplayEntry,
  encodeToPhotonicRetina,
  replayRetinaEntries,
} from '../../src/lib/photonic-retina/index.js';

const input = {
  sourceKind: 'coordinates',
  payload: [{ x: 5, y: 7, color: '#44ccff', emphasis: 1 }],
  dimensions: { width: 10, height: 10 },
};

describe('retina diagnostics and replay', () => {
  it('summarizes packet data for visual diagnostics consumers', () => {
    const packet = encodeToPhotonicRetina(input, { targetDimension: 8 });
    const snapshot = createRetinaDiagnosticsSnapshot(packet);

    expect(snapshot.ok).toBe(true);
    expect(snapshot.packetId).toBe(packet.packetId);
    expect(snapshot.dataSummary.length).toBe(8);
    expect(snapshot.dataSummary.checksum).toMatch(/^[A-F0-9]+$/);
  });

  it('replays recorded entries and verifies packet identity', () => {
    const entry = createRetinaReplayEntry(input, { targetDimension: 8 });
    const [result] = replayRetinaEntries([entry]);

    expect(result.matches).toBe(true);
    expect(result.packet.packetId).toBe(entry.packetId);
  });

  it('snapshots replay inputs against caller mutation', () => {
    const mutableInput = {
      sourceKind: 'coordinates',
      payload: [{ x: 1, y: 2, color: '#ffffff' }],
    };
    const mutableOptions = { targetDimension: 8 };
    const entry = createRetinaReplayEntry(mutableInput, mutableOptions);

    mutableInput.payload[0].x = 99;
    mutableOptions.targetDimension = 16;

    const [result] = replayRetinaEntries([entry]);

    expect(result.matches).toBe(true);
    expect(result.packet.dimension).toBe(8);
  });

  it('treats repeated null packet replay as a match', () => {
    const entry = createRetinaReplayEntry(input, { mode: 'off' });
    const [result] = replayRetinaEntries([entry]);

    expect(result.matches).toBe(true);
    expect(result.packet).toBeNull();
    expect(result.expectedPacketId).toBeNull();
  });
});
