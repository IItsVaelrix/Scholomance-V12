import { describe, expect, it } from 'vitest';
import { evaluateCleriRaidMind } from '../../codex/core/diagnostic/CleriRaidMind.js';

describe('ByteCode Diagnostic Synthesis Integration', () => {
  it('diagnoses an auth sender mismatch as the primary fault', () => {
    const complexes = [
      {
        id: 'AUTH_HANDSHAKE_COMPLEX',
        expected: {
          authSender: 2,
          identityProof: 2,
          sessionContinuity: 1,
        },
        weights: {
          authSender: 1.4,
          identityProof: 1.4,
          sessionContinuity: 1,
        },
        subunits: [
          { id: 'authSender', signalKey: 'AUTH_SENDER_MATCH' },
          { id: 'identityProof', signalKey: 'IDENTITY_PROOF_VALID' },
          { id: 'sessionContinuity', signalKey: 'SESSION_CONTINUITY' },
        ],
      },
    ];

    const result = evaluateCleriRaidMind({
      raidId: 'CLERI_RAID_TEST',
      complexes,
      bytecodeHealthSnapshot: {
        AUTH_SENDER_MATCH: {
          score: 0,
          bytecode: 'PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH',
        },
        IDENTITY_PROOF_VALID: { status: 'stable' },
        SESSION_CONTINUITY: { status: 'stable' },
      },
    });

    // score:0 → adapter normalizes to 0 → authSender is "missing" → complex is critical → mindState is fractured
    expect(result.mindState).toBe('fractured');
    expect(result.primaryFaults[0]).toMatchObject({
      complexId: 'AUTH_HANDSHAKE_COMPLEX',
      subunitId: 'authSender',
    });

    // "missing" maps to restore_signal, not increase_coverage
    expect(result.nextDebugActions[0].action).toBe('restore_signal');
  });

  it('returns coherent when all three default-registry complexes are healthy', () => {
    // Signals must match stoichiometric proportions — not just "all at 1".
    // Unequal expected ratios mean equal observed signals would appear as excess.
    // Supply signals scaled to match each complex's expected ratio:
    //   AUTH_HANDSHAKE  2:2:1:1 → 1:1:0.5:0.5
    //   BYTECODE_INTEGRITY 2:2:2:1 → 1:1:1:0.5
    //   UI_STATE_COHERENCE 1:1:1:1 → 1:1:1:1
    const result = evaluateCleriRaidMind({
      raidId: 'CLERI_RAID_FULL',
      bytecodeHealthSnapshot: {
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

    expect(result.mindState).toBe('coherent');
    expect(result.globalHealth).toBeGreaterThanOrEqual(0.9);
    expect(result.primaryFaults).toEqual([]);
  });

  it('unknown signals are ignored and do not affect output', () => {
    const baseline = evaluateCleriRaidMind({
      raidId: 'TEST',
      bytecodeHealthSnapshot: {
        AUTH_SENDER_MATCH: 1,
        IDENTITY_PROOF_VALID: 1,
        SESSION_CONTINUITY: 1,
        CSRF_BOUNDARY_HEALTH: 1,
        BYTECODE_DECODABLE: 1,
        BYTECODE_CHECKSUM_VALID: 1,
        BYTECODE_SCHEMA_VALID: 1,
        BYTECODE_PROVENANCE_VALID: 1,
        ROUTE_STATE_HEALTH: 1,
        VIEW_STATE_HEALTH: 1,
        CURSOR_STATE_HEALTH: 1,
        OVERLAY_STATE_HEALTH: 1,
      },
    });

    const withNoise = evaluateCleriRaidMind({
      raidId: 'TEST',
      bytecodeHealthSnapshot: {
        AUTH_SENDER_MATCH: 1,
        IDENTITY_PROOF_VALID: 1,
        SESSION_CONTINUITY: 1,
        CSRF_BOUNDARY_HEALTH: 1,
        BYTECODE_DECODABLE: 1,
        BYTECODE_CHECKSUM_VALID: 1,
        BYTECODE_SCHEMA_VALID: 1,
        BYTECODE_PROVENANCE_VALID: 1,
        ROUTE_STATE_HEALTH: 1,
        VIEW_STATE_HEALTH: 1,
        CURSOR_STATE_HEALTH: 1,
        OVERLAY_STATE_HEALTH: 1,
        UNKNOWN_SIGNAL_XYZ: 999,
        RANDOM_GARBAGE: { status: 'explode' },
      },
    });

    expect(withNoise.globalHealth).toBe(baseline.globalHealth);
    expect(withNoise.mindState).toBe(baseline.mindState);
  });

  it('produces QBIT payload with expected shape', () => {
    const result = evaluateCleriRaidMind({
      raidId: 'QBIT_TEST',
      bytecodeHealthSnapshot: {
        AUTH_SENDER_MATCH: { score: 0 },
      },
    });

    expect(result.qbitPayload).toMatchObject({
      qbitType: 'BYTECODE_DIAGNOSTIC_SYNTHESIS',
      raidId: 'QBIT_TEST',
      collapseConfidence: expect.any(Number),
      complexCount: expect.any(Number),
      unstableComplexes: expect.any(Array),
    });
  });
});
