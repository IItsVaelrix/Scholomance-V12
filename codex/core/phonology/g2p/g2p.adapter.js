import {
  JUROR_WEIGHTS,
  CANDIDATE_SOURCES,
  POLICY_PASS,
  POLICY_WARN,
  POLICY_REJECT,
  POLICY_ERROR,
  POLICY_OFF,
  MAX_CANDIDATES,
  createDeterministicVerdict,
  createRuntimeDiagnostics,
  computeWeightedScore,
  tallyJuryVotes,
  resolveWinner,
  isValidVote,
  FIDELITY_GRADES,
} from './schemas.js';
import { generateCandidates } from './candidates/index.js';
import { createPhonotacticJuror } from './jurors/phonotactic.juror.js';
import { createSyntacticJuror } from './jurors/syntactic.juror.js';
import { createSemanticJuror } from './jurors/semantic.juror.js';
import { createGraphJuror } from './jurors/graph.juror.js';
import { createHHMJuror } from './jurors/hhm.juror.js';
import { encodeModuleHealth } from '../../diagnostic/BytecodeHealth.js';

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export async function runG2PJury(word, syntaxContext = null, options = {}) {
  const upper = String(word || '').toUpperCase().replace(/[^A-Z]/g, '');

  if (!upper) {
    return offResult(upper, 0, 0);
  }

  if (options.policy === POLICY_OFF) {
    return offResult(upper, 0, 0);
  }

  const startTime = Date.now();
  const beforeMemory = process.memoryUsage?.()?.heapUsed || 0;

  try {
    const cmuEntries = await loadCmuEntries();
    const candidates = generateCandidates(upper, cmuEntries);

    if (candidates.length === 0) {
      return {
        verdict: createDeterministicVerdict({
          ok: false,
          word: upper,
          candidates: [],
          votes: [],
          aggregateScores: {},
          winner: null,
          policy: POLICY_REJECT,
          flags: { fidelityRejected: false, legalityViolated: true, precisionLoss: 0 },
        }),
        diagnostics: finishDiagnostics(startTime, beforeMemory),
      };
    }

    const jurors = createJurors(cmuEntries);
    const votes = [];

    for (const candidate of candidates) {
      for (const juror of jurors) {
        const rawVote = juror.vote(candidate, syntaxContext);
        if (!rawVote || !isValidVote(rawVote)) continue;
        votes.push(normalizeVote(rawVote));
      }
    }

    const aggregateScores = tallyJuryVotes(candidates, votes);
    const winner = resolveWinner(candidates, aggregateScores, votes);

    const fidelityRejected = votes.some((v) => v.fidelityGrade === 'F');
    const hasWinner = winner && Number.isFinite(winner.aggregate);

    const policySelected = fidelityRejected || !hasWinner ? POLICY_REJECT : POLICY_PASS;

    const verdict = createDeterministicVerdict({
      ok: policySelected === POLICY_PASS,
      word: upper,
      candidates,
      votes,
      aggregateScores,
      winner,
      policy: policySelected,
      flags: { fidelityRejected, legalityViolated: false, precisionLoss: 0 },
    });

    return { verdict, diagnostics: finishDiagnostics(startTime, beforeMemory) };
  } catch (error) {
    return {
      verdict: createDeterministicVerdict({
        ok: false,
        word: upper,
        candidates: [],
        votes: [],
        aggregateScores: {},
        winner: null,
        policy: POLICY_ERROR,
        flags: { fidelityRejected: false, legalityViolated: false, precisionLoss: 0 },
      }),
      diagnostics: createRuntimeDiagnostics({
        latencyMs: Date.now() - startTime,
        memoryDeltaBytes: Math.max(0, (process.memoryUsage?.()?.heapUsed || 0) - beforeMemory),
        bytecodeHealth: encodeModuleHealth('g2p-jury', { error: String(error) }),
      }),
    };
  }
}

function offResult(upper, startTime = 0, beforeMemory = 0) {
  const endTime = Date.now();
  const afterMemory = process.memoryUsage?.()?.heapUsed || beforeMemory;
  return {
    verdict: createDeterministicVerdict({
      ok: false,
      word: upper,
      candidates: [],
      votes: [],
      aggregateScores: {},
      winner: null,
      policy: POLICY_OFF,
      flags: { fidelityRejected: false, legalityViolated: false, precisionLoss: 0 },
    }),
    diagnostics: createRuntimeDiagnostics({
      latencyMs: endTime - startTime,
      memoryDeltaBytes: Math.max(0, afterMemory - beforeMemory),
    }),
  };
}

function finishDiagnostics(startTime, beforeMemory) {
  const endTime = Date.now();
  const afterMemory = process.memoryUsage?.()?.heapUsed || beforeMemory;
  return createRuntimeDiagnostics({
    latencyMs: endTime - startTime,
    memoryDeltaBytes: Math.max(0, afterMemory - beforeMemory),
  });
}

async function loadCmuEntries() {
  try {
      const { CmuPhonemeEngine } = await import('../cmu.phoneme.engine.js');
    if (!CmuPhonemeEngine._available) {
      await CmuPhonemeEngine.init();
    }
    if (CmuPhonemeEngine._available && CmuPhonemeEngine._entriesByWord.size > 0) {
      return Array.from(CmuPhonemeEngine._entriesByWord.entries());
    }
  } catch {
    // Ignore and fall through to empty entries.
  }
  return [];
}

function createJurors(cmuEntries) {
  return [
    createPhonotacticJuror(cmuEntries),
    createSyntacticJuror(),
    createSemanticJuror(),
    createGraphJuror(null),
    createHHMJuror(),
  ];
}

function normalizeVote(vote) {
  return {
    candidateKey: String(vote.candidateKey || ''),
    jurorId: String(vote.jurorId),
    tokenWeight: clamp(vote.tokenWeight, 0.05, 1.5),
    confidence: clamp01(vote.confidence),
    stageSignal: clamp(vote.stageSignal, 0.05, 1.6),
    syntaxModifier: clamp(vote.syntaxModifier, 0.2, 2.8),
    rationale: String(vote.rationale || ''),
    fidelityGrade: FIDELITY_GRADES.includes(vote.fidelityGrade) ? vote.fidelityGrade : 'D',
  };
}
