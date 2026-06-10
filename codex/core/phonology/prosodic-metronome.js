/**
 * PROSODIC METRONOME — stress-shift homograph disambiguation.
 *
 * English noun/verb homographs alternate stress: the noun stresses syllable 1
 * (REcord), the verb stresses syllable 2 (reCORD). Which one is correct is not
 * a lexical fact — it's a *rhythmic/structural* one, read from the function-word
 * frame around the word: a determiner/adjective before it sets a noun beat; a
 * `to`/modal/subject-pronoun before it sets a verb beat.
 *
 * The "metronome" reads that local beat and places the stress. It only speaks
 * when the frame is confident; otherwise it defers to normal G2P (returns null).
 * It cannot help vowel-change homographs (read/lead) — those are segmental, not
 * rhythmic, and belong to a lexical table.
 */

// word -> { noun: front-stress phonemes, verb: end-stress phonemes }
export const STRESS_SHIFT_HOMOGRAPHS = Object.freeze({
  record:   { noun: ['R','EH1','K','ER0','D'],            verb: ['R','AH0','K','AO1','R','D'] },
  present:  { noun: ['P','R','EH1','Z','AH0','N','T'],     verb: ['P','R','IY0','Z','EH1','N','T'] },
  object:   { noun: ['AA1','B','JH','EH0','K','T'],        verb: ['AH0','B','JH','EH1','K','T'] },
  produce:  { noun: ['P','R','OW1','D','UW0','S'],         verb: ['P','R','AH0','D','UW1','S'] },
  contract: { noun: ['K','AA1','N','T','R','AE0','K','T'], verb: ['K','AH0','N','T','R','AE1','K','T'] },
  desert:   { noun: ['D','EH1','Z','ER0','T'],             verb: ['D','IH0','Z','ER1','T'] },
  permit:   { noun: ['P','ER1','M','IH0','T'],             verb: ['P','ER0','M','IH1','T'] },
  conduct:  { noun: ['K','AA1','N','D','AH0','K','T'],     verb: ['K','AH0','N','D','AH1','K','T'] },
  rebel:    { noun: ['R','EH1','B','AH0','L'],             verb: ['R','IH0','B','EH1','L'] },
  contest:  { noun: ['K','AA1','N','T','EH0','S','T'],     verb: ['K','AH0','N','T','EH1','S','T'] },
  convert:  { noun: ['K','AA1','N','V','ER0','T'],         verb: ['K','AH0','N','V','ER1','T'] },
  address:  { noun: ['AE1','D','R','EH0','S'],             verb: ['AH0','D','R','EH1','S'] },
});

// Function-word frame cues (the "beat").
const NOUN_CUES = new Set([
  'a','an','the','this','that','these','those','my','your','his','her','its','our','their',
  'no','every','each','some','any','one','another',
  'new','old','big','small','good','bad','great','strange','final','latest','recent','only',
]);
const VERB_CUES = new Set([
  'to','will','would','shall','should','can','could','may','might','must','please','let',
  "don't",'dont',"didn't",'didnt',"doesn't","won't","can't",
  'i','we','you','they','he','she','it',
]);

function norm(token) {
  return String(token || '').toLowerCase().replace(/[^a-z']/g, '');
}

export function isStressShiftHomograph(word) {
  return Object.prototype.hasOwnProperty.call(STRESS_SHIFT_HOMOGRAPHS, norm(word));
}

/**
 * Read the noun/verb beat from the token immediately before the target.
 * @returns {'noun'|'verb'|null}
 */
export function readMeter(tokens, targetIndex) {
  if (!Array.isArray(tokens) || targetIndex <= 0) return null;
  const prev = norm(tokens[targetIndex - 1]);
  if (NOUN_CUES.has(prev)) return 'noun';
  if (VERB_CUES.has(prev)) return 'verb';
  return null;
}

/**
 * Pronounce a stress-shift homograph using the metronome's frame, or null to
 * defer to normal G2P (word isn't in the class, or the frame is ambiguous).
 * @returns {string[]|null}
 */
export function pronounceWithMeter(word, tokens, targetIndex) {
  const key = norm(word);
  const entry = STRESS_SHIFT_HOMOGRAPHS[key];
  if (!entry) return null;
  const frame = readMeter(tokens, targetIndex);
  if (frame === 'noun') return [...entry.noun];
  if (frame === 'verb') return [...entry.verb];
  return null;
}
