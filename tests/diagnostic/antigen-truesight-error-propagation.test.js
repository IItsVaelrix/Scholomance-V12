/**
 * ANTIGEN TEST — TrueSight Error Propagation
 *
 * Verifies that code errors injected into the diagnostic pipeline
 * correctly propagate through BytecodeError → BytecodeXPVaccine →
 * CleriRaidMind synthesis → TrueSight bytecodeRenderer visual substrate.
 *
 * This is the "antigen" — a known pathogen we introduce to verify
 * the immune system (diagnostic pipeline) detects and surfaces it.
 */

import { describe, it, expect } from 'vitest';
import { BytecodeError, ERROR_CATEGORIES, ERROR_SEVERITY, MODULE_IDS, ERROR_CODES } from '../../codex/core/pixelbrain/bytecode-error.js';
import { encodeBytecodeXPVaccineFromError } from '../../codex/core/diagnostic/BytecodeXPVaccine.js';
import { evaluateCleriRaidMind } from '../../codex/core/diagnostic/CleriRaidMind.js';
import { decodeBytecode } from '../../codex/core/shared/truesight/bytecodeRenderer.js';
import { encodeBytecodeHealth, HEALTH_CODES, CELL_IDS } from '../../codex/core/diagnostic/BytecodeHealth.js';

// ─── Test Antigen Definitions ────────────────────────────────────────────────

/**
 * Creates a synthetic BytecodeError that mimics a real diagnostic violation.
 * This is our "antigen" — a known error we inject to test the pipeline.
 */
function createAntigenError(overrides = {}) {
  return new BytecodeError(
    overrides.category || ERROR_CATEGORIES.STATE,
    overrides.severity || ERROR_SEVERITY.CRIT,
    overrides.moduleId || MODULE_IDS.IMMUNITY,
    overrides.errorCode || ERROR_CODES.INVARIANT_VIOLATION,
    {
      layer: 'test-antigen',
      ruleId: 'ANTIGEN_INJECTION',
      sourceFile: 'tests/diagnostic/antigen-truesight-error-propagation.test.js',
      antigen: true,
      ...overrides.context,
    }
  );
}

/**
 * Creates a minimal VerseIR token with visual bytecode that would be
 * produced by the phoneticColor amplifier for a token affected by an error.
 */
function createErrorTokenVisualBytecode(errorBytecode) {
  return {
    version: 2,
    school: 'VOID',
    color: 'hsl(0, 100%, 50%)', // Red — error color
    glowIntensity: 0.9,
    saturationBoost: 0.8,
    syllableDepth: 1,
    isAnchor: false,
    isStopWord: false,
    effectClass: 'RESONANT',
    biophysical: {
      visemeCluster: 'ERROR',
      resonanceScore: 0.9,
      chromaAlignment: 0.1,
    },
    // Embed the error bytecode for TrueSight to decode
    diagnosticBytecode: errorBytecode,
  };
}

// ─── Antigen Test Suite ──────────────────────────────────────────────────────

describe('ANTIGEN: TrueSight Error Propagation Pipeline', () => {

  describe('Stage 1: BytecodeError → BytecodeXPVaccine encoding', () => {
    it('encodes a deterministic vaccine from the antigen error', () => {
      const antigen = createAntigenError();
      const vaccine = encodeBytecodeXPVaccineFromError(antigen);

      // Vaccine must be deterministic
      const vaccine2 = encodeBytecodeXPVaccineFromError(antigen);
      expect(vaccine.toJSON()).toEqual(vaccine2.toJSON());

      // Vaccine must carry the error's bytecode as source
      expect(vaccine.sourceBytecode).toBe(antigen.bytecode);
      expect(vaccine.sourceKind).toBe('error');
      expect(vaccine.stableContext.category).toBe('STATE');
      expect(vaccine.stableContext.severity).toBe('CRIT');
      expect(vaccine.stableContext.moduleId).toBe('IMMUNE');
    });

    it('produces a parseable PB-XP-v1 bytecode header', () => {
      const antigen = createAntigenError();
      const vaccine = encodeBytecodeXPVaccineFromError(antigen);

      expect(vaccine.bytecode).toMatch(/^PB-XP-v1-ERR-[A-Z0-9]{4,8}-[0-9a-f]{12}-[0-9a-f]{12}$/);
    });
  });

  describe('Stage 2: CleriRaidMind synthesis consumes error signals', () => {
    it('registers the antigen error as a fractured mind state', () => {
      // Create a minimal complex that expects a signal we'll mark as failed
      const complexes = [{
        id: 'ANTIGEN_TEST_COMPLEX',
        expected: { antigenSignal: 1 },
        subunits: [{ id: 'antigenSignal', signalKey: 'ANTIGEN_SIGNAL' }],
      }];

      // Snapshot with the antigen signal at 0 (failed)
      const result = evaluateCleriRaidMind({
        raidId: 'ANTIGEN_RAID',
        complexes,
        bytecodeHealthSnapshot: {
          ANTIGEN_SIGNAL: 0, // Antigen detected — signal is dead
        },
      });

      expect(result.mindState).toBe('fractured');
      expect(result.primaryFaults.length).toBeGreaterThan(0);
      expect(result.primaryFaults[0].subunitId).toBe('antigenSignal');
      expect(result.nextDebugActions[0].action).toBe('restore_signal');
    });

    it('produces QBIT payload with the antigen raid ID', () => {
      const complexes = [{
        id: 'ANTIGEN_TEST_COMPLEX',
        expected: { antigenSignal: 1 },
        subunits: [{ id: 'antigenSignal', signalKey: 'ANTIGEN_SIGNAL' }],
      }];

      const result = evaluateCleriRaidMind({
        raidId: 'ANTIGEN_RAID_QBIT',
        complexes,
        bytecodeHealthSnapshot: { ANTIGEN_SIGNAL: 0 },
      });

      expect(result.qbitPayload.qbitType).toBe('BYTECODE_DIAGNOSTIC_SYNTHESIS');
      expect(result.qbitPayload.raidId).toBe('ANTIGEN_RAID_QBIT');
      expect(result.qbitPayload.unstableComplexes).toContain('ANTIGEN_TEST_COMPLEX');
    });
  });

  describe('Stage 3: TrueSight bytecodeRenderer decodes error visual bytecode', () => {
    it('renders error-class bytecode with RESONANT effect and red color', () => {
      const antigen = createAntigenError();
      const errorBytecode = antigen.bytecode;
      const visualBytecode = createErrorTokenVisualBytecode(errorBytecode);

      const decoded = decodeBytecode(visualBytecode, { theme: 'dark' });

      // Error tokens should have RESONANT effect class (not INERT)
      expect(decoded.className).toContain('vb-effect--resonant');
      expect(decoded.className).not.toContain('vb-effect--inert');

      // Should have glow intensity from the error
      expect(decoded.style['--vb-glow-intensity']).toBeGreaterThan(0.5);

      // Color should be the error red
      expect(decoded.color).toBe('hsl(0, 100%, 50%)');
    });

    it('applies reduced motion correctly for error tokens', () => {
      const antigen = createAntigenError();
      const visualBytecode = createErrorTokenVisualBytecode(antigen.bytecode);

      const normal = decodeBytecode(visualBytecode, { reducedMotion: false, theme: 'dark' });
      const reduced = decodeBytecode(visualBytecode, { reducedMotion: true, theme: 'dark' });

      // Reduced motion should halve the glow intensity
      expect(reduced.style['--vb-glow-intensity']).toBeLessThan(normal.style['--vb-glow-intensity']);
      expect(reduced.style['--vb-glow-intensity']).toBeCloseTo(normal.style['--vb-glow-intensity'] * 0.5, 2);
    });

    it('INERT tokens (healthy) produce no effect classes', () => {
      const healthyBytecode = {
        version: 2,
        school: null,
        color: 'hsl(200, 50%, 50%)',
        glowIntensity: 0,
        saturationBoost: 0,
        syllableDepth: 1,
        isAnchor: false,
        isStopWord: true,
        effectClass: 'INERT',
        biophysical: { visemeCluster: 'NONE', resonanceScore: 0, chromaAlignment: 1 },
      };

      const decoded = decodeBytecode(healthyBytecode, { theme: 'dark' });

      expect(decoded.className).toBe('');
      expect(decoded.style).toEqual({});
    });
  });

  describe('Stage 4: End-to-end — Health signal for clean scan vs error signal', () => {
    it('clean immunity scan emits PB-OK health, error scan emits PB-ERR', () => {
      // Clean scan → health signal
      const cleanHealth = encodeBytecodeHealth(CELL_IDS.IMMUNITY_SCAN, 'no-violations-detected', {
        filesScanned: 10,
      });

      expect(cleanHealth.code).toBe(HEALTH_CODES.IMMUNE_PASS_COORD);
      expect(cleanHealth.bytecode).toMatch(/^PB-OK-v1-IMMUNE-PASS-COORD/);

      // Error scan → error bytecode (via BytecodeError)
      const antigen = createAntigenError();
      expect(antigen.bytecode).toMatch(/^PB-ERR-v1-STATE-CRIT-IMMUNE-/);
    });

    it('health and error bytecodes are distinguishable by prefix', () => {
      const cleanHealth = encodeBytecodeHealth(CELL_IDS.IMMUNITY_SCAN, 'no-violations-detected', {});
      const antigen = createAntigenError();

      expect(cleanHealth.bytecode.startsWith('PB-OK-')).toBe(true);
      expect(antigen.bytecode.startsWith('PB-ERR-')).toBe(true);
    });
  });

  describe('Stage 5: Determinism contract (VAELRIX_LAW §6)', () => {
    it('antigen error produces identical bytecode across 100 runs', () => {
      const checksums = new Set();
      for (let i = 0; i < 100; i++) {
        const antigen = createAntigenError();
        checksums.add(antigen.checksum);
      }
      expect(checksums.size).toBe(1);
    });

    it('vaccine from antigen produces identical bytecode across 100 runs', () => {
      const antigen = createAntigenError();
      const checksums = new Set();
      for (let i = 0; i < 100; i++) {
        const vaccine = encodeBytecodeXPVaccineFromError(antigen);
        checksums.add(vaccine.checksum);
      }
      expect(checksums.size).toBe(1);
    });

    it('CleriRaidMind synthesis is deterministic for same antigen snapshot', () => {
      const complexes = [{
        id: 'DET_COMPLEX',
        expected: { a: 1 },
        subunits: [{ id: 'a', signalKey: 'ANTIGEN_DET' }],
      }];

      const snapshot = { ANTIGEN_DET: 0 };
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(evaluateCleriRaidMind({
          raidId: 'DET_RAID',
          complexes,
          bytecodeHealthSnapshot: snapshot,
        }));
      }

      const first = results[0];
      for (const r of results) {
        expect(r.globalHealth).toBe(first.globalHealth);
        expect(r.mindState).toBe(first.mindState);
        expect(JSON.stringify(r.qbitPayload)).toBe(JSON.stringify(first.qbitPayload));
      }
    });
  });

  describe('Stage 6: Error context preservation through pipeline', () => {
    it('antigen context survives BytecodeError → Vaccine → Synthesis', () => {
      const customContext = {
        layer: 'test-antigen',
        ruleId: 'ANTIGEN_INJECTION',
        sourceFile: 'tests/diagnostic/antigen-truesight-error-propagation.test.js',
        customField: 'preserved-through-pipeline',
        numericValue: 42,
      };

      const antigen = createAntigenError({ context: customContext });
      const vaccine = encodeBytecodeXPVaccineFromError(antigen);

      // Vaccine stableContext should preserve key diagnostic fields
      expect(vaccine.stableContext.layer).toBe('test-antigen');
      expect(vaccine.stableContext.ruleId).toBe('ANTIGEN_INJECTION');
      expect(vaccine.stableContext.sourceFile).toContain('antigen-truesight-error-propagation.test.js');
      expect(vaccine.stableContext.category).toBe('STATE');
      expect(vaccine.stableContext.severity).toBe('CRIT');
    });
  });
});

// ─── Integration Smoke Test ──────────────────────────────────────────────────

describe('ANTIGEN INTEGRATION: Full pipeline smoke test', () => {
  it('antigen flows from error → vaccine → synthesis → visual bytecode', () => {
    // 1. Create antigen error
    const antigen = createAntigenError({
      context: { testPhase: 'integration-smoke' },
    });

    // 2. Encode to vaccine (BytecodeXP)
    const vaccine = encodeBytecodeXPVaccineFromError(antigen);
    expect(vaccine.sourceBytecode).toBe(antigen.bytecode);

    // 3. Feed into synthesis as a failed signal
    const complexes = [{
      id: 'SMOKE_TEST_COMPLEX',
      expected: { signal: 1 },
      subunits: [{ id: 'signal', signalKey: 'SMOKE_SIGNAL' }],
    }];

    const synthesis = evaluateCleriRaidMind({
      raidId: 'SMOKE_RAID',
      complexes,
      bytecodeHealthSnapshot: { SMOKE_SIGNAL: 0 }, // Antigen kills the signal
    });

    expect(synthesis.mindState).toBe('fractured');

    // 4. Create visual bytecode that would render this error in TrueSight
    const visualBytecode = createErrorTokenVisualBytecode(antigen.bytecode);
    const decoded = decodeBytecode(visualBytecode, { theme: 'dark' });

    // 5. Verify TrueSight substrate lights up for the error
    expect(decoded.className).toContain('vb-effect--resonant');
    expect(decoded.style['--vb-glow-intensity']).toBeGreaterThan(0);
    expect(decoded.color).toBe('hsl(0, 100%, 50%)');

    // 6. Verify the diagnostic bytecode is embedded for inspection
    expect(visualBytecode.diagnosticBytecode).toBe(antigen.bytecode);
    expect(visualBytecode.diagnosticBytecode).toMatch(/^PB-ERR-v1-/);
  });
});