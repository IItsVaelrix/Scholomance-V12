# IDE Runtime Stasis Promotion Plan (C/B → S-Tier)
## Bytecode Search Code
`SCHOL-ENC-BYKE-IDE-STASIS-PROMOTION`

## 1. Plan Identity
- **Plan ID:** PDR-20260521-IDE-STASIS-PROMOTION-S
- **Subject:** IDE Stability Ascension (Wand / Oracle / Collab Runtime Hardening)
- **Target Grade:** S-Tier (High-Availability, Pressure-Resistant, & Formally Hardened)
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
              [ fastify.listen() /health/live (200 OK) ]
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
         [ /health/ready Status flips to 200 READY ]
```

#### Promotion Gates:
- **A Gate:** Fastify binds and listens on its port before executing any heavy dictionary loading or reaper cycles. Expose separate liveness and readiness probes to prevent false container restarts:
  - `/health/live`: Returns `200 OK` immediately: `{ status: "alive" }`.
  - `/health/ready`: Returns `200 READY` or `503 DEGRADED` depending on subsystem initialization state:
    ```json
    {
      "status": "degraded",
      "subsystems": {
        "phonemeEngine": "loading",
        "oracle": "warming",
        "collab": "reaping",
        "sqlite": "ready"
      }
    }
    ```
- **S Gate:** Gated routes (`/read`, `/wand`, and predictive endpoints) will safely return graceful "Initializing" payloads rather than throwing 500 or crashing if hit during the `Degraded` phase.

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
- **A Gate:** Routes all known persistence operations through an asynchronous queue (`sqliteWriteQueue.enqueue()`).
- **S Gate:** 
  - Reapers, presence logs, formula persistence, and collaborative event pipelines are strictly prohibited from calling `.run()` or `.exec()` directly.
  - Implement a custom **AST/ESLint Rule** banning database mutation calls outside of authorized persistence layers (`collab.persistence.js`).
  - Under extreme lock stress testing, the serialization queue retains execution order and prevents thread blockages by shifting transaction runs to an off-thread DB worker if necessary.

---

### Pillar 4: Oracle UI Fail-Safe & Graceful Fallbacks
* **The Vulnerability:** Unhandled network disconnections bubbled up from async lookup hooks to parent views (`SearchPanel.jsx`, `ReadPage.jsx`), completely unmounting the IDE frame due to a lack of UI-level error boundaries.
* **The Fix:** Safe async exception mapping and React layout protection.

#### Promotion Gates:
- **A Gate (Surgery):** Refactor `useWordLookup.jsx` to intercept fetch and network failures gracefully. The hook **never throws** for normal network failure. Instead, it catches the error and returns a stable, non-crashing state payload:
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
- **S Gate (Armor):** Wrap panels in React Error Boundaries as a final safety net, render localized, elegant "Oracle signal fading" overlays, and implement active Oracle reconnect state workflows.

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
* **The Fix:** Canonical key serialization and strict FNV-1a hash determinism with unique constraints and collision fallback.

#### Promotion Gates:
- **A Gate:** Enforce stable object stringification where keys are sorted recursively before generating the `catalogId`.
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
  - **Null Safeguard Policy:** Strip `undefined` fields and UI-only metadata. Preserve `null` values unless the schema explicitly defines `null` as non-semantic (e.g. distinguishing `{ axis: null }` from default behavior).
  - **Collision Mitigation Policy:** Define a `UNIQUE(catalogId)` database constraint. If a calculated `catalogId` already exists:
    * If the canonical payloads match exactly: Return the existing record.
    * If the canonical payloads differ: Emit a `HASH_COLLISION` diagnostic warning and derive a new `catalogId` by appending a salt-based unique suffix.
  - Implement parallel-save race condition unit tests to guarantee zero duplicate registration attempts under parallel load.

---

## 3. Recommended Promotion Checklist

### A Gate
* [ ] Fastify binds before `PhonemeEngine.init()` is executed.
* [ ] Database presence reapers run asynchronously *after* Fastify binds.
* [ ] Separate `/health/live` and `/health/ready` endpoints are functional.
* [ ] Dictionary parse moves off the main execution thread or is deferred safely.
* [ ] Authoritative `sqliteWriteQueue.enqueue()` write mechanism is established.
* [ ] All known database write queries are successfully routed through the serialization queue.
* [ ] Hook `useWordLookup.jsx` catches fetch errors and returns a safe, structured error state payload instead of throwing.
* [ ] Pooled persistent measurement canvas replaces all per-keystroke canvas creation instances.
* [ ] `stableStringify` recursively and alphabetically sorts all object keys.

### S Gate
* [ ] Degraded routes gracefully return "Initializing" status payloads to the client UI.
* [ ] Web Worker parsing crash and auto-recovery cycles are verified.
* [ ] Direct SQLite writes outside authorized persistence files are banned via AST/ESLint rules.
* [ ] Oracle disconnected fallback UI elegantly preserves the surrounding IDE layout.
* [ ] QBIT pulse scheduler batches and drives cursor coordinates strictly on `requestAnimationFrame`.
* [ ] Caret and font measurement cache invalidation triggers are thoroughly tested.
* [ ] SQLite `catalogId` uniqueness constraint and FNV-1a hash collision salt resolution logic are in place.
* [ ] Parallel-save integration tests prove no duplicate registry entries are made.
* [ ] Performance profiling confirms rapid typing remains under the 16.6ms per-frame budget with TrueSight active.

---

## 4. Regression Controls & Retest Ritual

Use the following checks to verify active stasis integrity:

### 1. Boot Verification
Run the dev environment and immediately probe liveness and readiness states:
```bash
npm run dev
# Probe liveness (should return 200 OK immediately)
curl http://localhost:3000/health/live
# Probe readiness (returns 200 READY or 503 DEGRADED depending on dict hydration)
curl http://localhost:3000/health/ready
```

### 2. Direct Write Auditing
Execute automated static scans to ensure no writes bypass the queue:
```bash
grep -R "\.run(" codex src --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"
grep -R "\.exec(" codex src --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"
```

### 3. Subsystem Stress Gauntlets
Execute high-pressure unit and integration gauntlets:
```bash
npm run test -- --run sqlite       # Validates serialization write queues
npm run test -- --run oracle       # Validates no-throw disconnections & fallback UI states
npm run test -- --run wand         # Validates coordinates parsing bounds and rendering
npm run test -- --run persistence  # Validates FNV-1a sorting, null safety, and collision-salting
```
