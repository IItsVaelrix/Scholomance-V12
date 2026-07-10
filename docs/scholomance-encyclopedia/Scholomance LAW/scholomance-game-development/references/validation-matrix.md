# Validation Matrix

Report commands and observed output. An unchecked checklist is not evidence.

## Package

```bash
python /home/deck/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
rg -n 'TO[D]O|TB[D]|PLACEHOLD[E]R' \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
```

Require a successful validator result and no placeholder matches.

## SCDL

```bash
node codex/core/pixelbrain/scdl/scdl.cli.js check path/to/asset.scdl
node codex/core/pixelbrain/scdl/scdl.cli.js compile path/to/asset.scdl \
  --export json,png,svg,phaser,aseprite
```

Confirm:

- No `SCDL-*` error.
- No unknown-material fallback is accepted as production-ready.
- PB-SEM diagnostics match intended roles, materials, effects, and provenance.
- Outputs follow target-suffixed naming and land beside source unless `--out-dir` is explicit.
- Frame indices and replacement/addition ordering obey SCDL v1.1 laws.
- Compiler, not the author, emits the frame-loop manifest.

## Determinism

Run the same compile, forge, or emit operation twice with identical input. Compare canonical packet IDs and serialized packet/export/manifest content. When applicable compare shader hashes, Godot artifacts, and PNG bytes.

An intentional output change requires a source explanation. A semantic-only annotation change must not silently alter geometry identity.

## PB-SEM

Confirm canonical role resolution rather than downstream alias conditionals. Check that material/effect binding is valid and that `partId`, role, material, `sourceOpId`, annotations, and provenance survive lowering.

Treat these diagnostics explicitly:

- `PB-SEM-001`: unknown role.
- `PB-SEM-002`: conflicting role ownership.
- `PB-SEM-003`: missing material binding for an effect.
- `PB-SEM-004`: invalid effect target.
- `PB-SEM-005`: provenance loss.

## Isometric Integrity

```bash
file path/to/asset.png
```

Also inspect image statistics or a trusted image tool to prove alpha includes `0`. Verify exact SCDL dimensions, intended diamond/silhouette bounds, floor/decor separation, bottom-center prop anchor, cliff extension, native draw dimensions, projection alignment, and consistent upper-left/NW lighting in the live combat grid.

## Foundry and Routes

Check `routeDiagnostics.ok`, the grammar and construction contracts, every required part/material/motif/anchor/mask, and non-empty GeometryAMP masks. Run focused tests for the changed route before broad PixelBrain QA.

Reference commands include:

```bash
npx vitest run tests/core/pixelbrain/shape-grammar-router.test.js
npx vitest run tests/core/pixelbrain/item-foundry.test.js
npx vitest run tests/core/pixelbrain/construction-line-microprocessor.test.js
npx vitest run tests/qa/pixelbrain
```

## Animation

For SCDL animation, verify the compiler-generated manifest, per-frame duration, stable frame-0 packet identity, fixed Aseprite layer order, and absent parts as empty layers.

For transform/effect animation, evaluate the same absolute timestamps repeatedly. Confirm bytecode channel lookup consistency, frame-rate independence, bounded cached patterns, and absence of per-frame randomness or simulation.

## Exports and UI

Confirm the export derives from a packet or lattice, never a screenshot. Confirm render transforms do not mutate the source packet. For UI surfaces, verify the DIV Wand proposal's declared and computed geometry, keyboard operation, accessibility, reduced motion, and semantic z-index tiers.

## Diagnosis

Use this order:

```text
diagnostic -> route/pass/seam -> required output -> owning source -> correction -> repeatable proof
```

Do not finish at the first plausible renderer symptom. Prove the earliest authoritative defect and show that regeneration clears the diagnostic.

## Repository Gates

Run focused lint/tests for touched implementation files, then:

```bash
git diff --check
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
git status --short
```

Separate pre-existing failures and unrelated worktree changes from changes caused by the task.
