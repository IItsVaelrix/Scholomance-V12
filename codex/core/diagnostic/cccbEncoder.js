import { BytecodeError, ERROR_CODES } from '../pixelbrain/bytecode-error.js';

export const CCCB_VERSION = 'SCHOL-CCCB-v1';
export const CCCB_REQUIRED_FIELDS = Object.freeze([
  'ID',
  'PHASE',
  'TITLE',
  'GLOSSARY',
  'STEPS',
  'CODE_SPEC',
  'PITFALLS',
  'IMPLS',
  'NEXT',
  'MCP_KEYS',
  'TURBO_VEC',
]);

const CCCB_ALLOWED_FIELDS = new Set(CCCB_REQUIRED_FIELDS);
const BLOCK_START = 'CCCB_START';
const BLOCK_END = 'CCCB_END';
const INFUSION_ALLOW = '# INFUSION_ALLOW';
const ID_PATTERN = /^SCHOL-CCCB-v1-(PDR|BUG|PIR|LAW)-(\d{2})-(\d{2})-([A-Z0-9]{4,8})-([0-9a-f]{8})$/;

export function fnv1a32(input) {
  const FNV_OFFSET = 2166136261;
  const FNV_PRIME = 16777619;
  let hash = FNV_OFFSET;
  for (const char of String(input)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function deriveSemanticSlug(title) {
  const slug = String(title || '')
    .replace(/[aeiou]/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 8);

  if (slug.length < 4) {
    throw createCccbError('INVALID_SLUG', { title, slug });
  }

  return slug;
}

export function normalizeCccbOrdinal(value, fieldName) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) {
    throw createCccbError('INVALID_ORDINAL', { fieldName, value });
  }
  return String(number).padStart(2, '0');
}

export function buildCccbId({ domain, phaseId, stepNum, semanticSlug, title }) {
  const normalizedDomain = String(domain || '').toUpperCase();
  if (!['PDR', 'BUG', 'PIR', 'LAW'].includes(normalizedDomain)) {
    throw createCccbError('INVALID_DOMAIN', { domain });
  }

  const phase = normalizeCccbOrdinal(phaseId, 'phaseId');
  const step = normalizeCccbOrdinal(stepNum, 'stepNum');
  const slug = semanticSlug ? String(semanticSlug).toUpperCase() : deriveSemanticSlug(title);
  if (!/^[A-Z0-9]{4,8}$/.test(slug)) {
    throw createCccbError('INVALID_SLUG', { semanticSlug: slug });
  }

  const checksum = fnv1a32(`${normalizedDomain}${phase}${step}${slug}`);
  return `${CCCB_VERSION}-${normalizedDomain}-${phase}-${step}-${slug}-${checksum}`;
}

export function parseCccbId(id) {
  const match = ID_PATTERN.exec(String(id || ''));
  if (!match) {
    throw createCccbError('INVALID_ID', { id });
  }

  const [, domain, phaseId, stepNum, semanticSlug, checksum] = match;
  const expectedChecksum = fnv1a32(`${domain}${phaseId}${stepNum}${semanticSlug}`);
  return {
    id,
    domain,
    phaseId,
    stepNum,
    semanticSlug,
    checksum,
    checksumVerified: checksum === expectedChecksum,
    expectedChecksum,
  };
}

export function serializeCccbBlock(block) {
  const normalized = normalizeBlock(block);
  const lines = [
    INFUSION_ALLOW,
    BLOCK_START,
    ...CCCB_REQUIRED_FIELDS.map(field => `${field.padEnd(12)} ${normalized[field]}`),
    BLOCK_END,
  ];
  return `${lines.join('\n')}\n`;
}

export function parseCccbBlock(serializedBlock) {
  const lines = String(serializedBlock || '')
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.length > 0);

  if (!lines.includes(INFUSION_ALLOW)) {
    throw createCccbError('MISSING_INFUSION_ALLOW', {});
  }

  const startIndex = lines.indexOf(BLOCK_START);
  const endIndex = lines.indexOf(BLOCK_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw createCccbError('INVALID_BLOCK_BOUNDARY', { startIndex, endIndex });
  }

  const block = {};
  for (const line of lines.slice(startIndex + 1, endIndex)) {
    const match = /^([A-Z_]+)\s{2,}(.+)$/.exec(line);
    if (!match) {
      throw createCccbError('INVALID_FIELD_LINE', { line });
    }

    const [, field, value] = match;
    if (!CCCB_ALLOWED_FIELDS.has(field)) {
      throw createCccbError('UNKNOWN_FIELD', { field });
    }
    if (field in block) {
      throw createCccbError('DUPLICATE_FIELD', { field });
    }
    block[field] = value;
  }

  return normalizeBlock(block);
}

export function verifyCccbBlock(blockOrSerialized) {
  try {
    const block = typeof blockOrSerialized === 'string'
      ? parseCccbBlock(blockOrSerialized)
      : normalizeBlock(blockOrSerialized);
    const parsedId = parseCccbId(block.ID);
    const fieldErrors = validateFieldSemantics(block);

    return {
      valid: parsedId.checksumVerified && fieldErrors.length === 0,
      id: block.ID,
      checksumVerified: parsedId.checksumVerified,
      expectedChecksum: parsedId.expectedChecksum,
      checksum: parsedId.checksum,
      errors: fieldErrors,
      block,
    };
  } catch (error) {
    return {
      valid: false,
      id: null,
      checksumVerified: false,
      errors: [toCccbErrorJSON(error)],
    };
  }
}

export function extractCccbBlocks(markdown) {
  const blocks = [];
  const regex = /# INFUSION_ALLOW\s*\nCCCB_START[\s\S]*?CCCB_END/g;
  const matches = String(markdown || '').match(regex) || [];
  for (const match of matches) {
    blocks.push(parseCccbBlock(match));
  }
  return blocks;
}

export function traverseCccbGraph(blocks, entryId) {
  const byId = new Map(blocks.map(block => [block.ID, block]));
  const visited = new Set();
  const path = [];
  let currentId = entryId;

  while (currentId !== 'TERMINAL') {
    if (visited.has(currentId)) {
      throw createCccbError('GRAPH_CYCLE', { currentId, path });
    }
    const block = byId.get(currentId);
    if (!block) {
      throw createCccbError('GRAPH_MISSING_NODE', { currentId, path });
    }
    visited.add(currentId);
    path.push(currentId);
    currentId = block.NEXT;
  }

  return {
    terminal: true,
    steps: path.length,
    path,
  };
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object') {
    throw createCccbError('INVALID_BLOCK', { type: typeof block });
  }

  const unknown = Object.keys(block).filter(field => !CCCB_ALLOWED_FIELDS.has(field));
  if (unknown.length > 0) {
    throw createCccbError('UNKNOWN_FIELD', { field: unknown[0] });
  }

  const missing = CCCB_REQUIRED_FIELDS.filter(field => !block[field]);
  if (missing.length > 0) {
    throw createCccbError('MISSING_REQUIRED_FIELD', { missing });
  }

  const normalized = {};
  for (const field of CCCB_REQUIRED_FIELDS) {
    normalized[field] = String(block[field]).trim();
  }

  const parsedId = parseCccbId(normalized.ID);
  if (!parsedId.checksumVerified) {
    throw createCccbError('CHECKSUM_MISMATCH', {
      id: normalized.ID,
      expectedChecksum: parsedId.expectedChecksum,
      actualChecksum: parsedId.checksum,
    });
  }

  const semanticErrors = validateFieldSemantics(normalized);
  if (semanticErrors.length > 0) {
    throw createCccbError('SEMANTIC_VALIDATION_FAILED', { errors: semanticErrors });
  }

  return Object.freeze(normalized);
}

function validateFieldSemantics(block) {
  const errors = [];

  const glossaryTerms = splitPiped(block.GLOSSARY);
  if (glossaryTerms.length < 3 || glossaryTerms.length > 6 || glossaryTerms.some(term => !term.includes(':'))) {
    errors.push({ field: 'GLOSSARY', reason: 'expected 3-6 TERM:definition entries' });
  }

  const steps = String(block.STEPS).split(/\s+(?=\d+\.)/).filter(Boolean);
  if (steps.length < 3 || steps.length > 8 || steps.some((step, index) => !step.startsWith(`${index + 1}.`))) {
    errors.push({ field: 'STEPS', reason: 'expected 3-8 ordered N.action entries' });
  }

  const pitfalls = splitPiped(block.PITFALLS);
  if (pitfalls.length !== 3 || pitfalls.some((pitfall, index) => !pitfall.startsWith(`P${index + 1}:`))) {
    errors.push({ field: 'PITFALLS', reason: 'expected exactly P1/P2/P3 entries' });
  }

  const impls = splitPiped(block.IMPLS);
  if (impls.length !== 3 || impls.some(impl => !impl.includes('→'))) {
    errors.push({ field: 'IMPLS', reason: 'expected exactly 3 option→summary entries' });
  }

  if (block.NEXT !== 'TERMINAL') {
    try {
      parseCccbId(block.NEXT);
    } catch {
      errors.push({ field: 'NEXT', reason: 'expected TERMINAL or valid CCCB ID' });
    }
  }

  const mcpKeys = block.MCP_KEYS.split(',').map(key => key.trim()).filter(Boolean);
  if (mcpKeys.length !== 2 || !mcpKeys[1].endsWith('_RESULT')) {
    errors.push({ field: 'MCP_KEYS', reason: 'expected input key and _RESULT key' });
  }

  const turboTokens = block.TURBO_VEC.split(/\s+/).filter(Boolean);
  if (turboTokens.length < 6 || turboTokens.length > 12) {
    errors.push({ field: 'TURBO_VEC', reason: 'expected 6-12 semantic tokens' });
  }

  return errors;
}

function splitPiped(value) {
  return String(value).split('|').map(part => part.trim()).filter(Boolean);
}

function createCccbError(reason, context) {
  return new BytecodeError('VALUE', 'WARN', 'IMMUNE', ERROR_CODES.VALUE_INVALID, {
    layer: 'cccb',
    reason,
    ...context,
  });
}

function toCccbErrorJSON(error) {
  if (error?.toJSON) return error.toJSON();
  return { message: error?.message || String(error) };
}
