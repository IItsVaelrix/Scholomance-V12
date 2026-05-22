import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDivProposal } from './div-layout-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const PRESETS_FILE_PATH = path.join(ROOT_DIR, 'presets', 'proposed-div-layouts.json');

/**
 * Recursive stable serialization.
 */
export function serializeDeterministic(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(serializeDeterministic).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(k => `"${k}":${serializeDeterministic(obj[k])}`);
  return '{' + parts.join(',') + '}';
}

/**
 * FNV-1a deterministic 32-bit hash.
 */
export function computeFNV1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Generate a unique, deterministic catalog ID.
 */
export function generateCatalogId(role, layout, sourceIntentHash = '') {
  const layoutBytes = serializeDeterministic(layout);
  const compositeKey = `${role}:${layoutBytes}:${sourceIntentHash}`;
  return `cat-div-${computeFNV1a(compositeKey)}`;
}

/**
 * Idempotently registers a DIV layout proposal.
 * @param {Object} proposal - The validated proposal.
 * @returns {Object} Catalog registration metadata containing the catalogId.
 */
export function registerDivLayout(proposal) {
  const validation = validateDivProposal(proposal);
  if (!validation.valid) {
    throw new Error(`Cannot register invalid proposal: ${validation.errors.join(', ')}`);
  }

  const role = proposal.proposedLayout.role;
  const layout = proposal.proposedLayout;
  const intentHash = proposal.sourceIntentHash || '';
  const catalogId = generateCatalogId(role, layout, intentHash);

  // Read existing presets or create empty array
  let existing = [];
  if (fs.existsSync(PRESETS_FILE_PATH)) {
    try {
      const data = fs.readFileSync(PRESETS_FILE_PATH, 'utf8');
      existing = JSON.parse(data);
      if (!Array.isArray(existing)) existing = [];
    } catch (e) {
      existing = [];
    }
  }

  // Idempotently check if catalogId already exists
  const exists = existing.find(item => item.catalogId === catalogId);
  if (exists) {
    return { catalogId, alreadyRegistered: true, count: existing.length };
  }

  const newEntry = {
    catalogId,
    timestamp: Date.now(), // EXEMPT
    proposal
  };

  existing.push(newEntry);

  // Write with clean formatting
  fs.writeFileSync(PRESETS_FILE_PATH, JSON.stringify(existing, null, 2), 'utf8');

  return { catalogId, alreadyRegistered: false, count: existing.length };
}
