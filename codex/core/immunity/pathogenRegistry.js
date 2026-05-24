/**
 * LAYER 2 — ADAPTIVE IMMUNITY (The Leukocytes)
 * 
 * Vector-similarity to known pathogens with AI Glyph steganographic encoding.
 * 
 * Each pathogen signature carries:
 *   - Pre-computed quantized vector (data: number[])
 *   - Glyph cluster for AI-instantaneous identification
 *   - Determinism proof (verifiable via verifyDeterminism)
 * 
 * GLYPH SCHEME (SISP-GLYPH-v1):
 *   ⟡ (E29E1) = CLIENT_AUTHORITY
 *   ⧫ (E29EB) = SHADOW_PATH  
 *   ⌁ (E29E1) = EQUIVALENCE
 *   ⟟ (E29DF) = LOOP_RECURSION
 *   ⧯ (E29EF) = INFRASTRUCTURE
 *   ◈ (E25C8) = PROTOCOL_DRIFT
 *   ⧿ (E29FF) = CRITICAL_PATH
 * 
 * Reference: SCHOLOMANCE_IRONCLAD_STERILIZATION_PROTOCOL.skill.md § SISP-GLYPH-v1
 */

import { quantizeVectorJS } from '../quantization/turboquant.js';
import { generatePhonosemanticVector } from '../semantic/vector.utils.js';
import { PATHOGEN_GLYPHS } from './ai-glyphs.js';

// Shared seed for all pathogen signatures (matches adaptive.scanner.js)
const SEED = 42;

/**
 * Generate pre-computed signature for a pathogen with glyph encoding.
 * 
 * @param {string} pathogenName - Human-readable pathogen name
 * @param {string} pathogenId - Registry ID for glyph lookup
 * @returns {{ data: number[], norm: number, glyphs: string }}
 */
function computeGlyphSignature(pathogenName, pathogenId) {
  const vec = generatePhonosemanticVector(pathogenName);
  const sig = quantizeVectorJS(vec, SEED);
  
  // Get glyph cluster from registry or derive from ID
  const glyphs = PATHOGEN_GLYPHS[pathogenId] || '◎';
  
  return { 
    data: Array.from(sig.data), 
    norm: sig.norm,
    glyphs,
  };
}

export const PATHOGEN_REGISTRY = [
  {
    id: 'pathogen.client-combat-scorer',
    name: 'Client-side Combat Scoring',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-04-26-COMBAT-AUTHORITY',
    vector_id: 'TQ-SIGNATURE-COMBAT-SCORING-V1',
    glyphs: '⟡⌁', // CLIENT_AUTHORITY + EQUIVALENCE
    signature: (() => computeGlyphSignature('Client-side Combat Scoring', 'pathogen.client-combat-scorer'))(),
  },
  {
    id: 'pathogen.legacy-rhyme-stack',
    name: 'Legacy Rhyme Engine',
    threshold: 0.90,
    encyclopediaEntry: 'BUG-2026-04-26-RHYME-SEVERANCE',
    vector_id: 'TQ-SIGNATURE-LEGACY-RHYME-V1',
    glyphs: '⧫⌁', // SHADOW_PATH + EQUIVALENCE
    signature: (() => computeGlyphSignature('Legacy Rhyme Engine', 'pathogen.legacy-rhyme-stack'))(),
  },
  {
    id: 'pathogen.bytecode-bridge-shadow',
    name: 'Bytecode Bridge Shadowing',
    threshold: 0.88,
    encyclopediaEntry: 'BUG-2026-04-26-ANIMATION-PARITY',
    vector_id: 'TQ-SIGNATURE-BYTECODE-BRIDGE-V1',
    glyphs: '⧫⧫', // SHADOW_PATH x2
    signature: (() => computeGlyphSignature('Bytecode Bridge Shadowing', 'pathogen.bytecode-bridge-shadow'))(),
  },
  {
    id: 'pathogen.recursive-shadow',
    name: 'Recursive Shadow (Service/Service Loop)',
    threshold: 0.95,
    encyclopediaEntry: 'BUG-2026-04-27-RECURSIVE-SHADOW',
    vector_id: 'TQ-SIGNATURE-RECURSIVE-SHADOW-V1',
    glyphs: '⟟⟟', // LOOP_RECURSION x2
    signature: (() => computeGlyphSignature('Recursive Shadow (Service/Service Loop)', 'pathogen.recursive-shadow'))(),
  },
  {
    id: 'pathogen.port-drift',
    name: 'Port Drift (Render vs Fly.io Legacy)',
    threshold: 0.80,
    encyclopediaEntry: 'BUG-2026-04-27-PORT-DRIFT',
    vector_id: 'TQ-SIGNATURE-PORT-DRIFT-V1',
    glyphs: '⧯⧯', // INFRASTRUCTURE x2
    signature: (() => computeGlyphSignature('Port Drift (Render vs Fly.io Legacy)', 'pathogen.port-drift'))(),
  },
  {
    id: 'pathogen.recursive-fragmentation',
    name: 'Recursive Fragmentation (Handshake Loop)',
    threshold: 0.90,
    encyclopediaEntry: 'BUG-2026-04-27-RECURSIVE-FRAGMENTATION',
    vector_id: 'TQ-SIGNATURE-RECURSIVE-FRAGMENTATION-V1',
    glyphs: '⟟⌁', // LOOP_RECURSION + EQUIVALENCE
    signature: (() => computeGlyphSignature('Recursive Fragmentation (Handshake Loop)', 'pathogen.recursive-fragmentation'))(),
  },
  {
    // Layer 3 (protocol scanner) catches this structurally. The registry
    // entry exists so dashboards and audits can name the disease class.
    id: 'pathogen.async-protocol-drift',
    name: 'Sync-style Caller of Async API',
    threshold: 1.0, // structural match; no vector similarity used
    encyclopediaEntry: 'BUG-2026-04-27-ASYNC-PROTOCOL-DRIFT',
    vector_id: 'STRUCTURAL-LAYER-3-PROTOCOL-V1',
    layer: 'protocol',
    glyphs: '◈◈', // PROTOCOL_DRIFT x2
    signature: null, // Layer 3 handles this via structural scanning
  },
  {
    id: 'pathogen.keystroke-critical-path',
    name: 'Keystroke Critical Path Contamination (Per-Stroke Sync Work)',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-05-08-INPUT-LAG-COMPLETIONS',
    vector_id: 'TQ-SIGNATURE-KEYSTROKE-CRITICAL-PATH-V1',
    glyphs: '⧿⧿', // CRITICAL_PATH x2
    signature: (() => computeGlyphSignature('Keystroke Critical Path Contamination (Per-Stroke Sync Work)', 'pathogen.keystroke-critical-path'))(),
  },
  {
    id: 'pathogen.rejected-water-source',
    name: 'Rejected Water Source (Shadow Path + Recursive Entropy)',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-05-09-REJECTED-WATER-SOURCE',
    vector_id: 'TQ-SIGNATURE-REJECTED-WATER-V1',
    glyphs: '⧫⟟', // SHADOW_PATH + LOOP_RECURSION
    signature: (() => computeGlyphSignature('Rejected Water Source (Shadow Path + Recursive Entropy)', 'pathogen.rejected-water-source'))(),
  },
  {
    id: 'pathogen.phoneme-engine-severance',
    name: 'Phoneme Engine Severance (Internal Bridge Collapse)',
    threshold: 0.90,
    encyclopediaEntry: 'BUG-2026-05-09-PHONEME-SEVERANCE',
    vector_id: 'TQ-SIGNATURE-PHONEME-SEVERANCE-V1',
    glyphs: '◈⟟', // PROTOCOL_DRIFT + LOOP_RECURSION
    signature: (() => computeGlyphSignature('Phoneme Engine Severance (Internal Bridge Collapse)', 'pathogen.phoneme-engine-severance'))(),
  },
  {
    id: 'pathogen.blocking-boot-sequence',
    name: 'Blocking Boot Sequence (Pre-Bind Subsystem Init)',
    threshold: 0.88,
    encyclopediaEntry: 'BUG-2026-05-21-BLOCKING-STARTUP',
    vector_id: 'TQ-SIGNATURE-BLOCKING-BOOT-V1',
    glyphs: '⧯⧿', // INFRASTRUCTURE + CRITICAL_PATH
    signature: (() => computeGlyphSignature('Blocking Boot Sequence (Pre-Bind Subsystem Init)', 'pathogen.blocking-boot-sequence'))(),
  },
  {
    id: 'pathogen.main-thread-parse-stall',
    name: 'Main-Thread Parse Stall (Synchronous Dictionary Hydration)',
    threshold: 0.87,
    encyclopediaEntry: 'BUG-2026-05-21-PARSE-STALL',
    vector_id: 'TQ-SIGNATURE-PARSE-STALL-V1',
    glyphs: '⧿⧯', // CRITICAL_PATH + INFRASTRUCTURE
    signature: (() => computeGlyphSignature('Main-Thread Parse Stall (Synchronous Dictionary Hydration)', 'pathogen.main-thread-parse-stall'))(),
  },
  {
    id: 'pathogen.unserialized-write-contention',
    name: 'Unserialized Write Contention (SQLITE_BUSY Lock Storm)',
    threshold: 0.86,
    encyclopediaEntry: 'BUG-2026-05-21-SQLITE-BUSY',
    vector_id: 'TQ-SIGNATURE-WRITE-CONTENTION-V1',
    glyphs: '⧯⟟', // INFRASTRUCTURE + LOOP_RECURSION
    signature: (() => computeGlyphSignature('Unserialized Write Contention (SQLITE_BUSY Lock Storm)', 'pathogen.unserialized-write-contention'))(),
  },
  {
    id: 'pathogen.noncanonical-persistence-drift',
    name: 'Non-Canonical Persistence Drift (Hash Collision / Duplicate Registry)',
    threshold: 0.89,
    encyclopediaEntry: 'BUG-2026-05-21-PERSISTENCE-DRIFT',
    vector_id: 'TQ-SIGNATURE-PERSISTENCE-DRIFT-V1',
    glyphs: '◈⌁', // PROTOCOL_DRIFT + EQUIVALENCE
    signature: (() => computeGlyphSignature('Non-Canonical Persistence Drift (Hash Collision / Duplicate Registry)', 'pathogen.noncanonical-persistence-drift'))(),
  },
  {
    id: 'pathogen.rename-without-consumer-grep',
    name: 'Rename Without Consumer Grep',
    threshold: 0.85,
    encyclopediaEntry: 'BUG-2026-05-24-RENAME-WITHOUT-CONSUMER-GREP',
    vector_id: 'TQ-SIGNATURE-RENAME-GREP-V1',
    glyphs: '⧫◈', // SHADOW_PATH + PROTOCOL_DRIFT
    signature: (() => computeGlyphSignature('Rename Without Consumer Grep', 'pathogen.rename-without-consumer-grep'))(),
  },
];
