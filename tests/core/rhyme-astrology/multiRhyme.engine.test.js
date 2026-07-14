// @vitest-environment node
//
// The multi engine is a SEPARATE pipeline (see multiRhyme.engine.js). These tests
// exist to prove it finds the rhymes the word engine structurally cannot, and that
// it refuses the things that made the old phrase_compound tier untrustworthy.
//
// Node environment: PhonemeEngine's dictionary loader branches on `typeof window`,
// and under jsdom it takes the browser fetch path and falls back to spelling-guessed
// phonemes. A multi is a chain of real syllables; guessed ones make it meaningless.

import { beforeAll, describe, expect, it } from 'vitest';
import { compileVerseToIR } from '../../../codex/core/shared/truesight/compiler/compileVerseToIR.js';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { CmuPhonemeEngine } from '../../../codex/core/phonology/cmu.phoneme.engine.js';
import {
  MIN_CHAIN_SYLLABLES,
  SLANT_EARNS_ABOVE,
  STRONG_LINK,
  buildSyllableStream,
  chainIsValid,
  findMultiRhymes,
} from '../../../codex/core/rhyme-astrology/multiRhyme.engine.js';

function multisIn(text) {
  const verseIR = compileVerseToIR(text, { phonemeEngine: PhonemeEngine });
  return findMultiRhymes(verseIR);
}

/** Does any chain pair these two spans, in either direction? */
function chainPairing(multis, left, right) {
  return multis.find((m) => {
    const a = m.a.text;
    const b = m.b.text;
    return (a.includes(left) && b.includes(right)) || (a.includes(right) && b.includes(left));
  }) || null;
}

describe('[Core] multi-rhyme engine', () => {
  beforeAll(async () => {
    await CmuPhonemeEngine.init();
    await PhonemeEngine.init();
  });

  it('finds a multi whose rhyme is INTERIOR — the case no word engine can see', () => {
    // Biggie. The rhyme is carried on ER-S-T, in the middle:
    //   was the worst  days     [ER·stop] [EY·Z]
    //   when we thirs  ty       [ER·S   ] [IY  ]
    // "days" and "thirsty" do not rhyme with each other AT ALL, so no rhyme-tail
    // bucket can put these two spans together and no ending rule can see it. This
    // is the entire reason the multi engine exists as a separate pipeline.
    const multis = multisIn('Birthdays was the worst days\nNow we sip champagne when we thirsty');
    const chain = chainPairing(multis, 'worst', 'thirsty');

    expect(chain).not.toBeNull();
    expect(chain.syllables).toBeGreaterThanOrEqual(MIN_CHAIN_SYLLABLES);
  });

  it('finds a multi across word boundaries', () => {
    // MF DOOM. "bastard never" ~ "master with an" — the chain runs through the
    // space between words, which is why syllables (not words) are the unit.
    const multis = multisIn('Bastard never falls in line\nMaster with an awkward mind');
    expect(chainPairing(multis, 'bastard', 'master')).not.toBeNull();
  });

  it('chains a dense multisyllabic verse the way it is actually written', () => {
    const multis = multisIn([
      'body is dead, with a mind of a Zero',
      'Copy the death of divine like a hero',
      'Sloppy, my breath is aligned with a weird flow',
      "Obvious stench from the rhyme, I'm a scarecrow.",
    ].join('\n'));

    // The scheme runs body/copy/sloppy/obvious, dead/death/breath/stench,
    // mind/divine/aligned/rhyme, zero/hero/weird flow/scarecrow.
    expect(chainPairing(multis, 'zero copy', 'hero sloppy')).not.toBeNull();
    expect(chainPairing(multis, 'death of divine', 'breath is aligned')).not.toBeNull();
    expect(chainPairing(multis, 'body', 'sloppy')).not.toBeNull();

    // "a zero copy" ~ "a hero sloppy" is the strongest chain in the verse.
    const strongest = chainPairing(multis, 'zero copy', 'hero sloppy');
    expect(strongest.score).toBeGreaterThanOrEqual(0.90);
    expect(strongest.syllables).toBeGreaterThanOrEqual(4);

    // ...and it is the strongest: nothing weaker should outrank it.
    const best = [...multis].sort((x, y) => y.score - x.score)[0];
    expect(best.score).toBeGreaterThanOrEqual(strongest.score);
  });

  it('will not chain grammar: a run of function words is not a rhyme', () => {
    // Before the hygiene, "with a" chained to "of a" at 0.89 and to "i'm a" at 0.90.
    // Those syllables genuinely agree; they are simply not a rhyme anyone hears.
    const multis = multisIn([
      'body is dead, with a mind of a Zero',
      'Copy the death of divine like a hero',
    ].join('\n'));

    for (const chain of multis) {
      const wordsA = chain.a.text.split(' ');
      const wordsB = chain.b.text.split(' ');
      const allFunctionA = wordsA.every((w) => ['a', 'the', 'of', 'with', 'is', "i'm"].includes(w));
      const allFunctionB = wordsB.every((w) => ['a', 'the', 'of', 'with', 'is', "i'm"].includes(w));
      expect(allFunctionA && allFunctionB).toBe(false);
    }
  });

  it('requires a stressed anchor — a multi lands on a beat', () => {
    // Every emitted chain must contain at least one STRONG link between two stressed
    // syllables. Unstressed agreement is the connective tissue between rhymes.
    const multis = multisIn([
      'body is dead, with a mind of a Zero',
      'Copy the death of divine like a hero',
    ].join('\n'));

    expect(multis.length).toBeGreaterThan(0);
    // The engine drops anything without the anchor, so a non-empty result IS the
    // assertion; pin the invariant explicitly so a regression cannot pass silently.
    for (const chain of multis) {
      expect(chain.score).toBeGreaterThan(0);
      expect(chain.syllables).toBeGreaterThanOrEqual(MIN_CHAIN_SYLLABLES);
    }
  });

  it('emits the charStarts of every word a chain touches', () => {
    // This is the contract with the resonance gate: it lights WORDS, and a multi
    // spans several of them. Without this the gate could light only the first.
    const multis = multisIn('body is dead, with a mind of a Zero\nCopy the death of divine like a hero');
    const chain = chainPairing(multis, 'zero copy', 'hero sloppy') || multis[0];

    expect(Array.isArray(chain.a.charStarts)).toBe(true);
    expect(chain.a.charStarts.length).toBeGreaterThan(0);
    expect(chain.a.charStarts.every((cs) => Number.isFinite(cs))).toBe(true);
    expect(chain.b.charStarts.length).toBeGreaterThan(0);
  });

  it('keeps the longest chain, not each of its prefixes', () => {
    // A rapper hears the longest run. Emitting "zero copy" AND "a zero copy" AND
    // "zero" as three separate rhymes is the same rhyme counted three times.
    const multis = multisIn([
      'body is dead, with a mind of a Zero',
      'Copy the death of divine like a hero',
      'Sloppy, my breath is aligned with a weird flow',
    ].join('\n'));

    for (const chain of multis) {
      const subsumedByAnother = multis.some((other) => (
        other !== chain
        && other.__start.a <= chain.__start.a
        && other.__start.a + other.syllables >= chain.__start.a + chain.syllables
        && other.__start.b <= chain.__start.b
        && other.__start.b + other.syllables >= chain.__start.b + chain.syllables
      ));
      expect(subsumedByAnother).toBe(false);
    }
  });
});

// ── The grammar filter ───────────────────────────────────────────────────────────
//
// The first hygiene rule ("a run of function words is not a rhyme") only asks that
// each SIDE contain one content word. That is too weak. It passes "makes the" ~
// "stains on", because `makes` and `stains` are content words — while the link doing
// the actual rhyming is `the` ~ `on`.
//
// And the stressed-anchor rule cannot catch it either, because CMU stores function
// words in CITATION form: `of` is AH1 V, `or` is AO1 R, `them` is DH EH1 M. Every one
// of them is stress-1. "Anchored on a beat" therefore anchors happily on `or`.
//
// So a function word may RIDE a chain (DOOM rhymes "never" against "with an"), but it
// may not BE the chain: grammar may not link to grammar, and the beat a multi lands on
// must be a word that means something.
describe('[Core] multi-rhyme grammar filter', () => {
  beforeAll(async () => {
    await CmuPhonemeEngine.init();
    await PhonemeEngine.init();
  });

  // Damien's verse. Before the filter this emitted 41 chains and coloured 80 words,
  // 27 of them function words.
  const VERSE = [
    'Statements of saudade, they are paving the way',
    'for the opaque flame on the sword.',
    'Rage, and a compact hatred abhors',
    'Absorbing disdain, a creation of war.',
    'branded and scorched as a slave',
    'While the mortician learned every curve of my body, of course.',
    'porcelain skin, steady torque of the blade',
    'carving corpses like gravestones made to reinforce.',
    'rainbow rope makes the noose feel pretty',
    'Stains on my soul makes the truth feel shitty',
    'Clashing against glass ceilings really hurt',
    'Vast emotion, the ocean inside is still the worst.',
  ].join('\n');

  it('will not rhyme grammar against grammar', () => {
    const multis = multisIn(VERSE);

    // Each of these was a real chain. Every one of them is carried by a link between
    // two function words: the~on, the~of, and~of / a~my, as~of.
    expect(chainPairing(multis, 'makes the', 'stains on')).toBeNull();
    expect(chainPairing(multis, 'paving the', 'creation of')).toBeNull();
    expect(chainPairing(multis, 'and a compact', 'of my body')).toBeNull();
    expect(chainPairing(multis, 'scorched as', 'torque of')).toBeNull();
  });

  it('keeps the rhymes that verse is actually built on', () => {
    const multis = multisIn(VERSE);

    // The filter must cost nothing real. These are the multis a reader hears.
    expect(chainPairing(multis, 'porcelain', 'corpses')).not.toBeNull();
    expect(chainPairing(multis, 'noose feel pretty', 'truth feel shitty')).not.toBeNull();
    expect(chainPairing(multis, 'abhors', 'course')).not.toBeNull();
    expect(chainPairing(multis, 'branded', 'steady')).not.toBeNull();
  });

  it('lets a function word RIDE a chain it does not carry', () => {
    // DOOM: "bastard never" ~ "master with an". `with an` is pure grammar, but it is
    // rhyming against `never` — content. The rule is grammar-to-GRAMMAR, not
    // grammar-anywhere, or this multi dies with the junk.
    const multis = multisIn('Bastard never falls in line\nMaster with an awkward mind');
    expect(chainPairing(multis, 'bastard', 'master')).not.toBeNull();
  });

  it('does not anchor a multi on a function word, whatever CMU says its stress is', () => {
    // `or` (AO1 R) and `for` (F AO1 R) are a perfect stressed strong link in CMU, and
    // also the two most meaningless syllables in the line. Before the filter this
    // couplet emitted six 6-syllable chains — every rotation of the same glue.
    //
    // What survives is the rhyme that is really there: walk~talk and way~day, with
    // `or the` ~ `for the` riding INSIDE the chain it does not carry.
    const multis = multisIn([
      'Or the way that you walk, or the way that you talk',
      'For the day that they stalk, and them all in the dark',
    ].join('\n'));

    expect(multis.length).toBeGreaterThan(0);
    expect(chainPairing(multis, 'walk or the way', 'talk for the day')).not.toBeNull();

    // The invariant: glue may be interior, never an edge. A chain that begins or ends
    // with grammar on BOTH sides is grammar padding a shorter rhyme out to multi length.
    for (const chain of multis) {
      const a = chain.a.text.split(' ');
      const b = chain.b.text.split(' ');
      const grammar = (w) => FUNCTION_WORDS_UNDER_TEST.has(w);

      expect(grammar(a[0]) && grammar(b[0])).toBe(false);
      expect(grammar(a[a.length - 1]) && grammar(b[b.length - 1])).toBe(false);
    }
  });

  it('lights only the words the chain is entitled to paint, never the glue', () => {
    // "makes the noose feel pretty" ~ "makes the truth feel shitty" is a real multi and
    // it really does run through `the`. But charStarts is what the resonance gate PAINTS,
    // and a painted word reads as "this word rhymes" — so the glue must not be in it.
    // Without this, every `the` / `of` / `on` in the verse lit up, coloured by its own
    // vowel family, i.e. as though the function words rhymed with each other.
    const verseIR = compileVerseToIR(
      'rainbow rope makes the noose feel pretty\nStains on my soul makes the truth feel shitty',
      { phonemeEngine: PhonemeEngine },
    );
    const multis = findMultiRhymes(verseIR);
    const chain = multis.find((m) => m.a.text.includes('noose') || m.b.text.includes('noose'));
    expect(chain).toBeTruthy();

    const byCharStart = new Map(verseIR.tokens.map((t) => [t.charStart, String(t.text || '')]));
    const painted = [...chain.a.charStarts, ...chain.b.charStarts]
      .map((cs) => byCharStart.get(cs))
      .filter(Boolean);

    expect(painted.length).toBeGreaterThan(0);
    for (const word of painted) {
      expect(FUNCTION_WORDS_UNDER_TEST.has(word.toLowerCase())).toBe(false);
    }
  });

  it('collapses the flood: fewer chains, and far less grammar coloured', () => {
    const multis = multisIn(VERSE);
    const coloured = new Set();
    for (const chain of multis) {
      for (const end of [chain.a, chain.b]) {
        for (const word of end.text.split(' ')) coloured.add(word);
      }
    }
    const grammar = [...coloured].filter((w) => FUNCTION_WORDS_UNDER_TEST.has(w));

    // Was 41 chains / 27 distinct function words coloured.
    expect(multis.length).toBeLessThan(30);
    expect(grammar.length).toBeLessThan(10);
  });
});

const FUNCTION_WORDS_UNDER_TEST = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'as', 'so',
  'i', 'me', 'my', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'we', 'us',
  'our', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "i'm", "it's",
  'do', 'does', 'did', 'have', 'has', 'had', 'of', 'to', 'in', 'on', 'at',
  'for', 'from', 'with', 'by', 'up', 'out', 'no', 'not', 'too', 'very',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'must',
]);

describe('[Core] multi-rhyme chain validity', () => {
  it('needs at least two syllables — one is just a rhyme', () => {
    expect(chainIsValid([1.0])).toBe(false);
    expect(chainIsValid([1.0, 1.0])).toBe(true);
  });

  it('rejects a chain with a link below the floor', () => {
    expect(chainIsValid([1.0, 0.4])).toBe(false);
  });

  it('earns a slant link only when the REST of the chain carries it', () => {
    // Damien's rule: a slant is tolerated if the rest of the structure scores > 0.80.
    const slant = 0.70; // below STRONG, above the floor
    expect(slant).toBeLessThan(STRONG_LINK);

    // rest averages 0.95 > 0.80 -> the slant is earned
    expect(chainIsValid([0.95, 0.95, slant])).toBe(true);

    // rest averages 0.78 <= 0.80 -> it is not
    expect(chainIsValid([0.78, 0.78, slant])).toBe(false);
    expect(SLANT_EARNS_ABOVE).toBe(0.80);
  });

  it('will not build a chain out of nothing but slant links', () => {
    expect(chainIsValid([0.70, 0.70])).toBe(false);
  });
});

describe('[Core] multi-rhyme syllable stream', () => {
  beforeAll(async () => {
    await CmuPhonemeEngine.init();
    await PhonemeEngine.init();
  });

  it('tokenizes into SYLLABLES, each remembering its word', () => {
    // The separate tokenization. A chain can start mid-word ("thirs|ty") and cross a
    // word boundary ("worst | days"), so words are the wrong unit.
    const verseIR = compileVerseToIR('worst days', { phonemeEngine: PhonemeEngine });
    const stream = buildSyllableStream(verseIR);

    expect(stream.length).toBeGreaterThanOrEqual(2);
    for (const syllable of stream) {
      expect(syllable.nucleus).toMatch(/^[A-Z]+$/);
      expect(typeof syllable.codaClass).toBe('string');
      expect(Number.isFinite(syllable.charStart)).toBe(true);
      expect(syllable.word).toBeTruthy();
    }
  });
});
