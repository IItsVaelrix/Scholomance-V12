import {
  DEFAULT_BEATS_PER_LINE,
  DEFAULT_BPM,
  FLOW_SPS_WEIGHT,
  FLOW_SYNC_WEIGHT,
  SPS_CEILING,
} from './constants.js';

const VOWEL_PHONEME = /^(?:A[AEHOWY]|E[HRY]|I[HY]|O[HOWY]|U[HW])\d?$/;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function positiveOption(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function lineWords(line) {
  return Array.isArray(line?.words) ? line.words : [];
}

/**
 * v1 recognizes named section prefixes, plus short all-uppercase labels.
 * Title-case lyric lines remain lyrics unless they use a named prefix.
 */
function isSectionHeading(line) {
  const text = String(line?.text ?? '').trim();
  if (/^(verse|chorus|bridge|intro|outro|hook|section)\b/i.test(text)) {
    return true;
  }

  const wordCount = text.split(/\s+/u).filter(Boolean).length;
  return (
    wordCount <= 3
    && /^[A-Z][A-Z0-9 ]{0,24}$/u.test(text)
  );
}

function vowelCount(word) {
  const phonemes = word?.phonetics?.phonemes ?? word?.deepPhonetics?.phonemes ?? [];
  return phonemes.filter((phoneme) => VOWEL_PHONEME.test(String(phoneme))).length;
}

function syllableCount(word) {
  if (Number.isFinite(word?.syllableCount) && word.syllableCount > 0) {
    return Math.floor(word.syllableCount);
  }
  return vowelCount(word);
}

function stressPattern(word, count) {
  const supplied = typeof word?.stressPattern === 'string'
    ? word.stressPattern.replace(/[^012]/gu, '')
    : '';
  if (supplied.length > 0) {
    return Array.from({ length: count }, (_, index) => supplied[index] ?? '0');
  }

  const phonemes = word?.phonetics?.phonemes ?? word?.deepPhonetics?.phonemes ?? [];
  const inferred = phonemes
    .filter((phoneme) => VOWEL_PHONEME.test(String(phoneme)))
    .map((phoneme) => String(phoneme).endsWith('1') ? '1' : '0');
  return Array.from({ length: count }, (_, index) => inferred[index] ?? '0');
}

function lineSyllableProfile(line) {
  const stresses = [];
  let resolvedWords = 0;

  for (const word of lineWords(line)) {
    const count = syllableCount(word);
    if (count <= 0) continue;
    resolvedWords += 1;
    stresses.push(...stressPattern(word, count));
  }

  return {
    syllables: stresses.length,
    primaryStressIndexes: stresses
      .map((stress, index) => stress === '1' ? index : -1)
      .filter((index) => index >= 0),
    resolvedWords,
    wordCount: lineWords(line).length,
  };
}

function stressDisplacement(profiles, beatsPerLine) {
  let displacementSum = 0;
  let primaryStressCount = 0;
  const halfSubdivision = 0.5 / beatsPerLine;

  for (const profile of profiles) {
    if (profile.syllables === 0) continue;
    for (const syllableIndex of profile.primaryStressIndexes) {
      const position = (syllableIndex + 0.5) / profile.syllables;
      const nearestGridPosition = (
        Math.round(position * beatsPerLine) / beatsPerLine
      );
      const distance = Math.abs(position - nearestGridPosition);
      displacementSum += clamp01(distance / halfSubdivision);
      primaryStressCount += 1;
    }
  }

  return primaryStressCount === 0
    ? 0
    : clamp01(displacementSum / primaryStressCount);
}

function hasIrregularLineStructure(profiles) {
  if (profiles.length < 2) return false;
  const counts = profiles.map((profile) => profile.syllables);
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  if (mean === 0) return false;
  const variance = counts.reduce(
    (sum, count) => sum + ((count - mean) ** 2),
    0,
  ) / counts.length;
  return Math.sqrt(variance) / mean > 0.35;
}

/**
 * Computes the text-only flow estimate. Aligned flow is intentionally deferred
 * until the complete alignment eligibility path is available.
 *
 * @param {import('./types.js').AnalyzedDocument} doc
 * @param {{ bpm?: number, beatsPerLine?: number, alignment?: unknown, beatGrid?: unknown }} [options]
 * @returns {import('./types.js').SongStatPillar}
 */
export function computeFlowAlignment(doc, options = {}) {
  const bpm = positiveOption(options.bpm, DEFAULT_BPM);
  const beatsPerLine = positiveOption(options.beatsPerLine, DEFAULT_BEATS_PER_LINE);
  const lyricLines = (doc.lines ?? []).filter((line) => (
    String(line?.text ?? '').trim().length > 0 && !isSectionHeading(line)
  ));
  const profiles = lyricLines.map(lineSyllableProfile);
  const bars = lyricLines.length;
  const estimatedDurationSec = bars * beatsPerLine * 60 / bpm;
  const totalSyllables = profiles.reduce(
    (sum, profile) => sum + profile.syllables,
    0,
  );
  const totalWords = profiles.reduce((sum, profile) => sum + profile.wordCount, 0);
  const resolvedWords = profiles.reduce(
    (sum, profile) => sum + profile.resolvedWords,
    0,
  );
  const sps = estimatedDurationSec > 0
    ? totalSyllables / estimatedDurationSec
    : 0;
  const stressDisplacementProxy = stressDisplacement(profiles, beatsPerLine);
  const diagnostics = [{
    code: 'estimated_one_bar_per_line',
    message: 'Estimated flow assumes one bar for each nonempty lyric source line.',
    severity: 'info',
  }];

  if (bars < 2) {
    diagnostics.push({
      code: 'estimated_flow_low_confidence',
      message: 'Estimated flow is low confidence with fewer than two lyric bars.',
      severity: 'warning',
    });
  }
  if (hasIrregularLineStructure(profiles)) {
    diagnostics.push({
      code: 'line_structure_irregular',
      message: 'Lyric-line syllable counts vary enough to weaken the one-bar-per-line estimate.',
      severity: 'info',
    });
  }

  return {
    id: 'flow_alignment',
    value: sps,
    unit: 'sps',
    secondary: {
      stressDisplacementProxy,
      estimatedDurationSec,
    },
    normalized01: (
      FLOW_SPS_WEIGHT * clamp01(sps / SPS_CEILING)
      + FLOW_SYNC_WEIGHT * stressDisplacementProxy
    ),
    fidelity: 'estimated',
    confidence01: bars < 2 ? 0.4 : 0.7,
    coverage01: totalWords > 0 ? resolvedWords / totalWords : 0,
    diagnostics,
  };
}
