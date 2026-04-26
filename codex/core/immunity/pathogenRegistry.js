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
  }
];
