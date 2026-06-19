import { CANDIDATE_SOURCES, MAX_CANDIDATES, generateCandidateId } from '../schemas.js';
import { generateSubstringCandidates } from './substring.candidate.generator.js';
import { generateRuleCandidates } from './rule.candidate.generator.js';
import { retrieveVectorNNPhonemeCandidates } from './vector-nn.candidate.generator.js';

export { generateRuleCandidates, generateSubstringCandidates, retrieveVectorNNPhonemeCandidates };

export function generateCandidates(word, cmuEntries) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!upper) return [];

  const ruleCandidates = generateRuleCandidates(upper);
  const substringCandidates = generateSubstringCandidates(upper, cmuEntries);
  const allCandidates = [...ruleCandidates, ...substringCandidates];

  const deduped = dedupeCandidates(allCandidates);

  return deduped.slice(0, MAX_CANDIDATES);
}

function dedupeCandidates(candidates) {
  const seen = new Map();
  for (const candidate of candidates) {
    const key = candidate.phonemes.join(' ');
    if (!seen.has(key)) {
      seen.set(key, candidate);
      continue;
    }
    const existing = seen.get(key);
    if ((candidate.confidence || 0) > (existing.confidence || 0)) {
      seen.set(key, candidate);
    }
  }
  return Array.from(seen.values());
}
