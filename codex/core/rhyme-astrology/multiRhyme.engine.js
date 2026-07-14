/**
 * Multi-Rhyme Engine — a SEPARATE pipeline for multisyllabic rhymes.
 *
 * WHY THIS IS NOT IN deepRhyme.engine
 * -----------------------------------
 * The word engine models one rhyme per token, anchored at an EDGE: a token's rhyme
 * tail, bucketed by that tail, scored as a pair. Every part of it — the buckets, the
 * tiers, the gate — assumes that shape.
 *
 * A multi does not have that shape. It is a CHAIN of rhyme families running across
 * syllables, and it does not have to touch either edge:
 *
 *     was the worst  days        [ER·stop] [EY·Z]
 *     when we thirs  ty          [ER·S   ] [IY  ]
 *                                  ^^^^^^   ^^^^
 *                                  strong   slant
 *
 * "days" and "thirsty" do not rhyme with each other AT ALL. No tail key can put
 * those two windows in the same bucket; no ending rule can see the rhyme; no
 * single-pair score can express it. The rhyme lives on ER-S-T, in the middle.
 *
 * Attempts to fit this into the word engine all failed the same way: correcting the
 * phrase phonemes invalidated the bucket tuning (pairs stopped being compared),
 * adding an interior bucket blew the payload to 9.76MB, and every emit-gate tweak
 * traded one golden case against another. That is the architecture refusing the
 * model, not a tuning problem.
 *
 * So this runs in PARALLEL. It tokenizes the verse into SYLLABLES (its own
 * tokenization), finds chains, and emits its own connection type. It imports from
 * the phonology layer and touches nothing in deepRhyme.engine — no buckets, no
 * scores, no tiers. The word engine's tests stay pinned exactly where they are.
 *
 * THE MODEL
 * ---------
 *   1. SYLLABLE STREAM  the verse flattened into syllables, each carrying the word
 *                       it came from. Built from the tokens' real CMU phonemes —
 *                       never from a mashed pseudo-word like "NEVERFALLSINLINE".
 *   2. LINK             two syllables rhyme when their nuclei and coda classes
 *                       agree; a weaker vowel match is a SLANT link.
 *   3. CHAIN            >= 2 consecutive syllables at i matching >= 2 consecutive
 *                       syllables at j, link for link. The chain is the unit.
 *   4. EARNED SLANT     a slant link is allowed only when the REST of the chain
 *                       averages above SLANT_EARNS_ABOVE — a multi may be carried
 *                       by a weak syllable, but not by weakness alone.
 */

import { PhonemeEngine } from '../phonology/phoneme.engine.js';
import { PhoneticSimilarity } from '../phonology/phoneticSimilarity.js';
import { codaClassOf } from './resonanceFingerprint.js';

/** A chain must be at least this many syllables to be a multi at all. */
export const MIN_CHAIN_SYLLABLES = 2;

/**
 * Below this, two syllables are not linked in any sense.
 *
 * Set from the weakest link in a real multi rather than picked round: the trailing
 * syllable of Biggie's "worst days" ~ "thirsty" (EY·Z against a bare IY) scores
 * 0.578. That link IS weak — the rhyme is carried by the ER-S-T before it — and the
 * earned-slant rule is what decides whether such a tail is allowed to ride along.
 * The floor only rejects links that are nothing at all.
 */
export const LINK_FLOOR = 0.55;

/** At or above this, a link is STRONG — it carries itself. */
export const STRONG_LINK = 0.90;

/**
 * A slant link is earned only if the REST of the chain averages above this.
 * A multi may lean on a weak syllable; it may not be built out of weak ones.
 */
export const SLANT_EARNS_ABOVE = 0.80;

/** A rhyme is something the ear holds. Beyond this many lines apart, it does not. */
export const MAX_LINE_DISTANCE = 4;

/**
 * A multi is anchored on STRESS. Rap lands a multi on beats, and a chain of purely
 * unstressed syllables is not a rhyme the ear picks out — it is the connective
 * tissue between rhymes. Without this, "with a" chained to "of a" and to "i'm a".
 */
const REQUIRE_STRESSED_ANCHOR = true;

/**
 * ...and it must be carried by at least one word that MEANS something. A chain whose
 * every word on one side is a function word is grammar, not rhyme: "with a" ~ "of a"
 * scores 0.89 and says nothing. This is the same hygiene the word engine applies; it
 * is restated here rather than imported so this pipeline stays free-standing.
 *
 * A function word may RIDE a chain — DOOM rhymes "never" against "with an" — but it
 * may not BE one. See isGrammarLink and hasStressedAnchor for the two rules that
 * enforce the difference.
 */
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'as', 'so',
  'i', 'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'we', 'us',
  'our', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "i'm", "it's",
  'do', 'does', 'did', 'have', 'has', 'had', 'of', 'to', 'in', 'on', 'at',
  'for', 'from', 'with', 'by', 'up', 'out', 'no', 'not', 'too', 'very',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'must',
]);

function isFunctionWord(word) {
  return FUNCTION_WORDS.has(String(word || '').toLowerCase().replace(/[^a-z']/g, ''));
}

/**
 * A GRAMMAR LINK: both syllables come from function words.
 *
 * English glue agrees with itself constantly. "the" against "on" is a real vowel and a
 * real coda class and it means nothing; so is "the" ~ "of", "and" ~ "of", "as" ~ "of".
 * These are the links that let the engine emit "makes the" ~ "stains on" (0.883),
 * "paving the" ~ "creation of" (0.823) and "scorched as" ~ "torque of" (0.866). Each was
 * waved through by the every-side-has-a-content-word rule on the strength of `makes` /
 * `paving` / `scorched`, while the syllable actually doing the rhyming was the glue.
 *
 * Note it takes BOTH sides. A function word rhyming against a CONTENT word is one of the
 * best things in rap — DOOM's "bastard never" ~ "master with an" is exactly that — and a
 * blanket ban on function words in a chain kills it.
 */
export function isGrammarLink(a, b) {
  return Boolean(a?.isFunction && b?.isFunction);
}

/**
 * Glue may be carried; it may not carry.
 *
 * A grammar link is allowed INSIDE a chain, because real multis run straight through the
 * connective tissue and out the other side:
 *
 *     death  of  divine        [EH·th] [grammar] [AY·N]
 *     breath is  aligned       [EH·th] [grammar] [AY·N]
 *
 * `of` ~ `is` is pure grammar, and that couplet is still a real rhyme — the chain is
 * anchored on death~breath and divine~aligned, and the glue merely rides between them.
 * Breaking the chain at the glue destroyed this multi, which is how we know it is wrong.
 *
 * But a chain may not BEGIN or END on grammar. There the glue is not being carried, it
 * is doing the carrying: it is the syllable that pads a one-word rhyme out to the length
 * of a multi. "makes" ~ "stains" is a rhyme; "makes the" ~ "stains on" is that same
 * rhyme wearing a second syllable it did not earn.
 *
 * Because an edge link on both ends must be content, this also guarantees a chain has at
 * least MIN_CHAIN_SYLLABLES content links — grammar can never be what makes a run long
 * enough to count as a multi at all.
 */
function grammarOnlyRides(stream, i, j, links) {
  const last = links.length - 1;
  if (isGrammarLink(stream[i], stream[j])) return false;
  if (isGrammarLink(stream[i + last], stream[j + last])) return false;
  return true;
}

function stripStress(phone) {
  return String(phone).replace(/[0-9]/g, '');
}

/**
 * The verse as a flat stream of syllables, each remembering the word it came from.
 *
 * This is the separate tokenization. The word engine tokenizes into words and reads
 * one rhyme off each; a multi needs the syllables themselves, because its chain can
 * start and end in the middle of a word ("thirs|ty") and span word boundaries
 * ("worst | days").
 */
export function buildSyllableStream(verseIR, phonemeEngine = PhonemeEngine) {
  const tokens = Array.isArray(verseIR?.tokens) ? verseIR.tokens : [];
  const stream = [];

  for (const token of tokens) {
    const phonemes = token?.analysis?.phonemes || token?.phonemes;
    if (!Array.isArray(phonemes) || phonemes.length === 0) continue;

    const syllables = phonemeEngine.analyzeSyllables(phonemes);
    if (!Array.isArray(syllables) || syllables.length === 0) continue;

    for (const syllable of syllables) {
      const nucleus = stripStress(syllable?.vowel || '');
      if (!nucleus) continue;

      const coda = Array.isArray(syllable?.codaPhonemes) ? syllable.codaPhonemes : [];
      const lastCoda = coda.length > 0 ? stripStress(coda[coda.length - 1]) : null;

      stream.push({
        nucleus,
        coda: coda.map(stripStress),
        onset: (Array.isArray(syllable?.onsetPhonemes) ? syllable.onsetPhonemes : []).map(stripStress),
        codaClass: codaClassOf(lastCoda),
        stress: Number(syllable?.stress) || 0,
        // The WORD this syllable belongs to. A chain reports the words it touches,
        // so the caller can highlight them without knowing about syllables.
        word: String(token.text || ''),
        // Carried on the syllable because both grammar rules are applied per LINK, and
        // a link joins syllables, not words.
        isFunction: isFunctionWord(token.text),
        charStart: Number(token.charStart),
        charEnd: Number(token.charEnd),
        lineIndex: Number(token.lineIndex) || 0,
        tokenIndex: stream.length === 0 ? 0 : stream[stream.length - 1].tokenIndex + (
          stream[stream.length - 1].charStart === Number(token.charStart) ? 0 : 1
        ),
      });
    }
  }

  // THE INTERLUDE — the consonants between this nucleus and the next.
  //
  // Syllable boundaries are an artefact of the syllabifier, not of the ear.
  // "thirsty" splits thir·sty, so the S,T that CARRIES the rhyme lands in the next
  // syllable's ONSET, while in "worst" the same S,T is a coda. Comparing codas alone
  // scored worst~thirs at 0.807 and missed Biggie's multi entirely.
  //
  // What a listener actually hears is vowel, consonants, vowel. So each syllable's
  // consonantal signature is its own coda PLUS the following onset — which makes the
  // comparison immune to where the syllabifier chose to put the break, and lets a
  // chain cross a word boundary ("worst | days") exactly as the ear does.
  for (let i = 0; i < stream.length; i += 1) {
    const current = stream[i];
    const next = stream[i + 1];

    // Not across a line break. A line ending stops the sound; the consonants that
    // open the NEXT line are not heard as closing this one. Without this guard the
    // "days" ending line 1 swallowed the N of "Now" opening line 2.
    const continues = next && next.lineIndex === current.lineIndex;
    current.interlude = [...current.coda, ...(continues ? next.onset : [])];

    // The class must come from the INTERLUDE, not the coda, or it contradicts the
    // very thing it is meant to summarise: "thirs" has an empty coda (class 'open')
    // while its interlude is [S,T]. That mismatch is what kept worst~thirs off the
    // strong tier and hid Biggie's multi.
    const last = current.interlude.length > 0
      ? current.interlude[current.interlude.length - 1]
      : null;
    current.interludeClass = codaClassOf(last);
  }

  return stream;
}

/**
 * How strongly two syllables rhyme, in [0, 1].
 *
 * The nucleus carries the rhyme, so its similarity dominates; the coda CLASS (manner
 * + nasality, not the exact phoneme) decides whether the syllables land the same way.
 * Comparing coda classes rather than phonemes is what lets "worst" (ER + S,T) link to
 * the "thirs" of "thirsty" (ER + S).
 */
export function linkScore(a, b) {
  if (!a || !b) return 0;

  const vowel = PhoneticSimilarity.getVowelSimilarity(a.nucleus, b.nucleus);
  if (!Number.isFinite(vowel) || vowel <= 0) return 0;

  // Compare the INTERLUDE (coda + following onset), not the coda, so the score does
  // not depend on where the syllabifier put the break. See buildSyllableStream.
  const interludeA = Array.isArray(a.interlude) ? a.interlude : a.coda;
  const interludeB = Array.isArray(b.interlude) ? b.interlude : b.coda;

  const bothOpen = interludeA.length === 0 && interludeB.length === 0;
  const exact = interludeA.length === interludeB.length
    && interludeA.every((p, i) => p === interludeB[i]);

  let consonants;
  if (exact || bothOpen) {
    consonants = 1;
  } else if (interludeA.length === 0 || interludeB.length === 0) {
    // One lands on a vowel, the other on a consonant. They do not close the same way.
    consonants = 0.35;
  } else {
    // Partial credit, so "worst" (S,T + D) still meets the "thirs" of thirsty (S,T).
    consonants = PhoneticSimilarity.getArraySimilarity(interludeA, interludeB);
    if (!Number.isFinite(consonants)) consonants = 0;
    // Landing the same WAY counts even when the exact phonemes differ (T vs D).
    // Compared on the interlude's class, not the coda's — see buildSyllableStream.
    if (a.interludeClass && a.interludeClass === b.interludeClass) {
      consonants = Math.max(consonants, 0.85);
    }
  }

  return (vowel * 0.65) + (consonants * 0.35);
}

/**
 * Is this run of links a legitimate chain?
 *
 * Every link must clear the floor. A link below STRONG is a SLANT, and a slant is
 * earned only when the REST of the chain averages above SLANT_EARNS_ABOVE — so a
 * multi can be carried by one weak syllable riding strong ones, but a chain of
 * nothing but weak links is not a rhyme.
 */
export function chainIsValid(links) {
  if (!Array.isArray(links) || links.length < MIN_CHAIN_SYLLABLES) return false;
  if (links.some((score) => score < LINK_FLOOR)) return false;

  for (let i = 0; i < links.length; i += 1) {
    if (links[i] >= STRONG_LINK) continue;

    const rest = links.filter((_, index) => index !== i);
    if (rest.length === 0) return false; // a lone slant link is never a multi
    const restMean = rest.reduce((sum, score) => sum + score, 0) / rest.length;
    if (restMean <= SLANT_EARNS_ABOVE) return false;
  }

  return true;
}

function chainScore(links) {
  return links.reduce((sum, score) => sum + score, 0) / links.length;
}

/**
 * Does the chain land on a beat?
 *
 * At least one link must join two STRESSED syllables of two CONTENT words, and be
 * strong. That is the anchor the ear actually hears; everything around it is the tail
 * of the multi. Without the stress rule the engine chained "with a" to "of a" — real
 * vowel agreement between syllables nobody stresses.
 *
 * The content requirement is not redundant with the stress one, because CMU stores
 * function words in CITATION form, where they are all stressed:
 *
 *     or   AO1 R          for  F AO1 R          them  DH EH1 M
 *     of   AH1 V          was  W AH1 Z
 *
 * So `or` ~ `for` is a stressed, strong (0.94), perfectly legitimate-looking anchor for
 * a six-syllable chain — built on the two most meaningless syllables in the line. In
 * running speech nobody stresses `or`; the dictionary simply has no way to say so. The
 * beat a multi lands on must be a word that means something.
 */
function hasStressedAnchor(stream, i, j, links) {
  if (!REQUIRE_STRESSED_ANCHOR) return true;

  for (let k = 0; k < links.length; k += 1) {
    const a = stream[i + k];
    const b = stream[j + k];
    if (!a || !b) return false;
    if (a.isFunction || b.isFunction) continue;
    if (a.stress >= 1 && b.stress >= 1 && links[k] >= STRONG_LINK) return true;
  }
  return false;
}

/**
 * The words a chain LIGHTS — the ones it is entitled to paint.
 *
 * A chain may legitimately contain glue ("makes the noose feel pretty"), because the
 * ear runs straight through it. But `charStarts` is a claim: the gate paints every
 * charStart it is handed, and a painted word reads as "this word rhymes". Handing it
 * `the` makes exactly the assertion grammarOnlyRides just refused to make — and worse,
 * the colour is keyed on the word's own vowel family, so every `the`, `of`, `on` and
 * `are` in the verse lands in one bright group, as if they rhymed with each other.
 * That is what the reader actually complains about when they say the glue is coloured.
 *
 * So: the chain is heard through the glue, and anchored on the content. Only the content
 * is painted. (grammarOnlyRides guarantees both edge links are content words, so this can
 * never empty a side.)
 */
function litWordsOf(stream, start, length) {
  return wordsOf(stream, start, length).filter((w) => !isFunctionWord(w.word));
}

/** The words a run of syllables touches, in document order, deduped. */
function wordsOf(stream, start, length) {
  const seen = new Set();
  const words = [];
  for (let i = start; i < start + length; i += 1) {
    const syllable = stream[i];
    if (!syllable || seen.has(syllable.charStart)) continue;
    seen.add(syllable.charStart);
    words.push({
      word: syllable.word,
      charStart: syllable.charStart,
      charEnd: syllable.charEnd,
      lineIndex: syllable.lineIndex,
    });
  }
  return words;
}

function overlaps(aStart, aLen, bStart, bLen) {
  return aStart < bStart + bLen && bStart < aStart + aLen;
}

/**
 * Every multisyllabic rhyme in the verse.
 *
 * For each pair of starting positions, extend a chain as far as the links hold, keep
 * the LONGEST valid chain for that pair, and drop chains that sit inside a longer one.
 * A rapper hears the longest run, not each of its prefixes.
 */
export function findMultiRhymes(verseIR, options = {}) {
  const phonemeEngine = options.phonemeEngine || PhonemeEngine;
  const maxLineDistance = Number.isFinite(options.maxLineDistance)
    ? options.maxLineDistance
    : MAX_LINE_DISTANCE;

  const stream = buildSyllableStream(verseIR, phonemeEngine);
  const chains = [];

  for (let i = 0; i < stream.length; i += 1) {
    for (let j = i + MIN_CHAIN_SYLLABLES; j < stream.length; j += 1) {
      if (Math.abs(stream[j].lineIndex - stream[i].lineIndex) > maxLineDistance) continue;

      // Extend link by link for as long as the syllables keep rhyming.
      const links = [];
      let length = 0;
      while (
        i + length < stream.length
        && j + length < stream.length
        && !overlaps(i, length + 1, j, length + 1)
      ) {
        const score = linkScore(stream[i + length], stream[j + length]);
        if (score < LINK_FLOOR) break;
        links.push(score);
        length += 1;
      }

      // Trim back to the longest run that is actually valid: a trailing weak link
      // can make an otherwise-good chain fail the earned-slant rule, and a trailing
      // GRAMMAR link is padding that must be trimmed off rather than counted.
      //
      // Only the tail is trimmed here. A chain that BEGINS on grammar is rejected
      // outright — its content is found anyway, as the chain starting at (i+1, j+1),
      // which this same loop reaches on its own.
      let best = null;
      for (let len = links.length; len >= MIN_CHAIN_SYLLABLES; len -= 1) {
        const candidate = links.slice(0, len);
        if (!chainIsValid(candidate)) continue;
        if (!grammarOnlyRides(stream, i, j, candidate)) continue;
        if (!hasStressedAnchor(stream, i, j, candidate)) continue;
        best = candidate;
        break;
      }
      if (!best) continue;

      // The two runs must not be the same words in the same order — that is
      // repetition ("creation of" / "curve of" ends on the same syllable), not rhyme.
      const wordsA = wordsOf(stream, i, best.length);
      const wordsB = wordsOf(stream, j, best.length);
      const textA = wordsA.map((w) => w.word.toLowerCase()).join(' ');
      const textB = wordsB.map((w) => w.word.toLowerCase()).join(' ');
      if (!textA || !textB || textA === textB) continue;

      // Grammar is not rhyme. If one side is nothing but function words, the chain is
      // riding the connective tissue between rhymes rather than the rhyme itself.
      const contentA = wordsA.some((w) => !isFunctionWord(w.word));
      const contentB = wordsB.some((w) => !isFunctionWord(w.word));
      if (!contentA || !contentB) continue;

      // Emit only what a consumer needs. The per-link scores and the syllable
      // indices are diagnostics; keeping them on the wire is what turns a rhyme
      // index into a multi-megabyte payload.
      chains.push({
        type: 'multi',
        syllables: best.length,
        score: Number(chainScore(best).toFixed(3)),
        slantLinks: best.filter((s) => s < STRONG_LINK).length,
        // charStarts are the contract: the gate lights exactly these words. `text` is
        // the whole chain as heard (glue included); charStarts are only the words the
        // chain is entitled to paint. See litWordsOf.
        a: {
          charStarts: litWordsOf(stream, i, best.length).map((w) => w.charStart),
          text: textA,
          lineIndex: wordsA[0]?.lineIndex,
        },
        b: {
          charStarts: litWordsOf(stream, j, best.length).map((w) => w.charStart),
          text: textB,
          lineIndex: wordsB[0]?.lineIndex,
        },
        // Kept off the wire but useful in tests / debugging.
        __start: { a: i, b: j },
      });
    }
  }

  return dropSubsumedChains(chains);
}

/**
 * A chain that sits entirely inside a longer chain of the same pairing is the same
 * rhyme heard shorter. Keep the longest.
 */
function dropSubsumedChains(chains) {
  const sorted = [...chains].sort((x, y) => (y.syllables - x.syllables) || (y.score - x.score));
  const kept = [];

  for (const chain of sorted) {
    const subsumed = kept.some((other) => (
      chain.__start.a >= other.__start.a
      && chain.__start.a + chain.syllables <= other.__start.a + other.syllables
      && chain.__start.b >= other.__start.b
      && chain.__start.b + chain.syllables <= other.__start.b + other.syllables
    ));
    if (!subsumed) kept.push(chain);
  }

  return kept;
}
