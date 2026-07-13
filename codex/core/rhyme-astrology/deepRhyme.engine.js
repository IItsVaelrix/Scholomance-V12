/**
 * Deep Rhyme Analysis Engine
 * Provides document-level rhyme analysis including multi-syllable matching,
 * internal rhymes, and rhyme connections.
 */

import { PhonemeEngine } from "../phonology/phoneme.engine.js";
import { RHYME_TYPES, RHYME_SUBTYPES } from "../constants/data/rhymeScheme.patterns.js";
import { normalizeVowelFamily } from "../phonology/vowelFamily.js";
import { WORD_REGEX_GLOBAL } from "../constants/regex.js";
import { compileVerseToIR } from "../shared/truesight/compiler/compileVerseToIR.js";
import { buildResonanceFingerprint, rhymeBucketKeys } from './resonanceFingerprint.js';

/**
 * @typedef {object} WordPosition
 */

/**
 * @typedef {object} RhymeConnection
 */

/**
 * @typedef {object} LineAnalysis
 */

/**
 * @typedef {object} DocumentAnalysis
 */

const RHYME_THRESHOLD = 0.60;
const ASSONANCE_THRESHOLD = 0.45;
const STRESSED_ASSONANCE_SCORE = 0.62;
const MAX_FULL_PAIR_SCAN_OCCURRENCES = 2;
// Cross-line assonance: full pairwise scan for same-vowel buckets up to this
// size; larger buckets fall back to document-adjacent pairs only, bounding the
// pairwise work in vowel-dense text.
const ASSONANCE_BUCKET_FULL_SCAN_MAX = 16;
const TRUESIGHT_RHYME_TYPES = new Set([
  ...Object.values(RHYME_TYPES).map(t => t.id),
  ...Object.values(RHYME_SUBTYPES || {}).map(t => t.id)
]);
const IGNORE_IDENTICAL_WORD_RHYMES = true;
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'than',
  'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'we', 'our', 'ours',
  'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs',
  'it', 'its', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'done',
  'to', 'of', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'as',
  'not', 'no', 'so', 'too', 'very', 'just', 'can', 'could', 'would', 'should',
  'will', 'shall', 'might', 'may', 'must',
]);
const SYNTAX_GATES = Object.freeze({
  ALLOW: 'allow',
  ALLOW_WEAK: 'allow_weak',
  SUPPRESS: 'suppress',
});

function resolveAuthorityMode(options) {
  return options?.authorityMode === 'background' ? 'background' : 'blocking';
}

function createWordRegex() {
  return new RegExp(WORD_REGEX_GLOBAL.source, WORD_REGEX_GLOBAL.flags);
}

/**
 * Deep Rhyme Analysis Engine
 */
export class DeepRhymeEngine {
  constructor(phonemeEngine = PhonemeEngine) {
    this.engine = phonemeEngine;
    this.analysisCache = new Map();
    this.syntaxLayerContext = null;
    this.syntaxGateCounters = null;
    // Authoritative rhyme families pulled from the Scholomance Dictionary API
    // (POST /api/lexicon/lookup-batch returns word → rhyme_family). When a
    // family is present for both ends of a pair, it outranks the local
    // phoneme similarity threshold for `perfect`. Populated via
    // `primeRhymeFamilies(words, dictionaryAPI)` before the analysis runs.
    this.rhymeFamilyCache = new Map();
  }

  /**
   * Set a single word's authoritative rhyme family. Pass `null` to record a
   * confirmed no-family (e.g. dictionary confirmed the word exists but has no
   * recorded rhyme family) so the lookup won't be retried.
   */
  setRhymeFamily(word, family) {
    if (!word) return;
    const key = String(word).trim().toLowerCase();
    if (!key) return;
    this.rhymeFamilyCache.set(key, family || null);
  }

  /**
   * Bulk-set authoritative rhyme families from a `{ word: family }` map.
   * Convenience wrapper around `setRhymeFamily`.
   */
  setRhymeFamilies(map) {
    if (!map || typeof map !== 'object') return;
    for (const [word, family] of Object.entries(map)) {
      this.setRhymeFamily(word, family);
    }
  }

  /**
   * Get the cached authoritative rhyme family for a word, or `null` when the
   * cache has no record. The cache is intentionally untyped so callers can
   * distinguish "never looked up" from "looked up and had no family".
   */
  getRhymeFamily(word) {
    if (!word) return undefined;
    const key = String(word).trim().toLowerCase();
    if (!key) return undefined;
    return this.rhymeFamilyCache.has(key)
      ? this.rhymeFamilyCache.get(key)
      : undefined;
  }

  hasRhymeFamilyLookup(word) {
    if (!word) return false;
    const key = String(word).trim().toLowerCase();
    return this.rhymeFamilyCache.has(key);
  }

  /**
   * Populate the cache by calling `dictionaryAPI.lookupBatch(words)`. The
   * expected return shape is `{ families: { WORD: "FAMILY" } }` (Scholomance
   * Dictionary API). Words that already have a cached entry are skipped to
   * avoid a network round-trip on re-analysis. Failures degrade silently:
   * the engine falls back to its local phoneme scoring.
   *
   * @param {string[]} words — words to look up
   * @param {{ lookupBatch?: (words: string[]) => Promise<{ families?: Record<string,string> }> }} [dictionaryAPI]
   * @returns {Promise<{ requested: number, cached: number, families: number }>}
   */
  async primeRhymeFamilies(words, dictionaryAPI) {
    if (!dictionaryAPI || typeof dictionaryAPI.lookupBatch !== 'function') {
      return { requested: 0, cached: 0, families: 0 };
    }
    const unique = Array.from(new Set(
      (Array.isArray(words) ? words : [])
        .map((w) => String(w || '').trim())
        .filter(Boolean),
    ));
    const missing = unique.filter((w) => !this.rhymeFamilyCache.has(w.toLowerCase()));
    if (missing.length === 0) {
      return { requested: unique.length, cached: unique.length, families: 0 };
    }
    let payload;
    try {
      payload = await dictionaryAPI.lookupBatch(missing);
    } catch (err) {
      return { requested: unique.length, cached: unique.length - missing.length, families: 0, error: err?.message || String(err) };
    }
    const families = (payload && typeof payload === 'object' && payload.families) || {};
    let resolved = 0;
    for (const word of missing) {
      const family = families[word] || families[word.toUpperCase()] || families[word.toLowerCase()] || null;
      this.setRhymeFamily(word, family);
      if (family) resolved += 1;
    }
    return { requested: unique.length, cached: unique.length, families: resolved };
  }

  /**
   * Clear the authoritative rhyme-family cache. Useful between documents or
   * when the dictionary API endpoint rotates.
   */
  clearRhymeFamilies() {
    this.rhymeFamilyCache.clear();
  }

  /**
   * Analyzes an entire document for rhyme patterns.
   * @param {string} text - Full document text.
   * @param {object} [options]
   * @returns {Promise<DocumentAnalysis>} Complete document analysis.
   */
  async analyzeDocument(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return this.emptyDocumentAnalysis();
    }

    const syntaxLayer = options?.syntaxLayer?.enabled ? options.syntaxLayer : null;
    const cacheKey = `${String(options?.mode || 'balanced')}|syntax:${syntaxLayer ? '1' : '0'}|${text}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const allUniqueWords = [...new Set(text.match(createWordRegex()) || [])];
    if (typeof this.engine.ensureAuthorityBatch === 'function') {
      const authorityPromise = typeof this.engine.primeAuthorityBatch === 'function'
        ? this.engine.primeAuthorityBatch(allUniqueWords)
        : this.engine.ensureAuthorityBatch(allUniqueWords);
      if (resolveAuthorityMode(options) === 'blocking') {
        await authorityPromise;
      } else if (authorityPromise?.catch) {
        authorityPromise.catch(() => {});
      }
    }

    this.syntaxLayerContext = syntaxLayer;
    this.syntaxGateCounters = { enabled: Boolean(syntaxLayer), totalCandidates: 0, suppressedPairs: 0, weakenedPairs: 0, keptPairs: 0 };

    const verseIR = compileVerseToIR(text, {
      phonemeEngine: this.engine,
      mode: options?.mode,
    });
    const lines = verseIR.lines.map((lineIR) => this.buildLineAnalysisFromIRLine(lineIR, verseIR.tokens));

    const endRhymeConnections = this.findEndRhymeConnections(lines);
    const internalRhymeConnections = lines.flatMap(l => l.internalRhymes);
    const crossLineAssonanceConnections = this.findCrossLineAssonanceConnections(lines, endRhymeConnections);
    const phraseConnections = await this.findPhraseConnections(verseIR);
    const { rhymeGroups, schemePattern } = this.buildRhymeGroups(lines, endRhymeConnections);
    this.assignGroupLabels(endRhymeConnections, rhymeGroups);

    const allConnections = [...endRhymeConnections, ...internalRhymeConnections, ...crossLineAssonanceConnections, ...phraseConnections];
    const result = {
      lines,
      endRhymeConnections,
      internalRhymeConnections,
      allConnections,
      rhymeGroups,
      schemePattern,
      syntaxSummary: syntaxLayer?.syntaxSummary || null,
      compiler: {
        verseIRVersion: verseIR.version,
        mode: verseIR.metadata?.mode || 'balanced',
        tokenCount: Number(verseIR.metadata?.tokenCount) || verseIR.tokens.length,
        lineCount: Number(verseIR.metadata?.lineCount) || verseIR.lines.length,
        maxWindowSyllables: Number(verseIR.metadata?.maxWindowSyllables) || undefined,
        maxWindowTokenSpan: Number(verseIR.metadata?.maxWindowTokenSpan) || undefined,
        syllableWindowCount: Number(verseIR.metadata?.syllableWindowCount) || verseIR.syllableWindows.length,
        lineBreakStyle: verseIR.metadata?.lineBreakStyle || 'none',
        offsetSemantics: verseIR.metadata?.offsetSemantics || undefined,
        graphemeAware: typeof verseIR.metadata?.graphemeAware === 'boolean' ? verseIR.metadata.graphemeAware : undefined,
        graphemeCount: Number(verseIR.metadata?.graphemeCount) || undefined,
        whitespaceFidelity: Boolean(verseIR.metadata?.whitespaceFidelity),
      },
      statistics: this.computeStatistics(lines, allConnections, this.syntaxGateCounters),
    };

    this.syntaxLayerContext = null;
    this.syntaxGateCounters = null;
    this.analysisCache.set(cacheKey, result);
    return result;
  }

  analyzeLine(lineText, lineIndex, charOffset = 0) {
    const verseIR = compileVerseToIR(lineText, { phonemeEngine: this.engine });
    const lineIR = verseIR.lines[0] || {
      lineIndex: 0,
      text: lineText,
      tokenIds: [],
    };

    const shiftedWords = lineIR.tokenIds.map((tokenId) => {
      const token = verseIR.tokens[tokenId];
      const shiftedCharStart = charOffset + token.charStart;
      return this.createLineWordFromToken(token, lineIndex, shiftedCharStart);
    });

    const internalRhymes = this.findInternalRhymes(shiftedWords);
    const totalSyllables = shiftedWords.reduce((sum, word) => sum + (Number(word?.syllableCount) || 0), 0);
    const stressPattern = shiftedWords
      .map((word) => String(word?.stressPattern || '').trim())
      .filter(Boolean)
      .join(' ');
    const endWord = shiftedWords.length > 0 ? shiftedWords[shiftedWords.length - 1] : null;

    return {
      lineIndex,
      text: lineText,
      words: shiftedWords,
      syllableTotal: totalSyllables,
      stressPattern,
      internalRhymes,
      endRhymeKey: endWord?.rhymeKey || null,
      endWord: endWord?.analysis || null,
    };
  }

  buildLineAnalysisFromIRLine(lineIR, tokens) {
    const words = lineIR.tokenIds.map((tokenId) => this.createLineWordFromToken(tokens[tokenId]));
    const internalRhymes = this.findInternalRhymes(words);
    const totalSyllables = words.reduce((sum, word) => sum + (Number(word?.syllableCount) || 0), 0);
    const stressPattern = words
      .map((word) => String(word?.stressPattern || '').trim())
      .filter(Boolean)
      .join(' ');
    const endWord = words.length > 0 ? words[words.length - 1] : null;

    return {
      lineIndex: lineIR.lineIndex,
      text: lineIR.text,
      words,
      syllableTotal: totalSyllables,
      stressPattern,
      internalRhymes,
      endRhymeKey: endWord?.rhymeKey || null,
      endWord: endWord?.analysis || null,
    };
  }

  createLineWordFromToken(token, overrideLineIndex = token.lineIndex, overrideCharStart = token.charStart) {
    const analysis = token?.analysis || null;
    const charEnd = overrideCharStart + String(token?.text || '').length;

    return {
      word: token.text,
      normalizedWord: String(token.normalizedUpper || token.normalized || '').toUpperCase(),
      vowelFamily: token.primaryStressedVowelFamily || token.terminalVowelFamily || null,
      rhymeKey: analysis?.rhymeKey || token.rhymeTailSignature || null,
      syllableCount: Number(token.syllableCount) || 0,
      stressPattern: String(token.stressPattern || ''),
      lineIndex: overrideLineIndex,
      wordIndex: token.tokenIndexInLine,
      charStart: overrideCharStart,
      charEnd,
      analysis,
      syntaxToken: this.getSyntaxToken(overrideLineIndex, token.tokenIndexInLine, overrideCharStart),
    };
  }

  getSyntaxToken(lineIndex, wordIndex, charStart) {
    const syntaxLayer = this.syntaxLayerContext;
    if (!syntaxLayer) return null;
    const identityKey = `${lineIndex}:${wordIndex}:${charStart}`;
    return syntaxLayer.tokenByIdentity?.get?.(identityKey) || syntaxLayer.tokenByCharStart?.get?.(charStart) || null;
  }

  async findPhraseConnections(verseIR) {
    const phraseNodes = [];
    // Dedup identical windows (same char span) up front. syllableWindows can
    // emit the same multi-token span repeatedly; without this the pairwise scan
    // below is O(dupWindows^2), producing tens of thousands of duplicate
    // phrase_compound connections (≈138k on a 500-word verse) that cost
    // analyzeDeep calls, memory, and downstream vectorization for no new signal.
    const seenWindowSpans = new Set();
    const multiTokenWindows = verseIR.syllableWindows.filter(w => {
      if (w.tokenSpan[0] === w.tokenSpan[1]) return false;
      const spanKey = `${w.charStart}:${w.charEnd}`;
      if (seenWindowSpans.has(spanKey)) return false;
      seenWindowSpans.add(spanKey);
      return true;
    });
    
    const phraseStrings = [...new Set(multiTokenWindows.map(w => 
        verseIR.rawText.substring(w.charStart, w.charEnd).replace(/[^A-Za-z]/g, '').toUpperCase()
    ))];
    
    if (typeof this.engine.primeG2PBatch === 'function' && phraseStrings.length > 0) {
        await this.engine.primeG2PBatch(phraseStrings);
    }
    
    for (const w of multiTokenWindows) {
        const tokenCount = w.tokenSpan[1] - w.tokenSpan[0] + 1;
        if (tokenCount > 4) continue;

        const phraseStr = verseIR.rawText.substring(w.charStart, w.charEnd);
        const cleanStr = phraseStr.replace(/[^A-Za-z]/g, '').toUpperCase();
        if (!cleanStr) continue;

        const analysis = this.engine.analyzeDeep(cleanStr);
        if (!analysis || analysis.syllableCount < 2) continue;

        const firstToken = verseIR.tokens[w.tokenSpan[0]];
        const lastToken = verseIR.tokens[w.tokenSpan[1]];
        if (!firstToken || !lastToken) continue;

        phraseNodes.push({
            word: phraseStr,
            analysis,
            lineIndex: firstToken.lineIndex,
            wordIndex: firstToken.tokenIndexInLine,
            charStart: w.charStart,
            charEnd: w.charEnd,
            tokenSpan: w.tokenSpan,
            syllableLength: analysis.syllableCount
        });
    }

    // Candidates come from the Resonance Fingerprint's rhyme-bearing blocks.
    // The old scan compared every window with every other — 1,335 of the 1,448
    // connections on the 75-word fixture, growing quadratically and OOM-killing
    // the server past ~12,000 chars. Bucketing only changes which pairs we LOOK
    // at; every emitted connection is still scored by scoreMultiSyllableMatch,
    // so no score and no colour can move.
    const connections = [];
    const buckets = new Map();

    for (const node of phraseNodes) {
      node.fingerprint = buildResonanceFingerprint(node.analysis?.phonemes || []);
      // A tailless token gets no fingerprint and therefore no bucket. Do NOT
      // bucket them together — that would collide every unknown token at once.
      if (!node.fingerprint) continue;
      for (const key of rhymeBucketKeys(node.fingerprint)) {
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(node);
      }
    }

    const seenPairs = new Set();

    for (const [, groupNodes] of buckets) {
      if (groupNodes.length < 2) continue;

      for (let i = 0; i < groupNodes.length; i += 1) {
        for (let j = i + 1; j < groupNodes.length; j += 1) {
          const nodeA = groupNodes[i];
          const nodeB = groupNodes[j];

          // A node sits in several bands, so the same pair can surface more than once.
          const spanA = `${nodeA.charStart}:${nodeA.charEnd}`;
          const spanB = `${nodeB.charStart}:${nodeB.charEnd}`;
          const pairKey = spanA < spanB ? `${spanA}|${spanB}` : `${spanB}|${spanA}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          if (nodeA.charEnd > nodeB.charStart && nodeA.charStart < nodeB.charEnd) continue;
          if (nodeA.word.toLowerCase() === nodeB.word.toLowerCase()) continue;

          const match = this.engine.scoreMultiSyllableMatch(nodeA.analysis, nodeB.analysis);
          if (match && match.syllablesMatched >= 2 && match.score >= 0.6) {
            connections.push({
              type: 'phrase_compound',
              subtype: match.type || 'none',
              score: match.score,
              syllablesMatched: match.syllablesMatched,
              phoneticWeight: match.syllablesMatched * match.score,
              wordA: {
                lineIndex: nodeA.lineIndex,
                wordIndex: nodeA.wordIndex,
                charStart: nodeA.charStart,
                charEnd: nodeA.charEnd,
                word: nodeA.word
              },
              wordB: {
                lineIndex: nodeB.lineIndex,
                wordIndex: nodeB.wordIndex,
                charStart: nodeB.charStart,
                charEnd: nodeB.charEnd,
                word: nodeB.word
              },
              groupLabel: null,
              syntax: { gate: 'allow', multiplier: 1, reasons: ['phrase_connection'] }
            });
          }
        }
      }
    }
    return connections;
  }

  findInternalRhymes(words) {
    const connections = [];
    if (words.length < 2) return connections;
    const buckets = this.buildPhoneticBuckets(words);
    const seenPairs = new Set();
    for (const [, groupWords] of buckets) {
      if (groupWords.length < 2) continue;
      this.collectGroupConnections(groupWords, connections, seenPairs);
    }
    return connections;
  }

  findEndRhymeConnections(lines) {
    const connections = [];
    const endWords = [];
    for (let idx = 0; idx < lines.length; idx++) {
      const lastWord = lines[idx].words[lines[idx].words.length - 1];
      if (lastWord?.analysis) endWords.push({ ...lastWord, lineIndex: idx });
    }
    const buckets = this.buildPhoneticBuckets(endWords);
    const seenPairs = new Set();
    for (const [, groupWords] of buckets) {
      if (groupWords.length < 2) continue;
      this.collectGroupConnections(groupWords, connections, seenPairs);
    }
    return connections;
  }

  /**
   * Finds cross-line assonance connections for interior (non-end) words.
   * These are words that share stressed vowel families across different lines
   * but are not at the end of their lines, so they're invisible to
   * findEndRhymeConnections and findInternalRhymes.
   *
   * Only 2+ syllable words are considered as source anchors to avoid noise.
   * Monosyllabic words can be targets if paired with a multisyllabic anchor.
   */
  findCrossLineAssonanceConnections(lines, existingEndConnections = []) {
    const connections = [];

    // Track which charStarts are line-end words so we can skip already-covered pairs.
    const endWordCharStarts = new Set();
    for (const line of lines) {
      const lastWord = line.words[line.words.length - 1];
      if (lastWord) endWordCharStarts.add(lastWord.charStart);
    }

    // Build a set of already-evaluated pair keys from end-rhyme connections.
    const existingPairKeys = new Set();
    for (const conn of existingEndConnections) {
      existingPairKeys.add(this.getPairKey(conn.wordA, conn.wordB));
    }

    // Collect all words from all lines as candidates. Monosyllabic content
    // words now participate as anchors too (not only multisyllabic): a vowel
    // echo between short words is genuine assonance, and the tiered gate
    // renders assonance as a quiet tint, so the old noise-reduction
    // restriction is unnecessary. A per-family bucket cap bounds the work.
    const allWords = [];
    for (const line of lines) {
      for (const word of line.words) {
        if (!word.analysis) continue;
        allWords.push(word);
      }
    }

    if (allWords.length < 2) return connections;

    // Build stressed-vowel family buckets from every analyzed word.
    const stressBuckets = new Map();
    for (const word of allWords) {
      const family = this.getPrimaryStressedVowelFamily(word.analysis);
      if (!family) continue;
      if (!stressBuckets.has(family)) stressBuckets.set(family, []);
      stressBuckets.get(family).push(word);
    }

    const seenPairs = new Set(existingPairKeys);

    for (const [, groupWords] of stressBuckets) {
      if (groupWords.length < 2) continue;
      // Full pairwise scan for normal buckets; for very large same-vowel
      // buckets, fall back to document-adjacent pairs only to bound the work.
      const fullScan = groupWords.length <= ASSONANCE_BUCKET_FULL_SCAN_MAX;
      for (let i = 0; i < groupWords.length; i++) {
        const jEnd = fullScan ? groupWords.length : Math.min(groupWords.length, i + 2);
        for (let j = i + 1; j < jEnd; j++) {
          const wA = groupWords[i], wB = groupWords[j];

          // Skip same-line pairs — already handled by findInternalRhymes.
          if (wA.lineIndex === wB.lineIndex) continue;

          // Skip if BOTH are end-words — already handled by findEndRhymeConnections.
          if (endWordCharStarts.has(wA.charStart) && endWordCharStarts.has(wB.charStart)) continue;

          // Interior cross-line vowel echoes. Only the ones the scorer classes
          // as type:'assonance' (and that clear the gate's assonance floor)
          // tint; near/perfect-scored echoes are not promoted, keeping the
          // assonance palette from over-representing.
          this.pushConnectionIfValid(wA, wB, connections, seenPairs);
        }
      }
    }

    return connections;
  }

  collectGroupConnections(groupWords, out, seenPairs = new Set()) {
    if (!Array.isArray(groupWords) || groupWords.length < 2) return;
    if (groupWords.length <= MAX_FULL_PAIR_SCAN_OCCURRENCES) {
      for (let i = 0; i < groupWords.length; i++) {
        for (let j = i + 1; j < groupWords.length; j++) this.pushConnectionIfValid(groupWords[i], groupWords[j], out, seenPairs);
      }
      return;
    }
    for (let i = 1; i < groupWords.length; i++) this.pushConnectionIfValid(groupWords[i - 1], groupWords[i], out, seenPairs);
  }

  pushConnectionIfValid(wordA, wordB, out, seenPairs = new Set()) {
    if (!wordA?.analysis || !wordB?.analysis) return;
    if (this.shouldSkipLexicalRepetition(wordA, wordB)) return;
    const normA = this.normalizeWord(wordA.word);
    const normB = this.normalizeWord(wordB.word);
    // When no syntax layer is present, filter function-function pairs early.
    // When a syntax layer is active, let the gate decide (it tracks suppressed/weakened counts
    // and grants the both_function_line_end_exception for end-rhyme pairs).
    if (!this.syntaxLayerContext && normA && normB && FUNCTION_WORDS.has(normA) && FUNCTION_WORDS.has(normB)) return;
    const pairKey = this.getPairKey(wordA, wordB);
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    const syntaxGate = this.evaluateSyntaxGate(wordA, wordB);
    if (syntaxGate) {
      this.recordSyntaxGateDecision(syntaxGate);
      if (syntaxGate.gate === SYNTAX_GATES.SUPPRESS) return;
    }
    const connection = this.scoreConnection(wordA, wordB, syntaxGate);
    if (this.isTruesightRhymeConnection(connection)) out.push(connection);
  }

  evaluateSyntaxGate(wordA, wordB) {
    const tokenA = wordA?.syntaxToken || null;
    const tokenB = wordB?.syntaxToken || null;
    if (!tokenA && !tokenB && !this.syntaxLayerContext && !FUNCTION_WORDS.has(this.normalizeWord(wordA?.word)) && !FUNCTION_WORDS.has(this.normalizeWord(wordB?.word))) return { gate: SYNTAX_GATES.ALLOW, multiplier: 1, reasons: ['no_syntax_layer_and_not_function'] };
    const normA = this.normalizeWord(wordA?.word);
    const normB = this.normalizeWord(wordB?.word);
    const aFunction = tokenA?.role === 'function' || (!tokenA && FUNCTION_WORDS.has(normA));
    const bFunction = tokenB?.role === 'function' || (!tokenB && FUNCTION_WORDS.has(normB));
    
    // We can't know line_end precisely without syntax tokens sometimes, but we have lineIndex
    const aLineEnd = tokenA ? tokenA.lineRole === 'line_end' : false;
    const bLineEnd = tokenB ? tokenB.lineRole === 'line_end' : false;
    const hasFunctionNonEnd = (aFunction && !aLineEnd) || (bFunction && !bLineEnd);
    const isInternalPair = wordA?.lineIndex === wordB?.lineIndex;
    const hasLineAnchor = aLineEnd || bLineEnd || !isInternalPair;
    const phoneticAffinity = this.evaluatePhoneticAffinity(wordA?.analysis, wordB?.analysis);
    if (aFunction && bFunction && !aLineEnd && !bLineEnd) return { gate: SYNTAX_GATES.SUPPRESS, multiplier: 0, reasons: ['both_function_non_terminal'] };
    if (aFunction && bFunction && aLineEnd && bLineEnd) return { gate: SYNTAX_GATES.ALLOW_WEAK, multiplier: 0.9, reasons: ['both_function_line_end_exception'] };
    
    // Stem overlap check (same root words like baking/baked)
    if (tokenA?.stem && tokenB?.stem && tokenA.stem === tokenB.stem) {
      return { gate: SYNTAX_GATES.ALLOW_WEAK, multiplier: 0.5, reasons: ['stem_overlap'] };
    }

    if (hasFunctionNonEnd) {
      if (phoneticAffinity.sharedStressedFamily && hasLineAnchor) return { gate: SYNTAX_GATES.ALLOW_WEAK, multiplier: 0.94, reasons: ['contains_function_non_terminal', 'phonetic_affinity_override'] };
      return { gate: SYNTAX_GATES.ALLOW_WEAK, multiplier: 0.88, reasons: ['contains_function_non_terminal'] };
    }
    return { gate: SYNTAX_GATES.ALLOW, multiplier: 1, reasons: ['default_allow'] };
  }

  evaluatePhoneticAffinity(analysisA, analysisB) {
    if (!analysisA || !analysisB) return { sharedRhymeKey: false, sharedTerminalFamily: false, sharedStressedFamily: false };
    const stressedA = this.getPrimaryStressedVowelFamily(analysisA), stressedB = this.getPrimaryStressedVowelFamily(analysisB);
    return { sharedRhymeKey: analysisA.rhymeKey === analysisB.rhymeKey, sharedTerminalFamily: this.getTerminalVowelFamily(analysisA) === this.getTerminalVowelFamily(analysisB), sharedStressedFamily: stressedA === stressedB };
  }

  recordSyntaxGateDecision(syntaxGate) {
    if (!this.syntaxGateCounters?.enabled) return;
    this.syntaxGateCounters.totalCandidates += 1;
    if (syntaxGate?.gate === SYNTAX_GATES.SUPPRESS) this.syntaxGateCounters.suppressedPairs += 1;
    else if (syntaxGate?.gate === SYNTAX_GATES.ALLOW_WEAK) this.syntaxGateCounters.weakenedPairs += 1;
    else this.syntaxGateCounters.keptPairs += 1;
  }

  isTruesightRhymeConnection(connection) {
    if (!connection) return false;
    if (!TRUESIGHT_RHYME_TYPES.has(connection.type)) return false;
    const threshold = connection.type === 'assonance' ? ASSONANCE_THRESHOLD : RHYME_THRESHOLD;
    return Number(connection.score) >= threshold;
  }

  shouldSkipLexicalRepetition(wordA, wordB) {
    if (!IGNORE_IDENTICAL_WORD_RHYMES) return false;
    const normalizedA = this.normalizeWord(wordA?.word), normalizedB = this.normalizeWord(wordB?.word);
    return Boolean(normalizedA && normalizedB && normalizedA === normalizedB);
  }

  normalizeWord(value) { return String(value || '').trim().toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, ''); }

  buildPhoneticBuckets(words) {
    const buckets = new Map();
    const addToBucket = (bucketKey, word) => {
      if (!bucketKey) return;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey).push(word);
    };
    for (const word of words) {
      const analysis = word?.analysis;
      if (!analysis) continue;
      if (analysis.rhymeKey) addToBucket(`rhyme:${analysis.rhymeKey}`, word);
      const terminalVowel = this.getTerminalVowelFamily(analysis);
      if (terminalVowel) addToBucket(`vowel:${terminalVowel}`, word);
      const stressedVowel = this.getPrimaryStressedVowelFamily(analysis);
      if (stressedVowel) addToBucket(`stress:${stressedVowel}`, word);
    }
    return buckets;
  }

  getTerminalVowelFamilyRaw(analysis) {
    if (Array.isArray(analysis?.syllables) && analysis.syllables.length > 0) return analysis.syllables[analysis.syllables.length - 1]?.vowelFamily || null;
    return (typeof analysis?.rhymeKey === 'string' && analysis.rhymeKey.includes('-')) ? analysis.rhymeKey.split('-')[0] || null : null;
  }

  getPrimaryStressedVowelFamilyRaw(analysis) {
    if (!Array.isArray(analysis?.syllables) || analysis.syllables.length === 0) return this.getTerminalVowelFamilyRaw(analysis);
    const stressed = analysis.syllables.find((syl) => Number(syl?.stress) > 0) || analysis.syllables[0];
    return stressed?.vowelFamily || null;
  }

  getTerminalVowelFamily(analysis) {
    return normalizeVowelFamily(this.getTerminalVowelFamilyRaw(analysis));
  }

  getPrimaryStressedVowelFamily(analysis) {
    return normalizeVowelFamily(this.getPrimaryStressedVowelFamilyRaw(analysis));
  }

  calculatePhoneticWeight(analysis) {
    if (!analysis) return 0;
    const syllables = Array.isArray(analysis.syllables) ? analysis.syllables : [];
    const syllableWeight = Math.sqrt(syllables.length || 1);
    const stressWeight = syllables.reduce((acc, syl) => acc + (syl.stress > 0 ? 1.2 : 0.5), 0) / (syllables.length || 1);
    return syllableWeight * stressWeight;
  }

  getPairKey(wordA, wordB) {
    const idA = `${wordA.lineIndex}:${wordA.wordIndex}:${wordA.charStart}`, idB = `${wordB.lineIndex}:${wordB.wordIndex}:${wordB.charStart}`;
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
  }

  scoreStressedAssonance(analysisA, analysisB) {
    const stressedA = this.getPrimaryStressedVowelFamily(analysisA), stressedB = this.getPrimaryStressedVowelFamily(analysisB);
    return (stressedA && stressedB && stressedA === stressedB) ? STRESSED_ASSONANCE_SCORE : 0;
  }

  scoreConnection(wordA, wordB, syntaxGate = null) {
    const analysisA = wordA.analysis, analysisB = wordB.analysis;
    if (!analysisA || !analysisB) return null;
    const normalizedA = this.normalizeWord(wordA.word), normalizedB = this.normalizeWord(wordB.word);
    const isIdentity = normalizedA === normalizedB;
    // Authoritative dictionary family check FIRST. If the Scholomance
    // Dictionary API confirmed both words share a rhyme family, that
    // contract is a stronger `perfect` signal than any local phoneme
    // threshold. The local scorer still runs to compute the score
    // (heuristic for ordering), but the type is forced to perfect.
    const dictionaryFamilyMatch = !isIdentity
      ? this.matchDictionaryFamily(wordA.word, wordB.word)
      : null;
    const multiMatch = this.engine.scoreMultiSyllableMatch(analysisA, analysisB);
    const stressedAssonanceScore = multiMatch.syllablesMatched === 0 ? this.scoreStressedAssonance(analysisA, analysisB) : 0;
    if (!isIdentity && multiMatch.syllablesMatched === 0 && stressedAssonanceScore <= 0 && !dictionaryFamilyMatch) return null;
    let baseScore = Math.max(Number(multiMatch.score) || 0, stressedAssonanceScore);
    if (isIdentity) baseScore = 1.0;
    if (dictionaryFamilyMatch) {
      // Lift the score to PERFECT floor when the dictionary agrees. Words
      // the lexicon considers "same family" are canonically a perfect rhyme
      // even if local phoneme math undervalues the match (e.g. shared
      // rhyme_family with a final consonant swap).
      baseScore = Math.max(baseScore, RHYME_TYPES.PERFECT.minScore);
    }
    const multiplier = Number(syntaxGate?.multiplier);
    const connectionScore = baseScore * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
    const syllablesMatched = multiMatch.syllablesMatched > 0 ? multiMatch.syllablesMatched : (stressedAssonanceScore > 0 ? 1 : 0);
    const weightA = this.calculatePhoneticWeight(analysisA), weightB = this.calculatePhoneticWeight(analysisB);
    let type = 'consonance';
    let subtype = multiMatch.type;
    if (isIdentity) type = 'identity';
    else if (dictionaryFamilyMatch) {
      type = 'perfect';
      subtype = 'dictionary';
    } else if (connectionScore >= RHYME_TYPES.PERFECT.minScore) type = 'perfect';
    else if (connectionScore >= RHYME_TYPES.NEAR.minScore) type = 'near';
    else if (connectionScore >= RHYME_TYPES.SLANT.minScore) type = 'slant';
    else if (connectionScore >= RHYME_TYPES.ASSONANCE.minScore) type = 'assonance';
    return { type, subtype, score: connectionScore, syllablesMatched, phoneticWeight: (weightA + weightB) / 2, wordA: { lineIndex: wordA.lineIndex, wordIndex: wordA.wordIndex, charStart: wordA.charStart, charEnd: wordA.charEnd, word: wordA.word }, wordB: { lineIndex: wordB.lineIndex, wordIndex: wordB.wordIndex, charStart: wordB.charStart, charEnd: wordB.charEnd, word: wordB.word }, groupLabel: null, dictionaryFamily: dictionaryFamilyMatch || undefined, syntax: syntaxGate ? { gate: syntaxGate.gate || SYNTAX_GATES.ALLOW, multiplier: multiplier, reasons: Array.isArray(syntaxGate.reasons) ? syntaxGate.reasons : [] } : undefined };
  }

  /**
   * Look up the cached authoritative rhyme family for both words. Returns the
   * shared family string when both ends have a non-null family and they
   * match, otherwise `null`. Distinguishes "cache miss" (return null,
   * caller should fall back to local scoring) from "cache hit, no family"
   * (also null, but a different fallback story).
   */
  matchDictionaryFamily(wordA, wordB) {
    const a = this.getRhymeFamily(wordA);
    const b = this.getRhymeFamily(wordB);
    if (a === undefined || b === undefined) return null; // at least one was never looked up
    if (!a || !b) return null;
    return a === b ? a : null;
  }

  buildRhymeGroups(lines, connections) {
    const rhymeGroups = new Map(), lineToGroup = new Map();
    let nextGroupIndex = 0;
    for (const conn of connections) {
      const lineA = conn.wordA.lineIndex, lineB = conn.wordB.lineIndex;
      const groupA = lineToGroup.get(lineA), groupB = lineToGroup.get(lineB);
      if (groupA === undefined && groupB === undefined) {
        const label = String.fromCharCode(65 + nextGroupIndex);
        lineToGroup.set(lineA, label); lineToGroup.set(lineB, label); rhymeGroups.set(label, [lineA, lineB]);
        nextGroupIndex++;
      } else if (groupA !== undefined && groupB === undefined) {
        lineToGroup.set(lineB, groupA); rhymeGroups.get(groupA).push(lineB);
      } else if (groupA === undefined && groupB !== undefined) {
        lineToGroup.set(lineA, groupB); rhymeGroups.get(groupB).push(lineA);
      }
    }
    for (let i = 0; i < lines.length; i++) {
      if (!lineToGroup.has(i) && lines[i].endWord) {
        const label = String.fromCharCode(65 + nextGroupIndex);
        lineToGroup.set(i, label); rhymeGroups.set(label, [i]);
        nextGroupIndex++;
      }
    }
    rhymeGroups.forEach((lineIndices) => lineIndices.sort((a, b) => a - b));
    const pattern = lines.map((_, i) => lineToGroup.get(i) || 'X').join('');
    return { rhymeGroups, schemePattern: pattern };
  }

  assignGroupLabels(connections, rhymeGroups) {
    for (const conn of connections) {
      for (const [label, lineIndices] of rhymeGroups) {
        if (lineIndices.includes(conn.wordA.lineIndex)) { conn.groupLabel = label; break; }
      }
    }
  }

  computeStatistics(lines, connections, syntaxGateCounters = null) {
    const stats = { totalLines: lines.length, totalWords: lines.reduce((sum, l) => sum + l.words.length, 0), totalSyllables: lines.reduce((sum, l) => sum + l.syllableTotal, 0), perfectCount: 0, nearCount: 0, slantCount: 0, internalCount: 0, multiSyllableCount: 0, endRhymeCount: 0, syntaxGating: { enabled: Boolean(syntaxGateCounters?.enabled), totalCandidates: Number(syntaxGateCounters?.totalCandidates) || 0, suppressedPairs: Number(syntaxGateCounters?.suppressedPairs) || 0, weakenedPairs: Number(syntaxGateCounters?.weakenedPairs) || 0, keptPairs: Number(syntaxGateCounters?.keptPairs) || 0 } };
    for (const conn of connections) {
      if (conn.type === 'perfect') stats.perfectCount++; else if (conn.type === 'near') stats.nearCount++; else if (conn.type === 'slant') stats.slantCount++;
      if (conn.syllablesMatched >= 2) stats.multiSyllableCount++;
      if (conn.wordA.lineIndex === conn.wordB.lineIndex) stats.internalCount++; else stats.endRhymeCount++;
    }
    return stats;
  }

  emptyDocumentAnalysis() { return { lines: [], endRhymeConnections: [], internalRhymeConnections: [], allConnections: [], rhymeGroups: new Map(), schemePattern: '', syntaxSummary: null, compiler: null, statistics: { totalLines: 0, totalWords: 0, totalSyllables: 0, perfectCount: 0, nearCount: 0, slantCount: 0, internalCount: 0, multiSyllableCount: 0, endRhymeCount: 0, syntaxGating: { enabled: false, totalCandidates: 0, suppressedPairs: 0, weakenedPairs: 0, keptPairs: 0 } } }; }
  clearCache() { this.analysisCache.clear(); }
}

export const deepRhymeEngine = new DeepRhymeEngine();
