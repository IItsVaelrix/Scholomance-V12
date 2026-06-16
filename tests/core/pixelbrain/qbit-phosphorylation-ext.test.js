import { describe, it, expect } from 'vitest';
import { buildKinase } from '../../../codex/core/pixelbrain/qbit-phosphorylation.js';

const VALID_MATERIAL = {
  id: 'test_metal',
  anchors: { rim: '#FF0000', core: '#880000' },
  phosphorylationThreshold: 0.5,
};

const STUB_SDF = {
  type: 'circle',
  cx: 0,
  cy: 0,
  r: 50,
};

describe('buildKinase — QBIT energy extension', () => {
  it('backward compatibility: kinase.call with sdfValue+normal returns { color, confidence } without emission/materialBleed', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);
    expect(kinase.valid).toBe(true);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
    });

    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('confidence');
    expect(result.emission).toBeUndefined();
    expect(result.materialBleed).toBeUndefined();
  });

  it('with qbitEnergy=0 and zero gradient: emission=0, materialBleed=0', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('confidence');
    expect(result.emission).toBe(0);
    expect(result.materialBleed).toBe(0);
  });

  it('with qbitEnergy=1.0 and zero gradient: emission=0.8, materialBleed=0', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 1.0,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    expect(result.emission).toBe(0.8);
    expect(result.materialBleed).toBe(0);
  });

  it('with qbitEnergy=0.5 and gradient {gx:1, gy:0, gz:0}: emission=0.4, materialBleed=1.0', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.5,
      qbitGradient: { gx: 1, gy: 0, gz: 0 },
    });

    expect(result.emission).toBe(0.4);
    // gradientMagnitude = sqrt(1^2 + 0^2 + 0^2) = 1.0
    // materialBleed = min(1, 1.0 * 0.5 * 2.0) = min(1, 1.0) = 1.0
    expect(result.materialBleed).toBe(1.0);
  });

  it('emission is clamped to [0, 1]: qbitEnergy=2.0 produces emission=1.0 (not 1.6)', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 2.0,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    // emission = 2.0 * 0.8 = 1.6, clamped to 1.0
    expect(result.emission).toBe(1.0);
    expect(result.emission).toBeLessThanOrEqual(1);
  });

  it('materialBleed is clamped to [0, 1]: large gradient magnitude clamps correctly', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 1.0,
      qbitGradient: { gx: 10, gy: 10, gz: 10 },
    });

    // gradientMagnitude = sqrt(10^2 + 10^2 + 10^2) = sqrt(300) ≈ 17.32
    // materialBleed = min(1, 17.32 * 1.0 * 2.0) = min(1, 34.64) = 1.0
    expect(result.materialBleed).toBeLessThanOrEqual(1);
    expect(result.materialBleed).toBe(1.0);
  });

  it('color and confidence unchanged by presence of qbitEnergy: same values in old-style and new-style calls', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const oldStyleResult = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
    });

    const newStyleResult = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.5,
      qbitGradient: { gx: 1, gy: 0, gz: 0 },
    });

    expect(newStyleResult.color).toBe(oldStyleResult.color);
    expect(newStyleResult.confidence).toBe(oldStyleResult.confidence);
  });

  it('qbitGradient defaults to {gx:0, gy:0, gz:0} when not provided but qbitEnergy is: no error, materialBleed=0', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    // No qbitGradient provided — should default to zeros
    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.5,
      // qbitGradient intentionally omitted
    });

    expect(result).toHaveProperty('emission');
    expect(result).toHaveProperty('materialBleed');
    expect(result.emission).toBe(0.4); // 0.5 * 0.8
    expect(result.materialBleed).toBe(0); // zero gradient default
  });

  it('returns color/confidence/emission/materialBleed when qbitEnergy is present', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.75,
      qbitGradient: { gx: 0.5, gy: 0.5, gz: 0 },
    });

    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('emission');
    expect(result).toHaveProperty('materialBleed');
    expect(typeof result.emission).toBe('number');
    expect(typeof result.materialBleed).toBe('number');
  });

  it('emission formula: emission = qbitEnergy * 0.8, tested with qbitEnergy=0.25', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.25,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    expect(result.emission).toBe(0.2); // 0.25 * 0.8 = 0.2
  });

  it('materialBleed formula: min(1, gradientMagnitude * qbitEnergy * 2.0), tested with {gx:0.5, gy:0.5, gz:0}', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 0.3,
      qbitGradient: { gx: 0.5, gy: 0.5, gz: 0 },
    });

    // gradientMagnitude = sqrt(0.5^2 + 0.5^2 + 0^2) = sqrt(0.5) ≈ 0.707
    // materialBleed = min(1, 0.707 * 0.3 * 2.0) = min(1, 0.424) ≈ 0.424
    const expectedMaterialBleed = Math.min(1, Math.sqrt(0.5) * 0.3 * 2.0);
    expect(result.materialBleed).toBeCloseTo(expectedMaterialBleed, 5);
  });

  it('qbitEnergy at boundary 1.25 produces emission=1.0 (clamped)', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: 1.25,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    // emission = 1.25 * 0.8 = 1.0 (exactly at clamp boundary)
    expect(result.emission).toBe(1.0);
  });

  it('qbitEnergy undefined returns no emission/materialBleed fields (backward compat)', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: undefined,
      qbitGradient: { gx: 0, gy: 0, gz: 0 },
    });

    expect(result.emission).toBeUndefined();
    expect(result.materialBleed).toBeUndefined();
  });

  it('qbitEnergy null is treated same as undefined: backward compat', () => {
    const kinase = buildKinase(VALID_MATERIAL, STUB_SDF);

    const result = kinase.call({
      sdfValue: -10,
      normal: { nx: -0.707, ny: -0.707 },
      qbitEnergy: null,
    });

    expect(result.emission).toBeUndefined();
    expect(result.materialBleed).toBeUndefined();
  });
});
