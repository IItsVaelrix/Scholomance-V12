import { CANDIDATE_SOURCES, MAX_CANDIDATES } from '../schemas.js';

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function generateCompoundCandidates(word, cmuEntries, limit = MAX_CANDIDATES) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (upper.length < 3) return [];

  const dict = new Map();
  for (const entry of cmuEntries) {
    dict.set(entry[0], entry[1]);
  }

  const memo = new Map();
  function dfs(start) {
    if (start === upper.length) return [[]];
    if (memo.has(start)) return memo.get(start);

    const res = [];
    for (let i = start + 1; i <= upper.length; i++) {
      const sub = upper.slice(start, i);
      if (dict.has(sub)) {
        const nextPaths = dfs(i);
        for (const path of nextPaths) {
          res.push([sub, ...path]);
        }
      }
    }
    
    // Group by length and only keep the shortest paths to avoid "spelled out" garbage
    if (res.length > 0) {
      let minLen = Infinity;
      for (const p of res) {
        if (p.length < minLen) minLen = p.length;
      }
      const shortestPaths = res.filter(p => p.length === minLen);
      memo.set(start, shortestPaths);
      return shortestPaths;
    }
    
    memo.set(start, res);
    return res;
  }

  const validPaths = dfs(0);
  if (validPaths.length === 0) return [];

  const results = [];
  const seenPhonemes = new Set();

  for (const path of validPaths) {
    const combinedPhonemes = [];
    for (const sub of path) {
      const variants = dict.get(sub);
      if (variants && variants.length > 0) {
        combinedPhonemes.push(...variants[0]);
      }
    }

    const keyStr = combinedPhonemes.join(' ');
    if (seenPhonemes.has(keyStr)) continue;
    seenPhonemes.add(keyStr);

    results.push({
      word: upper,
      phonemes: combinedPhonemes,
      source: CANDIDATE_SOURCES.COMPOUND || 'compound',
      overlap: upper.length,
      confidence: 1.0,
    });

    if (results.length >= limit) break;
  }

  return results;
}
