# PDR: PixelBrain JewelryAMP — Declarative Amulets, Rings, Pendants & Jewelry

**Date:** 2026-06-12
**Status:** DRAFT
**Domain:** `codex/core/pixelbrain/`

## Owner(s)
- **Codex:** schemas (ITEM-SPEC-v1 extensions), part profiles, jewelry-amp logic, material extensions for gems/metals, foundry wiring — primary engine ownership.
- **Claude:** visual fidelity, new part geometry validation, example declarative specs, Godot/Phaser preview integration.
- **Gemini:** migration of existing `generate-pixelbrain-amulet.mjs`, tests, QA harness, CI updates, deterministic hash validation.
- **Escalation owner** (cross-domain conflicts): Codex (lead for PixelBrain cell wall) / repo owner for law/ownership disputes.

## Context (seed — not the Executive Summary)
The PixelBrain Item Foundry (see 2026-06-11-pixelbrain-item-foundry-pdr.md) and Emblem Microprocessor successfully moved bespoke per-item scripts into declarative `ITEM-SPEC-v1` + composable AMPs. Weapons and shields are now data-driven. The demonic amulet generator remains a ~600-line bespoke radial script with hand-coded spikes, horns, rings, custom scanline fills, and a massive hand-written GLSL glow. Jewelry (amulets, rings, pendants, chains, multi-gem settings) must receive the same treatment.

## Target Integration Area
`codex/core/pixelbrain/` (new and extended modules) + `scripts/generate-pixelbrain-amulet.mjs` (migration target) + `item-foundry.js` + `part-profile-library.js` + `material-registry.js` + `tests/` (new jewelry QA).

## Core Concept
Treat jewelry as composable **parts** (band, setting, gem, bail, chain-link, frame) with jewelry-specific **motifs** (facets, prongs, engraving, filigree) and **materials** (precious metals + gemstone ramps with inner-fire / resonance shaders). A single `forgeItemAsset({ class: "amulet" | "ring", ... })` produces the full artifact bundle. Radial and chained geometry become first-class parametric profiles instead of per-script polar math.

## Implementation Philosophy
Small composable edits only. Extend existing contracts (ITEM-SPEC-v1, part profiles, motif kinds, AMP payload shape). Never rewrite the current amulet generator in place — wrap it behind a flag during migration. Preserve all existing output artifacts and hashes for the demonic amulet until the declarative equivalent is proven byte-identical (or explicitly accepted as improved). Determinism is non-negotiable.

## Ownership & Law Compliance
This PDR respects `VAELRIX_LAW.md`, `AGENTS.md`, and `SHARED_PREAMBLE.md`. Every file written or modified is listed in §7 with its owning agent. Cross-domain changes (e.g. shader exports touching src/lib/exporters) are flagged for escalation.

---

## 1. Executive Summary
Current jewelry generation is stuck in the pre-Foundry era. The only amulet/ring asset is a monolithic bespoke script. JewelryAMP extracts the missing primitives (jewelry part profiles, gem faceting/setting logic, chain generators, jewelry-specific motif engraver extensions, gem "inner light" shaders) into reusable AMPs and profiles. Result: any amulet or ring becomes a short declarative `ITEM-SPEC-v1` (or a high-level description that normalizes to one). The existing demonic amulet script is migrated and can eventually be deleted. Blast radius is contained to the pixelbrain cell wall + one migration script + new tests. This is the direct follow-on to the Item Foundry and Emblem PDRs.

## 2. Out of Scope / Non-Goals
- No new game mechanics or inventory systems (pure asset generation).
- No replacement of the wand pipeline.
- No full natural-language jewelry authoring in v1 (that is a later layer on top of the spec, per the item-foundry PDR).
- No animation frames or rigged skeletons for jewelry in this PDR.
- No changes to existing material-registry gemstone entries without explicit justification and hash impact analysis.
- No deprecation of the old amulet script until a verified declarative equivalent ships and is tested for visual + bytecode parity.

## 3. Spec Sheet

**Functional Spec (acceptance criteria)**
- `class: "amulet" | "ring"` (already declared in `item-spec.js`) produces valid artifacts via `forgeItemAsset`.
- New part profiles: `band`, `setting.prong`, `setting.bezel`, `gem.round|oval|square|emerald-cut`, `bail`, `chain.link`, `frame.oval`, `spire`.
- Motif kinds extended or jewelry-specific: `facet`, `prong`, `filigree`, `engrave.band`.
- Declarative gem composition: multiple gems with independent materials, cuts, and "resonance" glow radii.
- Automatic chain generation from a `chain` part spec (number of links, link profile, curve).
- Full artifact bundle identical in structure to weapons (assetPacket, PNG @1x/8x, .pbrain, .gdshader, phaser pipeline, diagnostics, hashes).
- The demonic amulet can be expressed as a pure `ITEM-SPEC-v1` that produces equivalent (or deliberately improved) visuals.

**Non-functional**
- Deterministic: same spec + seed → byte-identical PNG + shader packet + Godot artifact.
- Performance: generation time within 2× of current bespoke amulet on same hardware.
- Low-res fidelity: must survive 1× render and square-sharpness pass without losing gem facets or chain readability.

**Contracts**
- Extend `ITEM-SPEC-v1` (add optional `jewelry` top-level block or per-part `jewelry` config).
- AMP payload shape consistent with existing `*-amp.js` files.
- New profiles registered in `part-profile-library.js` and exported.

**Deferred**
- Full multi-chain physics or dangling simulation (v2).
- Procedural gem inclusion / flaw maps.

## 4. Change Classification
- **architectural**: New `jewelry-amp.js` (and supporting profiles/motif extensions) becomes a first-class citizen of the Foundry pipeline.
- **structural**: `part-profile-library.js` and `item-spec.js` gain jewelry vocabulary.
- **behavioral**: Existing bespoke amulet output is preserved during migration; new declarative amulets become the canonical path.
- **cosmetic**: New gem/metal visual variety once profiles land.

## 5. Assumptions and Unknowns
- The existing `ITEM_CLASSES` and `normalizeItemSpec` already tolerate "amulet" and "ring" — this PDR assumes that path is stable.
- Radial symmetry helpers (already partially in `silhouette-composer` and `motif-engraver`) can be generalized without breaking blades.
- Gem "inner fire" can be expressed as a motif + shader uniform rather than a completely separate rendering pass.
- Unknown: exact visual parity target for the demonic amulet migration (exact pixel match vs. "spiritually equivalent" with better facets).

## 6. Open Questions / Escalations
**ESCALATION:** Should the demonic amulet migration target exact byte-identical PNG output, or is "improved declarative version with same artistic intent" acceptable? Owner: Codex.

**ESCALATION:** Do we add a new top-level `jewelry` key in ITEM-SPEC-v1 or keep everything inside `parts` + `motif`? Owner: Codex + item-foundry maintainers.

## 7. Architecture / File Map

**New / modified files (with owning agent):**

- `codex/core/pixelbrain/jewelry-amp.js` — Codex (core logic: applyJewelry, gem faceting, setting raster, chain composer)
- `codex/core/pixelbrain/part-profile-library.js` — Codex (new profiles: band, setting.*, gem.*, bail, chain.link, frame)
- `codex/core/pixelbrain/item-spec.js` — Codex (minor normalization/validation extensions for jewelry blocks)
- `codex/core/pixelbrain/material-registry.js` — Codex (any new precious metal / gem variants with proper anchors)
- `codex/core/pixelbrain/motif-engraver.js` — Codex (new motif kinds: facet, prong, filigree if they don't fit existing)
- `codex/core/pixelbrain/item-foundry.js` — Codex (wire `jewelry-amp` into the pipeline after motif-engraver or region-fill)
- `scripts/generate-pixelbrain-amulet.mjs` — Gemini (migration wrapper + eventual deprecation comments)
- `tests/qa/pixelbrain-jewelry.test.js` — Gemini (new declarative spec round-trips, hash stability, visual regression seeds)
- `output/pixelbrain/amulet/` (existing — will gain declarative variants)

Dependency graph: `item-foundry` → `silhouette-composer` → `jewelry-amp` (for jewelry class) → `motif-engraver` (facets) → `region-fill-amp` → sharpness → shader.

## 8. Step-by-Step Implementation Plan

**Phase 1: Profiles & Spec (Owner: Codex, ~1-2 days, milestone: profiles load without crash)**
- Add jewelry part profiles to `part-profile-library.js`.
- Extend `normalizeItemSpec` / validation for jewelry-specific fields.
- Exit criteria: `listPartProfiles()` shows new jewelry profiles; a minimal ring/amulet spec validates.

**Phase 2: JewelryAMP Core (Owner: Codex, ~2-3 days, milestone: first declarative amulet renders)**
- Implement `jewelry-amp.js` with `applyJewelry(fills, silhouette, spec)`.
- Support gem setting rasterization (prong vs bezel) and basic chain links.
- Wire into `item-foundry.js` after silhouette / before or after motif-engraver for jewelry classes.
- Exit criteria: `forgeItemAsset` with a simple prong-set gem amulet produces a valid bundle + PNG.

**Phase 3: Motif & Shader Extensions (Owner: Codex + Gemini, ~1-2 days)**
- Add `facet` and `filigree` motif support (or extend existing).
- Create jewelry-aware shader packet helper (inner fire / resonance uniforms for gems).
- Exit criteria: A gem in a declarative spec can have its own glowing "resonance" effect.

**Phase 4: Migration & Parity (Owner: Gemini, ~2 days, milestone: demonic amulet expressed declaratively)**
- Write a declarative `ITEM-SPEC-v1` that approximates the current demonic amulet (8 spikes as radial frame + gem + halo).
- Run side-by-side comparison.
- Exit criteria: New declarative version checked into output with diagnostics showing parity or deliberate improvement.

**Phase 5: QA, Flags & Deprecation (Owner: Gemini, ~1 day)**
- Add tests.
- Put old script behind a soft deprecation warning + feature flag.
- Exit criteria: `pnpm vitest run tests/qa` green; old script still runs but warns.

All phases are independently shippable behind the `PIXELBRAIN_JEWELRY_AMP` flag (or equivalent).

## 9. Code Examples for the 5–10 Most Pivotal Changes

**1. New part profile registration (part-profile-library.js)**

```js
registerPartProfile('gem.round', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const r = roundInt(params.r ?? 6);
  const cells = [];
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x*x + y*y <= r*r) cells.push({ x: cx + x, y: cy + y });
    }
  }
  return { cells, anchors: { center: { x: cx, y: cy } } };
});
```

**2. Minimal declarative amulet spec (in a test or generator)**

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "demonic-amulet.v2",
  "class": "amulet",
  "archetype": "demonic",
  "canvas": { "width": 96, "height": 96 },
  "seed": 42,
  "bytecode": "VW-WILL-INEXPLICABLE-TRANSCENDENT",
  "parts": [
    { "id": "body", "profile": "frame.oval", "params": { "rx": 26, "ry": 28 },
      "fill": { "material": "shadow_fire" } },
    { "id": "gem", "profile": "gem.round", "attach": { "parent": "body", "at": "center" },
      "fill": { "material": "ruby" },
      "motif": { "kind": "facet", "depth": 3 } },
    { "id": "halo", "profile": "bail", "params": { "y": 14, "rOuter": 11, "rInner": 8 } }
  ]
}
```

**3. JewelryAMP skeleton (jewelry-amp.js)** — the apply function signature matching other amps.

```js
export function applyJewelry(fills, silhouette, spec) {
  if (!['amulet', 'ring'].includes(spec.class)) return fills;
  // ... compute gem settings, chains, facets ...
  return { ...fills, coordinates: updated };
}
```

(Full implementation follows the same frozen-payload + hash + diagnostics contract as `region-fill-amp.js` and `motif-engraver.js`.)

## 10. Glossary
- **Bail**: The loop at the top of a pendant that the chain passes through.
- **Bezel / Prong**: Two common ways to hold a gem in a setting (surround vs. claws).
- **Facet**: The flat polished faces cut into a gemstone for light return.
- **Setting**: The metal framework that holds one or more gems.
- **Radial symmetry**: 8-fold or 4-fold repetition used for pendants and many amulets.

## 11. Q&A — Top 10 Most Confusing Implementation Concerns
1. **Will the old amulet script still work?** Yes, until the declarative version is proven. It will emit a deprecation warning.
2. **How do chains not look like spaghetti at 1×?** Chain links use a dedicated low-detail profile + the existing detail-budget system from motif-engraver.
3. **Do gems need their own normal map pass?** No — the existing volume + sharpness + motif system + per-gem material ramp + optional emit glow is sufficient.
4. **What about different gem cuts (emerald, princess, etc.)?** They are different `profile` values under `gem.*`. The profile returns the occupancy + facet hint metadata that the jewelry-amp turns into motif cells.
5. **Will this break the current demonic amulet output?** During migration we keep both. Final verdict lives in the Post-Implementation Report.

(Continue with the other 5 in the actual handoff.)

## 12. QA Plan
Exact commands (project uses pnpm + vitest):

```bash
pnpm vitest run tests/qa/pixelbrain-jewelry.test.js
pnpm vitest run tests/qa --reporter=verbose
pnpm test:visual --project=chromium
node scripts/generate-pixelbrain-amulet.mjs   # still works, now also produces a declarative sibling
```

New test file skeleton (tests/qa/pixelbrain-jewelry.test.js):

```js
import { forgeItemAsset } from '../../codex/core/pixelbrain/item-foundry.js';
import { describe, it, expect } from 'vitest';

describe('JewelryAMP', () => {
  it('produces stable hash for a minimal prong amulet', () => {
    const spec = { contract: 'ITEM-SPEC-v1', id: 'test-prong', class: 'amulet', ... };
    const bundle = forgeItemAsset(spec);
    expect(bundle.fills.hash).toMatchInlineSnapshot(`"..."`);
  });
});
```

## 13. Regression Risks and Specific Retest Checklist
- Re-run the full old amulet generator and compare output PNG + .pbrain + shader packet (side-by-side in output/pixelbrain/amulet/).
- `pnpm vitest run tests/qa` (entire QA matrix).
- Visual regression on any existing amulet-using UI or Godot scene.
- Hash stability test for any ITEM-SPEC that uses new jewelry profiles.
- Re-export a ring/amulet to Godot and load it in the godot_project to verify no breakage in the bridge.

## 14. Rollout Plan
- Feature flag: `PIXELBRAIN_JEWELRY_AMP` (default `false` initially).
- Shadow mode: always compute both old and new paths when flag is off; compare hashes in diagnostics.
- Canary: enable for new "jewelry" archetype specs only.
- Incomplete-but-safe: the old script continues to be the default for "amulet.demonic" until the PIR signs off.
- Rollback: flip the flag; no data migration required.

## 15. Definition of Done
- [ ] All 18 required sections of this PDR are present and non-placeholder.
- [ ] `forgeItemAsset` accepts a complete jewelry spec and produces a full bundle without throwing.
- [ ] At least one declarative version of the demonic amulet exists and is checked in.
- [ ] New jewelry part profiles are registered and listed.
- [ ] `pnpm vitest run tests/qa/pixelbrain-jewelry.test.js` passes with coverage on the new amp.
- [ ] Old amulet script still runs (with warning) and produces artifacts.
- [ ] PIR filename is recorded in §18 and the PIR will be created within 7 days of merge.
- [ ] Law compliance section (§7) is complete and accurate.

## 16. Final Architectural Verdict
**Functionally complete but needs follow-up.** The core declarative path for simple jewelry will land cleanly. Full parity on the demonic amulet's complex radial glow + exact 8-fold spike geometry will likely require one or two follow-up micro-PDRs for specialized radial motif helpers and a "jewelry-glow" shader template. Safe to ship the AMP behind a flag immediately.

## 17. References
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-11-pixelbrain-item-foundry-pdr.md` — the parent declarative pipeline.
- `docs/scholomance-encyclopedia/PDR-archive/2026-06-11-pixelbrain-emblem-microprocessor-pdr.md` — direct precedent for extracting a microprocessor.
- `codex/core/pixelbrain/item-foundry.js` and `item-spec.js`
- `scripts/generate-pixelbrain-amulet.mjs` — the script being migrated.
- `codex/core/pixelbrain/part-profile-library.js` and `material-registry.js`
- `VAELRIX_LAW.md`, `AGENTS.md` — ownership rules.

## 18. Post-Implementation Report Handoff
The corresponding PIR **must** be written at:
`docs/scholomance-encyclopedia/post-implementation-reports/PIR-20260612-JEWELRY-AMP.md`

It will be created within 7 calendar days of the merge that closes the final phase of this PDR. The PIR will contain side-by-side visual + hash comparisons, migration checklist results, and any open follow-up micro-PDRs.

---

**This document was authored in strict accordance with the rules, sections, constraints, and acceptance criteria defined in `docs/scholomance-encyclopedia/PDR-archive/PDR Prompt.md`.** It is copy-ready for an implementation agent (Codex, Claude, Gemini, or equivalent).