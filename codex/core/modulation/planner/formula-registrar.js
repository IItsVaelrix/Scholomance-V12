/**
 * SCHOLOMANCE FAIRLY ODD WAND — DETERMINISTIC FORMULA REGISTRAR
 *
 * Idempotent persistence layer for formula proposals.
 *
 * Pillar 6 (Idempotent & Canonical Persistence):
 *  - The formula model is strictly canonicalized (undefined + UI-only metadata
 *    stripped, semantic null preserved) BEFORE hashing, so formatting variants
 *    of an equivalent formula collapse to one deterministic catalogId.
 *  - Presets are stored in SQLite with a UNIQUE(catalogId) constraint. The
 *    constraint — not application logic — is the authority on uniqueness, so
 *    parallel saves cannot register duplicates.
 *  - Genuine FNV-1a hash collisions (distinct canonical payloads, same hash)
 *    emit a HASH_COLLISION diagnostic and fall back to a salted catalogId.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { validateProposal } from './formula-validator.js';

// Resolve directory boundaries safely
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const PRESETS_DB_PATH = path.join(ROOT_DIR, 'presets', 'proposed-formulas.sqlite');

// Schema version participates in the catalog hash so a future formula-model
// change cannot silently alias against ids minted under the old model.
const SCHEMA_VERSION = 1;

// Keys treated as non-semantic and dropped before hashing. Anything prefixed
// with `_` or `$` is also treated as an internal/UI marker.
const UI_METADATA_KEYS = new Set(['__meta', 'displayLabel', 'preview', 'icon', 'tooltip']);

const SALT_CEILING = 64;

/**
 * Deterministically serializes any JS value by sorting object keys recursively.
 * Ensures a stable byte representation for hashing.
 * @param {*} obj - Value to serialize.
 * @returns {string} Deterministic JSON string.
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
 * Strips non-semantic noise from a formula model so equivalent formulas with
 * cosmetic differences hash identically.
 *  - `undefined` values are removed (object keys and array holes).
 *  - UI-only / internal-marker keys are removed.
 *  - `null` is PRESERVED — it is a semantic value (e.g. `{ axis: null }` is a
 *    deliberate override distinct from a missing key).
 * @param {*} value - Formula model (or any nested fragment).
 * @returns {*} Canonical formula model.
 */
export function canonicalizeFormula(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => canonicalizeFormula(item));
  }
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      const v = value[key];
      if (v === undefined) continue;
      if (key.startsWith('_') || key.startsWith('$')) continue;
      if (UI_METADATA_KEYS.has(key)) continue;
      out[key] = canonicalizeFormula(v);
    }
    return out;
  }
  // Primitives, including the semantically meaningful `null`, pass through.
  return value;
}

/**
 * Computes the FNV-1a 32-bit hash as an 8-character hex string.
 * @param {string} str - Input string.
 * @returns {string} 8-character hexadecimal string.
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
 * Builds the canonical key payload that uniquely identifies a proposal.
 * @returns {{ schemaVersion: number, role: string, formula: *, sourceIntentHash: string }}
 */
function buildCanonicalPayload(role, formula, sourceIntentHash = '', schemaVersion = SCHEMA_VERSION) {
  return {
    schemaVersion,
    role,
    formula: canonicalizeFormula(formula),
    sourceIntentHash,
  };
}

/**
 * Generates the deterministic catalog ID for a proposal.
 * @param {string} role - Semantic role.
 * @param {Object} formula - Formula grammar object.
 * @param {string} [sourceIntentHash] - Optional source hash.
 * @param {number} [schemaVersion] - Formula-model schema version.
 * @returns {string} catalogId in the form `cat-XXXXXXXX`.
 */
export function generateCatalogId(role, formula, sourceIntentHash = '', schemaVersion = SCHEMA_VERSION) {
  const canonicalBytes = serializeDeterministic(
    buildCanonicalPayload(role, formula, sourceIntentHash, schemaVersion),
  );
  return `cat-${computeFNV1a(canonicalBytes)}`;
}

function emitHashCollisionDiagnostic(catalogId, existingBytes, incomingBytes) {
  console.warn(
    `[HASH_COLLISION] catalogId=${catalogId} — two distinct canonical formulas produced the ` +
    `same FNV-1a hash. Deriving a salted catalogId to keep both registrations addressable. ` +
    `(existingBytes=${existingBytes.length}, incomingBytes=${incomingBytes.length})`,
  );
}

let _db = null;

/**
 * Lazily opens the presets database and ensures the schema exists.
 * The PRIMARY KEY on catalogId is the UNIQUE(catalogId) constraint Pillar 6
 * requires — duplicate registration is rejected by the engine itself.
 */
function getDb() {
  if (_db) return _db;
  const dir = path.dirname(PRESETS_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  _db = new Database(PRESETS_DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS formula_presets (
      catalogId TEXT PRIMARY KEY,
      canonical_payload TEXT NOT NULL,
      proposal TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return _db;
}

/** Test/teardown hook — closes the cached database handle. */
export function closeRegistrar() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Register a proposal. Idempotent: an equivalent canonical formula always
 * resolves to the same catalogId and is never duplicated.
 * @param {Object} proposal - Formula proposal object.
 * @returns {{ catalogId: string, status: 'created'|'exists', entry: Object }}
 */
export function registerFormulaProposal(proposal) {
  // 1. Validate fail-closed.
  const validation = validateProposal(proposal);
  if (!validation.valid) {
    throw new Error(`FORMULA_PROPOSAL_REJECTED: ${validation.errors.join('; ')}`);
  }

  const { proposedFormula, sourceIntentHash = '' } = proposal;
  const { role, formula } = proposedFormula;

  // 2. Canonicalize, then hash the canonical bytes.
  const canonicalBytes = serializeDeterministic(
    buildCanonicalPayload(role, formula, sourceIntentHash),
  );
  const baseCatalogId = `cat-${computeFNV1a(canonicalBytes)}`;

  const db = getDb();
  const selectStmt = db.prepare(
    'SELECT catalogId, canonical_payload, proposal FROM formula_presets WHERE catalogId = ?',
  );
  const insertStmt = db.prepare(
    'INSERT INTO formula_presets (catalogId, canonical_payload, proposal, created_at) VALUES (?, ?, ?, ?)',
  );

  // 3. Resolve idempotency / collisions. The salt advances ONLY on a genuine
  //    hash collision (same id, different canonical payload). A lost parallel
  //    race re-resolves the SAME id, which the winner has now committed.
  let salt = 0;
  for (;;) {
    if (salt > SALT_CEILING) {
      throw new Error(
        `FORMULA_REGISTRAR_SALT_EXHAUSTED: could not resolve a unique catalogId for ${baseCatalogId}`,
      );
    }
    const catalogId = salt === 0 ? baseCatalogId : `${baseCatalogId}-s${salt}`;
    const existing = selectStmt.get(catalogId);

    if (existing) {
      if (existing.canonical_payload === canonicalBytes) {
        // Exact canonical match — true idempotent hit.
        return { catalogId, status: 'exists', entry: JSON.parse(existing.proposal) };
      }
      // Distinct canonical payloads under one hash — collision. Salt and retry.
      emitHashCollisionDiagnostic(catalogId, existing.canonical_payload, canonicalBytes);
      salt += 1;
      continue;
    }

    // Slot is free — claim it. The UNIQUE constraint adjudicates parallel saves.
    const entry = { catalogId, timestamp: new Date().toISOString(), ...proposal };
    try {
      insertStmt.run(catalogId, canonicalBytes, JSON.stringify(entry), entry.timestamp);
    } catch (err) {
      if (String(err?.code || '').startsWith('SQLITE_CONSTRAINT')) {
        // Lost a parallel race for this id — re-resolve the same id without
        // advancing the salt; the winner's row is now committed.
        continue;
      }
      throw err;
    }
    return { catalogId, status: 'created', entry };
  }
}
