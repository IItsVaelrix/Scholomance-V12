# PDR: Godot WASM Combat Runtime — De-Risking Spike
## Can the live Godot engine own the Combat screen in-browser?

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-GODOT-WASM-COMBAT-PDR`

**Status:** Proposed — Spike (Phase 0 docs + Phase 1 route complete; Phase 2 Godot export pending)
**Classification:** Architectural | Rendering Substrate | Combat Surface | Spike / De-Risk
**Priority:** High (blocks any decision to rewrite the Combat page)
**Primary Goal:** Prove or kill — with measured numbers, not vibes — whether Godot's HTML5/WASM export can become the primary visual + game layer for the Combat page, with Phaser demoted to an FX overlay, **before** a single line of the working Combat stack is deleted.

---

# 1. Executive Summary

The Combat page today renders through **Phaser** (`BattleArena → PhaserLayer.jsx → ResonanceScene.js`). The thing called "Godot" in the codebase (`GodotOverlay.jsx`) is **not the Godot engine** — it is a hand-written canvas2D proxy that replays JSON timelines exported from the Godot *desktop editor*. There is no Godot WASM/HTML5 build in the repo (confirmed: no `.wasm`/`.pck` artifacts). The real engine only runs as an authoring tool launched via Proton (the `godot` npm script).

The stated design intent is to **strip the React Combat UI entirely and let an engine own the whole screen — board, HUD, spell input, and all** — with Godot as the main visual layer and Phaser as the physics/FX layer.

That intent is only coherent against a **real Godot runtime in the browser** (Path A). The canvas2D replay proxy (Path B) is a dumb shape-drawer with no UI toolkit, no text layout, and no input handling; it cannot host a HUD or a text input without re-implementing a UI framework by hand. Path B is therefore rejected for this goal and is out of scope.

This PDR scopes a **throwaway spike** that answers three kill-questions cheaply, in order, each able to veto the rewrite before the working stack is touched:

1. **Bundle / load** — How big is the Godot Web export, and how does it cold-load on a Steam Deck-class device?
2. **Bridge** — Can a `postMessage` round-trip cleanly replace the in-process `combatBridge` event bus?
3. **Text input** — Can the core "type a verse" loop survive inside Godot Web, or must the `<textarea>` stay a DOM overlay?

The spike ships behind a new, isolated route (`/combat-godot-spike`) and **does not modify the existing Combat page, the `combatBridge`, or the `src/lib/godot-export/` pipeline.**

---

# 2. Problem Statement

We are being asked to consider deleting a **working, fully-wired React + Phaser Combat surface** and replacing it with a heavier runtime whose weakest documented feature — text input inside the WASM canvas — is the game's **core mechanic** (players type verses into `OracleScribe`).

Committing to that rewrite blind risks:

- Discovering a 20–40 MB WASM first-load is unacceptable for a web-deployed game **after** the React board is gone.
- Discovering the React↔Godot `postMessage` boundary is painful **after** `combatBridge` has been ripped out.
- Discovering verse text entry is unusable inside Godot Web **after** `OracleScribe` has been deleted.

Each of those is recoverable for *cents* if found during a spike and for *weeks* if found mid-rewrite. The problem this PDR solves is **sequencing the risk**, not building the final thing.

---

# 3. Product Goal

Deliver a disposable, measured spike that produces a **go / no-go decision artifact** with real numbers for:

1. Godot Web export bundle size (gzipped + raw) and cold-load time on target hardware.
2. A working one-round-trip `postMessage` bridge (React → "cast" → Godot renders → Godot → "anim done" → React).
3. A side-by-side verdict on verse text input: **engine-native vs. DOM overlay**.

The output is a short findings report appended to this PDR, plus a recommendation: **Path A (full rewrite)**, **Path A-hybrid (engine + DOM text overlay)**, or **abandon (stay on Phaser)**.

---

# 4. Non-Goals

- **Do not** modify `src/pages/Combat/**`, `src/pages/Combat/combatBridge.js`, or `src/lib/godot-export/**`. The spike is additive and isolated.
- **Do not** port real combat logic, scoring, or game state into Godot. The spike renders a stub scene reacting to one event.
- **Do not** delete Phaser, `ResonanceScene`, or any React chrome during the spike.
- **Do not** wire the spike route into the main navigation or ship it to production. It is dev-only.
- **Do not** treat the canvas2D replay proxy (Path B) as a candidate for "main visual layer." Out of scope.
- **Do not** solve final-art, shaders, or scene authoring. Fidelity is a later phase, gated on a `go`.

---

# 5. Core Design Principles

1. **Measure before you cut.** No file in the working Combat stack is deleted until all three kill-questions return green. Numbers veto opinions.
2. **Isolation.** The spike lives on its own route and loads the Godot build as a static asset. Zero blast radius into shipping code.
3. **Text input is load-bearing.** The verse `<textarea>` is the most-used interaction in the game. Its viability is a first-class gate, not an afterthought.
4. **Disposable by design.** The spike route, the bridge shim, and the stub Godot scene are expected to be thrown away or rewritten if the project proceeds. They optimize for *answering questions*, not for reuse.
5. **Honesty over hype.** The findings report states bundle size, load time, and input verdict as raw numbers, even if they kill the project. A weak result is reported with the measurement, not buried.

---

# 6. Two Paths (and why one is rejected)

| | **Path A — Real Godot WASM runtime** *(this spike)* | **Path B — Expand export-replay** *(rejected for this goal)* |
|---|---|---|
| What runs in browser | Godot HTML5/WASM engine | canvas2D proxy replaying JSON timelines |
| Can host HUD + text input? | Yes (Godot Control/Theme UI) | No — no UI toolkit; would require hand-built UI framework |
| Authoring vs runtime | Same artifact (no drift) | Author in Godot, re-implement render in canvas2D (drift-prone) |
| Cost | High: WASM bundle, CI export step, postMessage bridge | Moderate, but cannot meet "engine owns the screen" |
| Verdict | **Spike it** | **Out of scope** |

Because the design intent is "engine owns the whole screen including HUD and input," Path B is structurally disqualified and is not evaluated further.

---

# 7. Phase Plan

| Phase | Name | Gate to pass |
|---|---|---|
| 0 | Contract docs (this PDR + SPEC) | Documents separate Path A from Path B; kill-questions enumerated |
| 1 | Spike route + placeholder host | `/combat-godot-spike` renders, isolated from Combat, dev-only |
| 2 | Godot Web export ingest | A real `.wasm`/`.pck` from `godot_project` loads in the route |
| 3 | **Kill-Q1: bundle/load** | Bundle size + Steam Deck cold-load measured and recorded |
| 4 | **Kill-Q2: postMessage bridge** | One round-trip cast→render→done proven across the iframe boundary |
| 5 | **Kill-Q3: text input** | Verse entry tested engine-native vs DOM overlay; verdict recorded |
| 6 | Findings + recommendation | Go / Go-hybrid / Abandon decision appended here |

Phase 1 is the immediate deliverable. Phases 2–5 each carry a veto: any red gate halts the spike and the recommendation defaults to **stay on Phaser**.

---

# 8. Jurisdiction & LAW Notes

- The spike route lives under `src/pages/` — **Claude (UI) territory** per `Scholomance LAW/CLAUDE.md`.
- **Combat result rendering is a shared boundary.** This spike renders a *stub*, not real `CombatResult`/`ScoreTrace` data, so it does not consume Codex's event-bus shapes yet. When/if the spike graduates, the bridge contract must be co-designed with Codex.
- The Godot *export pipeline* (`src/lib/godot-export/`, `godot_project/`) is **Codex territory** — the spike *reads* its output (a WASM build) but **writes nothing** there.
- Hard stop respected: no edits to `codex/`, `codex/server/`, `src/lib/`.

---

# 9. Findings (to be appended after Phases 3–5)

> _Pending. This section is filled with measured numbers — bundle size (raw + gzip), Steam Deck cold-load ms, bridge round-trip latency, and the text-input verdict — once the spike runs. Until then, no rewrite of the Combat page is authorized._
