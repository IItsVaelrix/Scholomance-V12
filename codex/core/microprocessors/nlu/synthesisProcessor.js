/**
 * Verse Synthesis Microprocessor
 * 
 * Offloads linguistic transmutation from the main thread.
 * Standardizes the VerseSynthesis AMP interface.
 */

import { synthesizeVerse } from '../../shared/truesight/compiler/VerseSynthesis.js';
import { PhonemeEngine } from '../../phonology/phoneme.engine.js';
import { WORD_REGEX_GLOBAL } from '../../constants/regex.js';

/**
 * Synthesizes a verse into a structured artifact.
 * 
 * @param {Object} payload - { text, options }
 * @param {Object} _context
 * @returns {Promise<Object>} The synthesis artifact
 */
export async function runSynthesis(payload, _context) {
  const { text, options = {} } = payload;
  
  if (!text) {
    return { ok: false, error: 'MISSING_TEXT' };
  }

  const uniqueWords = [...new Set(String(text).match(WORD_REGEX_GLOBAL) || [])];
  if (typeof PhonemeEngine.primeAuthorityBatch === 'function') {
    await PhonemeEngine.primeAuthorityBatch(uniqueWords);
    if (typeof PhonemeEngine.primeG2PBatch === 'function') {
      await PhonemeEngine.primeG2PBatch(uniqueWords);
    }
  } else if (typeof PhonemeEngine.ensureAuthorityBatch === 'function') {
    await PhonemeEngine.ensureAuthorityBatch(uniqueWords);
  }

  // Execute the pure compiler logic after the canonical PhonemeEngine authority
  // cache has been hydrated. compileVerseToIR remains the single synchronous
  // source of truth; the API only feeds that source before compilation.
  const artifact = synthesizeVerse(text, options);

  return artifact;
}
