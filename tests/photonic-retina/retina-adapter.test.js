import { describe, expect, it, vi } from 'vitest';
import {
  encodeToPhotonicRetina,
} from '../../src/lib/photonic-retina/index.js';
import { RETINA_MODES } from '../../src/lib/photonic-retina/retina.config.js';

describe('retina-adapter', () => {
  it('returns null in off mode', () => {
    const packet = encodeToPhotonicRetina(
      { sourceKind: 'coordinates', payload: [] },
      { mode: RETINA_MODES.OFF }
    );

    expect(packet).toBeNull();
  });

  it('returns a packet in shadow mode', () => {
    const packet = encodeToPhotonicRetina({
      sourceKind: 'coordinates',
      payload: [{ x: 1, y: 2 }],
    });

    expect(packet.packetId).toMatch(/^retina_v1_/);
  });

  it('returns null on invalid input in warn mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const packet = encodeToPhotonicRetina(
      { sourceKind: 'bad-source', payload: [] },
      { mode: RETINA_MODES.WARN }
    );

    expect(packet).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('throws on invalid input in gate mode', () => {
    expect(() => encodeToPhotonicRetina(
      { sourceKind: 'bad-source', payload: [] },
      { mode: RETINA_MODES.GATE }
    )).toThrow('Invalid Photonic Retina sourceKind');
  });

  it('does not throw in default shadow mode', () => {
    expect(() => encodeToPhotonicRetina({ sourceKind: 'bad-source', payload: [] })).not.toThrow();
    expect(encodeToPhotonicRetina({ sourceKind: 'bad-source', payload: [] })).toBeNull();
  });
});
