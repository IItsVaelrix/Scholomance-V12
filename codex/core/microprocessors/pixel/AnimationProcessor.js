/**
 * PIXEL MICROPROCESSOR: Animation Compiler
 * 
 * Bridges the Bytecode Blueprint Bridge and Gear-Glide AMP with the
 * unified Microprocessor pipeline.
 * 
 * LAW 5 COMPLIANCE: This processor only handles COMPILATION and CALCULATION.
 * Execution (DOM/Phaser effects) is handled by the render layer.
 */

import { BytecodeBlueprintBridge } from '../../../../src/codex/animation/bytecode-bridge/index.ts';
import { getRotationAtTime } from '../../pixelbrain/gear-glide-amp.js';

/**
 * Compile an animation blueprint into target-specific payloads.
 * 
 * @param {Object} payload - { source (string or object), targets (array) }
 * @returns {Promise<Object>} The compiled animation output
 */
export async function compileAnimation({ source, targets = ['phaser', 'bytecode'] }) {
  if (!source) {
    throw new Error('Animation source is required for compilation');
  }

  const result = await BytecodeBlueprintBridge.execute({
    source,
    targets,
    execute: false, // MANDATORY: Processors are pure analysis
  });

  if (!result.success) {
    throw new Error(`Animation compilation failed: ${result.errors.map(e => e.message).join(', ')}`);
  }

  return result.output;
}

/**
 * Calculate BPM-synced rotation for a specific point in time.
 * 
 * @param {Object} payload - { absoluteTimeMs, bpm, degreesPerBeat, config }
 * @returns {Promise<number>} Rotation in radians
 */
export async function calculateRotation({ absoluteTimeMs, bpm, degreesPerBeat = 90, config = {} }) {
  const time = absoluteTimeMs ?? performance.now();
  const safeBpm = bpm ?? 90;
  
  return getRotationAtTime(time, safeBpm, degreesPerBeat, config);
}
