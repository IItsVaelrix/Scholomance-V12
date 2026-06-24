# Spec Sheet: BytecodeXP Memory Infusion Vaccines + QBIT Pulse

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-BYTXP-QBIT-SPEC`

**Status:** Implemented — Phase 0-5 complete  
**Classification:** Architectural | AI Observability | Diagnostic Memory | QBIT Substrate  
**Priority:** High  
**Primary Goal:** Define a bounded, deterministic path from CCCB checksums into BytecodeXP diagnostic vaccines that can attach to QBIT pulse metadata and identify nearby semantic hotspots without entangling runtime diagnostics, memory, and probe systems.

---

# 1. Scope

This spec covers the concept Angel described as:

> Mathematical ByteCode fingerprint checksums that an AI can parse instantly to know exactly what is wrong, attached to the substrate as a QBIT node that pulses nearby semantic hotspots.

The implementation must proceed in layers:

1. CCCB deterministic foundation.
2. BytecodeXP vaccine artifact.
3. QBIT pulse node metadata.
4. Optional cleri-probe hotspot enrichment.
5. Optional MCP memory persistence.

This spec intentionally does **not** merge these layers into `BytecodeHealth.js`.

---

# 2. Caveats and Boundaries

| Caveat | Rule |
|---|---|
| Schema sprawl | Do not replace `PB-ERR-v1` or `PB-OK-v1`; `PB-XP-v1` is a separate adapter layer. |
| Runtime cost | Do not run `cleri-probe` by default in every diagnostic scan. |
| QBIT ambiguity | Define pulse fields deterministically before visual or agent interpretation. |
| Coupling | Keep CCCB, vaccine, QBIT pulse, and cleri-probe as separate modules. |
| Checksum drift | Hash only stable fields; keep volatile probe timing and persistence metadata out of checksums. |
| Persistence law | If `PB-XP-v1` becomes persisted/shared externally, update `SCHEMA_CONTRACT.md` before treating it as canonical. |

---

# 3. Phase Contracts

## Phase 0 — Contract Definition

Deliverables:

- This spec sheet.
- Companion PDR.
- Existing CCCB PDR status updated to show Phase 0-1 implementation.

Acceptance:

- Documents explicitly separate CCCB, BytecodeXP vaccines, QBIT pulse, and cleri-probe enrichment.
- The caveats above are represented as implementation constraints.

## Phase 1 — CCCB Reference Implementation

Deliverables:

- `codex/core/diagnostic/cccbEncoder.js`
- Tests for:
  - FNV-1a determinism.
  - semantic slug derivation.
  - CCCB ID generation and parsing.
  - strict block parser.
  - checksum verification.
  - graph traversal to `TERMINAL`.
  - cycle and malformed-block rejection.

Acceptance:

- Parser returns or throws `PB-ERR-v1` bytecode-backed failures.
- Unknown fields fail.
- Missing required fields fail.
- Pilot PDR checksum examples verify.

## Phase 2 — BytecodeXP Vaccine Adapter

Target module:

```text
codex/core/diagnostic/BytecodeXPVaccine.js
```

Proposed stable fields:

```ts
interface BytecodeXPVaccine {
  version: "v1";
  bytecode: string;              // PB-XP-v1-...
  vaccineId: string;
  sourceKind: "error" | "health" | "cccb";
  sourceBytecode: string | null;
  semanticSlug: string;
  fingerprint: string;
  recoveryKey: string | null;
  stableContext: Record<string, unknown>;
  checksum: string;
}
```

Acceptance:

- Same source diagnostic -> same vaccine checksum.
- Different source code/path/severity/checkId -> different checksum.
- Vaccine does not mutate source diagnostic objects.

Implementation status: Implemented 2026-06-04.

Implemented module:

```text
codex/core/diagnostic/BytecodeXPVaccine.js
```

Implemented functions:

- `encodeBytecodeXPVaccineFromError`
- `encodeBytecodeXPVaccineFromHealth`
- `encodeBytecodeXPVaccineFromCccb`
- `parseBytecodeXPVaccineBytecode`
- `checksumVaccine`
- `checksumVaccineFingerprint`

Boundary retained: `PB-XP-v1` remains an internal diagnostic adapter artifact until persistence/schema review.

## Phase 3 — QBIT Pulse Node

Target module:

```text
codex/core/diagnostic/QbitPulse.js
```

Proposed stable fields:

```ts
interface QbitPulseNode {
  qbitType: "BYTECODE_XP_VACCINE_PULSE";
  vaccineId: string;
  origin: {
    path: string | null;
    code: string | null;
    cellId: string | null;
  };
  pulseRadius: number;
  collapseConfidence: number;
  hotspots: Array<{
    path: string;
    resonance: number;
    reason: string;
  }>;
  checksum: string;
}
```

Acceptance:

- Pulse output is deterministic for identical vaccine and hotspot input.
- Hotspots are sorted by resonance desc, then path asc.
- Pulse radius is bounded to `0..1`.

Implementation status: Implemented 2026-06-04.

Implemented module:

```text
codex/core/diagnostic/QbitPulse.js
```

Implemented functions:

- `buildQbitPulseNode`
- `normalizeHotspots`
- `checksumQbitPulse`
- `verifyQbitPulseNode`

Boundary retained: QBIT pulse nodes are internal diagnostic metadata. They are not included in `DiagnosticReport` checksum input.

## Phase 4 — Optional Cleri-Probe Enrichment

`cleri-probe` may supply hotspot candidates for a vaccine hypothesis.

Rules:

- Opt-in only.
- Bounded result count.
- Stable sorting before pulse checksum.
- Probe runtime metadata excluded from checksum.

Implementation status: Implemented 2026-06-04.

Implemented module:

```text
codex/core/diagnostic/QbitProbeEnrichment.js
```

Implemented functions:

- `buildCleriProbeHotspots`
- `buildQbitPulseNodeWithCleriProbe`
- `buildProbeHypothesis`

Boundary retained: enrichment requires an explicit file substrate or injected probe runner. It does not walk the repository by default and does not run in ordinary diagnostic scans.

## Phase 5 — MCP Memory Persistence Envelope

Target module:

```text
codex/core/diagnostic/QbitMemoryPersistence.js
```

Deliverables:

- Schema contract entry for `PB-XP-v1` and `SCHOL-BYTXP-MEM-v1`.
- Deterministic memory envelope builder.
- MCP memory-set payload helper.
- Injected persistence helper with dry-run support.

Acceptance:

- Envelope verifies vaccine and pulse checksums before persistence.
- Envelope checksum excludes volatile probe duration metadata.
- Live writes require an injected `memoryClient.set`; no diagnostic scan writes memory by default.

Implementation status: Implemented 2026-06-04.

---

# 4. Initial Implementation Decision

Implement **Phase 0-5 now**.

Do not wire memory persistence into ordinary diagnostic scans in this step. Persistence remains an explicit injected-client action.

---

# 5. Validation Checklist

| Check | Required Phase |
|---|---|
| CCCB FNV-1a examples pass | Phase 1 |
| CCCB parser rejects missing fields | Phase 1 |
| CCCB graph traversal reaches terminal | Phase 1 |
| Vaccine checksum deterministic | Phase 2 — implemented |
| QBIT pulse checksum deterministic | Phase 3 — implemented |
| Cleri-probe enrichment opt-in | Phase 4 — implemented |
| Schema update considered before persistence | Phase 5 — implemented |
| Memory envelope checksum deterministic | Phase 5 — implemented |
