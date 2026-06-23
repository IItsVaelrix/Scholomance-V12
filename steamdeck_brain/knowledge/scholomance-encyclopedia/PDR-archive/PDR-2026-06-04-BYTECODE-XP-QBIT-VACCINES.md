# PDR: BytecodeXP Memory Infusion Vaccines + QBIT Pulse
## Deterministic Diagnostic Memory Nodes for Semantic Hotspot Traversal

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-BYTXP-QBIT-PDR`

**Status:** Implemented — Phase 0-5 complete  
**Classification:** Architectural | AI Observability | Diagnostic Memory | QBIT Substrate  
**Priority:** High  
**Primary Goal:** Turn bytecode diagnostics and CCCB fingerprints into deterministic BytecodeXP vaccine artifacts that can attach to QBIT pulse metadata and guide agents toward nearby semantic hotspots.

---

# 1. Executive Summary

Scholomance already has strong bytecode diagnostics: `PB-ERR-v1` for failures, `PB-OK-v1` for health, CCCB blocks for compressed PDR execution, and CleriRaidMind QBIT payloads for aggregate diagnostic state. The missing bridge is a deterministic memory artifact that lets an AI instantly understand what went wrong, where it is anchored, and which nearby semantic hotspots may contribute to it.

This PDR defines that bridge as a **BytecodeXP memory infusion vaccine**. A vaccine is not the original error or health signal. It is a compact, checksummed adapter artifact derived from existing bytecode and safe stable context. Later phases attach vaccines to QBIT pulse nodes and optionally enrich them with `cleri-probe` substrate resonance.

The first implementation pass completed CCCB Phase 0-1. Phase 2 added the internal `PB-XP-v1` vaccine adapter. Phase 3 added deterministic QBIT pulse nodes. Phase 4 added opt-in cleri-probe enrichment. Phase 5 now adds the schema-reviewed memory envelope and injected persistence adapter.

---

# 2. Problem Statement

Current diagnostics tell agents what failed or passed, but they do not yet provide a compact memory node that combines:

- deterministic identity,
- parseable diagnosis,
- traversal hints,
- semantic hotspot context,
- memory infusion readiness.

CCCB solves part of this for PDR phases, but runtime diagnostics still need a parallel vaccine layer. QBIT pulse can provide graph-local activation, but only after the stable fingerprint layer exists.

---

# 3. Product Goal

Create a staged diagnostic memory system:

1. CCCB blocks encode instructions and graph edges.
2. BytecodeXP vaccines encode diagnostic memory fingerprints.
3. QBIT pulse nodes attach vaccines to semantic hotspots.
4. Cleri-probe optionally contributes resonance candidates.

---

# 4. Non-Goals

- Do not replace `PB-ERR-v1` or `PB-OK-v1`.
- Do not make `cleri-probe` mandatory for every diagnostic run.
- Do not store volatile runtime timing in vaccine checksums.
- Do not modify UI surfaces in Phase 0-1.
- Do not persist `PB-XP-v1` as a public schema until `SCHEMA_CONTRACT.md` is updated or explicitly exempted as internal metadata.

---

# 5. Core Design Principles

1. **Bytecode First:** Every vaccine and pulse has a deterministic bytecode/fingerprint.
2. **Layer Separation:** CCCB, vaccine, QBIT pulse, and probe enrichment remain separate modules.
3. **Optional Enrichment:** Semantic hotspot probing is an enrichment path, not a diagnostic prerequisite.
4. **Checksum Sovereignty:** Hash stable fields only.
5. **Graph Traversal:** Agents should traverse from a checksum node to the next action without rereading long prose.

---

# 6. Feature Overview

## 6.1 CCCB Foundation

Implements the existing CCCB PDR reference target:

```text
codex/core/diagnostic/cccbEncoder.js
```

Functions:

- `fnv1a32`
- `deriveSemanticSlug`
- `buildCccbId`
- `parseCccbId`
- `serializeCccbBlock`
- `parseCccbBlock`
- `verifyCccbBlock`
- `extractCccbBlocks`
- `traverseCccbGraph`

## 6.2 BytecodeXP Vaccine Adapter

Implemented module:

```text
codex/core/diagnostic/BytecodeXPVaccine.js
```

It derives `PB-XP-v1` vaccine artifacts from:

- `BytecodeError`
- `BytecodeHealth`
- CCCB block IDs

## 6.3 QBIT Pulse Node

Implemented module:

```text
codex/core/diagnostic/QbitPulse.js
```

It attaches vaccine IDs to bounded hotspot metadata for agent traversal.

## 6.4 Cleri-Probe Enrichment

Future optional path:

```text
scripts/cleri-probe.js
codex/core/immunity/protein-probe.engine.js
codex/core/diagnostic/QbitProbeEnrichment.js
```

The probe may supply hotspot candidates, but normal diagnostics must not depend on it.

---

# 7. Architecture

```text
PB-ERR / PB-OK / CCCB
  -> deterministic fingerprint adapter
  -> PB-XP-v1 vaccine
  -> QBIT pulse node
  -> optional cleri-probe hotspot enrichment
  -> optional MCP memory infusion
```

Phase 0-1 architecture:

```text
CCCB block text
  -> parseCccbBlock()
  -> verifyCccbBlock()
  -> traverseCccbGraph()
```

---

# 8. Module Breakdown

| Module | Phase | Responsibility |
|---|---:|---|
| `cccbEncoder.js` | 1 | CCCB checksum, parser, serializer, verifier, graph traversal |
| `BytecodeXPVaccine.js` | 2 | Diagnostic-to-vaccine adapter |
| `QbitPulse.js` | 3 | Vaccine-to-hotspot pulse metadata |
| `QbitProbeEnrichment.js` | 4 | Optional semantic hotspot candidate discovery |
| `QbitMemoryPersistence.js` | 5 | Optional persistence transport and memory envelope |

---

# 9. ByteCode IR Design

Phase 1 did not introduce `PB-XP-v1`.

Implemented internal `PB-XP-v1` format:

```text
PB-XP-v1-{SOURCE_KIND}-{SLUG}-{FINGERPRINT}-{CHECKSUM}
```

This is internal diagnostic adapter metadata. It is not canonical external schema until schema review approves persistence or public transport.

---

# 10. Implementation Phases

## Phase 0 — Contract Definition

Status: Implemented.

Deliverables:

- Spec sheet.
- PDR.
- Caveats captured as hard constraints.

## Phase 1 — CCCB Reference Implementation

Status: Implemented.

Deliverables:

- `codex/core/diagnostic/cccbEncoder.js`
- `tests/diagnostic/cccbEncoder.test.js`
- Diagnostic public API export.

## Phase 2 — BytecodeXP Vaccine Adapter

Status: Implemented.

Deliverables:

- `BytecodeXPVaccine.js`
- Deterministic vaccine tests.
- Decision on schema contract handling before persistence.

Implementation boundary:

- `PB-XP-v1` is implemented as an internal diagnostic adapter artifact.
- It is not yet part of `DiagnosticReport` stable checksum input.
- Persistence uses the `SCHOL-BYTXP-MEM-v1` memory envelope documented in `SCHEMA_CONTRACT.md`.

## Phase 3 — QBIT Pulse Node

Status: Implemented.

Deliverables:

- `QbitPulse.js`
- Deterministic pulse tests.
- Stable hotspot sort and bounded pulse radius.

Implementation boundary:

- Pulse nodes are generated from `BytecodeXPVaccine` artifacts or parseable vaccine bytecode.
- Hotspots are normalized, clamped, sorted by resonance descending and path ascending, and bounded by `maxHotspots`.
- `pulseRadius` and `collapseConfidence` are clamped to `0..1`.
- Pulse checksums exclude runtime probe timing and persistence metadata.
- Pulse nodes may be wrapped in `SCHOL-BYTXP-MEM-v1` envelopes through explicit persistence calls and are not part of `DiagnosticReport` stable checksum input.

## Phase 4 — Optional Cleri-Probe Enrichment

Status: Implemented.

Deliverables:

- Programmatic probe adapter.
- Opt-in diagnostic enrichment path.
- Runtime budget limits.

Implementation boundary:

- Enrichment requires an explicit file substrate or injected probe runner.
- The adapter does not walk the repository by default.
- `maxFiles`, `maxFileBytes`, `maxHotspots`, `maxRuntimeMs`, and `minResonance` are bounded options.
- `maxRuntimeMs` is enforced by the default probe itself via a wall-clock deadline checked per file (the synchronous scan cannot be interrupted by a raced timer alone), in addition to the outer timeout backstop for injected async probes.
- Probe duration, timeout state, and scan metadata are returned as enrichment metadata but excluded from QBIT pulse checksums.
- Pulse artifacts may be wrapped in `SCHOL-BYTXP-MEM-v1` envelopes through explicit persistence calls and are not part of `DiagnosticReport` stable checksum input.

## Phase 5 — MCP Memory Persistence Envelope

Status: Implemented.

Deliverables:

- `SCHEMA_CONTRACT.md` version `1.24` entry for BytecodeXP/QBIT memory artifacts.
- `QbitMemoryPersistence.js`.
- Deterministic `SCHOL-BYTXP-MEM-v1` envelope builder.
- MCP memory set payload helper.
- Injected persistence helper with dry-run support.

Implementation boundary:

- Live persistence requires an injected `memoryClient.set` function.
- Ordinary diagnostic scans do not write memory.
- Envelope checksums exclude volatile enrichment duration metadata.
- Envelopes validate vaccine and QBIT pulse checksums before write payloads are produced.

---

# 11. QA Requirements

Phase 1:

- FNV-1a checksum examples match the existing CCCB PDR.
- Semantic slug derivation is deterministic.
- Parser rejects unknown and missing fields.
- Verifier rejects checksum drift.
- Graph traversal reaches `TERMINAL`.
- Graph traversal rejects cycles.

Future phases:

- Vaccine checksum determinism.
- QBIT pulse checksum determinism.
- Optional probe enrichment bounded by count and runtime.
- Memory envelope checksum determinism.

---

# 12. Success Criteria

Phase 0-1 is successful when an agent can parse a CCCB block, verify its checksum, and traverse its `NEXT` edge without reading the full PDR prose.

Full system success requires a future agent to consume a `PB-XP-v1` vaccine and know:

- what diagnostic source produced it,
- what stable context matters,
- where the QBIT pulse originated,
- which semantic hotspots are nearby,
- what next action to take.

---

# 13. Implementation Record

2026-06-04:

- Phase 0 documented.
- Phase 1 implemented through `cccbEncoder.js`.
- Phase 1 tests added.
- Phase 2 implemented through `BytecodeXPVaccine.js`.
- Phase 2 tests added for error, health, CCCB, parseability, checksum drift, and mutation safety.
- Phase 3 implemented through `QbitPulse.js`.
- Phase 3 tests added for deterministic pulse construction, hotspot normalization, checksum drift, origin derivation, bytecode-only input, malformed input rejection, and mutation safety.
- Phase 4 implemented through `QbitProbeEnrichment.js`.
- Phase 4 tests added for hypothesis derivation, injected probe normalization, pulse construction, empty substrate handling, timeout handling, malformed input rejection, and mutation safety.
- Phase 5 implemented through `QbitMemoryPersistence.js`.
- `SCHEMA_CONTRACT.md` bumped to version `1.24` with BytecodeXP/QBIT memory artifact shapes.
- Phase 5 tests added for deterministic envelopes, memory key generation, volatile metadata exclusion, MCP payload generation, injected persistence, dry-run behavior, invalid pulse rejection, and mutation safety.
- Scan-write integration implemented through `diagnostic-memory-infusion.js`, `runDiagnostic({ memoryInfusion })`, CLI `--write-memory` manifests, and MCP `diagnostic_trigger_full_scan` memory writes.
- Scan-write tests added for real diagnostic violations, dry-run payload manifests, optional health infusion, artifact caps, and report checksum stability.
