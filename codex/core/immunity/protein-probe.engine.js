import { runVectorAmp, compareSignatures } from '../semantic/amp/runVectorAmp.js';

/**
 * PROTEIN PROBE ENGINE
 *
 * Vectorizes bug hypotheses and scans a collection of files for structural
 * resonance. Vectorization flows through the Vector AMP, so the probe shares the
 * exact lens/seed used by the codebase index and search — one eye, one lens.
 */

/**
 * Vectorizes a natural language hypothesis into a search protein.
 *
 * @param {string} hypothesis
 * @returns {ReturnType<typeof runVectorAmp>} AMP result (signature + fidelity)
 */
export function vectorizeHypothesis(hypothesis) {
  const amp = runVectorAmp(hypothesis);
  if (process.env.PROBE_DEBUG) {
    console.log(`[debug] searchProtein fidelity: ${amp.fidelity?.grade} (${amp.fidelity?.score})`);
  }
  return amp;
}

/**
 * Scans a list of files for resonance with a search protein.
 * 
 * @param {Array<{path: string, content: string}>} files
 * @param {ReturnType<typeof runVectorAmp>} searchProtein - AMP result from vectorizeHypothesis
 * @param {object} options
 * @returns {Array<{path: string, resonance: number}>}
 */
export function scanSubstrate(files, searchProtein, options = { minResonance: 0.7 }) {
  const heatmap = [];
  const proteinSignature = searchProtein.signature;

  for (const file of files) {
    const content = file.content;
    if (!content || content.length < 50) continue;

    // Chunking logic similar to adaptive scanner but optimized for probe
    const CHUNK_SIZE = 500;
    let maxResonance = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE / 2) {
      const chunk = content.slice(i, i + CHUNK_SIZE);
      // Same lens/seed as the protein, via the AMP.
      const chunkSignature = runVectorAmp(chunk, { fidelityPolicy: 'off' }).signature;
      const res = compareSignatures(chunkSignature, proteinSignature);
      if (res > maxResonance) maxResonance = res;
    }

    // Map -1..1 to 0..1 for percentage display
    const normalizedResonance = Math.max(0, Math.min(1, (maxResonance + 1) / 2));

    if (normalizedResonance >= options.minResonance) {
      heatmap.push({
        path: file.path,
        resonance: normalizedResonance
      });
    }
  }

  return heatmap.sort((a, b) => b.resonance - a.resonance);
}
