# Scholomance DIV Wand

### A Schema-Validated Layout Authoring Sandbox for DOM Proposal Design

**Version 1.0** · 2026-05-22
**Status:** Production sandbox complete; PDR ingestion planned
**Audience:** Internal — Scholomance ecosystem contributors
**Search anchor:** `SCHOLOMANCE-DIV-WAND-WHITE-PAPER-V1`

---

## Abstract

Frontend engineering teams that build UI for AI-driven systems face a specific authoring problem: how do you let an AI agent propose a DOM layout without that proposal being arbitrary, unbounded, or impossible to validate? Pixel emission produces no structure. Code emission is unbounded. Prompt-to-component pipelines that emit JSX can't be validated fail-closed without a schema.

We introduce the **Scholomance DIV Wand**: a JSON-schema-based layout proposal sandbox in which an AI agent emits a bounded layout tree — a *layout proposal* — that is validated fail-closed by the same codex validator used in server-side pipeline tooling, previewed in a live sandbox with real DOM geometry, inspected with a hover HUD that compares intended vs. actual dimensions, and registered idempotently to a deterministic browser-local catalog. The system ships as five cooperating primitives: a recursive node grammar, a codex-backed validator, a browser-safe registrar, a memoized renderer, and a real-time inspector HUD.

The wand describes the div. The schema is the constraint. The sandbox is the proof.

---

## 1. Introduction

The Apothacarium Engine is built around AI-driven content authoring at multiple levels of abstraction. The Fairly Odd Wand ([see white paper](../SCHOLOMANCE-FAIRLY-ODD-WAND-v1(1).md)) handles 2D coordinate generation for canvas-rendered props. The DIV Wand addresses the adjacent problem: AI authorship of *DOM-rendered* layouts — cards, dashboards, combat HUDs, panels, badges, and buttons that compose into interactive surfaces.

DOM layouts are structurally different from coordinate arrays. A canvas prop is a list of `{x, y}` points tagged with a role and material. A DOM layout is a recursive tree of nodes, each with a semantic role, a visual variant, a flex/grid layout declaration, and style bindings to the school color system. The authoring challenge is correspondingly different: the author must declare a tree that is simultaneously semantically valid (correct roles at correct nesting levels), visually coherent (variants match the school palette system), and geometrically meaningful (dimensions produce the intended layout when rendered by the browser's CSS engine).

The DIV Wand is designed to close this loop. An author — human or AI — writes a layout proposal as a JSON document. The sandbox validates it continuously, renders it in a contained DOM preview, and exposes real-time inspection of the gap between intended layout and browser-computed geometry. Valid proposals can be registered to a browser-local catalog with a deterministic ID.

---

## 2. Problem Statement

### 2.1 The unbounded-emission problem

An AI agent asked to "design a card layout" can emit:

- Prose: no structure, no validation surface.
- JSX or HTML: syntactically bounded but semantically unconstrained — any attribute, any nesting depth, any inline style.
- CSS: no structural semantics.
- A schema-validated JSON tree: bounded, deterministic, inspectable.

The first three emit formats cannot be validated fail-closed. The fourth is the premise of the DIV Wand.

### 2.2 The geometry-verification problem

Even a schema-valid layout proposal can produce unexpected DOM geometry. A node that declares `height: 200` inside a flex container that imposes `align-items: stretch` will render at a different height than declared. The only ground truth is the browser's box model — which means the authoring loop must include a rendered preview with real geometry measurement.

### 2.3 The catalog persistence problem

Browser-side authoring tools that register results to a server require a network round-trip per save. Server-side registrars that use `node:fs` cannot run in the browser bundle without Vite externalization errors. A browser-safe registrar that stores proposals in `localStorage` with the same deterministic ID algorithm as the server-side registrar gives authors an offline-capable, idempotent persistence layer.

---

## 3. Prior Art

- **Figma / Penpot**: Visual design tools that export to code. The output is code (JSX, CSS), not a bounded grammar. AI authoring produces the same unbounded-emission problem.
- **Storybook**: Component sandboxes that preview UI components. No schema validation of layout intent; the component itself is the source of truth.
- **JSON Forms / React JSON Schema Form**: Schema-to-form generators. They render form UI from JSON Schema, but do not support authoring of arbitrary nested DOM trees with visual preview.
- **Builder.io / Plasmic**: Visual editors that serialize to JSON AST. Their ASTs are proprietary and cover a much wider surface (drag-and-drop, asset management, multi-page) than the fail-closed authoring loop the DIV Wand targets.
- **The Fairly Odd Wand (this codebase)**: The direct predecessor, handling canvas-coordinate proposals. The DIV Wand applies the same fail-closed authoring pattern to DOM-tree proposals.

The DIV Wand occupies the intersection of schema validation (like JSON Forms), live preview (like Storybook), and AI-oriented bounded emission (like the Fairly Odd Wand) in a single, focused sandbox.

---

## 4. Architecture

The DIV Wand ships as five cooperating primitives.

### 4.1 The grammar — recursive node schema

The layout grammar (`codex/core/modulation/planner/div-layout-validator.js`) defines a discriminated node type:

- **`container`**: A structural grouping node. May have `children`. Valid roles: `wrapper`, `card`, `header`, `content`, `footer`, `grid`, `row`, `column`.
- **`element`**: A leaf node. No `children`. Valid roles: `text`, `button`, `badge`, `glow-container`.

Every node carries three optional sub-objects: `layout` (CSS box model), `style` (visual variant + school color binding), and `props` (content and behavior). The grammar enforces `additionalProperties: false` at every level via explicit allowlist checks — unknown keys fail validation immediately.

Recursion is bounded at `MAX_LAYOUT_DEPTH = 5`. The total proposal payload is bounded at `MAX_SERIALIZED_BYTES = 65536`.

### 4.2 The validator — codex-backed fail-closed enforcement

`validateDivProposal` (imported from `src/lib/engine.adapter.js`) is the same validator used in server-side pipeline tooling. It checks:

1. Proposal envelope: `rationale` (string), `confidence` (0..1 number), `reviewRequired` (boolean), optional `sourceIntentHash` and `evalSuiteId`.
2. Payload size: serialized bytes ≤ 65536.
3. Recursive layout tree: node type, role, layout props, style props, props fields — all checked against explicit allowlists.
4. On failure: emits a structured `BytecodeError` with `code: 'DIV_LAYOUT_REJECTED'` and an `errors` array.

The validator is shared between the browser sandbox and the server-side registrar. There is one schema; the sandbox and the pipeline agree on it.

### 4.3 The browser-safe registrar — FNV-1a + localStorage

The server-side `div-layout-registrar.js` uses `node:fs` and `node:url` at module evaluation time, which triggers a Vite externalization error when included in the browser bundle. The DIV Wand solves this by implementing `browserRegisterDivLayout` inline in the page, using the same FNV-1a algorithm and deterministic serialization to generate identical catalog IDs without any Node.js API:

```js
const CATALOG_KEY = 'scholomance.div-catalog';

function serializeDeterministic(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(serializeDeterministic).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${serializeDeterministic(obj[k])}`).join(',') + '}';
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
```

The `catalogId` is computed as `cat-div-${fnv1a(`${role}:${serializeDeterministic(proposedLayout)}:${intentHash}`)}`. This ID is byte-identical to the server-side ID for the same proposal. Registration is idempotent: re-registering the same proposal returns the same ID and does not create a duplicate.

### 4.4 The renderer — memoized LayoutNode

`LayoutNode` is a `React.memo`-wrapped recursive component. It:

1. Derives CSS class names from the node's `style.variant` and `style.glowColor`, applying them as BEM-style class strings rather than inline styles.
2. Maps numeric layout values through a `snapPx(value, 8)` grid-snap helper — all pixel values align to the 8px design grid.
3. Handles string width/height values (e.g. `'100%'`) and numeric values (`320`) uniformly.
4. Registers `onMouseEnter` / `onMouseLeave` (not `onMouseOver` / `onMouseOut`) with `e.stopPropagation()` to prevent event bubbling from child nodes interfering with the inspector.
5. Renders element roles (`text`, `badge`, `button`, `glow-container`) as distinct sub-components using class-based styling rather than inline colors.

The preview root uses `contain: layout paint style` to isolate the sandbox from the host page's layout context.

### 4.5 The inspector HUD — real geometry vs. declared intent

The inspector activates on demand via the Inspector toggle button. When active, hovering any node:

1. Fires `onMouseEnter` on the hovered `LayoutNode`, which calls `getBoundingClientRect()` on the DOM element and subtracts the preview root's origin.
2. Passes the result to `setHoveredNodeInfo`, which drives a `framer-motion` HUD overlay.
3. The HUD displays: node ID, depth, declared intent (`width`, `height` from the layout object), and actual browser-computed dimensions (`actualRect.width`, `actualRect.height`, `actualRect.x`, `actualRect.y`).
4. Actual measurements are colored in `var(--necromancy-primary)` (green) to visually distinguish ground truth from intent.
5. The HUD fades in and out with Framer Motion's `AnimatePresence` (140ms, scale 0.97 → 1).

---

## 5. The Layout Language

### 5.1 Node structure

Every node is a JSON object with the following fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | string | Unique identifier within the tree |
| `type` | Yes | `container` \| `element` | Structural discriminator |
| `role` | Yes | string (enum) | Semantic role |
| `layout` | No | object | CSS box model properties |
| `style` | No | object | Visual variant and school color |
| `props` | No | object | Content and behavior |
| `children` | No | array | Child nodes (containers only) |

### 5.2 Roles

| Role | Type | Renders as |
|---|---|---|
| `wrapper` | container | Outer full-bleed wrapper |
| `card` | container | Elevated surface with optional glow |
| `header` | container | Top strip of a card or panel |
| `content` | container | Central body area |
| `footer` | container | Bottom strip of a card or panel |
| `grid` | container | CSS grid parent |
| `row` | container | Flex row |
| `column` | container | Flex column |
| `text` | element | Title + subtitle text block |
| `button` | element | Clickable action element |
| `badge` | element | Label chip |
| `glow-container` | element | Icon or symbol with school glow |

### 5.3 Layout properties

The `layout` object exposes a safe subset of CSS:

| Property | Values | Notes |
|---|---|---|
| `display` | `flex`, `grid`, `block`, `none` | — |
| `position` | `relative`, `absolute`, `fixed`, `sticky` | — |
| `top`, `left`, `right`, `bottom` | number (px) or string | Number → snapped to 8px grid |
| `width`, `height` | number (px) or string | `'100%'` passes through unchanged |
| `padding`, `margin`, `gap` | number (px) or string | — |
| `flexDirection` | `row`, `column`, `row-reverse`, `column-reverse` | — |
| `justifyContent` | `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` | — |
| `alignItems` | `flex-start`, `flex-end`, `center`, `stretch`, `baseline` | — |
| `gridTemplateColumns`, `gridTemplateRows` | string | CSS grid template syntax |

### 5.4 Style properties

The `style` object controls visual presentation:

| Property | Enum values | Notes |
|---|---|---|
| `variant` | `glassmorphic`, `neonBorder`, `obsidianPanel`, `solid`, `transparent` | Applied as CSS class |
| `glowColor` | `sonic`, `psychic`, `void`, `alchemy`, `will` | Binds school color tokens |
| `borderRadius` | number (px) or string | — |
| `opacity` | 0..1 number | — |

School glow bindings inject `--school-color` and `--school-glow` CSS custom properties into the node's subtree, consumed by the `neonBorder` variant and the `glow-container` element role.

### 5.5 Props fields

The `props` object carries content:

| Field | Type | Used by |
|---|---|---|
| `text` | string | `button`, `badge`, `text` |
| `title` | string | `text` |
| `subtitle` | string | `text` |
| `icon` | string | `glow-container` |
| `interactive` | boolean | Any node — enables hover lift animation |
| `onClickAction` | string | `button` — declared action identifier |

---

## 6. Schema Validation and Fail-Closed Authoring

The validator enforces fail-closed authoring at three levels.

**Proposal envelope validation:** `rationale`, `confidence`, and `reviewRequired` are required with strict types. A proposal missing `rationale` or with `confidence: "high"` (string instead of number) is rejected before the layout tree is even inspected.

**Payload size enforcement:** The proposal is serialized and the byte count checked against 65536. This prevents pathological proposals from consuming excessive memory in the sandbox or persistence store.

**Recursive layout validation:** Every node in the tree is checked against the allowlist of valid fields, valid role values, valid enum values for `display`, `flexDirection`, `justifyContent`, `alignItems`, and valid numeric bounds. Unknown fields (`additionalProperties: false`) fail the entire proposal. A child node at depth 6 fails with a depth-exceeded error.

A proposal that fails validation is not partially rendered. The preview shows whatever the current parseable tree is (derived separately from the validation path via `useMemo`), while the terminal log shows all validation errors. The Register button is disabled while `validationResult.valid` is false.

This fail-closed contract is symmetric with the server-side validator. A proposal that passes in the browser sandbox will pass server-side. There is no browser-only leniency.

---

## 7. Sandbox Toolchain

The DIV Wand sandbox ships with a complete authoring toolchain beyond the core editor/preview split.

### 7.1 Preset library

Three built-in presets demonstrate the layout language at different complexity levels:

| Preset | Nodes | Description |
|---|---|---|
| Alchemist Card | 8 | A 320×400 card with header, icon body, and action footer |
| Grimoire Dashboard | 4 | Two-column flex panel with sonic/obsidian contrast |
| Combat HUD | 6 | Header + three-slot action row with school glow bindings |

Selecting a preset loads the full proposal JSON into the editor and triggers immediate validation.

### 7.2 Debounced validation

Validation runs 280ms after the last keystroke, preventing excessive codex calls during rapid editing. The debounce timer is cleared on every keystroke so only the final state of a fast edit sequence triggers validation.

### 7.3 JSON formatter

The Format button (also `Ctrl+Shift+F`) parses and re-serializes the current proposal with `JSON.stringify(parsed, null, 2)`. Runs only when the current text is valid JSON — invalid JSON is left unchanged.

### 7.4 Copy to clipboard

The Copy button writes the current proposal text to the clipboard and shows a "Copied!" confirmation for 1.4 seconds.

### 7.5 Zoom control

Preview zoom follows fixed steps: 50%, 75%, 100%, 125%, 150%. Zoom applies via `transform: scale(zoom)` with `transformOrigin: 'top center'`. The zoom control disables the respective direction button at the min/max step. CSS `transition: transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1)` gives a spring feel to scale transitions.

### 7.6 Pixel grid overlay

The Grid toggle overlays an 8px dot grid on the canvas:

```css
background-image: radial-gradient(circle, rgba(201, 162, 39, 0.18) 1px, transparent 1px);
background-size: 8px 8px;
```

The 8px period matches the `snapPx` grid-snap helper applied to all numeric layout values, so the grid is a visual representation of the authoring coordinate system.

### 7.7 Node counter

The preview pane bar shows a live `{nodeCount} nodes · depth {treeDepth}` badge derived from the current active proposal. Node count and max depth are computed by `countNodes` and `maxDepth` recursive helpers that run in `useMemo`. The badge appears in `var(--sonic-primary)` as an attention-drawing affordance.

### 7.8 Terminal log

A 170px scrollable terminal at the base of the editor pane shows timestamped events:

- `success` (green `--necromancy-primary`): Validation passed or catalog registration confirmed.
- `error` (red `--will-primary`): Validation errors or JSON syntax failures. Each error message is a separate line.
- `info` (blue `--psychic-primary`): Preset loads, format operations, clipboard copies.

Auto-scroll fires on every log state change (`scrollTop = scrollHeight`). The Clear button (×) resets the log to empty.

### 7.9 Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` / `Cmd+Enter` | Register proposal to catalog |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Format JSON |

Shortcuts are registered via `window.addEventListener('keydown')` with `preventDefault()` and cleaned up on unmount.

---

## 8. Visual Design Tokens

The sandbox consumes no inline colors. All color values are CSS custom properties from two token files:

**School color tokens** (`src/lib/css/generated/school-styles.css`):

| Token | School | Value |
|---|---|---|
| `--sonic-primary` | Sonic | `hsl(175, 85%, 55%)` |
| `--psychic-primary` | Psychic | `hsl(220, 90%, 60%)` |
| `--void-primary` | Void | `hsl(215, 15%, 41%)` |
| `--alchemy-primary` | Alchemy | `hsl(325, 80%, 58%)` |
| `--will-primary` | Will | `hsl(0, 85%, 48%)` |
| `--necromancy-primary` | Necromancy | `hsl(120, 75%, 40%)` |
| `--divination-primary` | Divination (gold) | `hsl(45, 90%, 68%)` |

Each token has a corresponding `--{school}-primary-glow` variant at 30% alpha, consumed by the `neonBorder` variant's `box-shadow`.

**Semantic role assignments** within the sandbox:

| Semantic | Token | Use |
|---|---|---|
| Gold accent | `--divination-primary` | Header text, button borders, preset pills |
| Success / valid | `--necromancy-primary` | Terminal success, actual measurements |
| Error / invalid | `--will-primary` | Terminal errors, validation badge |
| Info / selected | `--psychic-primary` | Terminal info, inspector highlight, node counter |
| Active grid | `--sonic-primary` | Tool button active state |

---

## 9. Operational Invariants

The following invariants hold across all operating states of the sandbox:

1. **Validation never blocks rendering.** The preview is derived via a separate `useMemo` path from the raw `proposalText`, not from the validation result. A schema-invalid proposal can still render a partial preview as long as the JSON parses.

2. **Registration is fail-disabled.** The Register button's `disabled` attribute is bound directly to `!validationResult.valid`. The keyboard shortcut calls `handleSaveProposal` which calls `JSON.parse` and then `browserRegisterDivLayout`, which calls `validateDivProposal` again before writing. Registration therefore requires two independent validation passes.

3. **Catalog IDs are deterministic.** Two proposals with identical `role`, `proposedLayout`, and `sourceIntentHash` always produce the same `catalogId`. Re-registering the same proposal is a no-op that returns `alreadyRegistered: true`.

4. **Inspector events do not bubble.** `onMouseEnter`/`onMouseLeave` are used exclusively (not `onMouseOver`/`onMouseOut`). `e.stopPropagation()` is called in both handlers. This prevents the HUD from flickering between parent and child node data as the cursor passes through nested nodes.

5. **Grid snap applies uniformly.** All numeric `layout` values (top, left, right, bottom, width, height, padding, margin, gap) pass through `snapPx(value, 8)` before being applied as inline style. This ensures authored proposals align to the 8px design grid when rendered.

6. **No inline color literals.** The CSS file contains zero color hex codes or HSL values outside of fallback values in `var(--token, fallback)` expressions. All primary color decisions are made at the token layer.

7. **No Node.js APIs in the browser bundle.** The `div-layout-registrar.js` import is excluded from `DivWandPage.jsx`. Only `validateDivProposal` is imported from `engine.adapter.js`, which Vite tree-shakes down to the validator alone.

---

## 10. Limitations and Future Work

### 10.1 Catalog synchronization

The browser `localStorage` catalog is local to one browser profile. Proposals registered in the sandbox are not automatically synced to the server-side `presets/proposed-div-layouts.json`. A sync script that reads the browser catalog (exported as JSON) and passes each entry through the server-side `registerDivLayout` would close this gap.

### 10.2 Schema coverage gaps

The current validator does not enforce:

- **Role-type congruence**: a node with `type: 'element'` and `role: 'wrapper'` passes validation. The `wrapper` role is a container role and should only appear on `type: 'container'` nodes.
- **Children on elements**: a node with `type: 'element'` and a `children` array currently passes validation. Element nodes should be leaf-only.
- **ID uniqueness**: duplicate IDs within the same tree are not caught by the validator.

These gaps should be closed in the validator before the sandbox is used for AI-emitted proposals in production.

### 10.3 Role dispatcher integration

The DIV Wand sandbox renders proposals directly with `LayoutNode`. A production integration would route validated proposals through a role dispatcher analogous to the Fairly Odd Wand's `roleDispatcher.ts`, allowing custom render logic per role rather than the generic class-based rendering currently in `LayoutNode`. This would enable, for example, a `glow-container` that renders an animated sigil rather than a static `<Sparkles />` icon.

### 10.4 AI emission integration

The sandbox currently assumes human authorship. The intended end state is an AI agent that receives a PDR intent (e.g., "combat HUD for a Void school character with three active spell slots") and emits a layout proposal. The validator is already the correct interface — the AI emits JSON, the sandbox validates it. What remains is wiring the AI agent's output to the editor's text state and providing a review workflow for `reviewRequired: true` proposals.

### 10.5 Responsive layout authoring

The current layout language does not support media queries or responsive breakpoints. All layout values are single-viewport declarations. A `responsive` key in the `layout` object with a map of breakpoint → layout overrides would extend the language without breaking existing proposals.

### 10.6 Drag-and-drop tree editing

The JSON editor is the only authoring surface. A tree-view editor alongside the JSON textarea — showing the node hierarchy with drag-to-reorder and click-to-select — would make the sandbox accessible to visual authors who find JSON authoring opaque.

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| **Layout proposal** | A validated JSON document describing a DIV layout tree, wrapped in AI-emission metadata (rationale, confidence, reviewRequired). |
| **LayoutNode** | The React component that recursively renders a layout proposal tree into real DOM. |
| **catalogId** | A deterministic FNV-1a hash identifier for a registered layout proposal: `cat-div-{hash}`. |
| **School glow binding** | A CSS class (e.g. `div-glow-sonic`) that injects `--school-color` and `--school-glow` custom properties, consumed by the `neonBorder` variant. |
| **Inspector HUD** | The overlay panel that shows real browser-computed geometry (via `getBoundingClientRect`) alongside the node's declared layout intent. |
| **snapPx** | The helper function `Math.round(value / 8) * 8` that aligns pixel values to the 8px design grid. |
| **browserRegisterDivLayout** | The browser-safe analog of the server-side `registerDivLayout` — same FNV-1a ID algorithm, localStorage persistence instead of `node:fs`. |

---

## Appendix B — Key Files

| Path | Role |
|---|---|
| `src/pages/DivWand/DivWandPage.jsx` | Main sandbox page — editor, preview, inspector, registrar |
| `src/pages/DivWand/DivWandPage.css` | Sandbox stylesheet — all styling via CSS custom properties |
| `codex/core/modulation/planner/div-layout-validator.js` | Layout grammar and fail-closed validator |
| `codex/core/modulation/planner/div-layout-registrar.js` | Server-side registrar (Node-only; excluded from browser bundle) |
| `src/lib/engine.adapter.js` | Adapter that exposes `validateDivProposal` for browser consumption |
| `src/lib/css/generated/school-styles.css` | School color token definitions |
| `presets/proposed-div-layouts.json` | Server-side catalog of registered proposals |

---

## Appendix C — Proposal Anatomy

A complete DIV Wand proposal at minimum complexity:

```json
{
  "rationale": "Simple card layout for displaying a spell name and action button.",
  "confidence": 0.95,
  "reviewRequired": false,
  "sourceIntentHash": "spell-card-simple-v1",
  "proposedLayout": {
    "id": "root",
    "type": "container",
    "role": "card",
    "layout": {
      "display": "flex",
      "flexDirection": "column",
      "width": 280,
      "height": 160,
      "padding": 16,
      "gap": 12
    },
    "style": {
      "variant": "glassmorphic",
      "glowColor": "psychic",
      "borderRadius": 8
    },
    "children": [
      {
        "id": "card-title",
        "type": "element",
        "role": "text",
        "props": { "title": "Mind Fracture", "subtitle": "Psychic · Tier 3" }
      },
      {
        "id": "card-action",
        "type": "element",
        "role": "button",
        "style": { "variant": "neonBorder", "glowColor": "will", "borderRadius": 4 },
        "layout": { "padding": 8 },
        "props": { "text": "Cast", "onClickAction": "cast-mind-fracture" }
      }
    ]
  }
}
```

---

## Appendix D — Naming Note

The name *Scholomance DIV Wand* is a deliberate parallel to the Fairly Odd Wand. Where the Fairly Odd Wand describes canvas coordinates, the DIV Wand describes DOM structure. Both instruments operate within bounded grammars; both grant wishes constrained by schemas. The `<div>` is both the target and the instrument.
