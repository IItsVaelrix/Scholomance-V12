/**
 * Deterministic Shape Grammar Engine
 * Expands construction features into a part manifest deterministically.
 */
import { hashString } from './shared.js';

export function expandShapeGrammar(spec, skeleton, grammarDefinition) {
  const parts = [];
  const requiredOutputs = [];
  const invariants = [];
  const seams = [];

  // This is a minimal engine that executes the grammar's rule functions
  // to build up the resolved parts and required outputs.
  const context = {
    skeleton,
    spec,
    addPart: (partDef) => {
      parts.push(partDef);
    },
    requireOutput: (req) => {
      requiredOutputs.push(req);
    },
    addInvariant: (inv) => {
      invariants.push(inv);
    },
    addSeam: (seam) => {
      seams.push(seam);
    }
  };

  grammarDefinition.expand(context);

  const hashContent = JSON.stringify({
    grammarId: grammarDefinition.id,
    version: grammarDefinition.version,
    parts,
    requiredOutputs
  });

  return {
    contract: 'PB-SHAPE-GRAMMAR-v1',
    grammarId: grammarDefinition.id,
    grammarVersion: grammarDefinition.version,
    sourceSkeletonHash: skeleton?.hash || 'no-skeleton',
    parts,
    requiredOutputs,
    invariants,
    seams,
    hash: hashString(spec.seed, hashContent)
  };
}
