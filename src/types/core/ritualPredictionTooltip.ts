export type RitualRole = 'anchor' | 'modifier' | 'trigger' | 'connector' | 'unknown';

export interface RitualPredictionSource {
  filePath?: string;
  languageId?: string;
  line: number;
  column: number;
  contextLine: string;
  surroundingText?: string;
}

export interface RitualPredictionData {
  ritualName: string;
  ritualFamily: string;
  role: RitualRole;
  /** The discrete signal that won the role classification (e.g. "suffix:-ness"). */
  roleSignal?: string;
  /** Runner-up roles with their accumulated evidence weight. */
  roleAlternatives?: RitualRoleAlternative[];
  intent: string;
  semanticAura: string[];
  /** Structured phoneme-engine output (not the flattened aura tags). */
  phonology?: RitualPhonology | null;
  syntacticFunction?: string;
  confidence: number;
  /** Auditable decomposition of the confidence score. */
  confidenceFactors?: RitualConfidenceFactor[];
}

export interface RitualRoleAlternative {
  role: RitualRole;
  score: number;
}

export interface RitualPhonology {
  vowelFamily: string | null;
  syllableCount: number;
  stressPattern: string | null;
  coda: string | null;
  rhymeKey: string | null;
  extendedRhymeKeys: string[];
  syllables: string[];
}

export interface RitualConfidenceFactor {
  label: string;
  delta: number;
}

export interface RitualWhyFactor {
  signal: string;
  detail: string;
  weight: number;
}

export interface RitualResonancePartner {
  word: string;
  /** deepRhyme connection tier: perfect | near | slant | assonance | consonance | identity. */
  type: string;
  score: number;
}

export interface RitualPredictionDetails {
  why: string;
  /** Causal decision trace behind the classification. */
  whyFactors?: RitualWhyFactor[];
  nearbySignals: string[];
  /** Real in-line rhyme connections from the deepRhyme engine. */
  resonancePartners?: RitualResonancePartner[];
  possibleMeanings: string[];
  suggestedActions: string[];
}

export interface RitualPredictionDiagnostics {
  warnings: string[];
  debugTrace?: string[];
}

export interface RitualPrediction {
  word: string;
  normalizedWord: string;
  source: RitualPredictionSource;
  prediction: RitualPredictionData;
  details: RitualPredictionDetails;
  diagnostics?: RitualPredictionDiagnostics;
}

export interface RitualPredictionAnchor {
  x: number;
  y: number;
}
