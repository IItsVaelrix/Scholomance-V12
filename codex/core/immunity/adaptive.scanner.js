/**
 * LAYER 2 — ADAPTIVE SCANNER (The Leukocytes)
 * 
 * Vector-similarity to known pathogens.
 */

import { similarity, quantizeVectorJS } from '../quantization/turboquant.js';
import { generatePhonosemanticVector } from '../semantic/vector.utils.js';
import { PATHOGEN_REGISTRY } from './pathogenRegistry.js';

const CHUNK_SIZE = 500; // Characters per semantic atom
const SEED = 42;

/**
 * Scans content for semantic matches against known pathogens.
 * @param {string} content
 * @returns {Promise<Array<{ pathogenId: string, score: number, entry: string }>>}
 */
export async function scanAdaptive(content) {
  if (!content || content.length < 50) return [];
  
  // 1. Chunking
  const chunks = [];
  for (let i = 0; i < content.length; i += CHUNK_SIZE / 2) {
    chunks.push(content.slice(i, i + CHUNK_SIZE));
  }
  
  const violations = [];
  
  // 2. Generate signatures for chunks
  const chunkSignatures = chunks.map(chunk => {
    const vec = generatePhonosemanticVector(chunk);
    return quantizeVectorJS(vec, SEED);
  });
  
  // 3. Compare against pathogen registry
  for (const pathogen of PATHOGEN_REGISTRY) {
    // Note: In a real implementation, pathogen.vector would be pre-quantized.
    // For this evolution, we generate it on the fly from the known bad pattern.
    const pathogenVec = generatePhonosemanticVector(pathogen.name); // Placeholder for signature
    const pathogenSig = quantizeVectorJS(pathogenVec, SEED);
    
    let maxScore = 0;
    for (const sig of chunkSignatures) {
      const score = similarity(sig, pathogenSig);
      if (score > maxScore) maxScore = score;
    }
    
    if (maxScore >= pathogen.threshold) {
      violations.push({
        pathogenId: pathogen.id,
        name: pathogen.name,
        score: maxScore,
        entry: pathogen.encyclopediaEntry
      });
    }
  }
  
  return violations;
}
