# PDR: PixelBrain Craft Gate for Forge Asset Immunity
## CLI gate for pixel-perfect forge assets, schema-bound voxel packets, and PB-ERR immune memory

**Bytecode Search Code:** `SCHOL-ENC-PDR-PIXELBRAIN-CRAFT-GATE-IMMUNITY-v1.0`
**Date:** 2026-06-19
**Status:** Draft
**Classification:** PixelBrain | Immunity | CLI Gate | Forge QA | Deterministic Asset Pipeline
**Priority:** High
**Primary Goal:** Add a CLI gate tied to Scholomance Immunity that refuses dirty forge assets before they become exported artifacts. The gate audits canonical lattice, construction, material, volume, and voxel packet state, not screenshots.

---

# 1. Executive Summary

The Item Foundry can now produce strong 2D assets and, through Structural-Energy Lift / VolumeLiftAMP, true item voxel packets. Existing tests prove the voidmetal pickaxe route emits required parts and deterministic output, but they do not yet prove professional craft: readable silhouette, clean pixel logic, legal construction, material authority, or voxel packet health. This PDR defines a PixelBrain Craft Gate CLI that compiles an `ITEM-SPEC-v1`, runs `forgeItemAsset()`, and emits a schema-bound `PixelBrainCraftGateReport` plus `PB-ERR-v1` failures. The first target is `specs/voidmetal-pickaxe.v1.json`; the gate must be generic enough for later weapons, shields, armor, and jewelry.

# 2. Problem Statement

Forge success is currently too broad. A route can be deterministic and still produce an amateur asset if the silhouette reads poorly, a diagonal handle crawls, the construction anchor is loose, or a voxel packet carries off-palette material ids. The new `.volume` and `.voxelPacket` outputs make this more urgent: a bad 2D lattice now becomes bad 3D geometry. The gate must separate "generated" from "shippable."

# 3. Product Goal

Create a CLI workflow:

```bash
node scripts/pixelbrain-forge-gate.mjs specs/voidmetal-pickaxe.v1.json --strict
node scripts/pixelbrain-forge-gate.mjs specs/voidmetal-pickaxe.v1.json --strict --json
```

that performs:

```text
ITEM-SPEC-v1
  -> forgeItemAsset()
  -> route/lattice/material/construction/readability audits
  -> volume + PB-VOXEL-ITEM-v1 audits
  -> deterministic forge-twice comparison
  -> PixelBrainCraftGateReport
  -> PB-ERR-v1 failures for Immunity / PB-XP learning
```

# 4. Non-Goals

- Do not generate or repaint assets. The gate diagnoses and blocks; it does not craft.
- Do not derive canonical truth from PNGs, screenshots, canvas previews, or shader output.
- Do not introduce `PB-FORGE-GATE-v1` in v1. `PixelBrainCraftGateReport` is CLI/internal; failures use `PB-ERR-v1`.
- Do not bypass `ITEM-SPEC-v1`, `PixelBrainAssetPacket`, or `PB-VOXEL-ITEM-v1`.
- Do not expose a `/pixelbrain` UI surface until the core CLI contract is implemented and tested.

# 5. Core Design Principles

- **Lattice is law.** All audits inspect integer coordinates, part ids, material ids, construction hints, route diagnostics, volume buffers, or voxel packets.
- **Construction before polish.** The gate checks anchors and structural relationships before color or export readiness.
- **Readability before effects.** A pickaxe must read as a pickaxe in silhouette and 1-bit inspection before glow/shader polish matters.
- **Errors are bytecode.** Blocking failures emit `PB-ERR-v1` strings with enough context for Immunity to learn cures.
- **Volume is not packet.** `bundle.volume` is in-memory; `bundle.voxelPacket` is the serialized boundary artifact.
- **No schema drift.** `PB-VOXEL-ITEM-v1` and `PixelBrainCraftGateReport` are registered in `SCHEMA_CONTRACT.md` v1.27.

# 6. Feature Overview

Proposed files:

| File | Owner | Purpose |
|---|---|---|
| `codex/core/pixelbrain/forge-craft-gate.js` | Gemini/backend implementation under Codex schema | Pure gate auditor. Accepts spec or bundle, returns `PixelBrainCraftGateReport`. |
| `scripts/pixelbrain-forge-gate.mjs` | Gemini/backend | CLI wrapper, JSON/human output, exit code 0/1. |
| `tests/core/pixelbrain/forge-craft-gate.test.js` | Gemini/backend + QA | Unit and mutation-negative coverage. |

Core report contract:

```ts
interface PixelBrainCraftGateReport {
  contract: "pixelbrain.craft-gate.v1";
  schemaVersion: "0.1.0";
  source: {
    path: string | null;
    specId: string | null;
    artifactKind: "ITEM-SPEC-v1" | "pixelbrain.asset.v1" | "PB-VOXEL-ITEM-v1";
  };
  strict: boolean;
  status: "pass" | "fail";
  summary: { audits: number; failures: number; warnings: number; fatal: number };
  audits: PixelBrainCraftGateAudit[];
  bytecodeErrors: string[];
}
```

# 7. Required Audits

| Audit | Required checks |
|---|---|
| `itemSpec` | `normalizeItemSpec()` and `validateItemSpec()` pass; no unknown class/profile/material. |
| `route` | `routeDiagnostics.ok === true`; no fatal required-output failures. |
| `lattice` | Coordinates are integers, in bounds, non-empty, and carry `partId`; no duplicate `(x,y,partId)` conflicts. |
| `construction` | Required anchors are bound; for pickaxe, handle/collar attach to head base and inlay stays in the head readable zone. |
| `silhouetteReadability` | 1-bit silhouette remains connected and class-readable; pickaxe anatomy counts meet or exceed route minima. |
| `pixelLogic` | Diagonal handle avoids uncontrolled stair jitter; no floating islands; rim/motif conflicts fail. |
| `materialAuthority` | Every final color traces to registry anchors or documented source-palette quantization. |
| `determinism` | Two forge runs produce byte-identical `assetPacket`, `fills.hash`, PNG when requested, `.pbrain`, `.volume` diagnostics, and `voxelPacket`. |
| `volume` | `bundle.volume` dimensions are positive, typed-array lengths match `width * height * depth`, energy values are `0..1`, energy types are legal. |
| `voxelPacket` | `contract === "PB-VOXEL-ITEM-v1"`, voxels sorted `y -> z -> x`, every voxel in bounds, every `materialId` resolves to `materials[String(id)]`, no `materialId: 0`, energy/energyType appear as a pair. |
| `export` | `PixelBrainAssetPacket` and exported Godot artifact remain derivable from canonical lattice without reading PNG/shader output as source. |

# 8. Bytecode IR Design

The gate does not reserve a new persisted bytecode family. Blocking failures should use existing `PB-ERR-v1` categories:

| Failure | Category | Module | Suggested code family |
|---|---|---|---|
| invalid spec / missing field | `VALUE` or `SCHEMA` when local encoder supports it | `SCHEMA` or `IMMUNE` | missing required / invalid format |
| out-of-bounds coordinate / voxel | `COORD` or `RANGE` | `COORD` | coordinate out of bounds |
| invalid color/material | `COLOR` or `VALUE` | `COLBYT` | color-byte mismatch / invalid value |
| route emitted zero required output | `STATE` | `IMMUNE` or future `LATTICE` | invariant violation |
| voxel packet nondeterminism | `STATE` | `IMMUNE` | invariant violation |

If Gemini needs new encoder constants for `SCHEMA`, `LATTICE`, or a dedicated craft module, escalate to Codex before adding them.

# 9. Implementation Phases

| Phase | Deliverable | Acceptance |
|---|---|---|
| 0 | Pure audit helpers for coordinates, materials, volume, voxel packets | Focused tests pass on valid pickaxe bundle and mutated invalid fixtures. |
| 1 | `runPixelBrainCraftGate(spec, opts)` | Returns `PixelBrainCraftGateReport`; no CLI yet. |
| 2 | CLI wrapper | `--json`, `--strict`, and exit codes work; no network or server required. |
| 3 | Immunity integration | `npm run immune:scan` or a separate `npm run pixelbrain:gate` can invoke it on staged specs without touching user drafts. |
| 4 | Mutation-negative suite | All required malformed cases fail with `PB-ERR-v1` evidence. |

# 10. QA Requirements

Gemini should add tests for:

- Valid `specs/voidmetal-pickaxe.v1.json` passes the gate.
- Missing `head_core`, `handle`, `handle_wrap`, `collar`, or `void_inlay` fails.
- Off-grid 2D coordinate fails.
- Floating island or disconnected silhouette fails.
- Jagged/crawling diagonal handle fails the pixel-logic audit.
- Illegal material color or off-palette `colorHint` fails.
- `bundle.volume.cells.length`, `energyField.length`, or `energyTypes.length` mismatch fails.
- Voxel coordinate out of dimensions fails.
- `materialId: 0` or unresolved voxel material id fails.
- Voxel packet order not `y -> z -> x` fails.
- Voxel packet non-determinism fails.
- Energy without `energyType`, `energyType` without energy, illegal energy type, or energy outside `0..1` fails.

# 11. Success Criteria

The voidmetal pickaxe gate passes when forged from its current spec and fails when any canonical contract is intentionally corrupted. The gate emits stable JSON in `PixelBrainCraftGateReport` shape, emits bytecode errors for blocking failures, and never reads rendered PNGs or shader output as authority. Once this is green, Claude may design a `/pixelbrain` surface that consumes the report; until then the CLI is the source of truth.

# 12. Gemini Handoff

Gemini owns implementation and tests. Start with `forge-craft-gate.js` as pure functions, then wire the CLI. Use `SCHEMA_CONTRACT.md` v1.27 as the authority for `PB-VOXEL-ITEM-v1` and `PixelBrainCraftGateReport`. Do not add `PB-FORGE-GATE-v1`. If the local bytecode encoder lacks `SCHEMA` or `LATTICE` categories you need, either map failures to existing categories for v1 or escalate to Codex for an encoder/schema alignment patch.
