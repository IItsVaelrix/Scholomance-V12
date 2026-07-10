# Scholomance Game Development Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate a Scholomance-specific game-development skill that routes asset, animation, UI, semantic, isometric, foundry, export, and diagnosis work through the repository's canonical SCDL and PixelBrain contracts.

**Architecture:** Create one standard skill package inside `Scholomance LAW`, with a concise `SKILL.md`, generated Codex interface metadata, and four focused reference files. The package points to the seven canonical source documents instead of copying them, preserving progressive disclosure and preventing law drift.

**Tech Stack:** Markdown agent skills, YAML interface metadata, Codex skill-creator scripts, shell validation, Scholomance SCDL/PixelBrain documentation, Git.

## Global Constraints

- Target path: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/`.
- Skill name: `scholomance-game-development` using lowercase letters and hyphens only.
- `SKILL.md` frontmatter contains only `name` and `description`; description starts with `Use when`, is third-person, and names concrete Scholomance triggers.
- `SKILL.md` stays below 500 lines and uses progressive disclosure for detailed guidance.
- Canonical source documents remain authoritative; reference files route readers to them and do not duplicate their full content.
- Lattice, bytecode, packets, SCDL, PB-SEM, and active schema contracts remain authoritative over PNG, SVG, canvas, DOM, shader, and preview output.
- Isometric work always loads `SCDNA_Gene_Isometric_Asset_Integrity.md` and preserves exact canvas, alpha, silhouette, anchor, compositing, and NW light law.
- Animation uses SCDL frame deltas for geometry changes and absolute-time precomputed bytecode channels for transforms/effects.
- No README, changelog, installation guide, copied asset bundle, parallel schema, or unrelated refactor.
- Do not modify or stage unrelated user changes already present in the worktree.
- Do not use subagents unless the user separately authorizes multi-agent work; execute this plan inline when that authorization is absent.

---

### Task 1: Establish RED validation and initialize the standard package

**Files:**
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/SKILL.md`
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/agents/openai.yaml`
- Create directory: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-10-scholomance-game-development-skill-design.md`.
- Produces: a standard initialized skill package that later tasks replace with finished content.

- [ ] **Step 1: Read the active law and skill-creation instructions completely**

Read the active `SHARED_PREAMBLE.md`, `VAELRIX_LAW.md`, `SCHEMA_CONTRACT.md`, `AGENTS.md`, `skill-creator/SKILL.md`, `writing-skills/SKILL.md`, and `references/openai_yaml.md`. Record any newly discovered conflict before writing.

- [ ] **Step 2: Run the absent-package validation to establish RED**

Run:

```bash
python /home/deck/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
```

Expected: FAIL because the target package and `SKILL.md` do not exist.

- [ ] **Step 3: Initialize the package with official tooling**

Run:

```bash
python /home/deck/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  scholomance-game-development \
  --path 'docs/scholomance-encyclopedia/Scholomance LAW' \
  --resources references \
  --interface 'display_name=Scholomance Game Development' \
  --interface 'short_description=Build deterministic Scholomance game assets and systems' \
  --interface 'default_prompt=Use $scholomance-game-development to design, implement, diagnose, or validate this Scholomance game-development task through its canonical SCDL and PixelBrain authority.'
```

Expected: the target directory, `SKILL.md`, `agents/openai.yaml`, and `references/` are created.

- [ ] **Step 4: Confirm initialization without accepting template placeholders**

Run:

```bash
find 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development' -maxdepth 3 -type f -print | sort
rg -n 'TODO|TBD|PLACEHOLDER' 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
```

Expected: standard files exist; placeholder matches are present only in generated template content and must disappear by Task 4.

---

### Task 2: Add the canonical source and authoring route references

**Files:**
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/source-map.md`
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/authoring-routes.md`

**Interfaces:**
- Consumes: the seven source documents named by the user and the active law read order.
- Produces: direct one-level references loaded by `SKILL.md` according to task classification.

- [ ] **Step 1: Write `source-map.md`**

Include:

```markdown
# Canonical Source Map

Use this map after classifying the request. Canonical documents override this summary.

| Trigger | Read completely | Extract |
|---|---|---|
| Any task | active SHARED_PREAMBLE, VAELRIX_LAW, SCHEMA_CONTRACT, AGENTS | ownership, schemas, quality gates |
| SCDL authoring/compiler | SCDL_AUTHORING_GUIDE and SCDL_COMPILER_WHITE_PAPER | syntax, pass order, diagnostics, limits |
| Isometric/2.5D | SCDNA_Gene_Isometric_Asset_Integrity | source canvas, masks, anchors, NW lighting |
| Vector/DOM proposal | WAND-AND-DIVWAND-MANUAL | Wand versus DIV Wand boundary |
| Roles/materials/effects | PIXELBRAIN_SEMANTICS_BRIDGE_WHITE_PAPER | canonical roles, PB-SEM diagnostics, provenance |
| Bytecode/animation/packets | PIXELBRAIN_LANGUAGE_WHITE_PAPER | lattice, bytecode, packet, formula, absolute-time laws |
| Foundry/export/diagnosis | PIXELBRAIN_AGENT_OPERATING_MANUAL | routes, required outputs, tests, anti-patterns |
```

Add exact repository-relative links to all seven supplied documents and note that reserved SCDL transforms, booleans, and references are not production geometry.

- [ ] **Step 2: Write `authoring-routes.md`**

Define the route table and the shared source-to-proof contract:

```text
authoritative source -> owning contract -> deterministic processor -> derived outputs -> verification
```

Cover SCDL lattice assets, Wand vectors, DIV Wand DOM, `ITEM-SPEC-v1`, `PB-SHADER-v1`, SCDL frame animation, PixelBrain blueprint animation, isometric assets, and broken-asset diagnosis. For multi-route tasks, require one primary authority and label all other forms as derived consumers.

- [ ] **Step 3: Verify every supplied source appears exactly by basename**

Run:

```bash
for name in \
  SCDNA_Gene_Isometric_Asset_Integrity.md \
  WAND-AND-DIVWAND-MANUAL.md \
  SCDL_COMPILER_WHITE_PAPER.md \
  SCDL_AUTHORING_GUIDE.md \
  PIXELBRAIN_SEMANTICS_BRIDGE_WHITE_PAPER.md \
  PIXELBRAIN_LANGUAGE_WHITE_PAPER.md \
  PIXELBRAIN_AGENT_OPERATING_MANUAL.md; do
  rg -l "$name" 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/source-map.md'
done
```

Expected: `source-map.md` prints once for each basename.

---

### Task 3: Add validation guidance and one complete example

**Files:**
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/validation-matrix.md`
- Create: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references/worked-example.md`

**Interfaces:**
- Consumes: route names from `authoring-routes.md`.
- Produces: concrete proof requirements and the single worked example linked by `SKILL.md`.

- [ ] **Step 1: Write `validation-matrix.md`**

Define exact evidence for package validation, SCDL `check`/`compile`, repeated deterministic output, PB-SEM role/material/effect resolution, isometric dimensions/RGBA/alpha/anchor checks, foundry route requirements, absolute-time animation, packet-derived exports, focused Vitest, lint, and encyclopedia hygiene.

Include this diagnosis order:

```text
diagnostic -> route/pass/seam -> required output -> owning source -> correction -> repeatable proof
```

Require agents to report actual commands and observed results rather than unchecked checklist claims.

- [ ] **Step 2: Write `worked-example.md`**

Provide one end-to-end isometric animated prop example that:

1. Selects SCDL as canonical authority.
2. Declares a base asset with semantic part/material intent and frame deltas.
3. Runs `scdl.cli.js check` then `compile` for JSON, PNG, SVG, and Aseprite.
4. Uses compiler-generated frame-loop output rather than hand-authored manifests.
5. Uses the SCDL alpha/silhouette for bottom-center prop registration.
6. Draws decor after the base floor.
7. Verifies repeated packet identity, native size, transparent pixels, NW lighting, anchor placement, and live-grid alignment.

Use a concise SCDL snippet and exact CLI commands. Clearly label generated files as derived artifacts.

- [ ] **Step 3: Check links and forbidden claims**

Run:

```bash
rg -n 'Math\.random|Date\.now|hand-write.*frameloop|PNG.*canonical|shader.*invent.*geometry' \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/references'
```

Expected: any match occurs only in an explicitly invalid/common-mistake context.

---

### Task 4: Replace the generated template with the production `SKILL.md`

**Files:**
- Modify: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/SKILL.md`

**Interfaces:**
- Consumes: all four reference files.
- Produces: the discovery and operating contract for future agents.

- [ ] **Step 1: Write exact frontmatter**

Use:

```yaml
---
name: scholomance-game-development
description: Use when designing, implementing, diagnosing, or validating Scholomance game assets, SCDL files, PixelBrain lattice packets, PB-SEM roles, Wand or DIV Wand proposals, deterministic animation, foundry routes, exports, shaders, or isometric 2.5D integration.
---
```

- [ ] **Step 2: Write the operating contract**

Include, in order:

1. Core principle: one canonical authority, deterministic derivation, evidence-backed completion.
2. Mandatory law and conditional source loading, linked directly to `references/source-map.md`.
3. A quick route-selection table linked to `references/authoring-routes.md`.
4. The eight-step workflow from the approved design.
5. Conditional branches for isometric integrity, geometry-changing animation, transform/effect animation, and failure diagnosis.
6. Validation routing to `references/validation-matrix.md`.
7. One example link to `references/worked-example.md`.
8. A common-mistakes table pairing each failure with the correct authority.
9. A completion response contract requiring authority, changed source, derived outputs, diagnostics, commands/results, limits, and risks.

Use positive recipes for output shape. Use strict prohibitions only for law violations such as parallel schemas, raster authority, silent required-output fallback, per-frame nondeterminism, and forced 2D-to-2.5D placement.

- [ ] **Step 3: Verify content shape**

Run:

```bash
wc -l 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/SKILL.md'
rg -n 'TODO|TBD|PLACEHOLDER' 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
rg -n '^description: Use when' 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/SKILL.md'
```

Expected: fewer than 500 lines, no placeholders, and one matching description line.

---

### Task 5: Generate interface metadata and validate the completed skill

**Files:**
- Modify: `docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development/agents/openai.yaml`

**Interfaces:**
- Consumes: finished `SKILL.md`.
- Produces: validated skill package and review evidence.

- [ ] **Step 1: Regenerate `openai.yaml` from the finished skill**

Run:

```bash
python /home/deck/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development' \
  --interface 'display_name=Scholomance Game Development' \
  --interface 'short_description=Build deterministic Scholomance game assets and systems' \
  --interface 'default_prompt=Use $scholomance-game-development to design, implement, diagnose, or validate this Scholomance game-development task through its canonical SCDL and PixelBrain authority.'
```

Expected: valid YAML containing only the requested interface fields.

- [ ] **Step 2: Run standard validation**

Run:

```bash
python /home/deck/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
```

Expected: validation succeeds.

- [ ] **Step 3: Run static retrieval/application scenarios**

Check the package against these prompts:

```text
Create a four-frame VOID brazier prop for the isometric combat grid.
Turn this character silhouette into role-tagged vector art.
Fix an exported chestplate whose center_core shader mask is empty.
Animate an orb pulse smoothly at any frame rate.
Build a new PixelBrain export object with {pixels,size} because it is simpler.
```

Expected decisions:

1. SCDL frames plus isometric gene; compiler-generated manifest.
2. Fairly Odd Wand composite with roles and evaluated `vectorPaths`.
3. Trace route/seam back to geometry/spec/profile; do not patch shader/export.
4. Blueprint/precomputed channels with absolute time.
5. Refuse the parallel schema and use an existing packet/export contract.

- [ ] **Step 4: Run final repository checks**

Run:

```bash
git diff --check -- 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
git status --short
```

Expected: no whitespace errors; hygiene result recorded; status shows the skill package plus pre-existing unrelated changes.

- [ ] **Step 5: Commit only the skill package**

Run:

```bash
git add -- 'docs/scholomance-encyclopedia/Scholomance LAW/scholomance-game-development'
git diff --cached --check
git commit -m 'feat: add Scholomance game development skill'
```

Expected: one commit containing only the skill package.
