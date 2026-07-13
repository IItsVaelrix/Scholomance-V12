import { vectorizeHypothesis, scanSubstrate } from '../immunity/protein-probe.engine.js';
import { verifyInvestigationReport } from '../immunity/cleri-probe/canonical-report.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS,
} from '../pixelbrain/bytecode-error.js';
import { buildQbitPulseNode, normalizeHotspots } from './QbitPulse.js';

export const DEFAULT_QBIT_PROBE_LIMITS = Object.freeze({
  maxFiles: 200,
  maxFileBytes: 64 * 1024,
  maxHotspots: 12,
  maxRuntimeMs: 250,
  minResonance: 0.4,
});

/**
 * Derives QBIT hotspots from a SCHOL-CLERI-PROBE-v2 report.
 *
 * This is the canonical adapter: a hotspot is a place a structural verifier
 * proved something, not a place a vector happened to resonate. A verified
 * finding carries no similarity score, so every hotspot has resonance 1 — it is
 * certainty, not proximity.
 *
 * Duration and cache metadata live here, in the derived view, never in the
 * canonical report.
 */
export function buildQbitHotspotsFromCleriReport(report, options = {}) {
  if (!report || typeof report !== 'object' || report.contract !== 'SCHOL-CLERI-PROBE-v2') {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVALID_FORMAT,
      { message: 'QBIT enrichment requires a SCHOL-CLERI-PROBE-v2 report', contract: report?.contract },
    );
  }

  const validation = verifyInvestigationReport(report);
  if (!validation.valid) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMMUNITY,
      ERROR_CODES.INVARIANT_VIOLATION,
      { message: `QBIT enrichment refused a tampered report: ${validation.reason}` },
    );
  }

  const limits = normalizeProbeLimits(options);

  const hotspots = normalizeHotspots(
    (report.findings || [])
      .filter(finding => finding && finding.verdict === 'VERIFIED')
      .map(finding => ({
        path: finding.span?.path,
        resonance: 1,
        reason: `${finding.pathologyClass} verified by ${finding.verifier?.id}`,
      })),
    { maxHotspots: limits.maxHotspots },
  );

  return {
    hypothesis: report.hypothesis,
    hotspots,
    metadata: stableClone({
      probe: 'cleri-probe',
      source: 'SCHOL-CLERI-PROBE-v2',
      reportId: report.reportId,
      reportBytecode: report.bytecode,
      status: report.status,
      verifiedFindings: (report.findings || []).length,
      coverageComplete: Boolean(report.coverage?.complete),
      maxHotspots: limits.maxHotspots,
    }),
  };
}

/**
 * Legacy similarity path, kept for callers that still inject a probe runner.
 *
 * Its hotspots are nominations, not proof. New callers should derive hotspots
 * from a verified report via buildQbitHotspotsFromCleriReport.
 *
 * @deprecated
 */
export async function buildCleriProbeHotspots(vaccineInput, files = [], options = {}) {
  const limits = normalizeProbeLimits(options);
  const vaccine = normalizeVaccine(vaccineInput);
  const hypothesis = buildProbeHypothesis(vaccine, options);
  const boundedFiles = normalizeProbeFiles(files, limits);
  const probeRunner = options.probeRunner || runProteinProbe;

  if (boundedFiles.length === 0) {
    return {
      hypothesis,
      hotspots: Object.freeze([]),
      metadata: stableClone({
        probe: 'cleri-probe',
        skipped: true,
        reason: 'EMPTY_SUBSTRATE',
        scannedFiles: 0,
        maxFiles: limits.maxFiles,
        maxFileBytes: limits.maxFileBytes,
        minResonance: limits.minResonance,
      }),
    };
  }

  const startedAt = performance.now(); // EXEMPT
  const deadline = limits.maxRuntimeMs > 0 ? startedAt + limits.maxRuntimeMs : startedAt;
  const raw = await runWithRuntimeBudget(() => probeRunner({
    hypothesis,
    files: boundedFiles,
    minResonance: limits.minResonance,
    maxHotspots: limits.maxHotspots,
    deadline,
    vaccine,
  }), limits.maxRuntimeMs);
  const durationMs = roundMs(performance.now() - startedAt); // EXEMPT

  if (raw.timedOut) {
    return {
      hypothesis,
      hotspots: Object.freeze([]),
      metadata: stableClone({
        probe: 'cleri-probe',
        timedOut: true,
        durationMs,
        maxRuntimeMs: limits.maxRuntimeMs,
        scannedFiles: boundedFiles.length,
        minResonance: limits.minResonance,
      }),
    };
  }

  const hotspots = normalizeHotspots(mapProbeHits(raw.value), {
    maxHotspots: limits.maxHotspots,
  });

  return {
    hypothesis,
    hotspots,
    metadata: stableClone({
      probe: 'cleri-probe',
      timedOut: false,
      durationMs,
      scannedFiles: boundedFiles.length,
      maxFiles: limits.maxFiles,
      maxFileBytes: limits.maxFileBytes,
      maxHotspots: limits.maxHotspots,
      minResonance: limits.minResonance,
    }),
  };
}

export async function buildQbitPulseNodeWithCleriProbe(vaccineInput, files = [], options = {}) {
  const enrichment = await buildCleriProbeHotspots(vaccineInput, files, options);
  const pulse = buildQbitPulseNode(vaccineInput, {
    ...options,
    hotspots: enrichment.hotspots,
    maxHotspots: options.maxHotspots ?? DEFAULT_QBIT_PROBE_LIMITS.maxHotspots,
  });

  return stableClone({
    pulse,
    enrichment,
  });
}

export function buildProbeHypothesis(vaccineInput, options = {}) {
  if (options.hypothesis) return String(options.hypothesis).trim();
  const vaccine = normalizeVaccine(vaccineInput);
  const context = vaccine.stableContext || {};
  return [
    vaccine.sourceKind,
    vaccine.semanticSlug,
    vaccine.recoveryKey,
    context.ruleId,
    context.checkId,
    context.errorCodeHex,
    context.errorCode,
    context.code,
    context.cellId,
    context.path || context.sourceFile || context.contextModuleId || context.moduleId,
  ].filter(Boolean).join(' ');
}

/**
 * Default probe runner.
 *
 * `scanSubstrate` is synchronous and CPU-bound, so a raced `setTimeout` cannot
 * interrupt it once it starts. This runner therefore enforces `maxRuntimeMs`
 * itself: it scans file-by-file, checks the wall-clock `deadline` before each
 * file, and yields a macrotask between files so the outer runtime-budget timer
 * can also fire. The budget now bounds the default probe, not just injected
 * async probes.
 */
export async function runProteinProbe({ hypothesis, files, minResonance, maxHotspots, deadline }) {
  const searchProtein = vectorizeHypothesis(hypothesis);
  const hits = [];

  for (const file of files) {
    if (Number.isFinite(deadline) && performance.now() >= deadline) break; // EXEMPT
    for (const hit of scanSubstrate([file], searchProtein, { minResonance })) {
      hits.push(hit);
    }
    await new Promise(resolve => setImmediate(resolve));
  }

  hits.sort((a, b) => b.resonance - a.resonance);
  return Number.isFinite(maxHotspots) ? hits.slice(0, maxHotspots) : hits;
}

function normalizeProbeLimits(options) {
  return {
    maxFiles: normalizePositiveInteger(options.maxFiles, DEFAULT_QBIT_PROBE_LIMITS.maxFiles),
    maxFileBytes: normalizePositiveInteger(options.maxFileBytes, DEFAULT_QBIT_PROBE_LIMITS.maxFileBytes),
    maxHotspots: normalizePositiveInteger(options.maxHotspots, DEFAULT_QBIT_PROBE_LIMITS.maxHotspots),
    maxRuntimeMs: normalizeNonNegativeNumber(options.maxRuntimeMs, DEFAULT_QBIT_PROBE_LIMITS.maxRuntimeMs),
    minResonance: normalizeUnitInterval(options.minResonance ?? DEFAULT_QBIT_PROBE_LIMITS.minResonance),
  };
}

function normalizeProbeFiles(files, limits) {
  if (!Array.isArray(files)) {
    throw new Error('QBIT cleri-probe enrichment requires an explicit files array');
  }

  return files
    .slice(0, limits.maxFiles)
    .map(file => ({
      path: normalizeRequiredString(file?.path, 'file.path'),
      content: String(file?.content || '').slice(0, limits.maxFileBytes),
    }))
    .filter(file => file.content.length > 0);
}

async function runWithRuntimeBudget(fn, maxRuntimeMs) {
  if (!Number.isFinite(maxRuntimeMs) || maxRuntimeMs <= 0) {
    return { timedOut: true, value: null };
  }

  let timeoutId;
  const timeout = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve({ timedOut: true, value: null }), maxRuntimeMs);
  });
  const work = Promise.resolve()
    .then(fn)
    .then(value => ({ timedOut: false, value }));

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProbeHits(raw) {
  const hits = Array.isArray(raw)
    ? raw
    : raw?.heatmap || raw?.results || raw?.hotspots || [];

  return hits.map(hit => ({
    path: hit.path || hit.file_path,
    resonance: hit.resonance ?? hit.score ?? 0,
    reason: hit.reason || hit.preview || 'cleri-probe resonance',
  }));
}

function normalizeVaccine(input) {
  const source = input?.toJSON ? input.toJSON() : input;
  if (!source || typeof source !== 'object') {
    return {
      sourceKind: null,
      semanticSlug: null,
      recoveryKey: null,
      stableContext: {},
    };
  }
  return {
    sourceKind: source.sourceKind || null,
    semanticSlug: source.semanticSlug || null,
    recoveryKey: source.recoveryKey || null,
    stableContext: stableClone(source.stableContext || {}),
  };
}

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return fallback;
  return Math.floor(numeric);
}

function normalizeNonNegativeNumber(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return numeric;
}

function normalizeUnitInterval(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(1, Math.max(0, numeric)).toFixed(6));
}

function normalizeRequiredString(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`QBIT cleri-probe enrichment requires ${fieldName}`);
  }
  return normalized;
}

function roundMs(value) {
  return Number(value.toFixed(3));
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
