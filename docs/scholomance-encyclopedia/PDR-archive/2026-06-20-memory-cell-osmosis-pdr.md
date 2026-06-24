# PDR: Memory Cell Osmosis
## Passive TurboQuant Receptors for Anomaly-Only Detection

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-MEMORY-CELL-OSMOSIS-PDR`

**Status:** Implemented  
**Classification:** Architectural | Immune System | Diagnostic Memory | TurboQuant Substrate  
**Priority:** High  
**Primary Goal:** Implement immutable TurboQuant memory-cell packets that passively compare diagnostic observations against sealed vector memory and emit only anomaly signals.

---

# 1. Executive Summary

Memory Cell Osmosis adds a passive receptor layer to the existing Scholomance immune system. A memory cell is a sealed TurboQuant packet with bounded membrane thresholds; it stores a compact vector memory and compares incoming diagnostic observations against that memory without reading or retaining raw payload content.

The feature is deliberately narrow. Memory cells do not diagnose root cause, recommend patches, mutate their own memory, or trigger repairs. They only answer one question: does this observation cross the membrane as anomalous?

---

# 2. Problem Statement

Scholomance already has bytecode errors, BytecodeHealth, BytecodeXP memory envelopes, QBIT pulse metadata, and Clerical RAID pattern matching. These systems identify and explain failures, but they do not yet provide a tiny substrate-level receptor that can sit between raw diagnostic events and heavier immune diagnosis.

Without that receptor layer, every diagnostic event must either remain a flat signal or be escalated into richer diagnosis too early. Cascade failures benefit from a cheaper first pass that can silently ignore normal observations while surfacing only meaningful drift or known-bad resonance.

---

# 3. Product Goal

Create a deterministic memory-cell packet and osmosis evaluator that:

1. Encodes a diagnostic memory as a TurboQuant vector packet.
2. Compares incoming observations against that sealed packet.
3. Emits an anomaly result only when membrane thresholds are crossed.
4. Preserves bytecode-first, deterministic, privacy-preserving immune architecture.

---

# 4. Non-Goals

- Do not replace `PB-ERR-v1`, `PB-OK-v1`, `PB-XP-v1`, or `SCHOL-BYTXP-MEM-v1`.
- Do not persist raw diagnostic text or user content inside memory-cell packets.
- Do not auto-learn or mutate memory cells at runtime.
- Do not auto-repair code or recommend fixes.
- Do not add UI surfaces in this phase.
- Do not run as a background daemon in this phase.

---

# 5. Core Design Principles

1. **Anomaly Only:** The public result is silent unless the observation crosses a membrane threshold.
2. **Immutable Memory:** Updating a memory cell requires creating a new packet with a new checksum.
3. **TurboQuant Substrate:** Stored memory is a quantized vector packet, not raw diagnostic prose.
4. **Privacy Boundary:** The membrane compares vector shape, not full source payloads.
5. **Bytecode Error Discipline:** Malformed packets or invalid observations fail with `PB-ERR-v1`.
6. **No Repair Authority:** Memory cells route attention; downstream systems diagnose and repair.

---

# 6. Feature Overview

Memory cells support two receptor modes:

| Mode | Meaning | Anomaly Condition |
|---|---|---|
| `baseline` | Memory of expected healthy shape | Observation drifts below similarity floor or above drift ceiling |
| `antigen` | Memory of known-bad shape | Observation matches or exceeds similarity floor |

Both modes also support concentration limits. Concentration is a caller-supplied count or scalar that lets a cascade of individually weak observations become anomalous when too many signals collect near the same receptor.

---

# 7. Architecture

```text
diagnostic observation
  -> deterministic 128-dim vector
  -> TurboQuant quantized observation
  -> memory-cell membrane comparison
  -> silent result OR anomaly result
  -> downstream QBIT / Clerical RAID / BytecodeXP systems
```

Memory Cell Osmosis sits before heavier diagnosis:

```text
PB-ERR / PB-OK / runtime observation
  -> memory-cell osmosis
      -> silent: stop
      -> anomaly: route to spatial immune / RAID / memory infusion
```

---

# 8. Module Breakdown

| Module | Responsibility |
|---|---|
| `codex/core/immunity/memory-cell-osmosis.js` | Build, verify, and compare memory-cell packets |
| `tests/core/immunity/memory-cell-osmosis.test.js` | Determinism, anomaly-mode, silent-mode, malformed-input coverage |
| `SCHEMA_CONTRACT.md` | Register `SCHOL-MEMCELL-v1` packet and osmosis result contracts |

---

# 9. ByteCode IR Design

Memory cells are structured packets, not a new public bytecode family.

```ts
interface MemoryCellPacket {
  contract: "SCHOL-MEMCELL-v1";
  schemaVersion: "0.1.0";
  id: string;
  family: "health" | "error" | "runtime" | "schema" | "render" | "qa" | "immunity";
  mode: "baseline" | "antigen";
  vector: {
    algorithm: "turboquant-js";
    dimensions: 128;
    seed: number;
    dataB64: string;
    norm: number;
    checksum: string;
  };
  membrane: {
    similarityFloor: number;
    driftCeiling: number;
    concentrationLimit: number;
  };
  sourceBytecode: string | null;
  stableContext: Record<string, unknown>;
  checksum: string;
}
```

Osmosis result contract:

```ts
interface MemoryCellOsmosisResult {
  contract: "SCHOL-MEMCELL-OSMOSIS-v1";
  schemaVersion: "0.1.0";
  cellId: string;
  status: "silent" | "anomaly";
  anomalyKind: "none" | "baseline_drift" | "antigen_match" | "concentration";
  similarity: number;
  drift: number;
  concentration: number;
  confidence: number;
  checksum: string;
  bytecodeError?: string;
}
```

---

# 10. Implementation Phases

## Phase 1 — Contract and PDR

Status: Implemented.

Deliverables:

- PDR archive entry.
- Archive index update.
- Schema contract registration.

## Phase 2 — Core Receptor Module

Status: Implemented.

Deliverables:

- Deterministic packet builder.
- Packet verifier.
- Observation normalizer.
- Osmosis evaluator.
- Anomaly-only filter helper.

## Phase 3 — Tests

Status: Implemented.

Deliverables:

- Baseline receptor detects drift.
- Antigen receptor detects known-bad resonance.
- Silent observations stay silent.
- Packet construction is deterministic.
- Invalid packets throw `PB-ERR-v1`.
- IDE TrueSight whitespace disparity is covered with a Playwright substrate test.

## Phase 4 — Future Integration

Status: Deferred.

Future work may attach anomaly results to QBIT spatial routing, BytecodeXP memory envelopes, or diagnostic runner output after explicit schema and product review.

---

# 11. QA Requirements

- Packet checksums must be deterministic for identical input.
- Packet checksums must change when vector memory or membrane thresholds change.
- Similarity, drift, concentration, and confidence must be clamped to `0..1`.
- Invalid family, mode, vector, or packet shape must fail with `PB-ERR-v1`.
- Evaluation must not mutate packet or observation inputs.
- Tests must cover both `baseline` and `antigen` modes.

---

# 12. Success Criteria

- A memory cell built twice from the same diagnostic observation produces identical packet JSON.
- A baseline cell emits `silent` for an in-family observation and `anomaly` for a structurally distant observation.
- An antigen cell emits `anomaly` for a known-bad observation and `silent` for unrelated observations.
- A helper can scan multiple cells and return only anomaly results.
- Targeted Vitest coverage passes.

---

# 13. Implementation Notes

Implemented on 2026-06-20.

Delivered files:

- `codex/core/immunity/memory-cell-osmosis.js`
- `tests/core/immunity/memory-cell-osmosis.test.js`
- `tests/visual/truesight-memory-cell-osmosis.spec.js`
- `docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md`

Validation was run by the user:

- `tests/core/immunity/memory-cell-osmosis.test.js`: 6 tests passed in 35ms.
- `tests/visual/truesight-memory-cell-osmosis.spec.js`: 2 chromium tests passed in 11.8s.

The IDE substrate test proved both sides of the contract:

- Healthy TrueSight styling remained silent when colored text preserved normal-mode advance.
- Injected `.truesight-word-inner { letter-spacing: 0.12em !important; }` produced `MEMCELL-IDE-ANOMALY` with `plainTotalPx: 583.156`, `styledTotalPx: 738.703`, `totalDeltaPx: 155.547`, `maxWordDriftPx: 138.266`, `similarity: 0.202777`, `drift: 0.797223`, `concentration: 1`, and `status: "anomaly"`.
