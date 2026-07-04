# Combat Stat Tree — Slice 1 (Movement / Attack / Range)

**Date:** 2026-07-04
**Status:** Approved (design), pending implementation plan
**Scope owner:** live combat (`src/hooks/useBattleSession.js`), not the card-battler tactical engine

## Goal

Establish the first three stats of the game's MMORPG stat tree — **movement points**,
**attack points**, and **attack range** — as canonical, stat-driven combat primitives, and
wire them into the live Combat page so they actually function in-game.

This is the first slice of a stat system designed to grow. The registry defined here is the
tree root; future stats are added as new registry entries.

## Current state (verified)

- Live combat lives in `src/hooks/useBattleSession.js` (a React hook holding `battleState`).
  Combat today is **spell-casting only**: the player writes scrolls, and damage comes from
  scored text (`scoreData.damage`), not from any attack stat.
- Entities are plain objects carrying half-baked movement fields at the top level:
  - `mov` (per-move reach radius, default 2)
  - `movesRemaining` / `maxMovesPerTurn` (moves per turn, default 1)
  - `range` (default 2/3) — **defined but never consumed anywhere; dead stat**
  - a `stats: { SYNT, META, MYTH, VIS, PSYC, CODEX, INT }` sub-object of *school aptitudes*
    (a separate category, left untouched by this slice)
- `moveEntity(delta)` exists and is exported from the hook but **has zero callers** — movement
  is not wired to any UI.
- There is **no attack action** of any kind.
- `tests/unit/combatSelectors.movement.test.js` imports
  `src/pages/Combat/state/combatSelectors.js`, which **does not exist** — the test is currently
  broken. It expects a pure `selectBoardTiles(state, { targetingMode })` returning tiles flagged
  `isReachable`.

## Decisions

- **Movement model:** a per-turn **movement-point pool** (default **3 MP**). Each tile stepped
  costs **1 MP**. Move freely until the pool is exhausted. Replaces the `mov` + `movesRemaining`
  shape.
- **Attack model:** a **new basic-attack action**. Select an enemy within `attackRange`
  (Manhattan tiles); deal `attackPoints` damage; consumes the turn's action.
- **UI (this slice):** **keyboard-driven** (Approach A). No new Phaser plumbing. The pure
  selectors this UI reads are exactly what a later click-to-move/attack upgrade would render.

## Architecture (4 units)

### 1. `combatStats` registry — the stat-tree root *(new)*

Location: `src/pages/Combat/state/combatStats.js`.

Canonical, data-only definitions. One entry per stat:

```js
{ key, label, category, base, min, max, description }
```

Slice-1 entries:

| key             | category   | base | min | max | meaning                                   |
| --------------- | ---------- | ---- | --- | --- | ----------------------------------------- |
| `movementPoints`| mobility   | 3    | 0   | 12  | MP pool per turn; 1 MP per tile stepped   |
| `attackPoints`  | offense    | 10   | 0   | 999 | damage dealt by a basic attack            |
| `attackRange`   | offense    | 1    | 0   | 12  | max Manhattan tiles a basic attack reaches |

Exports:
- `COMBAT_STATS` — the ordered registry (array or keyed object).
- `buildDefaultStatBlock(overrides = {})` — returns
  `{ movementPoints, movementPointsRemaining, attackPoints, attackRange }`, seeded from
  `base` values, with `movementPointsRemaining === movementPoints` at construction.

The tree grows by adding registry entries here; consumers iterate `COMBAT_STATS` rather than
hard-coding stat names.

> **Vocabulary note:** the separate card-battler schema (`codex/core/battle.schemas.js`) uses
> `movement` / `attack` / `range` on `TacticalCardStats`. That is a different system; we do NOT
> unify it here (YAGNI). Mapping is recorded for a future unification only:
> `movementPoints↔movement`, `attackPoints↔attack`, `attackRange↔range`.

### 2. Pure selectors *(new)*

Location: `src/pages/Combat/state/combatSelectors.js` (the path the orphaned test imports).

- `selectBoardTiles(state, { targetingMode })` → array of tile view-models. Each tile carries at
  least `{ position, occupantId, isReachable, isAttackable }`.
  - `targetingMode: 'move'` → flood-fill from the active player over unoccupied tiles, marking
    tiles reachable within `movementPointsRemaining` (step cost 1). If the pool is 0, nothing is
    reachable.
  - `targetingMode: 'attack'` → mark enemy-occupied tiles within `attackRange` (Manhattan) as
    `isAttackable`.
- No React, no side effects — fully unit-testable.

The orphaned test is repaired and updated to canonical stat names: a `movementPoints: 1` pool
yields the 4 orthogonally-adjacent tiles reachable; a `0` pool yields none.

### 3. `useBattleSession` wiring *(modified)*

- Build player/opponent stat fields from `buildDefaultStatBlock()` (player `movementPoints: 3`;
  opponent seeded likewise). Remove the dead `mov` / `range` / `movesRemaining` /
  `maxMovesPerTurn` fields in favor of `movementPoints` + `movementPointsRemaining` +
  `attackPoints` + `attackRange`.
- `moveEntity(delta)` — one-tile step (orthogonal). Guard: active player's turn, target tile
  in-bounds and unoccupied, `movementPointsRemaining >= 1`. On success: move and decrement
  `movementPointsRemaining` by 1. Movement never ends the turn.
- `basicAttack(targetId)` *(new)* — guard: active player's turn, target is a living enemy entity,
  Manhattan distance ≤ attacker `attackRange`, and the player has not already spent this turn's
  action. On success: subtract `attackPoints` from `target.hp` (clamped ≥ 0), append a history/log
  entry, and resolve the turn through the **same `handOffTurnToOpponent` path** casting uses.
- Turn-start recovery restores `movementPointsRemaining = movementPoints` (replacing the current
  `movesRemaining = maxMovesPerTurn` reset).
- Export `basicAttack` from the hook's return object.

### 4. Minimal UI *(modified — `src/pages/Combat/CombatPage.jsx`)*

- **HUD readout** of the three stats for the active player (e.g. `MP 3/3 · ATK 10 · RNG 1`),
  driven off `battleState`.
- **Keyboard handlers:**
  - Arrow keys / WASD → `moveEntity` single-tile steps (each spends 1 MP).
  - `A` → toggle attack-targeting mode; while active, selecting the in-range enemy (Enter, or
    the single valid target) calls `basicAttack`. `selectBoardTiles(state, {targetingMode:'attack'})`
    determines validity.
- Handlers no-op when it is not the player's turn or the relevant resource is exhausted.

## Turn / data flow

Per player turn: **move** (spend up to 3 MP, 1/tile) **and** take **one action** — cast a scroll
(existing) **or** `basicAttack` (new). Movement drains only the MP pool; the action resolves the
turn via `handOffTurnToOpponent`, which restores the MP pool for the next turn.

## Error handling

- All mutations funnel through `setBattleState` and return the previous state unchanged when a
  guard fails (matches the existing `moveEntity` pattern) — no throws for invalid input.
- Selectors treat missing/empty grid, missing active entity, or `movementPointsRemaining` absent
  as "nothing reachable/attackable" (return safe empty flags), never throwing.
- Damage clamps `target.hp` to `>= 0`.

## Testing

- **Unit (pure):** `combatSelectors.movement.test.js` (repaired) — reachable tiles for MP pools of
  0 and 1; plus attack-targeting cases (enemy in vs out of `attackRange`).
- **Unit (registry):** `buildDefaultStatBlock` returns the documented defaults and
  `movementPointsRemaining === movementPoints`.
- **Unit (hook logic):** extract/exercise the pure guards where practical — `moveEntity`
  decrements MP and refuses at 0; `basicAttack` refuses out-of-range / already-acted and applies
  `attackPoints` on success.
- **Manual (in-app):** load a battle, walk with arrow keys watching MP tick 3→0, press `A` and
  attack an adjacent enemy, confirm damage and turn hand-off, confirm MP restores next turn.

## Out of scope (deferred)

- Phaser click-to-move/attack + tile highlighting (Approach B; the selectors make it a drop-in).
- Terrain-weighted movement cost, diagonal movement, pathfinding around obstacles.
- Armor/mitigation on basic-attack damage (live entities have no armor field).
- Opponent AI using movement or basic attack.
- Unifying with the card-battler `TacticalCardStats` schema.
- Any progression/skill-tree UI for *spending* points to raise stats.
