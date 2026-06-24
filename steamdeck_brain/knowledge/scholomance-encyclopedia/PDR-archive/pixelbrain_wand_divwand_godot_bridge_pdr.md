# PDR: PixelBrain / Wand / DivWand Godot Bridge
## Authoring Export Pipeline and Native Godot Import Runtime

**Status:** Implemented
**Classification:** Architectural + Tooling + PixelBrain + Godot Interop
**Priority:** High
**Primary Goal:** Turn PixelBrain, Wand, and DivWand into browser-based authoring tools whose deterministic bytecode/JSON exports can be imported into Godot as native game assets and UI scenes.
**Bytecode Search Code:** `SCHOL-ENC-BYKE-SEARCH-PDR-PIXELBRAIN-WAND-DIVWAND-GODOT-BRIDGE`

---

# 1. Executive Summary

PixelBrain, Wand, and DivWand currently work as React pages over Codex core contracts. PixelBrain produces coordinates, palettes, formulas, and bytecode. Wand authors mathematical formula proposals. DivWand authors layout trees. The Godot bridge should not embed the React app in Godot. It should export canonical artifacts from the Scholomance browser tools and import those artifacts into Godot as native `ImageTexture`, `TileMapLayer`, `Node2D`, and `Control` scenes.

The bridge has two halves:

1. A Scholomance export adapter that writes deterministic JSON artifacts using Godot-selective `.pbrain`, `.wand`, and `.divwand` extensions.
2. A Godot importer/runtime package that validates those artifacts, converts them into Godot-native resources, and leaves room for future bytecode-first loading.

Incomplete versions must run in shadow mode: exports are available for inspection, importer validation warns on unsupported nodes/formulas, and no existing PixelBrain/Wand/DivWand behavior changes until enforcement is explicitly enabled.

# 2. Change Classification

**Architectural:** Adds a cross-engine artifact boundary between Scholomance and Godot.

**Structural:** Adds export adapters and Godot importer files without changing current UI flows.

**Behavioral:** Adds optional export buttons/commands and importer warnings. Existing generation, validation, and preview behavior must remain unchanged.

**Not cosmetic:** Visual changes are limited to optional export affordances.

# 3. Spec Sheet

| Field | Value |
|-------|-------|
| Project name | PixelBrain / Wand / DivWand Godot Bridge |
| Source tools | `src/pages/PixelBrain/`, `src/pages/Wand/`, `src/pages/DivWand/` |
| Source engine contracts | `codex/core/pixelbrain/`, `codex/core/modulation/planner/` |
| Export directory | `exports/godot/` or user download from browser |
| Godot target | Godot 4.x |
| Primary format | JSON with deterministic field ordering |
| Future canonical format | Existing bytecode families, especially `0xF` PixelBrain formulas |
| Rollout mode | Shadow export -> warning importer -> gated strict importer |
| Determinism requirement | Same Scholomance artifact input yields same Godot node tree/resource output |

# 4. Assumptions And Unknowns

Assumptions:

- Godot 4.x is the target engine.
- Scholomance remains the authoring surface.
- Godot consumes exported artifacts rather than running React views.
- Existing public APIs in `src/lib/pixelbrain.adapter.js` and `src/lib/engine.adapter.js` remain stable.
- Exported artifacts must not leak unsaved user work unless the user explicitly clicks export.

Unknowns — resolved before Phase 3:

- **Godot importer location — DECIDED:** The importer addon lives in this repository under `addons/scholomance_godot_bridge/` for Phase 3. If the Godot project grows into its own repo, the addon moves then; extraction does not block Phase 3 work.
- Whether artifact transfer is file-based only or later synchronized through a local dev bridge.
- Which DivWand CSS variants need exact Godot theme parity.
- Whether Godot runtime must evaluate formulas live or only consume baked coordinates.

# 5. Architecture Diagram / File Map

```text
React authoring surfaces
  src/pages/PixelBrain/
  src/pages/Wand/
  src/pages/DivWand/
        |
        | (UI hook gates export buttons)
        | src/hooks/useGodotExportFlag.js   ← UI layer (reads localStorage)
        |
        v
Scholomance export adapters              ← src/lib/ (pure functions, no browser APIs)
  src/lib/godot-export/
    pixelbrainGodotExport.js
    wandGodotExport.js
    divwandGodotExport.js
    artifactSchemas.js
    stableSerialize.js
        |
        v
UI download helper                       ← UI layer (DOM, not src/lib/)
  src/components/GodotExportButton/
    downloadTextFile.js
        |
        v
Artifact files
  *.pbrain
  *.wand
  *.divwand
        |
        v
Godot importer addon
  addons/scholomance_godot_bridge/
    plugin.cfg
    importers/pixelbrain_importer.gd
    importers/wand_importer.gd
    importers/divwand_importer.gd
    runtime/pixelbrain_renderer.gd
    runtime/divwand_builder.gd
```

Primary Scholomance integration files:

- `src/lib/pixelbrain.adapter.js`
- `src/lib/engine.adapter.js`
- `src/pages/PixelBrain/PixelBrainPage.jsx`
- `src/pages/Wand/WandPage.jsx`
- `src/pages/DivWand/DivWandPage.jsx`

Proposed test files:

- `tests/godot-export/pixelbrainGodotExport.test.js`
- `tests/godot-export/wandGodotExport.test.js`
- `tests/godot-export/divwandGodotExport.test.js`
- `tests/godot-export/artifactSchemas.test.js`

# 6. Step-By-Step Implementation Plan

## Step 1: Define artifact schemas

Create `src/lib/godot-export/artifactSchemas.js`. Keep schemas small, explicit, and versioned.

```js
export const GODOT_ARTIFACT_VERSION = 1;

export function createPixelBrainArtifact({ canvas, palettes, coordinates, formula, bytecode }) {
  return {
    kind: 'scholomance.pixelbrain.godot.v1',
    version: GODOT_ARTIFACT_VERSION,
    canvas: {
      width: Number(canvas?.width) || 160,
      height: Number(canvas?.height) || 144,
      gridSize: Number(canvas?.gridSize) || 1,
    },
    palettes: Array.isArray(palettes) ? palettes : [],
    coordinates: Array.isArray(coordinates) ? coordinates : [],
    formula: formula || null,
    bytecode: String(bytecode || ''),
  };
}
```

## Step 2: Add deterministic serialization

Create one canonical serializer so all exports are stable.

```js
export function serializeStable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serializeStable).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => {
    return `${JSON.stringify(key)}:${serializeStable(value[key])}`;
  }).join(',')}}`;
}
```

## Step 3: Export PixelBrain artifacts

Create `src/lib/godot-export/pixelbrainGodotExport.js`.

```js
import { formulaToBytecode } from '../pixelbrain.adapter.js';
import { createPixelBrainArtifact } from './artifactSchemas.js';
import { serializeStable } from './stableSerialize.js';

// Exception contract: throws if formulaToBytecode throws. Caller is responsible
// for try/catch at the UI boundary before passing to downloadTextFile.
export function buildPixelBrainGodotExport({ canvas, palettes, coordinates, formula }) {
  const bytecode = formula ? formulaToBytecode(formula) : '';
  const artifact = createPixelBrainArtifact({ canvas, palettes, coordinates, formula, bytecode });
  return `${serializeStable(artifact)}\n`;
}
```

## Step 4: Export Wand formula proposals

Create `src/lib/godot-export/wandGodotExport.js`.

```js
import { validateProposal } from '../engine.adapter.js';
import { serializeStable } from './stableSerialize.js';

// Exception contract: throws if validateProposal throws. Caller handles at UI boundary.
export function buildWandGodotExport(proposal) {
  const validation = validateProposal(proposal);
  return `${serializeStable({
    kind: 'scholomance.wand.godot.v1',
    version: 1,
    valid: Boolean(validation?.ok ?? validation?.valid),
    validation,
    proposal,
  })}\n`;
}
```

## Step 5: Export DivWand layout trees

Create `src/lib/godot-export/divwandGodotExport.js`.

```js
import { validateDivProposal } from '../engine.adapter.js';
import { serializeStable } from './stableSerialize.js';

// Exception contract: throws if validateDivProposal throws. Caller handles at UI boundary.
export function buildDivWandGodotExport(proposal) {
  const validation = validateDivProposal(proposal);
  return `${serializeStable({
    kind: 'scholomance.divwand.godot.v1',
    version: 1,
    valid: Boolean(validation?.ok ?? validation?.valid),
    validation,
    proposal,
  })}\n`;
}
```

## Step 6: Add UI export affordances behind a flag

`localStorage` is a browser API and must not live in `src/lib/`. Create a UI hook instead:

```js
// src/hooks/useGodotExportFlag.js  — UI layer, not src/lib/
export function useGodotExportFlag() {
  return localStorage.getItem('scholomance.godotExport') === 'enabled';
}
```

UI pages consume the hook and conditionally render an export button. The pure export functions in `src/lib/godot-export/` are unaware of the flag — they are always available to callers but never auto-invoked. Export must be user-initiated to preserve the Sovereign Editor principle.

## Step 7: Implement Godot PixelBrain renderer

Create a Godot runtime script that consumes the JSON and renders a texture.

```gdscript
extends Node

func render_pixelbrain_texture(artifact: Dictionary) -> ImageTexture:
	var canvas := artifact.get("canvas", {})
	var width := int(canvas.get("width", 160))
	var height := int(canvas.get("height", 144))
	var image := Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))

	for coord in artifact.get("coordinates", []):
		var x := int(coord.get("snappedX", coord.get("x", 0)))
		var y := int(coord.get("snappedY", coord.get("y", 0)))
		var color := Color.html(str(coord.get("color", "#FFFFFF")))
		if x >= 0 and x < width and y >= 0 and y < height:
			image.set_pixel(x, y, color)

	return ImageTexture.create_from_image(image)
```

## Step 8: Implement Godot DivWand builder

Map DivWand nodes to Godot `Control` nodes with warnings for unsupported CSS-like layout fields.

```gdscript
extends Node

func build_control_tree(layout_node: Dictionary) -> Control:
	var role := str(layout_node.get("role", "container"))
	var node: Control

	match role:
		"button":
			node = Button.new()
			node.text = str(layout_node.get("props", {}).get("text", ""))
		"text":
			node = Label.new()
			node.text = str(layout_node.get("props", {}).get("title", ""))
		_:
			node = PanelContainer.new()

	for child in layout_node.get("children", []):
		node.add_child(build_control_tree(child))

	return node
```

## Step 9: Add strict mode later

Strict mode should fail imports when:

- `kind` is unknown.
- `version` is unsupported.
- required canvas fields are invalid.
- coordinates exceed canvas bounds.
- DivWand node roles are unsupported and no fallback is configured.

# 7. Code Examples For Each Major Step

See steps 1 through 8. Those snippets are implementation-shaped and can be copied into the proposed files with imports adjusted to match local test setup.

Browser download helper — **UI layer only, not `src/lib/`:**

`Blob`, `URL.createObjectURL`, and `document.createElement` are DOM APIs. This helper belongs in the UI component that triggers the download, not in the pure export adapters.

```js
// src/components/GodotExportButton/downloadTextFile.js
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

The export page component calls `buildPixelBrainGodotExport(...)` (from `src/lib/`) to get the string, then passes it to `downloadTextFile` (from the UI component directory). The two concerns never mix layers.

# 8. Glossary

**PixelBrain:** Scholomance pixel-art generation system that turns image analysis and formulas into coordinate/palette/bytecode artifacts.

**Wand:** Mathematical authoring studio for formula proposals and coordinate rendering.

**DivWand:** Layout authoring studio for structured UI trees.

**Godot bridge:** The export/import boundary that moves Scholomance-authored assets into Godot-native resources.

**Artifact:** A deterministic JSON document representing a generated asset.

**Bytecode:** Canonical compact representation for persistent/interoperable Scholomance data.

**Shadow mode:** Export or import code runs without enforcing hard failures.

**Strict mode:** Invalid artifacts fail import deterministically.

# 9. Q&A: Top 10 Implementation Concerns

**Q1: Should Godot run the React tools directly?**

No. Export/import is cleaner. Godot should consume native resources and scenes.

**Q2: Should JSON or bytecode be canonical?**

Use JSON for the first importer because it is easy to inspect. Preserve bytecode inside the artifact so bytecode-first loading can become canonical later.

**Q3: What if Godot cannot reproduce CSS flexbox exactly?**

Do not promise parity. Map common DivWand roles to Godot containers and warn on unsupported layout fields.

**Q4: Should formulas evaluate in Godot?**

Phase 1 should import baked coordinates. Live formula evaluation can be a later phase after parity fixtures exist.

**Q5: How do we avoid leaking unsaved work?**

Only export on explicit user action. No auto-export, background sync, telemetry, or server upload.

**Q6: How do we preserve existing behavior?**

Keep exporters in adapter files and hide UI entry points behind `scholomance.godotExport`.

**Q7: How are invalid artifacts handled?**

Shadow mode warns. Strict mode fails deterministically with bytecode-style diagnostics.

**Q8: Should importers mutate artifacts?**

No. Importers produce Godot resources from immutable input dictionaries.

**Q9: How do we test determinism?**

Snapshot the serialized artifact string and assert repeated exports are byte-for-byte identical.

**Q10: What is the minimum useful version?**

PixelBrain baked coordinate import. That alone lets Godot render generated sprites/textures.

**Q11: How are artifact schema versions migrated?**

v1 artifacts must remain importable when v2 ships. The Godot importer reads `version` first and dispatches to a version-specific handler. Schema changes that add optional fields are backwards-compatible; changes that remove or rename required fields require a new `version` integer and a migration shim. The Scholomance export side always writes the latest version. Existing v1 artifacts in Godot projects are not auto-upgraded — the importer handles both.

**Q12: Is `src/lib/godot-export/` allowed to use browser APIs?**

No. `src/lib/` is CODEx territory — pure functions only. `localStorage`, `Blob`, `URL`, and `document` must never appear in `src/lib/godot-export/`. The feature flag lives in `src/hooks/useGodotExportFlag.js`. The download helper lives in `src/components/GodotExportButton/downloadTextFile.js`. The export functions themselves receive and return plain values.

# 10. QA Plan

Use Vitest for Scholomance export code.

Commands:

```bash
pnpm vitest run tests/godot-export
pnpm lint
node docs/scholomance-encyclopedia/tools/audit-hygiene.mjs
```

Create `tests/godot-export/pixelbrainGodotExport.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildPixelBrainGodotExport } from '../../src/lib/godot-export/pixelbrainGodotExport.js';

describe('buildPixelBrainGodotExport', () => {
  it('serializes deterministically', () => {
    const input = {
      canvas: { width: 2, height: 2, gridSize: 1 },
      palettes: [{ hex: '#FFFFFF', percentage: 100 }],
      coordinates: [{ x: 1, y: 1, color: '#FFFFFF' }],
      formula: null,
    };

    expect(buildPixelBrainGodotExport(input)).toBe(buildPixelBrainGodotExport(input));
  });
});
```

Create `tests/godot-export/artifactSchemas.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createPixelBrainArtifact } from '../../src/lib/godot-export/artifactSchemas.js';

describe('createPixelBrainArtifact', () => {
  it('normalizes missing canvas values', () => {
    const artifact = createPixelBrainArtifact({});
    expect(artifact.canvas).toEqual({ width: 160, height: 144, gridSize: 1 });
    expect(artifact.kind).toBe('scholomance.pixelbrain.godot.v1');
  });
});
```

Create `tests/godot-export/wandGodotExport.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { buildWandGodotExport } from '../../src/lib/godot-export/wandGodotExport.js';

vi.mock('../../src/lib/engine.adapter.js', () => ({
  validateProposal: (p) => ({ ok: true, proposal: p }),
}));

describe('buildWandGodotExport', () => {
  it('serializes deterministically', () => {
    const proposal = { type: 'linear', params: { a: 1, b: 2 } };
    expect(buildWandGodotExport(proposal)).toBe(buildWandGodotExport(proposal));
  });

  it('sets kind and version', () => {
    const result = JSON.parse(buildWandGodotExport({ type: 'linear' }));
    expect(result.kind).toBe('scholomance.wand.godot.v1');
    expect(result.version).toBe(1);
  });

  it('reflects validation ok flag', () => {
    const result = JSON.parse(buildWandGodotExport({ type: 'linear' }));
    expect(result.valid).toBe(true);
  });
});
```

Create `tests/godot-export/divwandGodotExport.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { buildDivWandGodotExport } from '../../src/lib/godot-export/divwandGodotExport.js';

vi.mock('../../src/lib/engine.adapter.js', () => ({
  validateDivProposal: (p) => ({ ok: true, proposal: p }),
}));

describe('buildDivWandGodotExport', () => {
  it('serializes deterministically', () => {
    const proposal = { role: 'container', children: [] };
    expect(buildDivWandGodotExport(proposal)).toBe(buildDivWandGodotExport(proposal));
  });

  it('sets kind and version', () => {
    const result = JSON.parse(buildDivWandGodotExport({ role: 'container' }));
    expect(result.kind).toBe('scholomance.divwand.godot.v1');
    expect(result.version).toBe(1);
  });

  it('reflects validation ok flag', () => {
    const result = JSON.parse(buildDivWandGodotExport({ role: 'container' }));
    expect(result.valid).toBe(true);
  });
});
```

Godot manual QA:

1. Export a 160x144 PixelBrain artifact.
2. Import it in a clean Godot 4 project.
3. Confirm a texture appears with the same visible coordinate pattern.
4. Import a malformed artifact and confirm warning mode does not crash.
5. Enable strict mode and confirm malformed artifact fails import.

# 11. Regression Risks And Retest Checklist

Risks:

- PixelBrain export button could accidentally expose unsaved work without explicit action.
- Stable serialization could reorder data in a way downstream tools do not expect.
- DivWand layout conversion could imply false visual parity with CSS.
- Importer strict mode could reject older artifacts too aggressively.
- Large coordinate artifacts could produce slow Godot imports.

Retest checklist:

- PixelBrain upload still analyzes and generates coordinates.
- PixelBrain terminal still displays bytecode.
- Wand preset validation still works.
- DivWand preset validation and preview still work.
- Exports are hidden when the feature flag is disabled.
- Exported JSON parses with `JSON.parse`.
- Repeated exports of the same input are byte-for-byte identical.
- No export occurs without a user click.

# 12. Rollout Plan

Phase 0: PDR and fixtures only.

Phase 1: Add export schema builders and tests. No UI changes.

Phase 2: Add feature-flagged export buttons to PixelBrain, Wand, and DivWand.

Phase 3: Create Godot addon prototype outside strict mode. Unsupported data emits warnings.

Phase 4: Add strict validation mode and fixture parity tests.

Phase 5: Evaluate whether bytecode-first import should replace JSON-first import. **Completed 2026-05-26.** Verdict: keep JSON-first import for v1 and preserve bytecode as authoritative metadata/future dispatch input. Do not replace v1 JSON imports with bytecode-first loading until PixelBrain, Wand, and DivWand all have complete bytecode schemas and Godot-side bytecode parity fixtures.

## Phase 5 Finalization: Bytecode-First Evaluation

Phase 5 evaluated the implemented bridge after strict validation landed in Phase 4.

Decision:

- Keep `.pbrain`, `.wand`, and `.divwand` as the Godot v1 import surface so Godot importers self-select by final extension.
- Treat PixelBrain `bytecode` as preserved canonical metadata inside the JSON artifact, not as the sole loader input yet.
- Defer bytecode-first import to a future v2 artifact/importer path.
- Do not break existing v1 fixtures or Godot projects when v2 ships.

Reasoning:

- JSON-first import is already implemented, deterministic, human-auditable, and covered by Vitest fixture parity.
- Phase 4 strict validation can reject malformed JSON artifacts before scene creation.
- PixelBrain already exports bytecode and the Godot renderer stores it as `scholomance_bytecode` metadata, so v1 does not discard bytecode truth.
- Wand and DivWand do not yet expose a complete shared bytecode contract equivalent to PixelBrain's `0xF` formula family.
- A bytecode-only Godot loader today would create parallel schema pressure and violate the PDR's shadow-first rollout design.

Future v2 promotion gates:

- `SCHEMA_CONTRACT.md` must define shared bytecode artifact contracts for all three tool families.
- Export builders must emit bytecode payloads for PixelBrain, Wand, and DivWand with deterministic fixtures.
- Godot importers must dispatch by artifact `version` and support v1 JSON alongside v2 bytecode.
- Fixture parity must prove v1 JSON and v2 bytecode produce equivalent Godot scenes for supported artifacts.
- Godot editor smoke tests must run in an environment with Godot 4.x installed.

Before completion, the system should run exactly as it does now. Export builders may exist unused. Feature-flagged buttons may be enabled by local developers. Godot importer failures must not affect the Scholomance browser app.

# 13. Definition Of Done

- PixelBrain can export a deterministic `.pbrain` artifact.
- Wand can export a deterministic `.wand` proposal artifact.
- DivWand can export a deterministic `.divwand` layout artifact.
- Export code is covered by Vitest determinism and schema normalization tests for all three tools.
- Export actions are explicit user actions.
- Godot importer addon lives in `addons/scholomance_godot_bridge/` in this repository.
- Godot can import a PixelBrain artifact and render a texture.
- Godot importer warns on unsupported DivWand/Wand features without crashing in shadow mode.
- Strict mode behavior is documented and tested.
- `src/lib/godot-export/` contains no browser APIs (`localStorage`, `Blob`, `URL`, `document`).
- Feature flag is exposed via `src/hooks/useGodotExportFlag.js` (UI layer), not from `src/lib/`.
- Download helper lives in `src/components/GodotExportButton/downloadTextFile.js` (UI layer).
- Artifact schema versioning strategy is documented; v1 artifacts remain importable when v2 ships.
- PDR archive hygiene passes or pre-existing archive drift is documented.
- Phase 5 bytecode-first evaluation is documented with a final v1/v2 decision.

# 14. Final Architectural Verdict

Implemented and finalized as an artifact boundary, not as a React runtime inside Godot. PixelBrain, Wand, and DivWand remain Scholomance-native authoring tools. Godot receives deterministic v1 JSON exports and converts them into native resources, while PixelBrain bytecode is preserved inside the artifact for future bytecode-first loading. The next major bridge revision should be v2 bytecode-first import, but only after shared bytecode schemas and parity fixtures exist for all three source tools.
