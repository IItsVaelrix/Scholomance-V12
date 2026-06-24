# BUG-2026-05-08 — CARET STICKING & STATE DRIFT

## Bytecode Search Code
`SCHOL-ENC-BUG-CARET-DRIFT-V1`

## Bug Description
While typing in the ScrollEditor with Truesight active, the caret would frequently "stick" to specific characters, jump unexpectedly, or vanish behind the analytical overlay. This manifested as a visual desync between the user's input position and the rendered color-coded words.

## Root Cause
1. **Logic-Fracture (State Parallelism):** The component maintained `content` and `contentForOverlay` in parallel. React's reconciliation loop would re-mount the entire Truesight overlay on every keystroke, causing micro-jitters in the DOM.
2. **Math-Rot (Box-Model Violation):** `.truesight-word` elements used `padding` and `letter-spacing` derived from viseme bytecode. This introduced horizontal pixel drift relative to the native textarea kerning, causing words to "slide" away from their true character offsets.
3. **Z-Index Anarchy:** Hardcoded `z-index` values (10, 11, 100, 1000) violated Law 10 and allowed sibling elements (like sidebar handles or topbars) to re-stack over the textarea's interaction surface.

## Thought Process
1. **Initial Observation:** Caret behavior was non-deterministic during rapid input but bit-perfect on static scrolls.
2. **Forensic Audit:** Chosen "Verify box-model rules" path. Identified that `letter-spacing` on spans was the "smoking gun" for horizontal drift.
3. **Pattern Match:** Identified the "State Drift" signature from `error-patterns.md`.
4. **Solution Derivation:** Decided to implement a "Typing Freeze" to isolate the input event from the analysis render, and sanitize the CSS substrate to match the textarea's native grid.

## Changes Made
| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `src/pages/Read/ScrollEditor.jsx` | 300-320, 800-830 | Implemented `isTypingRef` and debounced overlay sync (400ms). |
| `src/pages/Read/IDE.css` | 40-50, 220-230 | Purged hardcoded z-indexes in topbar/statusbar. |
| `src/pages/Read/IDE.css` | 440-460 | Clamped sidebar resize handle z-indexes to semantic constants. |
| `src/pages/Read/IDE.css` | 3570-3600 | Forced `padding: 0 !important` and `letter-spacing: normal !important` on `.truesight-word`. |

## Testing
1. **Ruler Test:** Typed 80+ characters without spaces; confirmed overlay and textarea wrap at identical columns.
2. **Stress Test:** Rapid alphanumeric input; confirmed caret remains fluid and overlay only updates after typing pauses.
3. **Audit:** Grep verified zero hardcoded z-indexes > 1 remain in `IDE.css`.

## Lessons Learned
The browser's native textarea is the "Sovereign Interaction Layer." Any attempt to decorate it with DOM elements must treat the textarea's box-model as the absolute coordinate system. Even 1px of `letter-spacing` drift becomes a "State Drift" pathogen when multiplied across a 100-character line.
