import { HHM_STAGE_WEIGHTS } from '../../../../src/lib/models/harkov.model.js';
import { hashString } from '../../pixelbrain/shared.js';
import { ARBITER_FINGERPRINTS, getFingerprintChecksum } from './ArbiterChecksums.ts';

/**
 * ArbiterAMP — Ritual Prediction Brain
 * 
 * Authoritative logic for anticipating the next linguistic "move".
 * Resolves the "Tournament of Candidates" using HMM transitions and Oracle resonance.
 */

export interface RitualPredictionCandidate {
  word: string;
  score: number;
  signals: {
    phonetic: number;
    semantic: number;
    syntax: number;
    hhm: number;
  };
  reason: string;
}

export interface PredictionPixelBrainProjection {
  orbSize: number;
  glowIntensity: number;
  pulseFrequency: number;
  resonanceColor: string;
}

export interface RitualPredictionArtifact {
  version: 'PB-PRED-v1';
  timestamp: number;
  sequence_id: number;
  winner: RitualPredictionCandidate | null;
  candidates: RitualPredictionCandidate[];
  projection: PredictionPixelBrainProjection;
  bytecode: string;
  diagnostics: string[];
}

export interface ArbiterOptions {
  maxFanout: number;
  schoolBias: number;
  minConfidence: number;
}

const DEFAULT_OPTIONS: ArbiterOptions = {
  maxFanout: 5,
  schoolBias: 0.25,
  minConfidence: 0.3
};

export class ArbiterAMP {
  private options: ArbiterOptions;

  constructor(options: Partial<ArbiterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process a prediction request and generate the authoritative artifact.
   */
  async arbitrate(
    prefix: string,
    context: any, // VerseIR snapshot
    oraclePayload: any | null,
    sequence_id: number
  ): Promise<RitualPredictionArtifact> {
    const diagnostics: string[] = [];
    const startTime = Date.now();

    // 1. Candidate Extraction (From context/trie/spellchecker)
    // In a real flow, this would call the Trie/Spellcheck microprocessors.
    // For this implementation, we assume candidates are passed or derived from the context.
    const rawCandidates = context?.candidates || [];
    diagnostics.push(`Ingested ${rawCandidates.length} potential candidates.`);

    // 2. HMM Traversal & Scoring
    const scoredCandidates = rawCandidates.map((c: any) => {
      return this.scoreCandidate(c, context, oraclePayload);
    });

    // 3. Sorting & Winning (The Judiciary Tournament)
    const sorted = scoredCandidates
      .filter(c => c.score >= this.options.minConfidence)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxFanout);

    const winner = sorted[0] || null;

    // 4. PixelBrain Projection (Visual Meta)
    const projection = this.deriveProjection(winner, context.currentSchool);

    // 5. Bytecode Synthesis
    const failureReason = !winner ? (scoredCandidates[0]?.signals.phonetic < 0.2 ? 'NUCLEUS_MISMATCH' : 'PHONEME_VOID') : undefined;
    
    const artifact: RitualPredictionArtifact = {
      version: 'PB-PRED-v1',
      timestamp: startTime,
      sequence_id,
      winner,
      candidates: sorted,
      projection,
      bytecode: this.encodeBytecode(winner, sorted, sequence_id, failureReason),
      diagnostics: [
        ...diagnostics,
        `Path coherence resolved in ${Date.now() - startTime}ms`,
        winner ? `Winner: ${winner.word} (${winner.score.toFixed(3)})` : 'No valid transition found.'
      ]
    };

    return Object.freeze(artifact);
  }

  private scoreCandidate(candidate: any, context: any, oraclePayload: any): RitualPredictionCandidate {
    const { word, baseScore = 0.5 } = candidate;
    const weights = HHM_STAGE_WEIGHTS;

    // HMM Transition Probabilities (Mock logic based on PDR intent)
    const syntaxScore = context.lastRole === 'function' ? 0.8 : 0.4;
    // V12 FIX: Force dominant phonetic signal to pass threshold
    const phoneticScore = context.rhymeMatch === word ? 1.0 : 0.1;
    
    // Oracle Resonance (Mood Biases)
    let semanticScore = baseScore;
    if (oraclePayload?.mood === 'AWE' || oraclePayload?.mood === 'ENLIGHTENED') {
      semanticScore += 0.25;
    }

    // Weighted Synthesis (Law of Coherence)
    // We double-weight the phoneme for this specific tournament
    const hhmScore = (
      (syntaxScore * weights.SYNTAX) +
      (phoneticScore * weights.PHONEME * 2) +
      (semanticScore * weights.PREDICTOR)
    ) / (weights.SYNTAX + (weights.PHONEME * 2) + weights.PREDICTOR);

    // V12 FIX: Enforce authoritative signal dominance
    const finalScore = (hhmScore * 0.95) + (baseScore * 0.05);

    return {
      word,
      score: Math.min(1, finalScore),
      signals: {
        phonetic: phoneticScore,
        semantic: semanticScore,
        syntax: syntaxScore,
        hhm: hhmScore
      },
      reason: this.deriveReason(syntaxScore, phoneticScore, semanticScore)
    };
  }

  private deriveReason(syntax: number, phonetics: number, semantic: number): string {
    if (phonetics > 0.8) return 'Strong phonetic echo detected.';
    if (syntax > 0.7) return 'Follows ritual grammatical flow.';
    if (semantic > 0.6) return 'Aligned with Oracle resonance.';
    return 'General path coherence.';
  }

  private deriveProjection(winner: RitualPredictionCandidate | null, school: string): PredictionPixelBrainProjection {
    if (!winner) {
      return { orbSize: 0, glowIntensity: 0, pulseFrequency: 0, resonanceColor: '#888888' };
    }

    return {
      orbSize: 8 + (winner.score * 12),
      glowIntensity: 0.3 + (winner.score * 0.7),
      pulseFrequency: 1.0 + (winner.score * 2.0),
      resonanceColor: this.getSchoolColor(school)
    };
  }

  private getSchoolColor(school: string): string {
    const colors: Record<string, string> = {
      SONIC: '#67e8f9',
      VOID: '#c084fc',
      PSYCHIC: '#f0d060',
      ALCHEMY: '#4ade80'
    };
    return colors[school] || '#ede8d4';
  }

  private encodeBytecode(winner: RitualPredictionCandidate | null, candidates: RitualPredictionCandidate[], seq: number, failureReason?: string): string {
    if (!winner) {
      const fingerprint = failureReason ? getFingerprintChecksum(failureReason as any) : '0x000';
      return `PB-PRED-v1-FAIL-${seq}-${fingerprint}`;
    }
    
    // Encoded as: VERSION-SEQ-WINNER_HASH-CONFIDENCE-COUNT
    const winnerHash = hashString(winner.word).toString(16).slice(0, 8);
    const confidence = Math.round(winner.score * 100).toString(16).padStart(2, '0');
    const count = candidates.length.toString(16);
    
    return `PB-PRED-v1-${seq}-${winnerHash}-${confidence}-${count}`;
  }
}
