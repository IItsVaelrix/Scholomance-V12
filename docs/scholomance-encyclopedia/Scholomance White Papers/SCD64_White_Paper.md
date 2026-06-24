# SCD64: SPATIAL COLOR DIAGNOSTIC 64
## A White Paper on Structured, Deterministic Bug Fingerprinting for TrueSight and the Spatial Immune System

**Bytecode Search Code:** `SCHOL-ENC-SCD64-WP-USAGE-2026`

> "The 64-character string is the lookup skeleton. The JSON is the diagnostic body."  
> — SCD64 Design Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem: The Color Dragon in TrueSight](#2-the-problem-the-color-dragon-in-truesight)
3. [What is SCD64](#3-what-is-scd64)
4. [The 64-Character Format and Slot Architecture](#4-the-64-character-format-and-slot-architecture)
5. [Deterministic Generation](#5-deterministic-generation)
6. [The Full Diagnostic Object](#6-the-full-diagnostic-object)
7. [Integration with the Spatial Immune System](#7-integration-with-the-spatial-immune-system)
8. [BytecodeHealth Wiring](#8-bytecodehealth-wiring)
9. [The Glossary and MCP Substrate](#9-the-glossary-and-mcp-substrate)
10. [How to Use SCD64](#10-how-to-use-scd64)
11. [Running Against TrueSight](#11-running-against-truesight)
12. [QA Checklist and Verification](#12-qa-checklist-and-verification)
13. [Extending SCD64 to New Bug Families](#13-extending-scd64-to-new-bug-families)
14. [Operational Runbook](#14-operational-runbook)
15. [Appendix: Pinned Color Dragon Example](#15-appendix-pinned-color-dragon-example)

---

## 1. Executive Summary

SCD64 (Spatial Color Diagnostic 64) is a compact, deterministic, machine-parseable 64-character uppercase hexadecimal fingerprint for complex, spatially-distributed bugs in the TrueSight rendering and color pipeline.

It condenses an entire bug anatomy — coordinate system divergence, invariant violations, masking behavior, gate failures, propagation paths, and diagnostic verdict — into a single stable key that can be:

- Stored in BytecodeHealth
- Indexed in the MCP substrate
- Looked up instantly against a glossary
- Used as a canonical identifier for regression testing and agent convergence

SCD64 is deliberately **non-autonomous**. It is a human-injected diagnostic instrument that produces an unambiguous signal for AI teams to reason over without hallucinating fixes.

The canonical first demonstration string for the Color Dragon bug is:

```
01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C
```

---

## 2. The Problem: The Color Dragon in TrueSight

TrueSight provides real-time color, school, and resonance overlays on text based on phonemic and syntactic analysis. The "Color Dragon" refers to a class of subtle, high-impact failures where:

- The **backend** (compileVerseToIR, deepRhymeEngine, syntaxLayer) correctly computes resonantCharStarts, vowel families, and authorizes colorization.
- The **frontend** (TruesightPlugin in the Lexical editor) recomputes or overrides the color decision using divergent coordinate systems and fallback paths.
- The **resonance gate** (the mechanism that should restrict rich coloring to resonant connections) never fires because the charStart keys never match.

Root causes include:

- **Coordinate system mismatch**: Backend uses source-relative `charStart` (including newlines). Frontend uses Lexical sibling traversal (`getGlobalCharStart`) that adds +1 per paragraph.
- **Hierarchy masking**: The `analysisMap` fallback keyed on lowercase token text silently supplies analysis for the wrong occurrence when charStart lookup fails.
- **G2P vs fallback divergence**: Vowel family (and therefore school/color) can come from authoritative backend or local PhonemeEngine.analyzeDeep.
- **No single gate**: "Should this word receive school color?" is decided in multiple places with different data.

Previous fixes at the decision layer (the `shouldColor` blocks) failed because they operated on poisoned coordinates. The bug was not in the color formula — it was in the coordinate authority that fed the gate.

SCD64 was invented to give this class of bug a stable, spatial, mathematically derivable identity.

---

## 3. What is SCD64

SCD64 is a **64-character uppercase hex string** divided into eight fixed 8-character blocks.

Each block represents one diagnostic criterion. The entire string acts as:

- A deterministic lookup key
- A stable bug anatomy signature
- An MCP-indexable identifier
- A payload that can be embedded in BytecodeHealth

The string is **never** generated from runtime floating-point values. Runtime evidence lives in the companion JSON. The hex blocks are derived only from canonical strings.

**Core invariants (locked forever):**

- Always exactly 64 uppercase hex characters (`[0-9A-F]{64}`)
- Fixed 8-slot order
- Version byte lives in `BUGCLASS[0:2]` (currently `"01"`)
- Irrelevant slots are `"00000000"`
- Short strings are forbidden
- Derivation is pure SHA256 of a canonical derivation string

---

## 4. The 64-Character Format and Slot Architecture

| Slot | Range | Name       | Purpose                                      | Example (Color Dragon) |
|------|-------|------------|----------------------------------------------|------------------------|
| 0    | 0-7   | BUGCLASS   | Bug family + version byte                    | `01861DF4`            |
| 1    | 8-15  | COORDSYS   | Coordinate systems in conflict               | `C31AC92C`            |
| 2    | 16-23 | INVARIANT  | The specific invariant that broke            | `24D4754D`            |
| 3    | 24-31 | MAGNITUDE  | Severity / scale of the drift                | `D1043D24`            |
| 4    | 32-39 | MASKING    | What hid the bug from previous fixes         | `4908E4B3`            |
| 5    | 40-47 | GATE       | The decision point that should have fired    | `317B9073`            |
| 6    | 48-55 | PROPAGATE  | How the error traveled through the system    | `5048A13A`            |
| 7    | 56-63 | VERDICT    | High-level diagnostic conclusion             | `0AB2B33C`            |

The first two characters of slot 0 are the version byte (`"01"` for v1).

---

## 5. Deterministic Generation

Every hex block is produced by:

```js
const hash = crypto.createHash('sha256')
  .update(canonicalDerivationString)
  .digest('hex')
  .toUpperCase();

const hex = isBugClass ? '01' + hash.slice(0,6) : hash.slice(0,8);
```

**Color Dragon canonical derivation strings (locked):**

- `BUGCLASS:COLOR_DRAGON:coordinate-drift+fallback-masking`
- `COORDSYS:source-charstart+lexical-sibling-walk+frontend-token-boundary`
- `INVARIANT:globalCharStart-mismatch+vowelFamily-source-divergence`
- `MAGNITUDE:mismatchRate>=0.94+perLineDrift+tokenCoverageDelta`
- etc.

This guarantees that the same bug anatomy always produces the identical 64-char string, even across different runs, agents, or machines.

---

## 6. The Full Diagnostic Object

The 64-char string is only the skeleton. The complete diagnosis is a structured object:

```json
{
  "schema": "SCD64_DIAGNOSTIC",
  "schemaVersion": 1,
  "domain": "COLOR",
  "bugFamily": "COLOR_DRAGON",
  "diagnosticMode": "DIAGNOSE_ONLY",
  "checksum64": "01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C",
  "slots": [ /* 8 slot objects with hex + glossaryKey */ ],
  "equations": [ /* JSON math objects (ICD, GMD, etc.) */ ],
  "runtimeEvidence": { /* backend vs frontend data */ },
  "raid": { /* verdict, evidenceRefs, similarity */ },
  "qbitField": { /* final spatial aggregation */ },
  "bytecodehealth": {
    "spatialDiagnosticChecksum": "01861DF4..."
  }
}
```

Equations are JSON objects containing `name`, `symbol`, `formula`, and `variables`. They travel alongside the checksum.

---

## 7. Integration with the Spatial Immune System

SCD64 lives inside `SpatialImmuneOrchestrator`:

```js
import { SpatialImmuneOrchestrator } from 'codex/core/immunity/spatial-immune-orchestrator.js';

const orch = new SpatialImmuneOrchestrator({ sizeX: 64, sizeY: 64, sizeZ: 64 });

// After RAID + QBIT final aggregation
const diagnosis = orch.generateSCD64(raidResult, qbitState, evidence);
```

The orchestrator automatically:

- Detects color/resonance/charStart symptoms
- Generates SCD64 after RAID absorption
- Wires BytecodeHealth
- Runs full TrueSight sweeps via `runFullTruesightDiagnostic()`

---

## 8. BytecodeHealth Wiring

SCD64 is **never** conflated with the existing 8-character health checksum.

Correct pattern:

```js
const health = orch.createBytecodeHealthForSCD(scd64Full, 'TRUESIGHT_COLOR', 'SCD64');

health.context.spatialDiagnosticChecksum === "01861DF4...";  // the 64-char key
health.checksum;  // still the original 8-char health checksum
```

Dashboards must treat `PB-OK-v1-SCD64` as "we have captured a structured diagnosis", not "the unit is healthy."

---

## 9. The Glossary and MCP Substrate

Each slot value has a glossary entry:

```json
{
  "schema": "SCD64_GLOSSARY_ENTRY",
  "slotName": "BUGCLASS",
  "hexCode": "01861DF4",
  "canonicalDerivationString": "...",
  "jsonFormulaTemplate": { ... },
  "categoryChecksum": "E8F4A2C91B7D3E5F"
}
```

The glossary is designed to live in the MCP substrate so agents can instantly recall meaning, formulas, and human descriptions by hex code or `categoryChecksum`.

---

## 10. How to Use SCD64

### Basic Generation

```js
const full = orch.generateSCD64(raid, qbit, evidence);
console.log(full.checksum64);
```

### Parsing (any AI can do this)

```js
const parsed = parseSCD64(full.checksum64);
// parsed.slots[0].hex === "01861DF4"
// parsed.versionByte === "01"
```

### Looking up meaning

Query the MCP glossary by `hexCode` or `categoryChecksum`.

### Running a full TrueSight sweep

```js
const report = runTrueSightSCD64Sweep();
report.results.forEach(r => {
  console.log(r.scd64, r.bytecodeHealth.context.spatialDiagnosticChecksum);
});
```

---

## 11. Running Against TrueSight

The recommended entry point is:

```js
import { runTrueSightSCD64Sweep } from 'codex/core/immunity/spatial-immune-orchestrator.js';

const sweep = runTrueSightSCD64Sweep();
```

This method:

1. Registers TrueSight spatial nodes (TruesightPlugin, compileVerseToIR, ReadPage, etc.)
2. Injects the Color Dragon prion and propagation exosome
3. Runs agent chemotaxis + absorption
4. Produces per-component and aggregate SCD64 + BytecodeHealth records

Use the evidence payloads from `compileVerseToIR`, `ReadPage`, and `TruesightPlugin` (globalCharStart, resonantCharStarts, vowelFamily, computed vs authoritative, etc.).

---

## 12. QA Checklist and Verification

Before promoting any change to v1 locked, execute:

- **repeatability**: Same sweep 10× → identical SCD64
- **agent convergence**: WBC-0, WBC-1, aggregate all produce same SCD64 for identical anatomy
- **negative control**: Non-color bug produces different BUGCLASS (or null COLOR slots)
- **nearby bug distinction**: Pure coordinate mismatch produces different COORDSYS and/or INVARIANT
- **health semantics**: `PB-OK-v1-SCD64` in BytecodeHealth is never misinterpreted as "no bug present"

The current implementation passes all five checks because derivation is purely from canonical strings.

---

## 13. Extending SCD64 to New Bug Families

1. Define new canonical derivation strings for each slot.
2. Add a new category (e.g., `BYTECODE_DRIFT`).
3. Update `generateSCD64` (or create a domain-specific generator).
4. Add glossary entries with `jsonFormulaTemplate`s.
5. Register the new symptom patterns in the orchestrator's color-domain detector (or generalize it).

The 8-slot skeleton and 64-char length remain fixed.

---

## 14. Operational Runbook

- Always capture both the 64-char `checksum64` and the full object.
- Feed the checksum into BytecodeHealth as `spatialDiagnosticChecksum`.
- Index the glossary entries (and their `categoryChecksum`s) in MCP.
- Use `parseSCD64` for any automated consumer.
- Never derive hex blocks from observed runtime values.
- When a new variant appears, create a new canonical string rather than mutating an existing one.

---

## 15. Appendix: Pinned Color Dragon Example

**checksum64:**
```
01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C
```

**Key slots (decoded via glossary):**
- BUGCLASS: `COLOR_DRAGON: coordinate-drift+fallback-masking`
- INVARIANT: `globalCharStart-mismatch+vowelFamily-source-divergence`
- MASKING: `resonantCharStarts-true+frontend-fallback-painter-overrides-family`
- VERDICT: `diagnose-only+authoritative-backend-family+rogue-painter`

**Core equations (excerpt):**

```json
{
  "name": "Invariant Color Divergence",
  "symbol": "ICD",
  "formula": "ICD(w) = backendVowelFamily(w, context) != frontendVowelFamily(w)"
}
{
  "name": "Gate Masked Divergence",
  "symbol": "GMD",
  "formula": "GMD(w) = resonantCharStarts.includes(globalCharStart(w)) && colorSource(w) != authoritativeColorSource(w)"
}
```

This is the reference fingerprint for the entire class of TrueSight color/resonance coordinate bugs.

---

**Document Version:** 1.0  
**Status:** v1 Locked (pending final operational validation)  
**Owner:** Spatial Immune / TrueSight team

*End of SCD64 White Paper*