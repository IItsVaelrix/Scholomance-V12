# IDE Runtime Stasis Promotion Plan (C/B → A/S)
## Bytecode Search Code
`SCHOL-ENC-BYKE-IDE-STASIS-PROMOTION`

## 1. Plan Identity
- **Plan ID:** PDR-20260521-IDE-STASIS-PROMOTION
- **Subject:** IDE Stability Ascension (Wand / Oracle / Collab Runtime Hardening)
- **Target Grade:** A/S (High-Availability & Pressure-Resistant)
- **Author:** Antigravity (Gemini Core)
- **Date:** 2026-05-21

---

## 2. Architectural Blueprint & Promotion Gates

This document maps out the comprehensive hardening spine required to transition the Scholomance V12 IDE from a *beautiful but pressure-sensitive* layout into a *beautiful and pressure-resistant* runtime environment. We define six core stabilization pillars, their respective Promotion Gates (A vs. S), and key regression risk controls.

---

### Pillar 1: Non-Blocking Startup & Readiness States
* **The Vulnerability:** Server boot sequence blocks on sequential JSON dictionary parsing and database presence reapers before Fastify binds, risking health-signal drops and early route failures.
* **The Fix:** Decouple server binding from subsystem initialization and implement dynamic readiness states.

```text
                  [ Server Boot Sequence ]
                             │
                             ▼
              [ fastify.listen() /health (DEGRADED) ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Async Phoneme Init ]           [ Async Collab Reapers ]
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                [ Subsystems Loaded ]
                             │
                             ▼
              [ Flip /health State to READY ]
```

#### Promotion Gates:
- **A Gate:** Fastify binds and listens on its port before executing any heavy dictionary loading or reaper cycles.
- **S Gate:** Implement a multi-state `/health` endpoint reflecting:
  - `Alive`: Server is bound and responding to basic HTTP signals.
  - `Degraded`: Server is up, but Oracle/PhonemeEngine or Collab service has not completed initialization.
  - `Ready`: All dictionaries parsed, reapers completed, and full operational capacity achieved.
  - Gated routes (`/read`, `/wand`, and predictive endpoints) will safely return a 503 or graceful "Initializing" payload rather than throwing 500 or crashing if hit during the `Degraded` phase.

---

### Pillar 2: Off-Thread Parsing & Compute (No UI Freeze)
* **The Vulnerability:** Synchronous `JSON.parse` of the ~15MB dictionary blocks the V8 thread for up to 350ms, causing temporal freezes on both the server event loop and the client browser main thread during initial load.
* **The Fix:** Move heavy parsing and lexical lookups out of the request and UI render paths entirely.

#### Promotion Gates:
- **A Gate:** Move dictionary parsing and index compilation off the main JavaScript threads.
- **S Gate:** 
  - **Server-side:** Offload dictionary parsing to a dedicated background Node.js `worker_threads` instance. The main thread communicates via non-blocking IPC query proxies.
  - **Client-side:** Move dictionary hydration and local searches to a browser Web Worker. The UI renders an active "Oracle warming" progress overlay and falls back to cached lexical matches until the worker emits the ready signal.
  - **Endgame:** Replace large JSON files with a local SQLite database using pre-quantized indexing for high-speed, asynchronous, zero-parse queries.

---

### Pillar 3: Centralized SQLite Write Serialization
* **The Vulnerability:** Parallel write pressure from pipelines, collab sessions, and reapers triggers `SQLITE_BUSY` (database locked) because the SQLite adapter runs transactions synchronously on a single loop.
* **The Fix:** Establish a strict, single-gate write serialization queue.

#### Promotion Gates:
- **A Gate:** Routes all known persistence operations through an asynchronous queue.
- **S Gate:** 
  - Centralize database writes behind a single authoritative gate: `sqliteWriteQueue.enqueue()`. 
  - Reapers, presence logs, formula persistence, and collaborative event pipelines are strictly prohibited from calling `db.prepare().run()` directly.
  - Integrate a ESLint/AST rule or build-time scanner to ban direct write operations outside of `collab.persistence.js`.
  - Under extreme lock stress testing, the serialization queue retains execution order and prevents thread blockages by shifting transaction runs to an off-thread DB worker if necessary.

---

### Pillar 4: Oracle UI Fail-Safe & Graceful Fallbacks
* **The Vulnerability:** Unhandled network disconnections bubbled up from async lookup hooks to parent views (`SearchPanel.jsx`, `ReadPage.jsx`), completely unmounting the IDE frame due to a lack of UI-level error boundaries.
* **The Fix:** Safe async exception mapping and React layout protection.

#### Promotion Gates:
- **A Gate:** Implement functional React Error Boundaries as a final safety net around the primary scroll view and toolbars.
- **S Gate:** 
  - Refactor `useWordLookup.jsx` to intercept fetch and network failures gracefully. Instead of throwing, the hook must return a stable, non-crashing state payload:
    ```javascript
    {
      ok: false,
      status: "disconnected",
      error: {
        category: "NETWORK",
        code: "ORACLE_DISCONNECTED",
        severity: "WARN"
      }
    }
    ```
  - The search panels recognize this state and render a localized, elegant "Oracle signal fading" overlay, preserving the rest of the workspace and keeping the page fully interactive.

---

### Pillar 5: De-jittered QBIT Cursor Scheduling
* **The Vulnerability:** Keyboard typing triggers forced reflows (`getComputedStyle`) and rapid `<canvas>` DOM element recreation on every single keystroke, causing high garbage collection pressure and layout micro-stutters.
* **The Fix:** Decouple measurements from typing, pool DOM objects, and tie updates to the QBIT pulse scheduler.

#### Promotion Gates:
- **A Gate:** Use a single, persistent, and hidden canvas element for text measurements, completely eliminating DOM creation and garbage collection pressure.
- **S Gate:** 
  - Tie caret coordinate updates directly to the QBIT pulse engine, batching measurements and executing rendering updates strictly on `requestAnimationFrame`.
  - Cache character-width matrices and computed font styles.
  - Enforce explicit **Cache Invalidation Triggers** to flush cached measurements only when a physical layout shift occurs:
    
    | Invalidation Trigger | Cause |
    |----------------------|-------|
    | `Textarea Width Change` | Text wrapping points shift. |
    | `Font Family / Size Change` | Caret offset and glyph widths shift. |
    | `Zoom / DevicePixel Change` | Vector and pixel raster mappings change. |
    | `ScrollTop / ScrollLeft Change` | Direct overlay coordinate offset changes. |
    | `Content Shift Before Cursor` | Cursor relative line placement changes. |
    | `Adaptive Topology Shift` | Active TrueSight scale overrides change. |

---

### Pillar 6: Idempotent & Canonical Persistence
* **The Vulnerability:** Risk of duplicate registries, memory drift, and hash collisions when parsing equivalent formulas with minor formatting variations.
* **The Fix:** Canonical key serialization and strict FNV-1a hash determinism.

#### Promotion Gates:
- **A Gate:** Enforce stable object stringification where keys are sorted alphabetically before generating the `catalogId`.
- **S Gate:** 
  - Enforce strict canonicalization of the formula model before hashing:
    ```javascript
    catalogId = FNV1a(
      stableStringify({
        schemaVersion,
        role,
        formula: canonicalizeFormula(formula),
        sourceIntentHash
      })
    )
    ```
  - `canonicalizeFormula` must execute precise normalization rules:
    - Sort all JSON object keys recursively.
    - Normalize numerical representations (e.g., float precision `1` vs `1.0`).
    - Strip undefined/null keys and UI-only metadata (e.g., coordinates cached on canvas).
    - Maintain stable arrays (do not auto-sort coordinates or indices where order carries spatial weight).
  - Implement parallel-save race condition unit tests to guarantee zero duplicate registration attempts under parallel load.

---

## 3. Regression Controls & Risk Mitigation

| Risk Area | Potential Breakage | Mitigation / Retest Path |
|-----------|--------------------|--------------------------|
| **Deferred Boot** | Subsystems accessed before dictionary hydration is finished. | Probe `/read` and `/wand` immediately upon server boot during `Degraded` phase. |
| **Worker Parsing** | IPC latency or worker load delay on dictionary requests. | Benchmark IPC roundtrip times and verify clean worker-recovery on thread crash. |
| **SQLite Serialization** | Direct database writes bypassing the queue. | Run static regex checks on codebase to ensure all `better-sqlite3` runs are gated through persistence. |
| **Oracle Resilience** | Silent failures hiding real logical bugs. | Unit test the mock network off-state and assert active `ORACLE_DISCONNECTED` bytecode logging. |
| **QBIT Scheduling** | Cursor overlay lagging behind visual caret during fast typing. | Profiler checks with TrueSight active to ensure frame times remain under 16.6ms. |
| **Canonical Persistence** | Hash collisions collapsing distinct formulas. | Run high-density FNV-1a collision tests with minor parameter mutations. |
