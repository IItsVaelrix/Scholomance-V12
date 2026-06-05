import crypto from 'node:crypto';
import { verifyQbitPulseNode } from './QbitPulse.js';

export const BYTECODE_XP_MEMORY_SCHEMA = 'SCHOL-BYTXP-MEM-v1';
export const BYTECODE_XP_MEMORY_ARTIFACT_KIND = 'BYTECODE_XP_MEMORY_INFUSION';
export const BYTECODE_XP_MEMORY_KEY_PREFIX = 'scholomance:bytecode-xp';

export function buildBytecodeXPMemoryEnvelope(input) {
  const vaccine = normalizeVaccine(input?.vaccine);
  const pulse = normalizePulse(input?.pulse || null);
  const enrichment = normalizeEnrichment(input?.enrichment || null);
  const labels = normalizeLabels(input?.labels || []);
  const provenance = normalizeProvenance(input?.provenance || {});
  const stable = {
    schema: BYTECODE_XP_MEMORY_SCHEMA,
    artifactKind: BYTECODE_XP_MEMORY_ARTIFACT_KIND,
    memoryKey: buildBytecodeXPMemoryKey(vaccine),
    vaccine,
    pulse,
    enrichment,
    labels,
    provenance,
  };

  return stableClone({
    ...stable,
    checksum: checksumBytecodeXPMemoryEnvelope(stable),
  });
}

export function buildBytecodeXPMemoryKey(vaccineInput) {
  const vaccine = normalizeVaccine(vaccineInput);
  return `${BYTECODE_XP_MEMORY_KEY_PREFIX}:${vaccine.vaccineId}`;
}

export function checksumBytecodeXPMemoryEnvelope(envelope) {
  const stable = {
    schema: envelope.schema,
    artifactKind: envelope.artifactKind,
    memoryKey: envelope.memoryKey,
    vaccine: normalizeVaccine(envelope.vaccine),
    pulse: normalizePulse(envelope.pulse || null),
    enrichment: normalizeEnrichment(envelope.enrichment || null),
    labels: normalizeLabels(envelope.labels || []),
    provenance: normalizeProvenance(envelope.provenance || {}),
  };

  return sha256Hex(stableJson(stable)).slice(0, 12);
}

export function verifyBytecodeXPMemoryEnvelope(envelope) {
  if (!envelope || envelope.schema !== BYTECODE_XP_MEMORY_SCHEMA || !envelope.checksum) {
    return false;
  }
  return checksumBytecodeXPMemoryEnvelope(envelope) === envelope.checksum;
}

export function createBytecodeXPMemorySetPayload(envelopeInput, options = {}) {
  const envelope = verifyBytecodeXPMemoryEnvelope(envelopeInput)
    ? envelopeInput
    : buildBytecodeXPMemoryEnvelope(envelopeInput);

  return stableClone({
    agent_id: options.agentId ?? null,
    key: envelope.memoryKey,
    value: envelope,
  });
}

export async function persistBytecodeXPMemoryEnvelope(memoryClient, envelopeInput, options = {}) {
  if (!memoryClient || typeof memoryClient.set !== 'function') {
    throw new Error('BytecodeXP memory persistence requires an injected memoryClient.set function');
  }

  const payload = createBytecodeXPMemorySetPayload(envelopeInput, options);
  if (options.dryRun) {
    return stableClone({
      ok: true,
      dryRun: true,
      payload,
    });
  }

  const result = await memoryClient.set(payload);
  return stableClone({
    ok: true,
    dryRun: false,
    payload,
    result: result ?? null,
  });
}

function normalizeVaccine(input) {
  const source = input?.toJSON ? input.toJSON() : input;
  if (!source?.vaccineId || !source?.bytecode || !source?.checksum) {
    throw new Error('BytecodeXP memory envelope requires a vaccine with vaccineId, bytecode, and checksum');
  }

  return stableClone({
    version: normalizeNullableString(source.version),
    bytecode: normalizeRequiredString(source.bytecode, 'vaccine.bytecode'),
    vaccineId: normalizeRequiredString(source.vaccineId, 'vaccine.vaccineId'),
    sourceKind: normalizeNullableString(source.sourceKind),
    sourceBytecode: normalizeNullableString(source.sourceBytecode),
    semanticSlug: normalizeNullableString(source.semanticSlug),
    fingerprint: normalizeNullableString(source.fingerprint),
    recoveryKey: normalizeNullableString(source.recoveryKey),
    stableContext: stableClone(source.stableContext || {}),
    checksum: normalizeRequiredString(source.checksum, 'vaccine.checksum'),
  });
}

function normalizePulse(input) {
  if (!input) return null;
  const source = input?.toJSON ? input.toJSON() : input;
  if (!verifyQbitPulseNode(source)) {
    throw new Error('BytecodeXP memory envelope requires a valid QBIT pulse checksum');
  }

  return stableClone({
    qbitType: normalizeRequiredString(source.qbitType, 'pulse.qbitType'),
    vaccineId: normalizeRequiredString(source.vaccineId, 'pulse.vaccineId'),
    origin: stableClone(source.origin || {}),
    pulseRadius: normalizeUnitInterval(source.pulseRadius),
    collapseConfidence: normalizeUnitInterval(source.collapseConfidence),
    hotspots: stableClone(source.hotspots || []),
    checksum: normalizeRequiredString(source.checksum, 'pulse.checksum'),
  });
}

function normalizeEnrichment(input) {
  if (!input) return null;
  return stableClone({
    hypothesis: normalizeNullableString(input.hypothesis),
    hotspots: stableClone(input.hotspots || []),
    metadata: normalizeStableEnrichmentMetadata(input.metadata || {}),
  });
}

function normalizeStableEnrichmentMetadata(metadata) {
  return pickStableKeys({
    probe: metadata.probe,
    skipped: metadata.skipped,
    reason: metadata.reason,
    timedOut: metadata.timedOut,
    scannedFiles: metadata.scannedFiles,
    maxFiles: metadata.maxFiles,
    maxFileBytes: metadata.maxFileBytes,
    maxHotspots: metadata.maxHotspots,
    maxRuntimeMs: metadata.maxRuntimeMs,
    minResonance: metadata.minResonance,
  });
}

function normalizeLabels(labels) {
  return stableClone([...new Set(labels
    .map(label => normalizeNullableString(label))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)));
}

function normalizeProvenance(provenance) {
  return pickStableKeys({
    source: provenance.source || 'diagnostic',
    pdr: provenance.pdr || 'PDR-2026-06-04-BYTECODE-XP-QBIT-VACCINES',
    phase: provenance.phase || 'phase-5',
    createdBy: provenance.createdBy || 'codex',
  });
}

function pickStableKeys(input) {
  const out = {};
  for (const key of Object.keys(input).sort((a, b) => a.localeCompare(b))) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return stableClone(out);
}

function normalizeUnitInterval(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(1, Math.max(0, numeric)).toFixed(6));
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value, fieldName) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    throw new Error(`BytecodeXP memory envelope requires ${fieldName}`);
  }
  return normalized;
}

function stableClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(stableClone));
  return Object.freeze(Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map(key => [key, stableClone(value[key])]),
  ));
}

function stableJson(value) {
  return JSON.stringify(stableClone(value));
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
