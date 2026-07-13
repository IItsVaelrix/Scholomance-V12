/**
 * Cleri Probe investigation runtime.
 *
 * Orchestrates the investigation lifecycle: PLAN, LOAD, INDEX, RETRIEVE,
 * VERIFY, ENRICH, REPORT. Enforces budgets, cancellation, and deterministic
 * identity. Core modules remain pure; filesystem/process authority is injected
 * through adapters.
 */

import { compileInvestigationPlan } from "../../core/immunity/cleri-probe/planner.js";
import {
  buildInvestigationReport,
  checksumInvestigationReport,
  encodeCleriReportIdentity,
  stableStringify
} from "../../core/immunity/cleri-probe/canonical-report.js";
import {
  createCoverage,
  createEvidence,
  createFinding,
  normalizeRepositoryPath
} from "../../core/immunity/cleri-probe/contracts.js";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../../core/pixelbrain/bytecode-error.js";
import { selectVerifiers } from "../../core/immunity/cleri-probe/verifier-registry.js";

// ─── Default runtime policy ──────────────────────────────────────────────────

const DEFAULT_MAX_FILES = Infinity;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_CANDIDATES = 50;
const DEFAULT_MAX_RUNTIME_MS = 30000;

// Default exclusions carried forward from the original CLI walk to avoid
// raising the noise floor with vendored, generated, and non-source trees.
export const ALWAYS_EXCLUDED = Object.freeze([
  "node_modules",
  ".git",
  "dist",
  ".codex",
  "Archive",
  "ARCHIVE REFERENCE DOCS",
  "nlp_chatbot",
  "venv",
  ".venv",
  "__pycache__",
  "site-packages",
  "target",
  "pkg",
  "godot_project",
  "mudlet",
  "OrChat",
  "steamdeck_brain",
  "generated-assets",
  "dict_data",
  "coverage",
  "playwright-report",
  "test-results",
  ".superpowers",
  "scratch",
  "docs",
  "scripts/cleri-probe",
  ".tmp"
]);

export const TEST_EXCLUDED = Object.freeze(["tests", "fixtures"]);

// ─── Internal helpers ────────────────────────────────────────────────────────

function runtimeError(category, severity, code, context) {
  return new BytecodeError(category, severity, MODULE_IDS.IMMUNITY, code, context);
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isSupportedScope(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  const normalized = normalizeRepositoryPath(value);
  if (normalized.startsWith("/") || normalized.startsWith("\\")) return false;
  if (normalized.split("/").some(part => part === "..")) return false;
  return true;
}

function globToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function matchesExclusion(relPath, excludeSet, explicitExcludes) {
  const parts = relPath.split("/");
  for (let i = 0; i < parts.length; i += 1) {
    const segment = parts[i];
    if (excludeSet.has(segment)) return true;
    for (const pattern of explicitExcludes) {
      const prefix = parts.slice(0, i + 1).join("/");
      if (globToRegExp(pattern).test(prefix) || globToRegExp(pattern).test(segment)) {
        return true;
      }
    }
  }

  for (const pattern of explicitExcludes) {
    if (globToRegExp(pattern).test(relPath)) return true;
  }
  return false;
}

function makeCandidateKey(candidate) {
  return stableStringify({
    path: candidate.path,
    factId: candidate.factId,
    pathologyClass: candidate.pathologyClass
  });
}

function buildDefaultExcludes({ includeTests }) {
  const set = new Set(ALWAYS_EXCLUDED);
  if (!includeTests) {
    for (const name of TEST_EXCLUDED) set.add(name);
  }
  return set;
}

function nowMs(clock) {
  return typeof clock === "function" ? clock() : Date.now();
}

function validateBudget(name, value) {
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: `Budget ${name} must be a finite non-negative number`, [name]: value }
    );
  }
}

// ─── Runtime constructor ─────────────────────────────────────────────────────

export function createInvestigationRuntime(dependencies) {
  const {
    substrateService,
    indexRepository,
    parser,
    parserVersion = "1.0.0",
    verifierRegistry,
    retrieval,
    contextService = null,
    clock = () => Date.now(),
    telemetry = null
  } = dependencies;

  if (!substrateService || typeof substrateService.resolveScope !== "function") {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: "substrateService.resolveScope is required" }
    );
  }
  if (!indexRepository || typeof indexRepository.get !== "function") {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: "indexRepository with get/set is required" }
    );
  }
  if (!parser || typeof parser !== "function") {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: "parser function is required" }
    );
  }
  if (!verifierRegistry) {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: "verifierRegistry is required" }
    );
  }
  if (!retrieval || typeof retrieval.retrieveCandidates !== "function") {
    throw runtimeError(
      ERROR_CATEGORIES.VALUE,
      ERROR_SEVERITY.CRIT,
      ERROR_CODES.INVALID_VALUE,
      { message: "retrieval.retrieveCandidates is required" }
    );
  }

  function emitPhase(name) {
    if (telemetry && typeof telemetry.phase === "function") {
      telemetry.phase(name);
    }
  }

  function checkBudget(state, request) {
    if (request.signal && request.signal.aborted) {
      throw runtimeError(
        ERROR_CATEGORIES.STATE,
        ERROR_SEVERITY.CRIT,
        ERROR_CODES.LIFECYCLE_VIOLATION,
        { message: "Investigation cancelled by signal" }
      );
    }
    const elapsed = nowMs(clock) - state.startedAt;
    if (elapsed > request.maxRuntimeMs) {
      throw runtimeError(
        ERROR_CATEGORIES.HOOK,
        ERROR_SEVERITY.CRIT,
        ERROR_CODES.HOOK_TIMEOUT,
        { message: "Investigation exceeded runtime budget", elapsed, budget: request.maxRuntimeMs }
      );
    }
  }

  async function loadSubstrate(request, state) {
    emitPhase("LOAD");
    const scopes = (request.scopes || []).filter(Boolean);
    const validatedScopes = scopes.length ? scopes : ["."];

    for (const scope of validatedScopes) {
      if (!isSupportedScope(scope)) {
        throw runtimeError(
          ERROR_CATEGORIES.VALUE,
          ERROR_SEVERITY.CRIT,
          ERROR_CODES.INVALID_FORMAT,
          { message: "Scope is not a repository-relative path", scope }
        );
      }
    }

    const resolved = await substrateService.resolveScope({ paths: validatedScopes });
    checkBudget(state, request);

    const explicitExcludes = [...(request.excludes || [])];
    const defaultExcludes = buildDefaultExcludes({ includeTests: request.includeTests });

    const files = [];
    const runtimeSkipped = [];

    for (const file of resolved.files) {
      checkBudget(state, request);
      const relPath = normalizeRepositoryPath(file.path);
      if (matchesExclusion(relPath, defaultExcludes, explicitExcludes)) {
        runtimeSkipped.push({ path: relPath, reasonCode: "EXCLUDED" });
        continue;
      }
      if (typeof file.bytes === "number" && file.bytes > request.maxFileBytes) {
        runtimeSkipped.push({ path: relPath, reasonCode: "FILE_TOO_LARGE" });
        continue;
      }
      files.push({ ...file, path: relPath });
    }

    files.sort((a, b) => a.path.localeCompare(b.path));

    let truncated = false;
    const maxFiles = Number.isFinite(request.maxFiles) ? request.maxFiles : DEFAULT_MAX_FILES;
    if (files.length > maxFiles) {
      const kept = files.slice(0, maxFiles);
      for (const file of files.slice(maxFiles)) {
        runtimeSkipped.push({ path: file.path, reasonCode: "BUDGET_LIMIT" });
      }
      files.length = 0;
      files.push(...kept);
      truncated = true;
    }

    const skipped = [
      ...resolved.skipped.map(s => ({ path: normalizeRepositoryPath(s.path), reasonCode: s.reasonCode })),
      ...runtimeSkipped
    ];

    return {
      rootFingerprint: resolved.rootFingerprint,
      requestedPaths: resolved.requestedPaths.map(normalizeRepositoryPath).sort(),
      files,
      skipped,
      truncated
    };
  }

  async function indexFiles(files, substrate, request, state) {
    emitPhase("INDEX");
    const profileVersion = `${state.plan.profileId}@${state.plan.version}`;
    const indexKey = {
      contract: "SCHOL-CLERI-FACTS-v1",
      parserVersion,
      profileVersion,
      repositoryFingerprint: substrate.rootFingerprint
    };

    let payload = null;
    try {
      payload = indexRepository.get(indexKey);
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== "object") {
      payload = {};
    }

    const factsByPath = new Map();
    const analyzedPaths = [];
    const parserFailures = [];

    for (const file of files) {
      checkBudget(state, request);
      const cached = payload[file.contentHash];
      let facts;
      if (cached && cached.ok && cached.contentHash === file.contentHash) {
        facts = cached;
      } else {
        try {
          facts = parser({ path: file.path, content: file.content });
        } catch (error) {
          const diagnostic = error instanceof BytecodeError
            ? error
            : runtimeError(
                ERROR_CATEGORIES.STATE,
                ERROR_SEVERITY.WARN,
                ERROR_CODES.INVARIANT_VIOLATION,
                { message: error.message, path: file.path }
              );
          parserFailures.push({
            path: file.path,
            errorBytecode: diagnostic.bytecode || diagnostic.toString()
          });
          continue;
        }
        if (!facts.ok) {
          const [diagnostic] = facts.diagnostics || [{ code: "PARSE_FAILED", message: "unknown parse failure" }];
          const encoded = runtimeError(
            ERROR_CATEGORIES.STATE,
            ERROR_SEVERITY.WARN,
            ERROR_CODES.INVARIANT_VIOLATION,
            { message: diagnostic.message, path: file.path, code: diagnostic.code }
          );
          parserFailures.push({ path: file.path, errorBytecode: encoded.bytecode });
          continue;
        }
        payload[file.contentHash] = facts;
      }

      analyzedPaths.push(file.path);
      factsByPath.set(file.path, facts);
    }

    if (!request.noCache) {
      try {
        indexRepository.set(indexKey, payload);
      } catch {
        // Cache writes are advisory; failures do not invalidate the investigation.
      }
    }

    return {
      factsByPath,
      analyzedPaths: [...new Set(analyzedPaths)].sort(),
      parserFailures
    };
  }

  function retrieveCandidates(files, plan, request, state) {
    emitPhase("RETRIEVE");
    const limit = Number.isFinite(request.maxCandidates)
      ? Math.max(0, request.maxCandidates)
      : DEFAULT_MAX_CANDIDATES;

    const candidates = [];
    const seen = new Set();

    for (const pathologyClass of plan.pathologyClasses) {
      checkBudget(state, request);
      const classCandidates = retrieval.retrieveCandidates(
        files,
        { hypothesis: request.hypothesis, pathologyClass },
        { limit, includeVector: true }
      );
      for (const candidate of classCandidates) {
        const key = makeCandidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
      }
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pathCmp = a.path.localeCompare(b.path);
      if (pathCmp !== 0) return pathCmp;
      return (a.span?.startLine || 0) - (b.span?.startLine || 0);
    });

    return candidates.slice(0, limit);
  }

  /**
   * Normalizes a verifier result into zero or more finding drafts.
   *
   * A verifier may prove several independent pathologies inside one candidate
   * file (one per call span), so a single VERIFIED result may carry a `findings`
   * array. A bare VERIFIED result is treated as one finding at the candidate span.
   */
  function draftsFromResult(result, candidate) {
    if (!result || result.verdict !== "VERIFIED") return [];

    const drafts = Array.isArray(result.findings) && result.findings.length > 0
      ? result.findings
      : [result];

    return drafts.map(draft => {
      const evidence = Array.isArray(draft.evidence) ? draft.evidence : [];
      const supporting = [
        ...(draft.supportingEvidence || []),
        ...evidence.filter(e => e.kind === "SUPPORTING")
      ];
      const counter = [
        ...(draft.counterEvidenceChecked || []),
        ...evidence.filter(e => e.kind === "COUNTERCHECK")
      ];
      const span = draft.span || candidate.span;

      if (supporting.length === 0) {
        supporting.push(createEvidence({
          kind: "SUPPORTING",
          predicateId: "VERIFIER_REPORTED",
          observed: true,
          span,
          explanation: "Verifier returned VERIFIED without supporting evidence"
        }));
      }
      if (counter.length === 0) {
        counter.push(createEvidence({
          kind: "COUNTERCHECK",
          predicateId: "NO_COUNTERCHECK",
          observed: false,
          span,
          explanation: "No counterchecks were recorded"
        }));
      }

      return { draft, span, supporting, counter };
    });
  }

  function verifyCandidates(candidates, index, plan, request, state) {
    emitPhase("VERIFY");
    const selected = selectVerifiers(verifierRegistry, plan);
    const detectors = new Set(request.detectorIds || []);

    const activeVerifiers = detectors.size
      ? selected.filter(v => detectors.has(v.id))
      : selected;

    if (detectors.size) {
      for (const id of detectors) {
        if (!selected.some(v => v.id === id)) {
          throw runtimeError(
            ERROR_CATEGORIES.VALUE,
            ERROR_SEVERITY.CRIT,
            ERROR_CODES.INVALID_FORMAT,
            { message: "Requested detector is not installed", detectorId: id }
          );
        }
      }
    }

    const findings = [];
    const context = {
      pathologyClass: null,
      repositoryRoot: request.root || ".",
      counterchecks: plan.counterchecks,
      // An operator who passes --include-tests has asked for test paths to be
      // analyzed as product code, which waives the test/documentation countercheck.
      includeTests: Boolean(request.includeTests)
    };

    const seenFindings = new Set();

    for (const candidate of candidates) {
      checkBudget(state, request);
      const classVerifiers = activeVerifiers.filter(v => v.pathologyClass === candidate.pathologyClass);
      // A verifier proves structure, so it reads the file's normalized facts —
      // never the raw source, and never the retrieval score.
      const facts = index.factsByPath.get(candidate.path) || null;

      for (const verifier of classVerifiers) {
        const result = verifier.verify(
          { ...candidate, facts },
          { ...context, pathologyClass: candidate.pathologyClass }
        );

        for (const { draft, span, supporting, counter } of draftsFromResult(result, candidate)) {
          const finding = createFinding({
            verdict: "VERIFIED",
            pathologyClass: candidate.pathologyClass,
            span,
            symbol: draft.symbol ?? candidate.factId,
            summary: draft.summary || result.summary || `${candidate.pathologyClass} at ${candidate.path}`,
            supportingEvidence: supporting,
            counterEvidenceChecked: counter,
            verifier: { id: verifier.id, version: verifier.version },
            lawRefs: draft.lawRefs || result.lawRefs || [],
            raidRefs: draft.raidRefs || result.raidRefs || [],
            verificationSteps: draft.verificationSteps || result.verificationSteps || [],
            remediation: draft.remediation || result.remediation || {
              recommendationId: null,
              summary: "",
              safePattern: "",
              unsafePattern: "",
              verificationSteps: [],
              autoFixAvailable: false
            },
            limitations: draft.limitations || result.limitations || []
          });

          // The same span may be nominated by several candidates; identity is the
          // span, not the nomination that led to it.
          const key = stableStringify({
            pathologyClass: finding.pathologyClass,
            span: finding.span,
            verifier: finding.verifier
          });
          if (seenFindings.has(key)) continue;
          seenFindings.add(key);
          findings.push(finding);
        }
      }
    }

    return findings;
  }

  function buildEnrichedPlan(plan, registry) {
    const selected = selectVerifiers(registry, plan);
    return {
      profileId: plan.profileId,
      version: plan.version,
      supported: plan.supported,
      reasonCode: plan.reasonCode,
      pathologyClasses: plan.pathologyClasses,
      verifierIds: plan.verifierIds,
      selectedVerifiers: selected.map(v => ({
        id: v.id,
        version: v.version,
        pathologyClass: v.pathologyClass
      })),
      counterchecks: plan.counterchecks,
      paths: plan.paths
    };
  }

  /**
   * Adds the Scholomance's existing knowledge to proven findings. Enrichment can
   * only add references; a failed adapter leaves the canonical finding intact and
   * surfaces itself as a diagnostic.
   */
  function enrich(findings) {
    if (!contextService || typeof contextService.enrichFindings !== "function") {
      return { findings, diagnostics: [] };
    }
    try {
      const result = contextService.enrichFindings(findings);
      return {
        findings: result.findings || findings,
        diagnostics: result.diagnostics || []
      };
    } catch (error) {
      const diagnostic = error instanceof BytecodeError
        ? error
        : runtimeError(
            ERROR_CATEGORIES.STATE,
            ERROR_SEVERITY.WARN,
            ERROR_CODES.INVARIANT_VIOLATION,
            { message: `Context enrichment failed: ${error.message}` }
          );
      return { findings, diagnostics: [diagnostic.bytecode] };
    }
  }

  function assembleReport(request, plan, substrate, index, candidates, rawFindings, statusOverride, skipEnrichPhase = false, extraDiagnostics = []) {
    let findings = rawFindings;
    const enrichDiagnostics = [];

    if (!skipEnrichPhase) {
      emitPhase("ENRICH");
      const enriched = enrich(rawFindings);
      findings = enriched.findings;
      enrichDiagnostics.push(...enriched.diagnostics);
    }

    const complete =
      !substrate.truncated &&
      index.parserFailures.length === 0 &&
      substrate.skipped.every(s => s.reasonCode === "EXCLUDED");

    const coverage = createCoverage({
      requestedPaths: substrate.requestedPaths,
      analyzedPaths: index.analyzedPaths,
      skipped: substrate.skipped,
      parserFailures: index.parserFailures,
      complete
    });

    const configuration = {
      profileId: plan.profileId,
      profileVersion: plan.version,
      detectorIds: request.detectorIds || [],
      includeTests: Boolean(request.includeTests),
      includeGenerated: Boolean(request.includeGenerated),
      noCache: Boolean(request.noCache),
      maxFiles: request.maxFiles,
      maxFileBytes: request.maxFileBytes,
      maxCandidates: request.maxCandidates,
      maxRuntimeMs: request.maxRuntimeMs,
      excludes: request.excludes || []
    };

    const diagnostics = [...extraDiagnostics, ...enrichDiagnostics];
    if (plan.reasonCode) {
      diagnostics.push(plan.reasonCode);
    }

    const substrateFiles = substrate.files.map(f => ({
      path: f.path,
      contentHash: f.contentHash
    }));

    let report = buildInvestigationReport({
      hypothesis: request.hypothesis,
      normalizedHypothesis: normalizeText(request.hypothesis),
      scope: substrate.requestedPaths,
      plan: buildEnrichedPlan(plan, verifierRegistry),
      configuration,
      substrateFiles,
      findings,
      coverage,
      diagnostics
    });

    if (statusOverride && report.status !== statusOverride) {
      const amended = { ...report, status: statusOverride };
      amended.checksum = checksumInvestigationReport(amended);
      amended.bytecode = encodeCleriReportIdentity(amended);
      report = Object.freeze(amended);
    }

    emitPhase("REPORT");
    return report;
  }

  async function investigate(request) {
    if (!request || typeof request !== "object") {
      throw runtimeError(
        ERROR_CATEGORIES.VALUE,
        ERROR_SEVERITY.CRIT,
        ERROR_CODES.INVALID_FORMAT,
        { message: "Investigation request must be an object" }
      );
    }

    validateBudget("maxFiles", request.maxFiles);
    validateBudget("maxFileBytes", request.maxFileBytes);
    validateBudget("maxCandidates", request.maxCandidates);
    validateBudget("maxRuntimeMs", request.maxRuntimeMs);

    const normalizedRequest = {
      hypothesis: String(request.hypothesis || ""),
      scopes: Array.isArray(request.scopes) ? request.scopes : [],
      excludes: Array.isArray(request.excludes) ? request.excludes : [],
      profile: request.profile || null,
      detectorIds: Array.isArray(request.detectorIds) ? request.detectorIds : [],
      includeTests: Boolean(request.includeTests),
      includeGenerated: Boolean(request.includeGenerated),
      planOnly: Boolean(request.planOnly),
      noCache: Boolean(request.noCache),
      maxFiles: Number.isFinite(request.maxFiles) ? request.maxFiles : DEFAULT_MAX_FILES,
      maxFileBytes: Number.isFinite(request.maxFileBytes)
        ? request.maxFileBytes
        : DEFAULT_MAX_FILE_BYTES,
      maxCandidates: Number.isFinite(request.maxCandidates)
        ? request.maxCandidates
        : DEFAULT_MAX_CANDIDATES,
      maxRuntimeMs: Number.isFinite(request.maxRuntimeMs)
        ? request.maxRuntimeMs
        : DEFAULT_MAX_RUNTIME_MS,
      signal: request.signal || null
    };

    if (!normalizedRequest.hypothesis) {
      throw runtimeError(
        ERROR_CATEGORIES.VALUE,
        ERROR_SEVERITY.CRIT,
        ERROR_CODES.MISSING_REQUIRED,
        { message: "Investigation hypothesis is required" }
      );
    }

    const startedAt = nowMs(clock);
    const state = { startedAt, plan: null };

    emitPhase("PLAN");
    const plan = compileInvestigationPlan(normalizedRequest.hypothesis, {
      paths: normalizedRequest.scopes
    });
    state.plan = plan;

    if (normalizedRequest.planOnly) {
      return {
        report: null,
        plan,
        status: "INCONCLUSIVE",
        durationMs: nowMs(clock) - startedAt,
        diagnostics: [],
        candidates: []
      };
    }

    if (!plan.supported) {
      const emptySubstrate = {
        rootFingerprint: "sha256:empty",
        requestedPaths: plan.paths,
        files: [],
        skipped: [],
        truncated: false
      };
      const emptyIndex = { factsByPath: new Map(), analyzedPaths: [], parserFailures: [] };
      const report = assembleReport(
        normalizedRequest,
        plan,
        emptySubstrate,
        emptyIndex,
        [],
        [],
        "INCONCLUSIVE",
        true
      );
      return {
        report,
        plan,
        status: "INCONCLUSIVE",
        durationMs: nowMs(clock) - startedAt,
        diagnostics: [plan.reasonCode],
        candidates: []
      };
    }

    try {
      const substrate = await loadSubstrate(normalizedRequest, state);
      state.substrate = substrate;
      const index = await indexFiles(substrate.files, substrate, normalizedRequest, state);
      state.index = index;
      const candidates = retrieveCandidates(substrate.files, plan, normalizedRequest, state);
      state.candidates = candidates;
      const findings = verifyCandidates(candidates, index, plan, normalizedRequest, state);
      const report = assembleReport(
        normalizedRequest,
        plan,
        substrate,
        index,
        candidates,
        findings,
        null
      );

      const status = report.status;
      return {
        report,
        plan,
        status,
        durationMs: nowMs(clock) - startedAt,
        diagnostics: [],
        candidates
      };
    } catch (error) {
      const elapsed = nowMs(clock) - startedAt;
      if (error instanceof BytecodeError && error.errorCode === ERROR_CODES.HOOK_TIMEOUT) {
        // Build a partial report from whatever was gathered before the timeout.
        const substrate = state.substrate || {
          rootFingerprint: "sha256:timeout",
          requestedPaths: plan.paths,
          files: [],
          skipped: [],
          truncated: true
        };
        const index = state.index || { factsByPath: new Map(), analyzedPaths: [], parserFailures: [] };
        const report = assembleReport(
          normalizedRequest,
          plan,
          substrate,
          index,
          [],
          [],
          "PARTIAL",
          false,
          [error.bytecode]
        );
        return {
          report,
          plan,
          status: "PARTIAL",
          durationMs: elapsed,
          diagnostics: [error.bytecode],
          candidates: state.candidates || []
        };
      }
      throw error;
    }
  }

  return { investigate };
}
