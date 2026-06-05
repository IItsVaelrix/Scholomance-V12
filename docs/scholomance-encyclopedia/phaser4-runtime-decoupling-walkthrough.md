# Phaser 4 Runtime Decoupling — Walkthrough

> [!NOTE]
> Navigation cost was traced to Phaser being pulled into route chunks via **static
> `import 'phaser'`** in the scene/host files. Because route chunks are warmed by
> hover-prefetch, an accidental hover over a Phaser-backed route (Combat/Listen) eagerly
> downloaded the ~1.36 MB engine. We moved Phaser behind a single dynamic-import gateway so
> it is **deferred until a Phaser view actually mounts**, and added an intentionality delay
> to prefetch so accidental hovers don't fetch route chunks at all.

## Implementation changes

### Central adapter orchestration
- `src/lib/phaser/phaser-runtime.adapter.js` is the **sole** gateway for importing Phaser.
  It is the only file with a runtime `import('phaser')` (a dynamic import), memoized so the
  engine loads at most once per session.
- `mountPhaserGame` owns the full `Phaser.Game` lifecycle: load → abort-check → instantiate
  → return an **idempotent `destroy()`**. Teardown is wired to the `AbortSignal` *and* the
  returned handle, so it is safe under React Strict Mode's mount/unmount/mount — including
  the race where the signal aborts *after* construction (the adapter destroys via the abort
  listener; the host's early-return no longer needs to). Covered by
  `tests/unit/phaserRuntimeAdapter.test.js` (6 tests).

### Factory isolation in scenes
- All Phaser scenes (`ResonanceScene`, `CrystalBallScene`, `AlchemicalLabScene`,
  `SignalChamberScene`) are **factory generators**: they export a closure `(Phaser) => Scene`
  and no longer import Phaser at the top level. The two `.tsx` hosts use
  `import type Phaser from 'phaser'`, which is erased at build time (zero runtime weight).
- An ESLint `no-restricted-imports` rule forbids importing `"phaser"` from any file except
  the adapter, so the boundary is **enforced, not just documented**.

### Abort-safe React hosts
- All hosts (`IDEAmbientCanvas`, `PhaserLayer`, `CrystalBallVisualizer`,
  `AlchemicalLabBackground`, `SigilChamber`) consume `mountPhaserGame` and bind `destroy()`
  into effect cleanup via `AbortController`.

### Prefetch intentionality delay
- `src/components/Navigation/Navigation.jsx` wraps the prefetch trigger in a 75 ms
  `setTimeout`, cleared by `onMouseLeave` / `onTouchMove` / `onTouchEnd` / `onTouchCancel`.
  Prefetch warms the route **code chunk**; the debounce stops a swipe-across from firing
  chunk downloads for links the user never intended to open.

## Verification

### Proven (build / lint / tests / e2e)
- Phaser is **code-split into its own chunk** (`phaser.esm-*.js`, ~1.36 MB / ~365 KB gz) and
  is reachable only via the adapter's dynamic import — no static value-import of `"phaser"`
  exists outside the adapter (grep-verified; git confirms the prior static scene imports in
  `ResonanceScene.js` / `CrystalBallVisualizer.tsx` were removed, commit `2fd86cf`).
- It is **deferred**, not tree-shaken or shrunk: the engine is fully present in its chunk and
  loads on demand when a Phaser view mounts. This is a fidelity/consolidation and
  **load-deferral** change, **not** a payload reduction (Phaser 4 grew vs Phaser 3).
- Strict-Mode teardown is correct and idempotent (`phaserRuntimeAdapter.test.js`, 6/6).
- The engine is **not requested during navigation** across non-Phaser routes, and **is**
  requested only when a Phaser view mounts — asserted by
  `tests/visual/phaser-lazy-load.spec.js`.

### Terminology
- This is **code-splitting / lazy loading**, not "tree-shaking." Tree-shaking eliminates
  dead code; here the engine is fully retained in a chunk and merely loaded on demand.
  (Consistent with `VERDICT-2026-06-05-PHASER4-MIGRATION.md` §6: "future dev-only routes
  should expect this and not claim 'tree-shaken'.")

### Pending measurement (not claimed as a result)
- A before/after Lighthouse/TTI capture to quantify the navigation improvement. The *cause*
  (eager Phaser fetch on the nav path) is removed and verified; the wall-clock TTI result is
  expected but not yet measured.
