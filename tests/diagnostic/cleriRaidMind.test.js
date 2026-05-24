import { describe, expect, it } from 'vitest';
import {
  evaluateCleriRaidMind,
  maybeRunDiagnosticSynthesis,
  shouldFailDiagnosticGate,
} from '../../codex/core/diagnostic/CleriRaidMind.js';

const TEST_COMPLEXES = [
  {
    id: 'TEST_COMPLEX',
    expected: { a: 1, b: 1 },
    subunits: [
      { id: 'a', signalKey: 'A_SIGNAL' },
      { id: 'b', signalKey: 'B_SIGNAL' },
    ],
  },
];

describe('CleriRaidMind', () => {
  describe('evaluateCleriRaidMind', () => {
    it('returns coherent when all complexes are stable', () => {
      const result = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 1, B_SIGNAL: 1 },
      });

      expect(result.mindState).toBe('coherent');
      expect(result.primaryFaults).toEqual([]);
    });

    it('returns fractured when a required signal is missing', () => {
      const result = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 1 },
      });

      expect(result.mindState).toBe('fractured');
      expect(result.primaryFaults[0].subunitId).toBe('b');
    });

    it('builds a QBIT-compatible payload', () => {
      const result = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 1, B_SIGNAL: 1 },
      });

      expect(result.qbitPayload.qbitType).toBe('BYTECODE_DIAGNOSTIC_SYNTHESIS');
      expect(result.qbitPayload.raidId).toBe('TEST_RAID');
      expect(typeof result.qbitPayload.collapseConfidence).toBe('number');
    });

    it('uses raidId in output', () => {
      const result = evaluateCleriRaidMind({
        raidId: 'CUSTOM_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: {},
      });

      expect(result.raidId).toBe('CUSTOM_RAID');
    });

    it('uses default raidId when not provided', () => {
      const result = evaluateCleriRaidMind({
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: {},
      });

      expect(result.raidId).toBe('CLERI_RAID_MAIN');
    });

    it('returns agitated for low global health without critical complex', () => {
      // Strongly imbalanced signals: one dominates, one is barely present but not zero.
      // Stoichiometric math: both are "non-missing" but health drops below 0.78 → agitated.
      const complexes = [
        {
          id: 'WEAK_COMPLEX',
          expected: { a: 1, b: 1 },
          subunits: [
            { id: 'a', signalKey: 'A' },
            { id: 'b', signalKey: 'B' },
          ],
        },
      ];

      const result = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes,
        bytecodeHealthSnapshot: { A: 0.95, B: 0.05 },
      });

      // B ratio = 0.05/0.5 = 0.1 → limiting (not missing). No critical complex.
      // health ≈ 0.55, globalHealth < 0.78 → agitated
      expect(result.mindState).toBe('agitated');
      expect(result.complexes[0].status).not.toBe('critical');
    });

    it('is deterministic across multiple runs', () => {
      const params = {
        raidId: 'DET_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 0.7, B_SIGNAL: 0.4 },
      };

      const r1 = evaluateCleriRaidMind(params);
      const r2 = evaluateCleriRaidMind(params);

      expect(r1.globalHealth).toBe(r2.globalHealth);
      expect(r1.mindState).toBe(r2.mindState);
      expect(JSON.stringify(r1.qbitPayload)).toBe(JSON.stringify(r2.qbitPayload));
    });
  });

  describe('maybeRunDiagnosticSynthesis', () => {
    it('returns null when disabled', () => {
      const result = maybeRunDiagnosticSynthesis({ enabled: false });
      expect(result).toBeNull();
    });

    it('shadow mode returns enforced:false with mind', () => {
      const result = maybeRunDiagnosticSynthesis({
        enabled: true,
        mode: 'shadow',
        snapshot: {},
      });

      expect(result.enforced).toBe(false);
      expect(result.mind).toBeDefined();
    });

    it('warn mode emits warning when not coherent', () => {
      const result = maybeRunDiagnosticSynthesis({
        enabled: true,
        mode: 'warn',
        snapshot: {},
      });

      // Empty snapshot → fractured → warning should be set
      if (result.mind.mindState !== 'coherent') {
        expect(result.warning).toBe('CLERI_RAID_MIND_NOT_COHERENT');
      } else {
        expect(result.warning).toBeNull();
      }
      expect(result.enforced).toBe(false);
    });

    it('shouldFailDiagnosticGate returns true only for fractured mind state', () => {
      const fractured = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 1 }, // B_SIGNAL missing → fractured
      });
      expect(fractured.mindState).toBe('fractured');
      expect(shouldFailDiagnosticGate(fractured)).toBe(true);

      const coherent = evaluateCleriRaidMind({
        raidId: 'TEST_RAID',
        complexes: TEST_COMPLEXES,
        bytecodeHealthSnapshot: { A_SIGNAL: 1, B_SIGNAL: 1 },
      });
      expect(coherent.mindState).toBe('coherent');
      expect(shouldFailDiagnosticGate(coherent)).toBe(false);
    });

    it('gate mode returns pass:true when coherent', () => {
      // Signals must match the expected stoichiometric proportions to be stable.
      // AUTH_HANDSHAKE: expected 2:2:1:1 → supply 1:1:0.5:0.5
      // BYTECODE_INTEGRITY: expected 2:2:2:1 → supply 1:1:1:0.5
      // UI_STATE_COHERENCE: expected 1:1:1:1 → supply 1:1:1:1
      const result = maybeRunDiagnosticSynthesis({
        enabled: true,
        mode: 'gate',
        snapshot: {
          AUTH_SENDER_MATCH: 1,
          IDENTITY_PROOF_VALID: 1,
          SESSION_CONTINUITY: 0.5,
          CSRF_BOUNDARY_HEALTH: 0.5,
          BYTECODE_DECODABLE: 1,
          BYTECODE_CHECKSUM_VALID: 1,
          BYTECODE_SCHEMA_VALID: 1,
          BYTECODE_PROVENANCE_VALID: 0.5,
          ROUTE_STATE_HEALTH: 1,
          VIEW_STATE_HEALTH: 1,
          CURSOR_STATE_HEALTH: 1,
          OVERLAY_STATE_HEALTH: 1,
        },
      });

      expect(result.enforced).toBe(true);
      expect(result.pass).toBe(true);
    });
  });
});
