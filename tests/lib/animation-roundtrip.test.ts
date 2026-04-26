import { describe, it, expect } from 'vitest';
import { encodeMotionBytecode, decodeMotionBytecode } from '../../src/codex/animation/bytecode/encodeMotionBytecode';

describe('Animation Bytecode Round-trip', () => {
  it('encodes and decodes motion output with byte-parity', () => {
    const fixture = {
      version: '1.0.0',
      targetId: 'test-element',
      ok: true,
      renderer: 'css',
      values: {
        durationMs: 300,
        delayMs: 0,
        easing: 'ease-out',
        translateX: 120,
        translateY: -45,
        scale: 1.12,
        scaleX: 1,
        scaleY: 1,
        rotateDeg: 45,
        opacity: 0.85,
        glow: 0.4,
        loop: false,
        originX: 50,
        originY: 50,
      },
      diagnostics: [],
      trace: []
    };

    const bytecode = encodeMotionBytecode(fixture);
    const decoded = decodeMotionBytecode(bytecode);

    expect(decoded.opacity).toBeCloseTo(fixture.values.opacity, 2);
    expect(decoded.scale).toBeCloseTo(fixture.values.scale, 2);
    expect(decoded.translateX).toBe(fixture.values.translateX);
    expect(decoded.translateY).toBe(fixture.values.translateY);
    expect(decoded.rotateDeg).toBe(fixture.values.rotateDeg);
    expect(decoded.glow).toBeCloseTo(fixture.values.glow, 2);
  });
});
