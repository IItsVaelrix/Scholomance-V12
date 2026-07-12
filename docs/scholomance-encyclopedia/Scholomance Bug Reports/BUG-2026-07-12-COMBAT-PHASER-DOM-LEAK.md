# BUG-2026-07-12-COMBAT-PHASER-DOM-LEAK

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-TEMPLATE`

## Bug Description
Reported as progressive FPS stutter on the Combat page (and suspected on Landing) that "worked at one point" and cleared after a page reload.

Two distinct defects were found:

1. **The Combat route was hard-broken, not slow.** `src/phaser/CombatArenaScene.js` carried a stray `}` — committed on `V13` — that closed `if (isEdge)` early and orphaned its `else` ~70 lines later. The file failed to parse, so the lazy chunk never loaded and `/combat` died with `Failed to fetch dynamically imported module: CombatPage.jsx`.

2. **Every visit to `/combat` permanently leaked the entire page.** Each navigation retained **224 DOM nodes, 14 event listeners and ~1.0 MB of JS heap**, surviving forced garbage collection, growing without bound across a session. Landing measured completely clean (0 nodes/cycle) — the leak was Combat-only.

## Root Cause

**Phaser's `Game.config` holds a strong reference to `parent` (the `combat-arena-mount` div), and `game.destroy()` never clears it.**

`runDestroy()` only returns the *main* canvas to the CanvasPool. The other pooled canvases (~4 per visit, e.g. `TextureManager._tempCanvas`) stay in Phaser's **module-global `CanvasPool`**, whose entries keep `parent` pointers that keep the `Game` — and therefore its `Config` — reachable indefinitely.

Blink keeps an *entire* detached DOM tree alive if any single node in it is referenced. So one stale `config.parent` pinned the mount div, and the mount div dragged the whole `CombatPage` subtree with it: the HUD, the resource bars, the slash-command console, and the WebGL canvas. Every visit. Forever.

Secondary retainer: `CombatArenaScene.js` and `PolarisForestScene.js` both registered `window.addEventListener('equipment-changed', this.handleEquipmentChange)` with **no matching `removeEventListener`** — the only listener in either file lacking cleanup. Its closure captured the scene, which holds the game, which holds the canvas.

Note that Phaser's `destroy()` is **deferred**: it merely sets `pendingDestroy = true`, and `runDestroy()` runs on the next game-loop step. Any teardown that cuts references must therefore hook the `DESTROY` event, not run inline.

## Thought Process

1. **The user's framing was wrong, and following it would have wasted the session.** The original request was to route more animations through the Animation AMP to fix the stutter. The AMP resolves motion *values*; it does not change which thread paints a frame. That work would have shipped a governance refactor with identical FPS. Scrapped before implementation.

2. **Headless measurement produced a fabricated bug.** A headless Playwright probe measured the Landing portal at **17.7 FPS**, median 50 ms, every frame janky — implicating its stacked `mix-blend-mode` and `filter: blur()` effects. Re-running **headed** on the real GPU: **74.4 FPS**, 13.3 ms median, 3 janky frames in 2,977. Headless Chromium has no GPU and software-rasterizes. Acting on those numbers would have meant gutting the portal's art direction to fix a bug that did not exist.

3. **Isolation before diagnosis.** Cycling `/` ↔ `/auth` and `/combat` ↔ `/auth` separately, with forced GC each cycle, proved Landing flat (886 nodes, zero growth) and Combat linear (+224 nodes/cycle). This killed the "Phaser scenes on both pages" and "StormCanvas rAF" theories outright.

4. **Shortest-path heap analysis lied — twice.** BFS from the GC root to the retained tree kept surfacing Chromium's `autofill::AutofillAgent`, which genuinely does retain detached `<input>` elements. It was not the cause: ablating **both** combat inputs moved the leak only 224 → 214. The tree had multiple independent roots, and shortest-path only ever shows one door.

5. **"True pins" found it.** The reliable method: compute the set of nodes reachable from the GC root **without traversing through** the detached set, then list only the edges from that set *into* the detached tree. This collapsed 520 detached nodes down to a single meaningful edge, appearing exactly once per cycle:

   ```
   3x  Config2 [object] --parent--> <div class="combat-arena-mount">
   ```

## Changes Made

| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `src/phaser/CombatArenaScene.js` | 1 (−) | Removed the stray `}` at line 4760 that broke parsing and killed the route |
| `src/lib/phaser/phaser-runtime.adapter.js` | ~14 | Null `game.config.parent` / `game.config.canvas` on the deferred `DESTROY` event. **Load-bearing change: 224 → 1 nodes/cycle** |
| `src/phaser/CombatArenaScene.js` | 3 | Remove `equipment-changed` listener via `this.events.once('destroy')`, matching the file's existing cleanup idiom |
| `src/phaser/PolarisForestScene.js` | 3 | Same listener cleanup |

Commits: `c74fdb8e` (syntax), `0f0eccaf` (leak).

## Testing

Measured with a CDP probe over 6 SPA navigation cycles (`/auth` → `/combat` → `/auth`), forcing `HeapProfiler.collectGarbage` between each and reading `Performance.getMetrics`. Navigation **must** go through the SPA router — a full `page.goto()` per cycle rebuilds the document, wipes the heap, and hides the leak entirely.

| Metric | Before | After |
|---|---|---|
| DOM nodes / cycle | 224 | **1.0** |
| Listeners / cycle | 14 | 5 |
| JS heap / cycle | ~1.0 MB | 0.28 MB |

Regression check: canvas renders 1270×800 across 3 consecutive mounts, HUD intact, 71–73 FPS, zero page errors. (Nulling config fields on a live engine could plausibly have broken the second mount; it does not.)

**Residual, deliberately not chased:** ~5 listeners and ~0.28 MB still accumulate per cycle; Phaser's `CanvasPool` still grows ~4 canvases per visit; Chromium's `AutofillAgent` still retains detached `<input>`s as a minor additional pin.

**Honest caveat:** the reported *stutter* was never reproduced in measurement — Combat benchmarked at 71–73 FPS both before and after. A real, unbounded leak was found and fixed. The causal link from that leak to the perceived stutter (accumulating DOM and WebGL contexts over a long session, on a Steam Deck sharing GPU memory with the system) is plausible but unproven.

## Lessons Learned

1. **Measure rendering headed, never headless.** Headless Chromium software-rasterizes and will invent catastrophic paint bugs that do not exist on real hardware. This is the web-stack twin of the known Godot rule (headless gives false-zero MultiMesh data). Sample long enough to cover the animation cycles under test — the portal's are 13s/20s/32s/46s, so a 4-second sample proves nothing.

2. **For leaks, shortest-path-from-root is a trap. Use "true pins."** A detached tree can have several independent roots; the shortest path shows you one, you remove it, and nothing changes. Compute root-reachability *excluding* the detached set, then look at what crosses the boundary.

3. **A leak is not a performance bug in the usual sense.** There was no slow function and no expensive render — profiling would never have found this. It was one stale pointer holding one `<div>`, and Blink's rule that any reference into a detached tree retains the *whole* tree did the rest.

4. **Phaser's `destroy()` is deferred and incomplete.** It sets `pendingDestroy` and returns; `runDestroy()` runs on the next game step. It never nulls `config.parent`, and it only returns the main canvas to the global `CanvasPool`. Any React host mounting Phaser must cut `config.parent` on the `DESTROY` event or it will pin its own mount point. `noReturn: true` is **not** the fix — it destroys Phaser's core plugins and prevents any future game instance on the page, which would break re-entering Combat.

5. **Take the user's symptom seriously and their mechanism skeptically.** "It's leaking into RAM via cache" was directionally correct (a global cache — Phaser's `CanvasPool` — was keeping the game alive) while the proposed mechanism ("the browser won't release it because it detects it loading") was not how GC works. Both halves matter: the symptom pointed at the right subsystem; the mechanism had to be measured, not accepted.

---

*Entry Status: FIXED | Last Updated: 2026-07-12*
