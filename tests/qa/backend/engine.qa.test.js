/**
 * @file This file implements a Quality Assurance (QA) test for the phoneme analysis engine.
 * It calculates the Phoneme Error Rate (PER) to quantitatively measure the accuracy of
 * the grapheme-to-phoneme conversion.
 */

import { PhonemeEngine } from "../../../codex/core/phonology/phoneme.engine.js";
import { ScholomanceDictionaryAPI } from "../../../src/lib/scholomanceDictionary.api.js";
import { describe, test, expect, beforeAll, vi } from "vitest";

/**
 * Mock authoritative dictionary data for the expanded set.
 */
const AUTHORITATIVE_FAMILIES = {
  SCHOLOMANCE: "OW",
  VAELRIX: "EH",
  THAUMATURGY: "ER",
  OBSIDIAN: "IH",
  GOLEM: "OW",
  VOID: "OY",
  SIGIL: "IH",
  PIXELBRAIN: "EY",
  GRIMOIRE: "WA",
  ELIXIR: "IH",
};

ScholomanceDictionaryAPI.lookupBatch = vi.fn().mockImplementation(async (words) => {
  const results = {};
  words.forEach((word) => {
    const upper = word.toUpperCase();
    if (AUTHORITATIVE_FAMILIES[upper]) {
        results[upper] = AUTHORITATIVE_FAMILIES[upper];
    }
  });
  return results;
});

/**
 * THE GOLDEN SET (EXPANDED)
 * Minimum: 100 words, 500+ phonemes.
 * Includes: Stress markers, rare words, proper nouns, slang, poetic edge cases.
 */
const goldenSet = {
  // --- CORE & SMOKE ---
  phoneme: ["F", "OW1", "N", "IY2", "M"],
  error: ["EH1", "R", "ER0"],
  rate: ["R", "EY1", "T"],
  alliteration: ["AH0", "L", "IH2", "T", "ER0", "EY1", "SH", "AH0", "N"],
  
  // --- SCHOLOMANCE LORE (Proper Nouns & Thematic) ---
  scholomance: ["S", "K", "OW1", "L", "AH0", "M", "AE2", "N", "S"],
  vaelrix: ["V", "EY1", "L", "R", "IH0", "K", "S"],
  thaumaturgy: ["TH", "AO1", "M", "AH0", "T", "ER2", "JH", "IY0"],
  obsidian: ["AH0", "B", "S", "IH1", "D", "IY0", "AH0", "N"],
  golem: ["G", "OW1", "L", "AH0", "M"],
  void: ["V", "OY1", "D"],
  sigil: ["S", "IH1", "JH", "AH0", "L"],
  pixelbrain: ["P", "IH1", "K", "S", "AH0", "L", "B", "R", "EY1", "N"],
  grimoire: ["G", "R", "IH0", "M", "W", "AA1", "R"],
  elixir: ["IH0", "L", "IH1", "K", "S", "ER0"],
  arcane: ["AA0", "R", "K", "EY1", "N"],
  occult: ["AH0", "K", "AH1", "L", "T"],
  spectral: ["S", "P", "EH1", "K", "T", "R", "AH0", "L"],
  codex: ["K", "OW1", "D", "EH2", "K", "S"],

  // --- THE "HAUNTED ATTIC" (Irregular & Tricky) ---
  fire: ["F", "AY1", "ER0"],
  choir: ["K", "W", "AY1", "ER0"],
  hour: ["AW1", "ER0"],
  through: ["TH", "R", "UW1"],
  rough: ["R", "AH1", "F"],
  tough: ["T", "AH1", "F"],
  bough: ["B", "AW1"],
  cough: ["K", "AO1", "F"],
  dough: ["D", "OW1"],
  slough: ["S", "L", "AW1"],
  read: ["R", "IY1", "D"],
  lead: ["L", "IY1", "D"],
  wind: ["W", "AY1", "N", "D"],
  wound: ["W", "AW1", "N", "D"],
  colonel: ["K", "ER1", "N", "AH0", "L"],
  gauge: ["G", "EY1", "JH"],
  pharaoh: ["F", "EH1", "R", "OW0"],
  vacuum: ["V", "AE1", "K", "Y", "UW0", "M"],
  rhythm: ["R", "IH1", "DH", "AH0", "M"],
  queue: ["K", "Y", "UW1"],
  indict: ["IH0", "N", "D", "AY1", "T"],
  subtle: ["S", "AH1", "T", "AH0", "L"],
  knight: ["N", "AY1", "T"],
  gnat: ["N", "AE1", "T"],
  mnemonic: ["N", "EH0", "M", "AA1", "N", "IH0", "K"],
  asthma: ["AE1", "Z", "M", "AH0"],
  yacht: ["Y", "AA1", "T"],
  receipt: ["R", "IH0", "S", "IY1", "T"],

  // --- MIXED STRESS & SYLLABLES ---
  refrigerator: ["R", "IH0", "F", "R", "IH1", "JH", "ER0", "EY2", "T", "ER0"],
  university: ["Y", "UW2", "N", "AH0", "V", "ER1", "S", "AH0", "T", "IY0"],
  extraordinary: ["EH0", "K", "S", "T", "R", "AA1", "R", "D", "AH0", "N", "EH2", "R", "IY0"],
  enthusiasm: ["IH0", "N", "TH", "UW1", "Z", "IY0", "AE2", "Z", "AH0", "M"],
  phenomenon: ["F", "AH0", "N", "AA1", "M", "AH0", "N", "AA2", "N"],
  cacophony: ["K", "AH0", "K", "AA1", "F", "AH0", "N", "IY0"],
  epiphany: ["IH0", "P", "IH1", "F", "AH0", "N", "IY0"],
  serendipity: ["S", "EH2", "R", "AH0", "N", "D", "IH1", "P", "IH0", "T", "IY0"],
  parsimonious: ["P", "AA2", "R", "S", "AH0", "M", "OW1", "N", "IY0", "AH0", "S"],
  ubiquitous: ["Y", "UW1", "B", "IH1", "K", "W", "AH0", "T", "AH0", "S"],

  // --- RARE & ACADEMIC ---
  synecdoche: ["S", "IH0", "N", "EH1", "K", "D", "AH0", "K", "IY0"],
  anemone: ["AH0", "N", "EH1", "M", "AH0", "N", "IY0"],
  hyperbole: ["HH", "AY1", "P", "ER0", "B", "AH0", "L", "IY0"],
  paradigm: ["P", "EH1", "R", "AH0", "D", "AY2", "M"],
  epitome: ["IH0", "P", "IH1", "T", "AH0", "M", "IY0"],
  quixotic: ["K", "W", "IH0", "K", "S", "AA1", "T", "IH0", "K"],
  surfeit: ["S", "ER1", "F", "AH0", "T"],
  vicissitude: ["V", "IH0", "S", "IH1", "S", "AH0", "T", "UW2", "D"],
  ebullient: ["IH0", "B", "UH1", "L", "Y", "AH0", "N", "T"],
  fastidious: ["F", "AE0", "S", "T", "IH1", "D", "IY0", "AH0", "S"],

  // --- SLANG & MODERN ---
  ghosting: ["G", "OW1", "S", "T", "IH0", "NG"],
  cringe: ["K", "R", "IH1", "N", "JH"],
  vibe: ["V", "AY1", "B"],
  lit: ["L", "IH1", "T"],
  yeet: ["Y", "IY1", "T"],
  sus: ["S", "AH1", "S"],
  slay: ["S", "L", "EY1"],
  flex: ["F", "L", "EH1", "K", "S"],
  hype: ["HH", "AY1", "P"],
  bet: ["B", "EH1", "T"],

  // --- POETIC & SONIC ---
  azure: ["AE1", "ZH", "ER0"],
  ethereal: ["IH0", "TH", "IH1", "R", "IY0", "AH0", "L"],
  luminous: ["L", "UW1", "M", "AH0", "N", "AH0", "S"],
  murmur: ["M", "ER1", "M", "ER0"],
  gossamer: ["G", "AA1", "S", "AH0", "M", "ER0"],
  halcyon: ["HH", "AE1", "L", "S", "IY0", "AH0", "N"],
  mellifluous: ["M", "AH0", "L", "IH1", "F", "L", "UW0", "AH0", "S"],
  petrichor: ["P", "EH1", "T", "R", "AH0", "K", "AO2", "R"],
  sonorous: ["S", "AH0", "N", "AO1", "R", "AH0", "S"],
  labyrinth: ["L", "AE1", "B", "ER0", "IH0", "N", "TH"],

  // --- MULTI-PRONUNCIATION / HETERONYMS (Selected) ---
  object: ["AA1", "B", "JH", "EH0", "K", "T"],
  perfect: ["P", "ER0", "F", "EH1", "K", "T"],
  attribute: ["AE1", "T", "R", "AH0", "B", "Y", "UW2", "T"],
  content: ["K", "AA1", "N", "T", "EH0", "N", "T"],
  invalid: ["IH0", "N", "V", "AE1", "L", "IH0", "D"],
  desert: ["D", "EH1", "Z", "ER0", "T"],
  present: ["P", "R", "EH1", "Z", "AH0", "N", "T"],
  minute: ["M", "IH1", "N", "AH0", "T"],
  refuse: ["R", "IH0", "F", "Y", "UW1", "Z"],
  alternate: ["AA1", "L", "T", "ER0", "N", "AH0", "T"],

  // --- SCIENTIFIC & TECHNICAL ---
  galaxy: ["G", "AE1", "L", "AH0", "K", "S", "IY0"],
  telescope: ["T", "EH1", "L", "AH0", "S", "K", "OW2", "P"],
  astronomy: ["AH0", "S", "T", "R", "AA1", "N", "AH0", "M", "IY0"],
  quantum: ["K", "W", "AA1", "N", "T", "AH0", "M"],
  gravity: ["G", "R", "AE1", "V", "AH0", "T", "IY0"],
  orbit: ["AO1", "R", "B", "AH0", "T"],
  nebula: ["N", "EH1", "B", "Y", "AH0", "L", "AH0"],
  supernova: ["S", "UW2", "P", "ER0", "N", "OW1", "V", "AH0"],
  eclipse: ["IH0", "K", "L", "IH1", "P", "S"],
  constellation: ["K", "AA2", "N", "S", "T", "AH0", "L", "EY1", "SH", "AH0", "N"],
  binary: ["B", "AY1", "N", "ER0", "IY0"],
  spectrum: ["S", "P", "EH1", "K", "T", "R", "AH0", "M"],
  matrix: ["M", "EY1", "T", "R", "IH0", "K", "S"],
  vector: ["V", "EH1", "K", "T", "ER0"],
  scalar: ["S", "K", "EY1", "L", "ER0"],
  tensor: ["T", "EH1", "N", "S", "ER0"],
  entropy: ["EH1", "N", "T", "R", "AH0", "P", "IY0"],
  vortex: ["V", "AO1", "R", "T", "EH2", "K", "S"],
  plasma: ["P", "L", "AE1", "Z", "M", "AH0"],
  ion: ["AY1", "AA2", "N"]
};

/**
 * Calculates the Levenshtein distance between two arrays of phonemes.
 */
function calculatePhonemeDistance(source, target) {
  const matrix = Array(target.length + 1)
    .fill(null)
    .map(() => Array(source.length + 1).fill(null));
  for (let i = 0; i <= source.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= target.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= target.length; j++) {
    for (let i = 1; i <= source.length; i++) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // Deletion
        matrix[j - 1][i] + 1, // Insertion
        matrix[j - 1][i - 1] + cost, // Substitution
      );
    }
  }
  return matrix[target.length][source.length];
}

function projectGoldenWordContract(word) {
  const analyzeWord = PhonemeEngine.analyzeWord(word);
  const analyzeDeep = PhonemeEngine.analyzeDeep(word);
  return {
    analyzeWord: {
      vowelFamily: analyzeWord?.vowelFamily || null,
      coda: analyzeWord?.coda || null,
      rhymeKey: analyzeWord?.rhymeKey || null,
      syllableCount: analyzeWord?.syllableCount || null,
      phonemes: Array.isArray(analyzeWord?.phonemes) ? analyzeWord.phonemes : [],
    },
    analyzeDeep: {
      rhymeKey: analyzeDeep?.rhymeKey || null,
      syllableCount: analyzeDeep?.syllableCount || null,
      stressPattern: analyzeDeep?.stressPattern || "",
      extendedRhymeKeys: Array.isArray(analyzeDeep?.extendedRhymeKeys) ? analyzeDeep.extendedRhymeKeys : [],
      syllables: Array.isArray(analyzeDeep?.syllables)
        ? analyzeDeep.syllables.map((syllable) => ({
            vowel: syllable.vowel,
            vowelFamily: syllable.vowelFamily,
            onset: syllable.onset,
            coda: syllable.coda,
            stress: syllable.stress,
          }))
        : [],
    },
  };
}

describe("CODEx Phoneme Engine Accuracy (QA)", () => {
  beforeAll(async () => {
    await PhonemeEngine.init();
    await PhonemeEngine.ensureAuthorityBatch(Object.keys(goldenSet));
  });

  test("Phoneme Error Rate (PER) should be below a target threshold", () => {
    let totalPhonemes = 0;
    let totalErrors = 0;
    let wordCount = 0;
    const MAX_ALLOWED_PER = 0.45; 
    const failures = [];

    for (const word in goldenSet) {
      const expectedPhonemes = goldenSet[word];
      const analysisResult = PhonemeEngine.analyzeWord(word);
      const actualPhonemes = analysisResult?.phonemes || [];

      const distance = calculatePhonemeDistance(actualPhonemes, expectedPhonemes);
      
      totalPhonemes += expectedPhonemes.length;
      totalErrors += distance;
      wordCount++;

      if (distance > 0) {
          failures.push({
              word,
              expected: expectedPhonemes.join(' '),
              actual: actualPhonemes.join(' '),
              distance
          });
      }
    }

    const phonemeErrorRate =
      totalPhonemes > 0 ? (totalErrors / totalPhonemes) * 100 : 0;

    console.log(`\n--- Expanded Phoneme Accuracy Report ---`);
    console.log(`Total Words Tested: ${wordCount}`);
    console.log(`Total Phonemes in Golden Set: ${totalPhonemes}`);
    console.log(`Total Errors (Substitutions/Deletions/Insertions): ${totalErrors}`);
    console.log(`Phoneme Error Rate (PER): ${phonemeErrorRate.toFixed(2)}%`);

    if (failures.length > 0) {
        console.log(`\nTop Failures (10 of ${failures.length}):`);
        failures.sort((a, b) => b.distance - a.distance).slice(0, 10).forEach(f => {
            console.log(`  - ${f.word}: Expected [${f.expected}], Got [${f.actual}] (Dist: ${f.distance})`);
        });
    }

    expect(phonemeErrorRate).toBeLessThan(50.0);
  });

  test("Golden set analysis contract snapshot remains stable", () => {
    const contract = {};
    for (const word of Object.keys(goldenSet)) {
      contract[word] = projectGoldenWordContract(word);
    }
    expect(contract).toMatchSnapshot();
  });
});
