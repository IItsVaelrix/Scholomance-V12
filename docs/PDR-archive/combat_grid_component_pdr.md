# Component PDR: 5×5 Combat Grid Architecture

## 1. Summary

This PDR defines the **component architecture**, **state model**, **render tree**, **interaction flow**, and **PixelBrain-ready animation routing** for converting the current combat screen into a **5×5 tactical board** while preserving the **MUD-like ritual shell**.

This document is implementation-facing.

It answers:
- what components should exist
- what each component owns
- what data flows where
- what animation responsibilities live at which layer
- how to keep the system deterministic, inspectable, and scalable

---

## 2. Change Classification

**Architectural + structural + behavioral**

This is not a visual reskin.
This changes the central combat model from a scene layout to a coordinate-based tactical surface.

---

## 3. Goals

### Primary goals
- Introduce a deterministic 5×5 grid as the combat truth surface
- Preserve current ritual shell and MUD-like information density
- Separate game logic from board rendering
- Separate board rendering from animation playback
- Prepare for PixelBrain / bytecode-style orchestration later

### Secondary goals
- Make tile, unit, and action state easy to test
- Keep keyboard-first interaction native
- Support future additions without rewriting the board core:
  - summons
  - hazards
  - telegraphs
  - cones / lines / AOE patterns
  - bosses with board manipulation

---

## 4. Architecture Principles

### Principle 1: Combat truth is data, not DOM
The board should render from combat state, not infer truth from visual layout.

### Principle 2: Position is first-class
Every unit, hazard, effect, and preview must resolve to coordinates.

### Principle 3: Animation is downstream of state
Game logic decides **what happened**.
Animation layer decides **how it is shown**.

### Principle 4: Inspector panels consume shared truth
Left, center, and right panels must all read from the same battle state and selection state.

### Principle 5: Small components, clear ownership
Do not let tile rendering, board logic, and combat orchestration merge into one mega-component.

---

## 5. Top-Level Feature Boundary

## Feature name
`combat-grid`

### Recommended folder shape
```text
src/features/combat/
  components/
    CombatScreen.tsx
    CombatTopBar.tsx
    CombatLeftPanel.tsx
    CombatCenterPane.tsx
    CombatRightPanel.tsx
    CombatBottomConsole.tsx
    ActionMenu.tsx
    ScholarStatusPanel.tsx
    TileInspector.tsx
    ChroniclePanel.tsx
    EncounterHeader.tsx
    SpellInputPanel.tsx
    WeaveIntentPanel.tsx
    CastControls.tsx
    TacticalBoard.tsx
    BoardGrid.tsx
    BoardTile.tsx
    BoardCursor.tsx
    UnitLayer.tsx
    UnitToken.tsx
    HazardLayer.tsx
    PreviewLayer.tsx
    TileOverlay.tsx
    InitiativeStrip.tsx
    HotkeyFooter.tsx
  hooks/
    useCombatBoard.ts
    useBoardCursor.ts
    useBoardSelection.ts
    useCombatHotkeys.ts
    useCombatAnimationQueue.ts
    useTileInspector.ts
  state/
    combatBoardSelectors.ts
    combatBoardTypes.ts
    combatBoardUtils.ts
    combatPreviewUtils.ts
    combatAnimationTypes.ts
  render/
    boardTheme.ts
    boardFxDescriptors.ts
    unitVisualDescriptors.ts
  test/
    TacticalBoard.test.tsx
    useBoardSelection.test.ts
    combatPreviewUtils.test.ts
```

---

## 6. Top-Level Render Tree

```text
CombatScreen
├─ CombatTopBar
├─ CombatShell
│  ├─ CombatLeftPanel
│  │  ├─ SpellInputPanel
│  │  ├─ WeaveIntentPanel
│  │  ├─ CastControls
│  │  └─ TargetContextPanel
│  ├─ CombatCenterPane
│  │  ├─ EncounterHeader
│  │  ├─ TacticalBoard
│  │  │  ├─ BoardGrid
│  │  │  │  └─ BoardTile x25
│  │  │  ├─ HazardLayer
│  │  │  ├─ PreviewLayer
│  │  │  ├─ UnitLayer
│  │  │  │  └─ UnitToken xN
│  │  │  └─ BoardCursor
│  │  └─ CombatBottomConsole
│  │     ├─ ActionMenu
│  │     ├─ ScholarStatusPanel
│  │     └─ TileInspector
│  └─ CombatRightPanel
│     ├─ EncounterCard
│     ├─ ChroniclePanel
│     └─ SelectedEntityPanel
└─ HotkeyFooter
```

---

## 7. Component Responsibilities

## 7.1 `CombatScreen`
### Owns
- screen-level composition
- wiring to combat store / route state
- orchestration of shared state

### Should not own
- tile-level logic
- preview math
- individual animation behavior

### Props / data sources
- battle state from store or parent feature state
- derived selectors
- dispatchers for actions

---

## 7.2 `CombatLeftPanel`
### Owns
- inscription UI
- weave / intent UI
- cast controls
- contextual spell targeting helper

### Inputs
- current spell draft
- current weave text
- current selected action
- board targeting context
- cast validity state

### Outputs
- edit verse
- edit weave
- cast request
- cancel request

### Notes
This panel should not compute board previews itself. It displays what preview systems derive.

---

## 7.3 `CombatCenterPane`
### Owns
- tactical focus area layout
- encounter header
- board placement
- bottom action console placement

### Should not own
- combat rules
- preview algorithms

---

## 7.4 `TacticalBoard`
### Owns
- board coordinate space
- render-layer ordering
- interaction bridge between cursor/selection and visible board

### Responsibilities
- render the 5×5 board scaffold
- mount layered render passes in deterministic order
- expose tile interactions
- receive fully-derived render state

### Should not own
- combat reducer logic
- spell range math
- enemy AI
- chronicle generation

### Key rule
`TacticalBoard` is a rendering orchestrator, not the combat engine.

---

## 7.5 `BoardGrid`
### Owns
- structural tile grid
- labels / coordinate rails if shown
- tile mapping loop

### Inputs
- tile render models
- hover/selected tile
- board theme tokens

### Output
- 25 `BoardTile` nodes

---

## 7.6 `BoardTile`
### Owns
- one tile’s visual rendering only

### Inputs
- coordinate
- occupancy flag
- reachable / targetable / threatened / selected flags
- hazard summary
- preview summary
- callbacks for hover/click/focus

### Should not own
- global board state
- pathfinding
- spell math

### Notes
This component must remain extremely disciplined. It should be cheap, predictable, and memoizable.

---

## 7.7 `UnitLayer`
### Owns
- rendering all units in board space
- z-order for units
- movement / cast / hit visual states at unit layer

### Inputs
- rendered unit models
- unit animation descriptors

### Output
- `UnitToken` instances

---

## 7.8 `UnitToken`
### Owns
- visual representation of a single combat unit
- idle/cast/hit/move local visuals
- micro-bars / status pips if shown on-board

### Inputs
- unit identity
- board coordinate
- visual state
- school / side / statuses
- animation descriptor

### Notes
This is the seam where future PixelBrain-authored motion descriptors can plug in cleanly.

---

## 7.9 `HazardLayer`
### Owns
- board hazards, wards, traps, corruption, lingering glyphs

### Inputs
- hazard render descriptors keyed by tile

### Notes
Do not merge hazard visuals into `BoardTile`. Hazards are semantically separate and will scale in complexity.

---

## 7.10 `PreviewLayer`
### Owns
- move preview
- target highlights
- AOE masks
- path indicators
- telegraphs

### Inputs
- preview model derived from selected action and selection context

### Notes
This must stay ephemeral. It should never become the source of truth for actual combat state.

---

## 7.11 `BoardCursor`
### Owns
- visible cursor / keyboard selection ornament

### Inputs
- cursor coordinate
- active mode
- pulse / lock state

### Notes
Keep cursor separate from tile state so keyboard navigation remains visually rich without mutating tile truth.

---

## 7.12 `CombatBottomConsole`
### Owns
- lower information band under the board

### Child areas
- `ActionMenu`
- `ScholarStatusPanel`
- `TileInspector`

### Why
This preserves your MUD texture while anchoring it directly to tactical context.

---

## 7.13 `ActionMenu`
### Owns
- command list
- active action selection
- hotkey hints

### Actions
- INSCRIBE SPELL
- MOVE
- CHANNEL
- WAIT / END TURN
- FLEE

### Notes
This should feel terminal-like, not like glossy RPG buttons.

---

## 7.14 `ScholarStatusPanel`
### Owns
- player HP / MP / resonance / school / active statuses

### Notes
Should consume battle state directly, not infer from rendered board.

---

## 7.15 `TileInspector`
### Owns
- selected / hovered tile detail

### Displays
- coordinate
- occupant
- distance
- terrain / hazard state
- threat state
- projected outcome if preview active

---

## 7.16 `CombatRightPanel`
### Owns
- chronicle / entity inspection / glossary support

### Notes
Should become the narrative witness of board events, not merely a decorative sidebar.

---

## 8. State Model

## State layers
Separate state into four layers:

1. **Combat truth state**
2. **UI interaction state**
3. **Derived preview state**
4. **Animation playback state**

This separation matters.

---

## 8.1 Combat truth state
This is the actual battle reality.

```ts
interface CombatBoardState {
  boardSize: { cols: 5; rows: 5 };
  turn: number;
  activeUnitId: string;
  phase: 'player' | 'enemy' | 'resolving' | 'victory' | 'defeat';
  scholarId: string;
  units: Record<string, CombatUnit>;
  hazards: Record<string, CombatHazard>;
  occupancyMap: Record<string, string | undefined>; // "2,3" => unitId
  chronicle: ChronicleEntry[];
}
```

### Owns
- actual positions
- HP / MP / statuses
- whose turn it is
- what hazards exist
- actual log entries after resolution

---

## 8.2 UI interaction state
This is the player’s temporary interface posture.

```ts
interface CombatUiState {
  selectedAction: 'inscribe' | 'move' | 'channel' | 'wait' | 'flee' | null;
  cursorTile: BoardCoord | null;
  selectedTile: BoardCoord | null;
  hoveredTile: BoardCoord | null;
  selectedUnitId: string | null;
  verseDraft: string;
  weaveDraft: string;
  targetingMode: 'none' | 'move' | 'spell' | 'inspect';
}
```

### Owns
- cursor
- hover
- drafts
- currently selected action

### Must not own
- real HP changes
- actual movement resolution
- actual spell results

---

## 8.3 Derived preview state
This is recomputed from truth state + UI state.

```ts
interface CombatPreviewState {
  reachableTiles: BoardCoord[];
  targetableTiles: BoardCoord[];
  threatenedTiles: BoardCoord[];
  pathPreview: BoardCoord[];
  aoeTiles: BoardCoord[];
  predictedEffects: PredictedEffect[];
  inspectedTile: InspectedTileModel | null;
}
```

### Notes
This should come from pure selectors/utilities wherever possible.

---

## 8.4 Animation playback state
This is the transient visual queue.

```ts
interface CombatAnimationState {
  queue: BoardAnimationIntent[];
  active: BoardAnimationIntent | null;
  lastCompleted: BoardAnimationIntent | null;
}
```

### Notes
The animation queue should reflect already-resolved events, not speculate about logic.

---

## 9. Recommended Hooks

## `useCombatBoard()`
### Purpose
Expose the full board view model and dispatchers needed by the combat screen.

### Returns
- battle truth selectors
- interaction state
- preview selectors
- action dispatchers

---

## `useBoardCursor()`
### Purpose
Handle keyboard and programmatic cursor movement.

### Owns
- moving within 5×5 bounds
- snapping to valid tiles
- optional cycle behavior

---

## `useBoardSelection()`
### Purpose
Resolve selection logic from cursor/hover/action mode.

### Owns
- selecting tiles
- selecting occupants
- confirming tile actions
- canceling selection flows

---

## `useCombatHotkeys()`
### Purpose
Centralize keyboard commands.

### Handles
- arrows / WASD
- Enter confirm
- Escape cancel
- hotkeys for menu actions
- optional tab target cycling

---

## `useTileInspector()`
### Purpose
Return the single tile/entity model that should be shown in inspector areas.

### Notes
Should unify hovered tile and selected tile precedence rules.

---

## `useCombatAnimationQueue()`
### Purpose
Process animation intents in deterministic order.

### Handles
- enqueue resolved action animations
- advancing active animation
- notifying UI when playback completes

---

## 10. Derived Selectors

You will want selectors that turn raw state into render-friendly models.

### Required selectors
- `selectBoardTiles()`
- `selectRenderedUnits()`
- `selectRenderedHazards()`
- `selectPreviewOverlay()`
- `selectSelectedTileModel()`
- `selectChronicleEntries()`
- `selectScholarStatusModel()`
- `selectEncounterHeaderModel()`

### Why
The components should receive already-shaped data, not do combat interpretation inline.

---

## 11. Tile View Model

Each tile should render from a compact view model.

```ts
interface BoardTileViewModel {
  coord: BoardCoord;
  label: string;
  isOccupied: boolean;
  occupantId: string | null;
  isCursor: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isReachable: boolean;
  isTargetable: boolean;
  isThreatened: boolean;
  hasHazard: boolean;
  hazardKind?: string;
  previewKind?: 'move' | 'spell' | 'aoe' | 'path' | null;
}
```

This gives `BoardTile` exactly what it needs and nothing else.

---

## 12. Board Coordinate Utilities

Create utilities and keep them pure.

### Required helpers
- `coordToKey(coord)`
- `keyToCoord(key)`
- `isWithinBounds(coord)`
- `getManhattanDistance(a, b)`
- `getNeighbors(coord)`
- `getLineTiles(origin, target)`
- `getCrossPattern(center, radius)`
- `getSquarePattern(center, radius)`
- `getConePattern(...)`

### Why
Future spell systems will explode in complexity if this logic is scattered in components.

---

## 13. Rendering Strategy

## Layer order inside `TacticalBoard`
```text
BoardGrid
HazardLayer
PreviewLayer
UnitLayer
BoardCursor
```

### Why this order
- tiles are base truth surface
- hazards persist on board
- previews sit above board but below units when appropriate
- units remain readable
- cursor remains strongest interactive marker

### Optional note
Some spell previews may need to render above units for clarity. That should be a conscious exception, not an accident.

---

## 14. Animation Architecture

## Core rule
Animation descriptors should be declarative.

Avoid hard-coding lots of one-off class toggles across the tree.

### Recommended shape
```ts
interface TileFxDescriptor {
  coord: BoardCoord;
  fxType: 'hoverPulse' | 'selectionLock' | 'impactFlash' | 'hazardBurn' | 'resonanceRipple';
  durationMs: number;
  intensity?: number;
  school?: string;
}

interface UnitFxDescriptor {
  unitId: string;
  motion: 'idle' | 'move' | 'cast' | 'hit' | 'defeat';
  origin?: BoardCoord;
  target?: BoardCoord;
  durationMs: number;
  school?: string;
}
```

### Why
This makes PixelBrain integration cleaner later. These descriptors can be emitted by the combat UI layer, then translated into CSS variables, motion envelopes, or bytecode-driven playback.

---

## 15. Action Flow Contracts

## 15.1 Move action
### Flow
1. Player selects `MOVE`
2. UI state enters `targetingMode = move`
3. Preview selector derives reachable tiles
4. Player chooses tile
5. Logic validates tile
6. Combat truth updates unit position
7. Chronicle entry added
8. Animation intent enqueued

### Contract
Movement is only real after combat truth updates.
The preview is not truth.

---

## 15.2 Inscribe / Cast action
### Flow
1. Player enters verse + weave
2. Player selects `INSCRIBE SPELL`
3. UI state enters `targetingMode = spell`
4. Preview selector derives targetable tiles and pattern
5. Player confirms target
6. Combat logic resolves effect
7. Units / hazards / statuses update
8. Chronicle entries added
9. Animation intents enqueued

### Contract
Spell effect resolution belongs in combat logic, not the board renderer.

---

## 15.3 Enemy turn
### Flow
1. AI chooses action
2. Combat truth resolves action
3. Chronicle entries added
4. Animation queue receives movement / cast / impact intents
5. UI playback displays outcome

### Contract
Enemy turn should use the same animation queue language as player actions.

---

## 16. Chronicle Integration Contract

The chronicle should subscribe to resolved battle events, not raw clicks.

### Good
- `Scholar anchored at B3`
- `The Phonocrat emitted a sonic fracture across C3-C5`

### Bad
- logging hover changes
- logging canceled previews
- logging unresolved targeting attempts as final events

---

## 17. Testing Strategy

## Unit tests
Test pure helpers and selectors heavily.

### High-priority tests
- coordinate conversion
- reachable tile generation
- target pattern generation
- preview derivation
- tile inspector precedence
- occupancy collision rules

## Component tests
- board renders 25 tiles
- selected tile styling state
- unit token appears at correct coordinate
- preview overlays appear when action mode changes

## Interaction tests
- keyboard navigation moves cursor correctly
- enter confirms selected tile
- escape cancels targeting mode
- move action updates board and chronicle

## Why
Most bugs here will come from state separation drift, not from CSS.

---

## 18. Performance Notes

### Keep cheap
- `BoardTile` should be memo-friendly
- selectors should derive compact models
- preview computation should stay pure and bounded
- avoid rerendering all side panels on every hover if possible

### 5×5 advantage
The board is small, so performance danger is not raw size.
The real danger is over-coupled state causing unnecessary full-screen rerenders.

---

## 19. Accessibility / Input Contracts

### Required
- every tile must be addressable by keyboard
- selected tile must have non-color distinction
- action mode changes must be clear
- hotkeys should be discoverable in footer/help text

### Recommended
- aria labels on tiles: `Tile B3, occupied by The Phonocrat, threatened`
- reduced motion support at animation descriptor layer

---

## 20. Styling Boundaries

### Use component styles for
- composition
- spacing
- typography
- panel framing

### Use visual descriptor / theme layers for
- school-coded board states
- tile glow language
- hazard motifs
- advanced FX routing

### Avoid
Inline visual logic inside combat reducers.
That way lies cursed spaghetti.

---

## 21. Migration Plan

## Phase 1: Shell-preserving board insertion
- keep current left/right panels mostly intact
- replace center battlefield with static 5×5 scaffold
- render scholar and one enemy on coordinates

## Phase 2: Interaction plumbing
- keyboard cursor
- tile selection
- inspector integration
- move previews

## Phase 3: Spell targeting
- targetable tiles
- aoe overlays
- cast resolve flow
- chronicle sync

## Phase 4: Animation and polish
- movement interpolation
- impact FX
- turn handoff animation
- school-specific board FX

## Phase 5: PixelBrain-facing abstraction
- descriptor-driven motion layer
- bytecode-friendly event mapping
- deterministic playback QA

---

## 22. What Should Be Reused from Current Screen

### Reuse directly
- general three-panel composition
- chronicle concept
- left-side inscription concept
- scholar status information model
- ritual top navigation style

### Rework
- center battlefield rendering
- bottom action zone integration with selected tile context
- enemy presentation to account for tile occupancy and tactical identity

### Do not preserve as-is
- decorative freeform battlefield spacing logic
- unit placement that is not coordinate-based
- any combat effect that only exists as scene dressing

---

## 23. Regression Risks

### Risk 1: Board logic leaks into components
**Symptom:** `BoardTile` starts computing distances, target patterns, and combat legality.

**Fix:** force derivation into selectors/utils.

### Risk 2: Animation queue becomes game logic
**Symptom:** actions only become “real” when animation completes.

**Fix:** resolve truth first, animate after.

### Risk 3: Hover state causes whole-screen thrash
**Symptom:** every mouse move rerenders chronicle, status, all board nodes.

**Fix:** isolate hover state and memoize view models.

### Risk 4: MUD identity gets diluted
**Symptom:** screen starts to feel like a generic tactics layer with decorative lore.

**Fix:** keep text console, chronicle, hotkeys, and ritual framing dominant.

---

## 24. Acceptance Criteria

### Architecture
- board, preview, and animation responsibilities are separated cleanly
- tile rendering is driven by compact view models
- combat truth state remains distinct from preview and animation state

### UX
- player can navigate and target through keyboard-first controls
- move and cast flows are understandable and testable
- inspector and chronicle reflect shared truth accurately

### Visual fidelity
- board integrates into current screen shell naturally
- components are ready for PixelBrain polish without rewrites

### Maintainability
- adding a new hazard or AOE pattern does not require rewriting `TacticalBoard`
- adding new enemy behaviors does not require changing `BoardTile`

---

## 25. QA Checklist

### State integrity
- [ ] truth state separate from preview state
- [ ] preview state separate from animation queue
- [ ] chronicle only logs resolved outcomes

### Component integrity
- [ ] `BoardTile` does not compute combat logic
- [ ] `TacticalBoard` does not resolve spell effects
- [ ] `UnitToken` only renders visual state

### Interaction
- [ ] arrow/WASD navigation works within bounds
- [ ] Enter confirms tile action
- [ ] Escape cancels preview or targeting mode
- [ ] hover and selection precedence is stable

### Rendering
- [ ] exactly 25 tiles render
- [ ] units mount at correct coordinates
- [ ] hazard and preview layers render in correct order
- [ ] cursor remains visible and distinct

### Animation
- [ ] resolved actions enqueue deterministic animation intents
- [ ] move/cast/hit playback does not desync from state
- [ ] reduced motion mode can bypass fancy envelopes without breaking clarity

---

## 26. Final Recommendation

Build this as a **combat doctrine architecture**, not just a board component.

The board is the visible center, but the real win is the state separation:
- truth
- interaction
- preview
- playback

That four-part split is what will let this grow from a nice 5×5 combat screen into a full Scholomance tactical language machine without collapsing into haunted UI soup.

