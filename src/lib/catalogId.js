/**
 * Browser-safe deterministic catalog-ID helpers.
 *
 * Shared by the Wand and DivWand authoring surfaces so the FNV-1a hash +
 * stable JSON serialization live in one place instead of being duplicated
 * (byte-for-byte) inside each page component. Pure functions, no DOM/IO —
 * safe to import from the UI adapter boundary.
 */

/** Stable, key-sorted JSON serialization so structurally-equal objects hash equal. */
export function serializeDeterministic(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(serializeDeterministic).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map((k) => `"${k}":${serializeDeterministic(obj[k])}`);
  return '{' + parts.join(',') + '}';
}

/** 32-bit FNV-1a hash → zero-padded 8-char hex. */
export function computeFNV1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Deterministic catalog id for a proposal.
 * @param {string} role            semantic role
 * @param {unknown} structure      formula / layout subtree to hash
 * @param {string} sourceIntentHash optional intent salt
 * @param {string} prefix          id prefix (e.g. 'cat' or 'cat-div')
 */
export function generateCatalogId(role, structure, sourceIntentHash = '', prefix = 'cat') {
  const bytes = serializeDeterministic(structure);
  const compositeKey = `${role}:${bytes}:${sourceIntentHash}`;
  return `${prefix}-${computeFNV1a(compositeKey)}`;
}
