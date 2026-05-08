/**
 * LAYER 2 — ADAPTIVE IMMUNITY (The Leukocytes)
 * 
 * Vector-similarity to known pathogens.
 */

export const PATHOGEN_REGISTRY = [
  {
    id: 'pathogen.client-combat-scorer',
    name: 'Client-side Combat Scoring',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-04-26-COMBAT-AUTHORITY',
    // Vector signature representing the "fat" client scoring logic
    vector_id: 'TQ-SIGNATURE-COMBAT-SCORING-V1'
  },
  {
    id: 'pathogen.legacy-rhyme-stack',
    name: 'Legacy Rhyme Engine',
    threshold: 0.90,
    encyclopediaEntry: 'BUG-2026-04-26-RHYME-SEVERANCE',
    vector_id: 'TQ-SIGNATURE-LEGACY-RHYME-V1'
  },
  {
    id: 'pathogen.bytecode-bridge-shadow',
    name: 'Bytecode Bridge Shadowing',
    threshold: 0.88,
    encyclopediaEntry: 'BUG-2026-04-26-ANIMATION-PARITY',
    vector_id: 'TQ-SIGNATURE-BYTECODE-BRIDGE-V1'
  },
  {
    id: 'pathogen.recursive-shadow',
    name: 'Recursive Shadow (Service/Service Loop)',
    threshold: 0.95,
    encyclopediaEntry: 'BUG-2026-04-27-RECURSIVE-SHADOW',
    vector_id: 'TQ-SIGNATURE-RECURSIVE-SHADOW-V1'
  },
  {
    id: 'pathogen.port-drift',
    name: 'Port Drift (Render vs Fly.io Legacy)',
    threshold: 0.80,
    encyclopediaEntry: 'BUG-2026-04-27-PORT-DRIFT',
    vector_id: 'TQ-SIGNATURE-PORT-DRIFT-V1'
  },
  {
    id: 'pathogen.recursive-fragmentation',
    name: 'Recursive Fragmentation (Handshake Loop)',
    threshold: 0.90,
    encyclopediaEntry: 'BUG-2026-04-27-RECURSIVE-FRAGMENTATION',
    vector_id: 'TQ-SIGNATURE-RECURSIVE-FRAGMENTATION-V1'
  },
  {
    // Layer 3 (protocol scanner) catches this structurally. The registry
    // entry exists so dashboards and audits can name the disease class.
    id: 'pathogen.async-protocol-drift',
    name: 'Sync-style Caller of Async API',
    threshold: 1.0, // structural match; no vector similarity used
    encyclopediaEntry: 'BUG-2026-04-27-ASYNC-PROTOCOL-DRIFT',
    vector_id: 'STRUCTURAL-LAYER-3-PROTOCOL-V1',
    layer: 'protocol'
  },
  {
    // Per-keystroke synchronous side effects on the textarea onChange path.
    // Symptoms: input lag, jank during burst typing, layout thrash.
    // Signatures: getCursorCoordsFromTextarea / getBoundingClientRect /
    // synchronous DOM measurement inside an onChange handler; fire-and-forget
    // async calls without debounce or request-id guard; setState cascades
    // unbatched across an await boundary in the keystroke critical path.
    // Cure: defer via setTimeout (debounce) or RAF; gate stale responses
    // with a monotonic request-id ref; keep work off the synchronous handler.
    // First containment: SISP-FIX-v1-INPUT-LAG-001 (ScrollEditor.jsx
    // updateCompletions debounce + request-id guard, 2026-05-08).
    id: 'pathogen.keystroke-critical-path',
    name: 'Keystroke Critical Path Contamination (Per-Stroke Sync Work)',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-05-08-INPUT-LAG-COMPLETIONS',
    vector_id: 'TQ-SIGNATURE-KEYSTROKE-CRITICAL-PATH-V1'
  }
];
