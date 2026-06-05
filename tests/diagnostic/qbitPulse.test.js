import { describe, expect, it } from 'vitest';
import { BytecodeError, ERROR_CODES } from '../../codex/core/pixelbrain/bytecode-error.js';
import { encodeBytecodeHealth } from '../../codex/core/diagnostic/BytecodeHealth.js';
import { encodeBytecodeXPVaccineFromCccb, encodeBytecodeXPVaccineFromError, encodeBytecodeXPVaccineFromHealth } from '../../codex/core/diagnostic/BytecodeXPVaccine.js';
import {
  QBIT_PULSE_TYPE,
  buildQbitPulseNode,
  checksumQbitPulse,
  normalizeHotspots,
  verifyQbitPulseNode,
} from '../../codex/core/diagnostic/QbitPulse.js';

const HOTSPOTS = [
  { path: 'zeta.js', resonance: 0.2, reason: 'low match' },
  { path: 'alpha.js', resonance: 0.9, reason: 'same layer' },
  { path: 'beta.js', resonance: 1.8, reason: 'clamped high' },
  { path: 'alpha.js', resonance: 0.9, reason: 'bridge import' },
];

describe('QbitPulse', () => {
  it('builds deterministic pulse nodes from BytecodeXP vaccines', () => {
    const vaccine = encodeBytecodeXPVaccineFromError(new BytecodeError('VALUE', 'WARN', 'IMMUNE', ERROR_CODES.TEST_MISSING, {
      layer: 'coverage',
      sourceFile: 'codex/core/example.js',
      ruleId: 'TEST_MISSING',
    }));

    const a = buildQbitPulseNode(vaccine, { hotspots: HOTSPOTS });
    const b = buildQbitPulseNode(vaccine, { hotspots: HOTSPOTS });

    expect(a).toEqual(b);
    expect(a.qbitType).toBe(QBIT_PULSE_TYPE);
    expect(a.vaccineId).toBe(vaccine.vaccineId);
    expect(a.origin).toEqual({
      cellId: null,
      code: 'TEST_MISSING',
      path: 'codex/core/example.js',
    });
    expect(verifyQbitPulseNode(a)).toBe(true);
  });

  it('normalizes, bounds, sorts, and limits hotspots', () => {
    const normalized = normalizeHotspots(HOTSPOTS, { maxHotspots: 3 });

    expect(normalized).toEqual([
      { path: 'beta.js', resonance: 1, reason: 'clamped high' },
      { path: 'alpha.js', resonance: 0.9, reason: 'bridge import' },
      { path: 'alpha.js', resonance: 0.9, reason: 'same layer' },
    ]);
  });

  it('derives radius and confidence from normalized hotspots', () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const pulse = buildQbitPulseNode(vaccine, { hotspots: HOTSPOTS });

    expect(pulse.pulseRadius).toBe(1);
    expect(pulse.collapseConfidence).toBe(0.75);
  });

  it('clamps explicit pulse radius and collapse confidence', () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const pulse = buildQbitPulseNode(vaccine, {
      hotspots: [],
      pulseRadius: 12,
      collapseConfidence: -4,
    });

    expect(pulse.pulseRadius).toBe(1);
    expect(pulse.collapseConfidence).toBe(0);
  });

  it('changes checksum when hotspot identity changes', () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const a = buildQbitPulseNode(vaccine, {
      hotspots: [{ path: 'codex/a.js', resonance: 0.8, reason: 'same code' }],
    });
    const b = buildQbitPulseNode(vaccine, {
      hotspots: [{ path: 'codex/b.js', resonance: 0.8, reason: 'same code' }],
    });

    expect(a.checksum).not.toBe(b.checksum);
    expect(checksumQbitPulse(a)).toBe(a.checksum);
  });

  it('derives health origins from cell context', () => {
    const health = encodeBytecodeHealth('FIXTURE_SHAPE', 'fixture-clean', {
      moduleId: 'tests/example.test.js',
    });
    const vaccine = encodeBytecodeXPVaccineFromHealth(health);
    const pulse = buildQbitPulseNode(vaccine);

    expect(pulse.origin).toEqual({
      cellId: 'FIXTURE_SHAPE',
      code: 'fixture-clean',
      path: 'tests/example.test.js',
    });
    expect(pulse.pulseRadius).toBe(0);
    expect(pulse.collapseConfidence).toBe(0);
  });

  it('accepts vaccine bytecode without context', () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const pulse = buildQbitPulseNode(vaccine.bytecode);

    expect(pulse.vaccineId).toBe(vaccine.vaccineId);
    expect(pulse.origin).toEqual({
      cellId: null,
      code: null,
      path: null,
    });
  });

  it('rejects malformed pulse inputs', () => {
    expect(() => buildQbitPulseNode('not-bytecode')).toThrow(/Invalid BytecodeXP/);
    expect(() => normalizeHotspots([{ resonance: 0.7 }])).toThrow(/hotspot.path/);
  });

  it('freezes pulse nodes and nested hotspot data', () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const pulse = buildQbitPulseNode(vaccine, {
      hotspots: [{ path: 'codex/a.js', resonance: 0.8 }],
    });

    expect(() => { pulse.pulseRadius = 0.1; }).toThrow();
    expect(() => { pulse.hotspots[0].path = 'mutated.js'; }).toThrow();
    expect(pulse.hotspots[0].path).toBe('codex/a.js');
  });
});
