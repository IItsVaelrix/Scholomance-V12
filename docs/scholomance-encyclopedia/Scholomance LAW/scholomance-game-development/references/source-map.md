# Canonical Source Map

Use this map after classifying the request. Read every selected document completely. Canonical documents override this routing summary.

## Mandatory Law Stack

Read for every task, in order:

1. [SHARED_PREAMBLE.md](../../SHARED_PREAMBLE.md)
2. [VAELRIX_LAW.md](../../VAELRIX_LAW.md)
3. [SCHEMA_CONTRACT.md](../../SCHEMA_CONTRACT.md)
4. [AGENTS.md](../../AGENTS.md)

These define source authority, schema sovereignty, agent ownership, bytecode errors, determinism, quality gates, and the current SCDNA inheritance.

## Conditional Sources

| Trigger | Read completely | Extract |
|---|---|---|
| SCDL authoring or compiler work | [SCDL_AUTHORING_GUIDE.md](../../../Scholomance%20White%20Papers/SCDL_AUTHORING_GUIDE.md) and [SCDL_COMPILER_WHITE_PAPER.md](../../../Scholomance%20White%20Papers/SCDL_COMPILER_WHITE_PAPER.md) | Syntax, painter order, frames, pass order, diagnostics, exporters, implementation limits |
| Isometric or 2.5D assets | [SCDNA_Gene_Isometric_Asset_Integrity.md](../../SCDNA_Gene_Isometric_Asset_Integrity.md) | SCDL canvas, silhouette masks, transparency, anchors, base/decor separation, NW light law |
| Vector art or structured DOM proposals | [WAND-AND-DIVWAND-MANUAL.md](../../../Scholomance%20White%20Papers/WAND-AND-DIVWAND-MANUAL.md) | Fairly Odd Wand versus DIV Wand boundary, bounded proposals, roles, evaluated artifacts |
| Roles, materials, effects, or provenance | [PIXELBRAIN_SEMANTICS_BRIDGE_WHITE_PAPER.md](../../../Scholomance%20White%20Papers/PIXELBRAIN_SEMANTICS_BRIDGE_WHITE_PAPER.md) | Canonical role resolution, SemQuant pass, PB-SEM diagnostics, material transmutation |
| Bytecode, packets, formulas, or animation | [PIXELBRAIN_LANGUAGE_WHITE_PAPER.md](../../../Scholomance%20White%20Papers/PIXELBRAIN_LANGUAGE_WHITE_PAPER.md) | Lattice and packet authority, bytecode integrity, formulas, blueprints, absolute-time laws, assertions |
| Foundry, export, route, or broken-asset work | [PIXELBRAIN_AGENT_OPERATING_MANUAL.md](../../../Scholomance%20White%20Papers/PIXELBRAIN_AGENT_OPERATING_MANUAL.md) | Ownership map, recipes, route seams, required outputs, tests, diagnosis, anti-patterns |

## Current Implementation Limits

Keep documented contract and runtime status distinct:

- SCDL `rotate`, `scale`, and `translate` parse but do not currently lower to geometry.
- SCDL `union`, `subtract`, and `intersect` use placeholder lowering; real set operations and conflict diagnostics are incomplete.
- SCDL `reference` and `instance` currently emit marker behavior rather than production referenced geometry.
- SCDL `ellipse` is an outline; it is not a filled ellipse.
- SCDL `fill`, `trace`, and `glow` are deferred intents or hints, not necessarily raster pixels in every exporter.
- PB-SEM semantic failures are fault-isolated in compilation; inspect diagnostics even when compilation succeeds.
- The Aseprite decoder has a known cell-accumulation limitation; verify encoded frame count and canvas dimensions using the documented supported checks.

Do not describe a published contract as already implemented when the canonical source marks it as future or placeholder behavior.
