#!/usr/bin/env node
/**
 * PROOF: ByteCode Diagnostic Synthesis
 *
 * Two scenarios:
 *   1. FAILURE — auth sender missing, BYTECODE and UI signals absent.
 *      Proves the system detects fractured state and names the primary fault.
 *   2. HEALTHY — all 12 signal keys present at correct proportions.
 *      Proves the system reaches coherent when signals are properly supplied.
 *
 * Usage: node scripts/prove_bytecode_diagnostic_synthesis.js
 */

import { evaluateCleriRaidMind } from '../codex/core/diagnostic/CleriRaidMind.js';

// ─── Scenario 1: Failure ──────────────────────────────────────────────────────

console.log('── Scenario 1: auth sender missing (fractured) ──────────────────────────');

const failure = evaluateCleriRaidMind({
  raidId: 'CLERI_RAID_PROOF',
  bytecodeHealthSnapshot: {
    // AUTH_HANDSHAKE_COMPLEX — authSender deliberately absent
    AUTH_SENDER_MATCH: { score: 0, bytecode: 'PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH' },
    IDENTITY_PROOF_VALID: { status: 'stable' },
    SESSION_CONTINUITY:   { status: 'stable' },
    CSRF_BOUNDARY_HEALTH: { status: 'stable' },
    // BYTECODE_INTEGRITY_COMPLEX — signals absent (unmapped in this snapshot)
    // UI_STATE_COHERENCE_COMPLEX — signals absent (unmapped in this snapshot)
  },
});

console.log(JSON.stringify(failure, null, 2));

if (failure.mindState !== 'fractured') {
  console.error(`PROOF FAILED: Expected "fractured", got "${failure.mindState}"`);
  process.exit(1);
}

if (failure.primaryFaults[0]?.subunitId !== 'authSender') {
  console.error(`PROOF FAILED: Expected primary fault "authSender", got "${failure.primaryFaults[0]?.subunitId}"`);
  process.exit(1);
}

if (failure.nextDebugActions[0]?.action !== 'restore_signal') {
  console.error(`PROOF FAILED: Expected first action "restore_signal", got "${failure.nextDebugActions[0]?.action}"`);
  process.exit(1);
}

console.log('✓ mindState: fractured');
console.log('✓ primaryFault: authSender');
console.log('✓ nextAction: restore_signal');

// ─── Scenario 2: Healthy ──────────────────────────────────────────────────────

console.log('\n── Scenario 2: all signals healthy (coherent) ───────────────────────────');

// Supply all 12 signal keys at proportions that satisfy each complex's
// stoichiometric ratios. AUTH: 2:2:1:1, BYTECODE: 2:2:2:1, UI: 1:1:1:1.
// Using raw scores that normalize to the correct ratios.
const healthy = evaluateCleriRaidMind({
  raidId: 'CLERI_RAID_PROOF_HEALTHY',
  bytecodeHealthSnapshot: {
    // AUTH_HANDSHAKE_COMPLEX — all four signals present
    AUTH_SENDER_MATCH:    1,
    IDENTITY_PROOF_VALID: 1,
    SESSION_CONTINUITY:   0.5,
    CSRF_BOUNDARY_HEALTH: 0.5,

    // BYTECODE_INTEGRITY_COMPLEX — all four signals present
    BYTECODE_DECODABLE:        1,
    BYTECODE_CHECKSUM_VALID:   1,
    BYTECODE_SCHEMA_VALID:     1,
    BYTECODE_PROVENANCE_VALID: 0.5,

    // UI_STATE_COHERENCE_COMPLEX — all four signals present
    ROUTE_STATE_HEALTH:   1,
    VIEW_STATE_HEALTH:    1,
    CURSOR_STATE_HEALTH:  1,
    OVERLAY_STATE_HEALTH: 1,
  },
});

console.log(JSON.stringify(healthy, null, 2));

if (healthy.mindState !== 'coherent') {
  console.error(`PROOF FAILED: Expected "coherent", got "${healthy.mindState}"`);
  process.exit(1);
}

if (healthy.primaryFaults.length !== 0) {
  console.error(`PROOF FAILED: Expected no primary faults, got ${healthy.primaryFaults.length}`);
  process.exit(1);
}

if (healthy.qbitPayload.unstableComplexes.length !== 0) {
  console.error(`PROOF FAILED: Expected no unstable complexes, got ${healthy.qbitPayload.unstableComplexes.join(', ')}`);
  process.exit(1);
}

console.log('✓ mindState: coherent');
console.log('✓ primaryFaults: none');
console.log('✓ unstableComplexes: none');
console.log('✓ collapseConfidence:', healthy.qbitPayload.collapseConfidence);

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log('\nBYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF_OK');
