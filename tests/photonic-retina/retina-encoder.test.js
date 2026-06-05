import { describe, expect, it } from 'vitest';
import { simulateRetinaEncoding } from '../../src/lib/photonic-retina/retina-encoder.js';
import {
  normalizeRetinaConfig,
  validateRetinaInput,
} from '../../src/lib/photonic-retina/retina-schema.js';

function sampleInput() {
  return validateRetinaInput({
    sourceKind: 'coordinates',
    payload: [
      { x: 1, y: 2, color: '#ffffff', emphasis: 1 },
      { x: 3, y: 4, color: '#44ccff', emphasis: 0.5 },
    ],
  });
}

describe('retina-encoder', () => {
  it('creates the same packet ID for the same input and config', () => {
    const config = normalizeRetinaConfig({ targetDimension: 16 });
    const input = sampleInput();

    const first = simulateRetinaEncoding(input, config);
    const second = simulateRetinaEncoding(input, config);

    expect(first.packetId).toBe(second.packetId);
  });

  it('creates the same byte data for the same input and config', () => {
    const config = normalizeRetinaConfig({ targetDimension: 16 });
    const input = sampleInput();

    const first = simulateRetinaEncoding(input, config);
    const second = simulateRetinaEncoding(input, config);

    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });

  it('changes config hash when config changes', () => {
    const input = sampleInput();
    const first = simulateRetinaEncoding(input, normalizeRetinaConfig({ targetDimension: 16 }));
    const second = simulateRetinaEncoding(input, normalizeRetinaConfig({ targetDimension: 32 }));

    expect(first.metadata.configHash).not.toBe(second.metadata.configHash);
    expect(first.packetId).not.toBe(second.packetId);
  });

  it('binary sign quantization only emits -1, 0, or 1', () => {
    const packet = simulateRetinaEncoding(
      sampleInput(),
      normalizeRetinaConfig({ quantizationKind: 'binary-sign', targetDimension: 16 })
    );

    expect(Array.from(packet.data).every((value) => [-1, 0, 1].includes(value))).toBe(true);
  });

  it('scalar quantization stays inside int8 range', () => {
    const packet = simulateRetinaEncoding(
      sampleInput(),
      normalizeRetinaConfig({ bitWidth: 8, targetDimension: 16 })
    );

    expect(Array.from(packet.data).every((value) => value >= -128 && value <= 127)).toBe(true);
  });

  it('marks packet metadata as deterministic', () => {
    const packet = simulateRetinaEncoding(sampleInput(), normalizeRetinaConfig());

    expect(packet.metadata.deterministic).toBe(true);
    expect(packet.metadata.generatedBy).toBe('photonic-retina');
  });

  it('folds seed into packet identity and emitted bytes', () => {
    const input = sampleInput();
    const first = simulateRetinaEncoding(
      input,
      normalizeRetinaConfig({ seed: 'left', targetDimension: 32 })
    );
    const second = simulateRetinaEncoding(
      input,
      normalizeRetinaConfig({ seed: 'right', targetDimension: 32 })
    );

    expect(first.packetId).not.toBe(second.packetId);
    expect(Array.from(first.data)).not.toEqual(Array.from(second.data));
  });

  it('preserves a non-zero color channel for string colors', () => {
    const config = normalizeRetinaConfig({
      rotationKind: 'none',
      targetDimension: 5,
    });
    const colors = simulateRetinaEncoding(
      validateRetinaInput({ sourceKind: 'colors', payload: ['#44ccff'] }),
      config
    );
    const coordinates = simulateRetinaEncoding(
      validateRetinaInput({
        sourceKind: 'coordinates',
        payload: [{ x: 0, y: 0, z: 0, emphasis: 0, color: '#44ccff' }],
      }),
      config
    );

    expect(colors.data[0]).not.toBe(0);
    expect(coordinates.data[4]).not.toBe(0);
  });
});
