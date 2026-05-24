# RAID Phase 5 ByteCode Diagnostic Synthesis Proof

**Status:** Stage 3 — Warn Mode Active  
**Date:** 2026-05-24  
**PDR:** `docs/scholomance-encyclopedia/PDR-archive/ByteCode Diagnostic Synthesis PDR (1).md`

---

## Claim

Cleri-Raid can synthesize BytecodeHealth signals into deterministic complex-level diagnostics, expose a raid-level mind state, emit structured warn-mode warnings, and produce a compact QBIT coherence payload — all without mutating or blocking existing BytecodeHealth behavior.

---

## Implementation Stages Complete

| Stage | Artifact | Status |
|---|---|---|
| 1 | `StoichComplexHealth.js` — pure stoichiometric math | Done |
| 2 (shadow) | `BytecodeHealthAdapter.js` + `CleriRaidComplexRegistry.js` + `CleriRaidMind.js` wired into `diagnostic-runner.js` in shadow mode | Done |
| 3 (warn) | Structured stderr warnings emitted when mindState is not coherent (`CLERI_RAID_SYNTHESIS_MODE=warn`) | Done |

---

## Proof Run

**Command:**

```bash
node scripts/prove_bytecode_diagnostic_synthesis.js
```

**Input snapshot:**

```json
{
  "AUTH_SENDER_MATCH": { "score": 0, "bytecode": "PB-ERR-v1-STATE-AUTH_SENDER_MISMATCH" },
  "IDENTITY_PROOF_VALID": { "status": "stable" },
  "SESSION_CONTINUITY": { "status": "stable" },
  "CSRF_BOUNDARY_HEALTH": { "status": "stable" }
}
```

**Expected output:**

```
mindState: "fractured"
primaryFault: AUTH_HANDSHAKE_COMPLEX.authSender
qbitPayload.qbitType: "BYTECODE_DIAGNOSTIC_SYNTHESIS"
```

**Result:** `BYTECODE_DIAGNOSTIC_SYNTHESIS_PROOF_OK`

---

## Test Coverage

```
tests/diagnostic/stoichComplexHealth.test.js        11 tests — pure math
tests/diagnostic/bytecodeHealthAdapter.test.js       23 tests — signal normalization
tests/diagnostic/cleriRaidMind.test.js               12 tests — raid mind + shadow/warn/gate modes + shouldFailDiagnosticGate
tests/diagnostic/bytecodeDiagnosticSynthesis.integration.test.js   4 tests — end-to-end
tests/diagnostic/bytecodeDiagnosticSynthesis.golden.test.js        1 test  — output stability
tests/diagnostic/diagnostic.stasis.test.js           63 tests — Stage 3 warn-mode wiring + stasis
```

All 114 diagnostic tests pass.

---

## Acceptance Criteria

- [x] `mindState` is `fractured` for auth sender mismatch input
- [x] `authSender` is the primary fault
- [x] `qbitPayload` is compact and deterministic
- [x] Repair vector recommends `restore_signal` for `authSender`
- [x] Unknown signals do not affect output
- [x] Shadow mode does not emit stderr
- [x] Warn mode emits `[CLERI_RAID_MIND]` structured warning to stderr when not coherent
- [x] Gate mode policy exists (`shouldFailDiagnosticGate`) but is not the default
- [x] Report checksum is not affected by synthesis field

---

## Limitations

- Registry coverage is incomplete — `AUTH_SENDER_MATCH`, `IDENTITY_PROOF_VALID`, `SESSION_CONTINUITY`, `CSRF_BOUNDARY_HEALTH`, `BYTECODE_DECODABLE`, `BYTECODE_CHECKSUM_VALID`, `BYTECODE_SCHEMA_VALID`, `BYTECODE_PROVENANCE_VALID`, `ROUTE_STATE_HEALTH`, `VIEW_STATE_HEALTH`, `CURSOR_STATE_HEALTH`, `OVERLAY_STATE_HEALTH` are declared; dedicated signal producers for UI state and CSRF are not yet wired.
- Gate mode is available via `CLERI_RAID_SYNTHESIS_MODE=gate` but should not be enabled in CI until warn-mode threshold tuning is complete.

---

## Rollout Ladder

```
off → shadow (done) → warn (done) → gate (pending threshold review)
```

---

## Next Step

Observe warn-mode output during real debugging sessions. If repair vectors are useful and false-positive rate is low, promote to gate mode by setting `CLERI_RAID_SYNTHESIS_MODE=gate` in CI.
