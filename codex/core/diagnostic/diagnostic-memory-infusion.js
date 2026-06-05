import { encodeBytecodeXPVaccineFromError, encodeBytecodeXPVaccineFromHealth } from './BytecodeXPVaccine.js';
import { buildQbitPulseNode } from './QbitPulse.js';
import {
  buildBytecodeXPMemoryEnvelope,
  createBytecodeXPMemorySetPayload,
  persistBytecodeXPMemoryEnvelope,
} from './QbitMemoryPersistence.js';

export const DEFAULT_DIAGNOSTIC_MEMORY_INFUSION = Object.freeze({
  enabled: false,
  dryRun: false,
  maxArtifacts: 32,
  includePassing: false,
  failOnError: false,
  agentId: 'diagnostic-scan',
});

export async function runDiagnosticMemoryInfusion(cellResults, options = {}) {
  const config = normalizeMemoryInfusionOptions(options);
  if (!config.enabled) {
    return null;
  }

  const artifacts = buildDiagnosticMemoryArtifacts(cellResults, config);
  const writes = [];
  const failures = [];

  for (const artifact of artifacts) {
    try {
      const write = config.memoryClient
        ? await persistBytecodeXPMemoryEnvelope(config.memoryClient, artifact.envelope, {
          agentId: config.agentId,
          dryRun: config.dryRun,
        })
        : {
          ok: true,
          dryRun: true,
          payload: createBytecodeXPMemorySetPayload(artifact.envelope, { agentId: config.agentId }),
        };

      writes.push({
        memoryKey: artifact.envelope.memoryKey,
        sourceKind: artifact.vaccine.sourceKind,
        sourceId: artifact.sourceId,
        dryRun: write.dryRun,
        checksum: artifact.envelope.checksum,
        payload: write.payload,
      });
    } catch (error) {
      const failure = {
        sourceId: artifact.sourceId,
        message: error instanceof Error ? error.message : String(error),
      };
      failures.push(failure);
      if (config.failOnError) {
        throw error;
      }
    }
  }

  return Object.freeze({
    enabled: true,
    dryRun: !config.memoryClient || config.dryRun,
    requestedArtifacts: artifacts.length,
    written: writes.length,
    failed: failures.length,
    writes: Object.freeze(writes.map(stableClone)),
    failures: Object.freeze(failures.map(stableClone)),
  });
}

export function buildDiagnosticMemoryArtifacts(cellResults, options = {}) {
  const config = normalizeMemoryInfusionOptions(options);
  const artifacts = [];

  for (const result of cellResults || []) {
    for (const error of result.errors || []) {
      artifacts.push(buildArtifactFromSource(error, 'error'));
      if (artifacts.length >= config.maxArtifacts) return Object.freeze(artifacts);
    }

    if (!config.includePassing) continue;
    for (const health of result.health || []) {
      artifacts.push(buildArtifactFromSource(health, 'health'));
      if (artifacts.length >= config.maxArtifacts) return Object.freeze(artifacts);
    }
  }

  return Object.freeze(artifacts);
}

function buildArtifactFromSource(source, kind) {
  const vaccine = kind === 'error'
    ? encodeBytecodeXPVaccineFromError(source)
    : encodeBytecodeXPVaccineFromHealth(source);
  const pulse = buildQbitPulseNode(vaccine);
  const envelope = buildBytecodeXPMemoryEnvelope({
    vaccine,
    pulse,
    labels: ['diagnostic-scan', kind],
    provenance: {
      source: 'diagnostic-scan',
      phase: 'scan-write',
      createdBy: 'diagnostic-runner',
    },
  });

  return stableClone({
    sourceId: deriveSourceId(source, kind),
    vaccine,
    pulse,
    envelope,
  });
}

function deriveSourceId(source, kind) {
  const json = source?.toJSON ? source.toJSON() : source;
  if (kind === 'error') {
    return [
      json?.context?.ruleId || json?.errorCodeHex || json?.code || json?.bytecode || 'error',
      json?.context?.path || json?.context?.sourceFile || json?.moduleId || 'unknown',
    ].join(':');
  }
  return [
    json?.cellId || 'health',
    json?.checkId || json?.code || 'unknown',
    json?.context?.moduleId || json?.moduleId || json?.context?.path || 'unknown',
  ].join(':');
}

function normalizeMemoryInfusionOptions(options) {
  return {
    enabled: Boolean(options.enabled),
    dryRun: Boolean(options.dryRun),
    maxArtifacts: normalizePositiveInteger(options.maxArtifacts, DEFAULT_DIAGNOSTIC_MEMORY_INFUSION.maxArtifacts),
    includePassing: Boolean(options.includePassing),
    failOnError: Boolean(options.failOnError),
    agentId: options.agentId || DEFAULT_DIAGNOSTIC_MEMORY_INFUSION.agentId,
    memoryClient: options.memoryClient || null,
  };
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return fallback;
  return Math.floor(numeric);
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
