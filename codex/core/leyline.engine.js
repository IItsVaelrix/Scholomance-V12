import { tokenize } from './tokenizer.js';

/**
 * Stable stringify for deterministic checksum payload serialisation.
 * @param {*} obj 
 * @returns {string}
 */
export function stableStringify(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Stable hash based on djb2.
 * @param {string} str 
 * @returns {number}
 */
export function stableHash(str) {
  const text = String(str || '');
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Seeded pseudo-random generator.
 * @param {number} seed 
 * @returns {function(): number}
 */
export function createSeededRandom(seed) {
  let state = (Math.abs(Number(seed) || 1) % 2147483646) + 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampBetween(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

/**
 * Function words are the connective tissue of natural language. Keyword-stuffed
 * phrases ("sulfur brimstone bind seal") have almost none; fluent invocations
 * thread their content words with these. Used as the primary coherence signal.
 */
const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'into', 'on', 'onto', 'at', 'by', 'for',
  'with', 'without', 'from', 'through', 'over', 'under', 'within', 'upon', 'and',
  'or', 'but', 'nor', 'so', 'yet', 'as', 'that', 'than', 'then', 'this', 'these',
  'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'him', 'her',
  'them', 'my', 'your', 'our', 'their', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'not', 'no', 'if',
  'while', 'when', 'where', 'which', 'who', 'whom', 'whose', 'what', 'all',
  'each', 'every', 'shall', 'will', 'let', 'until', 'about', 'against',
  'between', 'among', 'toward', 'around', 'before', 'after',
]);

/**
 * Estimates the linguistic coherence of a phrase in [0,1].
 *
 * This is a deterministic heuristic proxy, NOT a parser: it rewards phrases that
 * read like language (syntactic glue + adequate length) and punishes word-salad
 * keyword stuffing and single-token spam. Shared by leyline extraction (sloppy
 * phrasing destabilises the scholar) and combat casting (an incoherent cast is
 * more likely to fizzle while unstable).
 *
 * @param {string} text
 * @returns {number} coherence in [0,1]
 */
export function computeLinguisticCoherence(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const total = words.length;
  if (total === 0) return 0;
  if (total === 1) return 0.1; // a lone word is not a coherent invocation

  // 1. Syntactic glue — share of function words vs. a fluent-prose target (~35%).
  const functionCount = words.filter((w) => FUNCTION_WORDS.has(w)).length;
  const glue = clamp01((functionCount / total) / 0.35);

  // 2. Length adequacy — very short phrases can't sustain coherence.
  const lengthFactor = clamp01(total / 7);

  // 3. Anti-spam — penalize a single token dominating the phrase.
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  const maxRepeat = Math.max(...counts.values());
  const dominance = maxRepeat / total;
  const spamPenalty = dominance > 0.4 ? dominance - 0.4 : 0;

  const coherence = (glue * 0.65) + (lengthFactor * 0.35) - spamPenalty;
  return clamp01(Number(coherence.toFixed(3)));
}

/**
 * Explains why a phrase fell below the deterministic coherence floor.
 * @param {string} text
 * @param {number} coherenceFloor
 * @returns {string[]}
 */
export function diagnoseLinguisticCoherence(text, coherenceFloor = 0.6) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return ['no words were provided'];

  const reasons = [];
  const functionCount = words.filter((w) => FUNCTION_WORDS.has(w)).length;
  const functionRatio = functionCount / words.length;
  const targetFunctionRatio = 0.35;

  if (words.length < 7) {
    reasons.push(`too few words to stabilize the extraction (${words.length}/7 minimum structure words)`);
  }

  if (functionRatio < targetFunctionRatio) {
    reasons.push(`too little connective syntax (${functionCount}/${words.length} connector words; target ${Math.ceil(words.length * targetFunctionRatio)})`);
  }

  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  const repeated = [...counts.entries()]
    .filter(([, count]) => count / words.length > 0.4)
    .sort((a, b) => b[1] - a[1])[0];

  if (repeated) {
    reasons.push(`keyword repetition dominates the phrase ("${repeated[0]}" appears ${repeated[1]} times)`);
  }

  if (reasons.length === 0) {
    reasons.push(`phrase coherence is below this leyline's required floor (${(coherenceFloor * 100).toFixed(0)}%)`);
  }

  return reasons;
}

const LITERARY_CONTENT_STOPWORDS = new Set([
  ...FUNCTION_WORDS,
  'inside', 'outside', 'enough', 'only', 'never', 'without',
]);

const POLARITY_PAIRS = [
  ['sun', 'absence'],
  ['sun', 'moon'],
  ['above', 'below'],
  ['under', 'over'],
  ['first', 'final'],
  ['begin', 'end'],
  ['body', 'soul'],
  ['life', 'death'],
  ['wound', 'heal'],
  ['seal', 'open'],
  ['still', 'move'],
  ['silence', 'song'],
  ['hollow', 'vessel'],
  ['nothing', 'outline'],
  ['decay', 'order'],
  ['crown', 'decay'],
  ['star', 'absence'],
  ['star', 'void'],
];

const PERSONIFICATION_VERBS = new Set([
  'answers', 'asks', 'breathes', 'dreams', 'drinks', 'hears', 'learns',
  'listens', 'remembers', 'refuses', 'sings', 'speaks', 'wakes', 'whispers',
]);

function literaryTokens(phrase) {
  return tokenize(phrase).filter((token) => token.length > 2);
}

function contentTokens(phrase) {
  return literaryTokens(phrase).filter((token) => !LITERARY_CONTENT_STOPWORDS.has(token));
}

function estimateSyllables(word) {
  const normalized = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return 0;
  const vowelGroups = normalized.match(/[aeiouy]+/g) || [];
  let count = vowelGroups.length;
  if (normalized.endsWith('e') && count > 1 && !normalized.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

function estimatePhraseSyllables(phrase) {
  return literaryTokens(phrase).reduce((total, word) => total + estimateSyllables(word), 0);
}

function hasAlliteration(tokens) {
  const initials = new Map();
  for (const token of tokens) {
    const initial = token[0];
    initials.set(initial, (initials.get(initial) || 0) + 1);
  }
  return [...initials.values()].some((count) => count >= 2);
}

function vowelSignature(word) {
  const match = String(word || '').toLowerCase().match(/[aeiouy]+/);
  return match ? match[0] : '';
}

function hasAssonance(tokens) {
  const signatures = new Map();
  for (const token of tokens) {
    const signature = vowelSignature(token);
    if (!signature) continue;
    signatures.set(signature, (signatures.get(signature) || 0) + 1);
  }
  return [...signatures.values()].some((count) => count >= 2);
}

function rhymeTail(word) {
  const normalized = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length < 4) return '';
  return normalized.slice(-3);
}

function hasInternalRhyme(tokens) {
  const tails = new Map();
  for (const token of tokens) {
    const tail = rhymeTail(token);
    if (!tail) continue;
    const words = tails.get(tail) || new Set();
    words.add(token);
    tails.set(tail, words);
  }
  return [...tails.values()].some((words) => words.size >= 2);
}

function hasPolarityPair(tokens) {
  const tokenSet = new Set(tokens);
  return POLARITY_PAIRS.some(([left, right]) => tokenSet.has(left) && tokenSet.has(right));
}

function hasMetaphor(phrase, tokens) {
  const normalized = String(phrase || '').toLowerCase();
  if (/\b(is|are|becomes?|wears?|blooms?|learns?|dreams?)\b/.test(normalized) && tokens.length >= 5) {
    return true;
  }
  return /\b(as|like)\b/.test(normalized) && tokens.length >= 4;
}

function hasPersonification(tokens) {
  return tokens.some((token) => PERSONIFICATION_VERBS.has(token));
}

function hasChiasmus(tokens) {
  for (let index = 0; index <= tokens.length - 4; index += 1) {
    if (tokens[index] === tokens[index + 3] && tokens[index + 1] === tokens[index + 2]) {
      return true;
    }
  }
  return false;
}

/**
 * Scores deterministic poetic devices for high-tier Verbal Alchemy leylines.
 * The detector is intentionally forgiving: it identifies visible craft without
 * pretending to validate perfect meter or formal scansion.
 * @param {string} phrase
 * @param {Object|null} literaryConstraints
 * @returns {Object}
 */
export function scoreLiteraryConstraints(phrase, literaryConstraints = null) {
  if (!literaryConstraints) {
    return {
      required: false,
      requiredOk: true,
      score: 0,
      detected: [],
      missing: [],
      syllables: estimatePhraseSyllables(phrase),
      diagnostics: [],
    };
  }

  const allowed = literaryConstraints.allowed || [];
  const minRequired = Number(literaryConstraints.minRequired) || 0;
  const tokens = contentTokens(phrase);
  const syllables = estimatePhraseSyllables(phrase);
  const detections = {
    alliteration: hasAlliteration(tokens),
    assonance: hasAssonance(tokens),
    internal_rhyme: hasInternalRhyme(tokens),
    antithesis: hasPolarityPair(tokens),
    metaphor: hasMetaphor(phrase, tokens),
    personification: hasPersonification(tokens),
    chiasmus: hasChiasmus(tokens),
    meter_8_12_syllables: syllables >= 8 && syllables <= 12,
  };

  const detected = allowed.filter((device) => detections[device]);
  const missing = allowed.filter((device) => !detections[device]);
  const polarityOk = !literaryConstraints.requiresPolarityPair || detections.antithesis;
  const requiredOk = detected.length >= minRequired && polarityOk;
  const score = allowed.length > 0
    ? clamp01(detected.length / Math.max(1, minRequired || allowed.length))
    : 1;

  const diagnostics = [];
  detected.forEach((device) => {
    diagnostics.push(`✓ Literary device detected: ${device.replaceAll('_', ' ')}`);
  });
  if (literaryConstraints.meter) {
    diagnostics.push(`• Meter estimate: ${syllables} syllables (${literaryConstraints.meter.minSyllables}-${literaryConstraints.meter.maxSyllables} target)`);
  }
  if (detected.length < minRequired) {
    diagnostics.push(`✗ Literary lock incomplete: ${detected.length}/${minRequired} required devices detected; missing ${missing.slice(0, 4).map((device) => device.replaceAll('_', ' ')).join(', ') || 'additional device'}.`);
  }
  if (!polarityOk) {
    diagnostics.push('✗ Literary lock incomplete: no polarity pair detected.');
  }

  return {
    required: minRequired > 0,
    requiredOk,
    score,
    detected,
    missing,
    syllables,
    diagnostics,
  };
}

function puzzle({
  id,
  name,
  stars,
  affinity,
  type,
  prompt,
  requiredTerms,
  requiredActions,
  forbiddenTerms,
  mana,
  oracleWord,
  oracleDefinition,
}) {
  const minScoreByStars = {
    1: 0.52,
    2: 0.62,
    3: 0.72,
    4: 0.82,
    5: 0.90,
  };
  const literaryConstraintsByStars = {
    4: {
      minRequired: 1,
      allowed: ['internal_rhyme', 'alliteration', 'metaphor', 'antithesis'],
    },
    5: {
      minRequired: 3,
      allowed: ['internal_rhyme', 'assonance', 'metaphor', 'antithesis', 'meter_8_12_syllables'],
      requiresPolarityPair: true,
      meter: {
        minSyllables: 8,
        maxSyllables: 12,
        preferredStressPattern: null,
      },
    },
  };

  return {
    id,
    name,
    stars,
    affinity,
    type,
    domain: 'verbal-alchemy',
    prompt,
    requiredTerms,
    requiredActions,
    forbiddenTerms,
    literaryConstraints: literaryConstraintsByStars[stars] || null,
    minScore: minScoreByStars[stars],
    manaMin: mana[0],
    manaMax: mana[1],
    oracleSeed: {
      word: oracleWord,
      definition: oracleDefinition,
    },
  };
}

export const LEYLINE_PUZZLE_CODEX = Object.freeze([
  puzzle({ id: 'LEY-001', name: 'Sulfur Wick', stars: 1, affinity: 'ALCHEMY', type: 'sulfur-wick', prompt: 'Bind heat without saying its common name.', requiredTerms: [['sulfur', 'brimstone'], ['crucible', 'vessel']], requiredActions: [['bind', 'seal', 'contain']], forbiddenTerms: ['fire', 'burn', 'flame'], mana: [8, 14], oracleWord: 'CONTAINMENT', oracleDefinition: 'Power obeys the vessel before it obeys the hand.' }),
  puzzle({ id: 'LEY-002', name: 'Mercury Mirror', stars: 1, affinity: 'PSYCHIC', type: 'mercury-mirror', prompt: 'Name the liquid that remembers faces but refuses shape.', requiredTerms: [['mercury', 'quicksilver'], ['mirror', 'reflection']], requiredActions: [['distill', 'reflect', 'guide']], forbiddenTerms: ['water', 'ocean', 'river'], mana: [7, 13], oracleWord: 'REFLECTION', oracleDefinition: 'A thought becomes dangerous once it can look back.' }),
  puzzle({ id: 'LEY-003', name: 'Salt Latch', stars: 1, affinity: 'VITAL', type: 'salt-latch', prompt: 'Preserve the body of the spell from rot.', requiredTerms: [['salt'], ['body', 'corpus']], requiredActions: [['preserve', 'stabilize', 'fix']], forbiddenTerms: ['decay', 'rot', 'spoil'], mana: [6, 12], oracleWord: 'PRESERVATION', oracleDefinition: 'What is kept whole can still become holy.' }),
  puzzle({ id: 'LEY-004', name: 'Aether Thread', stars: 1, affinity: 'SONIC', type: 'aether-thread', prompt: 'Move breath through an invisible wire.', requiredTerms: [['aether', 'ether'], ['breath', 'wind']], requiredActions: [['conduct', 'carry', 'channel']], forbiddenTerms: ['silence', 'mute'], mana: [8, 15], oracleWord: 'CONDUCTION', oracleDefinition: 'Breath is the first bridge between body and spell.' }),
  puzzle({ id: 'LEY-005', name: 'Copper Green', stars: 1, affinity: 'LORE', type: 'copper-green', prompt: 'Ask old metal what time has written on it.', requiredTerms: [['copper'], ['verdigris', 'patina']], requiredActions: [['read', 'reveal', 'scrape']], forbiddenTerms: ['clean', 'polish'], mana: [7, 13], oracleWord: 'PATINA', oracleDefinition: 'Age is not damage when the eye has learned to read it.' }),
  puzzle({ id: 'LEY-006', name: 'Glass Nerve', stars: 1, affinity: 'CELESTIAL', type: 'glass-nerve', prompt: 'Make a clear thing carry a star without breaking.', requiredTerms: [['glass', 'crystal'], ['star', 'light']], requiredActions: [['focus', 'refract', 'carry']], forbiddenTerms: ['shatter', 'break'], mana: [8, 14], oracleWord: 'REFRACTION', oracleDefinition: 'Truth changes direction without becoming false.' }),
  puzzle({ id: 'LEY-007', name: 'Iron Oath', stars: 1, affinity: 'WARD', type: 'iron-oath', prompt: 'Give the line a spine and forbid it from bending.', requiredTerms: [['iron'], ['oath', 'spine']], requiredActions: [['temper', 'brace', 'anchor']], forbiddenTerms: ['bend', 'yield'], mana: [6, 12], oracleWord: 'TEMPER', oracleDefinition: 'Strength is heat remembered correctly.' }),
  puzzle({ id: 'LEY-008', name: 'Bone Ash', stars: 1, affinity: 'NECROTIC', type: 'bone-ash', prompt: 'Whiten the remnant without waking the dead.', requiredTerms: [['ash', 'bone'], ['white', 'pale']], requiredActions: [['calcine', 'settle', 'soften']], forbiddenTerms: ['raise', 'resurrect', 'corpse'], mana: [7, 13], oracleWord: 'REMAINDER', oracleDefinition: 'Not every ending is empty.' }),
  puzzle({ id: 'LEY-009', name: 'Ink Vein', stars: 1, affinity: 'CODEX', type: 'ink-vein', prompt: 'Draw power from a sentence before it dries.', requiredTerms: [['ink'], ['sentence', 'glyph']], requiredActions: [['scribe', 'draw', 'inscribe']], forbiddenTerms: ['erase', 'blank'], mana: [8, 16], oracleWord: 'INSCRIPTION', oracleDefinition: 'A mark becomes law when the world cannot forget it.' }),
  puzzle({ id: 'LEY-010', name: 'Amber Seed', stars: 1, affinity: 'VITAL', type: 'amber-seed', prompt: 'Wake the old sap without freeing the trapped hour.', requiredTerms: [['amber', 'sap'], ['hour', 'time']], requiredActions: [['warm', 'wake', 'preserve']], forbiddenTerms: ['release', 'free'], mana: [7, 14], oracleWord: 'SUSPENSION', oracleDefinition: 'Some moments survive by refusing to move.' }),

  puzzle({ id: 'LEY-011', name: 'Nigredo Pit', stars: 2, affinity: 'ENTROPY', type: 'nigredo-pit', prompt: 'Blacken the false shape until the useful residue remains.', requiredTerms: [['nigredo', 'blackening'], ['residue', 'ash']], requiredActions: [['reduce', 'blacken', 'separate']], forbiddenTerms: ['bright', 'pure'], mana: [12, 20], oracleWord: 'REDUCTION', oracleDefinition: 'To find the core, burn away the costume.' }),
  puzzle({ id: 'LEY-012', name: 'Albedo Basin', stars: 2, affinity: 'CELESTIAL', type: 'albedo-basin', prompt: 'Wash the phrase until only its cleanest intention remains.', requiredTerms: [['albedo', 'whitening'], ['impurity', 'stain']], requiredActions: [['wash', 'purify', 'separate']], forbiddenTerms: ['mud', 'soot'], mana: [12, 21], oracleWord: 'PURIFICATION', oracleDefinition: 'Clarity is not softness. It is removal.' }),
  puzzle({ id: 'LEY-013', name: 'Rubedo Knot', stars: 2, affinity: 'ALCHEMY', type: 'rubedo-knot', prompt: 'Join the red end to the first wound.', requiredTerms: [['rubedo', 'red'], ['wound', 'blood']], requiredActions: [['unite', 'complete', 'seal']], forbiddenTerms: ['split', 'sever'], mana: [13, 22], oracleWord: 'COMPLETION', oracleDefinition: 'The last color is not victory. It is integration.' }),
  puzzle({ id: 'LEY-014', name: 'Cinnabar Bell', stars: 2, affinity: 'SONIC', type: 'cinnabar-bell', prompt: 'Ring the red mineral until mercury hears itself.', requiredTerms: [['cinnabar'], ['mercury', 'quicksilver']], requiredActions: [['ring', 'resonate', 'vibrate']], forbiddenTerms: ['silence', 'dull'], mana: [12, 21], oracleWord: 'RESONANCE', oracleDefinition: 'Matter remembers the note that changed it.' }),
  puzzle({ id: 'LEY-015', name: 'Magnetite Gate', stars: 2, affinity: 'WARD', type: 'magnetite-gate', prompt: 'Turn the unseen north into a locked door.', requiredTerms: [['magnet', 'magnetite'], ['north', 'pole']], requiredActions: [['align', 'lock', 'orient']], forbiddenTerms: ['wander', 'drift'], mana: [11, 20], oracleWord: 'POLARITY', oracleDefinition: 'Direction is the first form of loyalty.' }),
  puzzle({ id: 'LEY-016', name: 'Quicklime Tongue', stars: 2, affinity: 'ALCHEMY', type: 'quicklime-tongue', prompt: 'Feed thirst to stone until it speaks heat.', requiredTerms: [['quicklime', 'lime'], ['stone']], requiredActions: [['slake', 'feed', 'react']], forbiddenTerms: ['drown', 'flood'], mana: [12, 22], oracleWord: 'REACTION', oracleDefinition: 'Hunger can be a doorway when measured.' }),
  puzzle({ id: 'LEY-017', name: 'Brine Spiral', stars: 2, affinity: 'VITAL', type: 'brine-spiral', prompt: 'Let saltwater turn without becoming a sea.', requiredTerms: [['brine', 'saltwater'], ['spiral', 'turn']], requiredActions: [['circulate', 'filter', 'condense']], forbiddenTerms: ['ocean', 'drown'], mana: [11, 19], oracleWord: 'CIRCULATION', oracleDefinition: 'A body survives because nothing holy stays still.' }),
  puzzle({ id: 'LEY-018', name: 'Obsidian Lens', stars: 2, affinity: 'VOID', type: 'obsidian-lens', prompt: 'Look through black glass without inviting the hollow in.', requiredTerms: [['obsidian', 'black glass'], ['lens', 'eye']], requiredActions: [['focus', 'look', 'veil']], forbiddenTerms: ['void', 'hollow'], mana: [12, 21], oracleWord: 'VEIL', oracleDefinition: 'Darkness becomes tool only when it has an edge.' }),
  puzzle({ id: 'LEY-019', name: 'Phosphor Moth', stars: 2, affinity: 'CELESTIAL', type: 'phosphor-moth', prompt: 'Make cold light land without naming a lamp.', requiredTerms: [['phosphor', 'phosphorescence'], ['moth', 'wing']], requiredActions: [['glow', 'land', 'lure']], forbiddenTerms: ['lamp', 'torch'], mana: [13, 22], oracleWord: 'LUMINANCE', oracleDefinition: 'Not all light burns. Some merely insists.' }),
  puzzle({ id: 'LEY-020', name: 'Lead Sleep', stars: 2, affinity: 'NECROTIC', type: 'lead-sleep', prompt: 'Make heaviness dream of becoming gold.', requiredTerms: [['lead'], ['gold', 'aurum']], requiredActions: [['transmute', 'dream', 'soften']], forbiddenTerms: ['awake', 'rise'], mana: [11, 20], oracleWord: 'POTENTIAL', oracleDefinition: 'The base thing is not shameful. It is unfinished.' }),

  puzzle({ id: 'LEY-021', name: 'Aqua Regia Mouth', stars: 3, affinity: 'ALCHEMY', type: 'aqua-regia-mouth', prompt: 'Dissolve the king without insulting the crown.', requiredTerms: [['aqua regia'], ['gold', 'king', 'crown']], requiredActions: [['dissolve', 'consume', 'open']], forbiddenTerms: ['destroy', 'insult', 'break'], mana: [20, 32], oracleWord: 'DISSOLUTION', oracleDefinition: 'Reverence is not refusal. Even kings must enter solution.' }),
  puzzle({ id: 'LEY-022', name: 'Alembic Moon', stars: 3, affinity: 'PSYCHIC', type: 'alembic-moon', prompt: 'Lift the moon through a glass throat and keep its face intact.', requiredTerms: [['alembic'], ['moon', 'face']], requiredActions: [['distill', 'lift', 'condense']], forbiddenTerms: ['shatter', 'spill'], mana: [19, 31], oracleWord: 'DISTILLATION', oracleDefinition: 'A soul can rise without abandoning its shape.' }),
  puzzle({ id: 'LEY-023', name: 'Vitriol Stair', stars: 3, affinity: 'ENTROPY', type: 'vitriol-stair', prompt: 'Descend into corrosion and return with the hidden green word.', requiredTerms: [['vitriol'], ['green', 'hidden']], requiredActions: [['descend', 'return', 'extract']], forbiddenTerms: ['avoid', 'escape'], mana: [20, 34], oracleWord: 'DESCENT', oracleDefinition: 'Some truths live below safety.' }),
  puzzle({ id: 'LEY-024', name: 'Furnace Psalm', stars: 3, affinity: 'SONIC', type: 'furnace-psalm', prompt: 'Sing the furnace into discipline without praising heat directly.', requiredTerms: [['furnace', 'kiln'], ['discipline', 'order']], requiredActions: [['sing', 'tune', 'temper']], forbiddenTerms: ['fire', 'hot', 'burn'], mana: [19, 31], oracleWord: 'METER', oracleDefinition: 'Heat without rhythm is only appetite.' }),
  puzzle({ id: 'LEY-025', name: 'Silver Nitrate Eye', stars: 3, affinity: 'CODEX', type: 'silver-nitrate-eye', prompt: 'Make memory darken into an image but never call it a photograph.', requiredTerms: [['silver'], ['nitrate', 'memory', 'image']], requiredActions: [['expose', 'darken', 'fix']], forbiddenTerms: ['photo', 'photograph', 'camera'], mana: [20, 33], oracleWord: 'EXPOSURE', oracleDefinition: 'Revelation is a wound made useful.' }),
  puzzle({ id: 'LEY-026', name: 'Fulminate Tooth', stars: 3, affinity: 'ENTROPY', type: 'fulminate-tooth', prompt: 'Touch the explosive syllable without letting it bite.', requiredTerms: [['fulminate'], ['tooth', 'bite']], requiredActions: [['stabilize', 'touch', 'disarm']], forbiddenTerms: ['explode', 'blast', 'detonate'], mana: [18, 30], oracleWord: 'VOLATILITY', oracleDefinition: 'The dangerous word asks first for manners.' }),
  puzzle({ id: 'LEY-027', name: 'Copper Serpent', stars: 3, affinity: 'VITAL', type: 'copper-serpent', prompt: 'Coil the healing metal around the wound without closing it too soon.', requiredTerms: [['copper'], ['serpent', 'wound']], requiredActions: [['coil', 'conduct', 'mend']], forbiddenTerms: ['seal', 'close'], mana: [19, 31], oracleWord: 'CONDUCTIVITY', oracleDefinition: 'Healing travels best through what can carry pain.' }),
  puzzle({ id: 'LEY-028', name: 'Lapis Archive', stars: 3, affinity: 'LORE', type: 'lapis-archive', prompt: 'Open the blue stone library and borrow only one sky.', requiredTerms: [['lapis', 'blue stone'], ['library', 'archive', 'sky']], requiredActions: [['open', 'borrow', 'index']], forbiddenTerms: ['steal', 'empty'], mana: [20, 34], oracleWord: 'ARCHIVE', oracleDefinition: 'Knowledge permits entry, not ownership.' }),
  puzzle({ id: 'LEY-029', name: 'Iodine Ghost', stars: 3, affinity: 'NECROTIC', type: 'iodine-ghost', prompt: 'Reveal the wound-stain that was hiding from the lamp.', requiredTerms: [['iodine'], ['stain', 'wound']], requiredActions: [['reveal', 'mark', 'tincture']], forbiddenTerms: ['hide', 'cleanse'], mana: [18, 30], oracleWord: 'INDICATION', oracleDefinition: 'The mark is not the sickness. It is the messenger.' }),
  puzzle({ id: 'LEY-030', name: 'Frost Crucible', stars: 3, affinity: 'WARD', type: 'frost-crucible', prompt: 'Keep the crucible cold enough to hold a dangerous name.', requiredTerms: [['crucible'], ['frost', 'cold', 'salt']], requiredActions: [['hold', 'chill', 'contain']], forbiddenTerms: ['melt', 'thaw'], mana: [19, 32], oracleWord: 'STASIS', oracleDefinition: 'Restraint is action wearing armor.' }),

  puzzle({ id: 'LEY-031', name: 'Hermetic Door', stars: 4, affinity: 'WARD', type: 'hermetic-door', prompt: 'Seal the vessel so perfectly that even intention must knock.', requiredTerms: [['hermetic'], ['vessel', 'door', 'intention']], requiredActions: [['seal', 'lock', 'consecrate']], forbiddenTerms: ['open', 'leak', 'spill'], mana: [30, 46], oracleWord: 'HERMETICISM', oracleDefinition: 'Closure is not denial. It is chosen boundary.' }),
  puzzle({ id: 'LEY-032', name: 'Mandelbrot Root', stars: 4, affinity: 'CODEX', type: 'mandelbrot-root', prompt: 'Describe the root that repeats itself smaller than memory.', requiredTerms: [['root', 'fractal'], ['repeat', 'memory']], requiredActions: [['iterate', 'scale', 'encode']], forbiddenTerms: ['random', 'chaos'], mana: [31, 48], oracleWord: 'RECURSION', oracleDefinition: 'A pattern becomes law when it survives reduction.' }),
  puzzle({ id: 'LEY-033', name: 'Ouroboros Brine', stars: 4, affinity: 'VITAL', type: 'ouroboros-brine', prompt: 'Let the serpent drink the sea of itself without drowning.', requiredTerms: [['ouroboros', 'serpent'], ['brine', 'sea', 'self']], requiredActions: [['circulate', 'consume', 'renew']], forbiddenTerms: ['drown', 'end', 'sever'], mana: [30, 45], oracleWord: 'RENEWAL', oracleDefinition: 'The cycle is sacred only when it feeds more than itself.' }),
  puzzle({ id: 'LEY-034', name: 'Emerald Tablet Shard', stars: 4, affinity: 'LORE', type: 'emerald-tablet-shard', prompt: 'Say what is below without copying what is above.', requiredTerms: [['below', 'under'], ['above', 'sky'], ['emerald', 'tablet']], requiredActions: [['translate', 'correspond', 'reflect']], forbiddenTerms: ['copy', 'duplicate'], mana: [32, 50], oracleWord: 'CORRESPONDENCE', oracleDefinition: 'Similarity is not imitation. It is relation.' }),
  puzzle({ id: 'LEY-035', name: 'Athanor Heart', stars: 4, affinity: 'ALCHEMY', type: 'athanor-heart', prompt: 'Keep the furnace alive for the whole work without feeding it greed.', requiredTerms: [['athanor', 'furnace'], ['heart', 'work']], requiredActions: [['sustain', 'feed', 'temper']], forbiddenTerms: ['greed', 'devour', 'burn'], mana: [31, 49], oracleWord: 'SUSTAINMENT', oracleDefinition: 'Great work requires fire that knows patience.' }),
  puzzle({ id: 'LEY-036', name: 'Basilisk Mercury', stars: 4, affinity: 'PSYCHIC', type: 'basilisk-mercury', prompt: 'Make the gaze flow away before it becomes stone.', requiredTerms: [['mercury', 'quicksilver'], ['gaze', 'stone']], requiredActions: [['avert', 'flow', 'soften']], forbiddenTerms: ['stare', 'petrify'], mana: [30, 47], oracleWord: 'AVERSION', oracleDefinition: 'Survival sometimes begins by refusing to look directly.' }),
  puzzle({ id: 'LEY-037', name: 'Black Sun Retort', stars: 4, affinity: 'VOID', type: 'black-sun-retort', prompt: 'Bottle a sun that gives shadow instead of morning.', requiredTerms: [['black sun'], ['retort', 'bottle', 'shadow']], requiredActions: [['bottle', 'invert', 'contain']], forbiddenTerms: ['dawn', 'morning', 'bright'], mana: [32, 50], oracleWord: 'INVERSION', oracleDefinition: 'Some light is only visible from the other side.' }),
  puzzle({ id: 'LEY-038', name: 'Choral Salt', stars: 4, affinity: 'SONIC', type: 'choral-salt', prompt: 'Make many voices crystallize into one edible chord.', requiredTerms: [['salt', 'crystal'], ['voices', 'chord']], requiredActions: [['harmonize', 'crystallize', 'tune']], forbiddenTerms: ['noise', 'discord'], mana: [31, 48], oracleWord: 'HARMONY', oracleDefinition: 'Unity is not sameness. It is agreement under pressure.' }),
  puzzle({ id: 'LEY-039', name: 'Myrrh Wound', stars: 4, affinity: 'NECROTIC', type: 'myrrh-wound', prompt: 'Anoint the wound so death cannot mistake it for a door.', requiredTerms: [['myrrh', 'anoint'], ['wound', 'death', 'door']], requiredActions: [['anoint', 'ward', 'close']], forbiddenTerms: ['invite', 'open'], mana: [29, 46], oracleWord: 'ANOINTING', oracleDefinition: 'A boundary can be tender and absolute.' }),
  puzzle({ id: 'LEY-040', name: 'Celestial Alum', stars: 4, affinity: 'CELESTIAL', type: 'celestial-alum', prompt: 'Fix the star to the page without making the page a prison.', requiredTerms: [['alum'], ['star', 'page']], requiredActions: [['fix', 'mordant', 'bind']], forbiddenTerms: ['prison', 'cage'], mana: [30, 48], oracleWord: 'FIXATION', oracleDefinition: "To bind rightly is to preserve motion's dignity." }),

  puzzle({ id: 'LEY-041', name: 'Prima Materia Labyrinth', stars: 5, affinity: 'ALCHEMY', type: 'prima-materia-labyrinth', prompt: 'Name the first matter without giving it a final face.', requiredTerms: [['prima materia', 'first matter'], ['face', 'form', 'name']], requiredActions: [['name', 'veil', 'begin']], forbiddenTerms: ['final', 'complete', 'finished'], mana: [45, 70], oracleWord: 'ORIGIN', oracleDefinition: 'The first thing is powerful because it has not chosen a prison.' }),
  puzzle({ id: 'LEY-042', name: "Philosopher's Wound", stars: 5, affinity: 'VITAL', type: 'philosophers-wound', prompt: 'Heal the impossible cut by proving the stone is not a stone.', requiredTerms: [['philosopher', 'stone'], ['wound', 'cut']], requiredActions: [['heal', 'prove', 'transmute']], forbiddenTerms: ['ordinary', 'simple', 'fake'], mana: [44, 68], oracleWord: 'TRANSMUTATION', oracleDefinition: 'Healing is not repair. It is changed destiny.' }),
  puzzle({ id: 'LEY-043', name: 'Choir of Nine Metals', stars: 5, affinity: 'SONIC', type: 'choir-of-nine-metals', prompt: 'Conduct nine metals so none of them overthrows the chord.', requiredTerms: [['metal', 'metals'], ['choir', 'chord', 'nine']], requiredActions: [['conduct', 'harmonize', 'balance']], forbiddenTerms: ['solo', 'crown', 'overthrow'], mana: [46, 72], oracleWord: 'BALANCE', oracleDefinition: 'A kingdom of forces survives by negotiated music.' }),
  puzzle({ id: 'LEY-044', name: 'Eclipse Alembic', stars: 5, affinity: 'CELESTIAL', type: 'eclipse-alembic', prompt: 'Distill the sun through the moon without letting either disappear.', requiredTerms: [['sun'], ['moon'], ['alembic', 'distill']], requiredActions: [['distill', 'balance', 'preserve']], forbiddenTerms: ['erase', 'devour', 'vanish'], mana: [45, 70], oracleWord: 'SYZYGY', oracleDefinition: 'Alignment is dangerous because it makes separate powers speak at once.' }),
  puzzle({ id: 'LEY-045', name: 'Library of Rot', stars: 5, affinity: 'LORE', type: 'library-of-rot', prompt: 'Read the book that decays into truer sentences as you turn it.', requiredTerms: [['book', 'archive', 'library'], ['rot', 'decay'], ['sentence']], requiredActions: [['read', 'turn', 'extract']], forbiddenTerms: ['preserve', 'clean', 'restore'], mana: [43, 68], oracleWord: 'PUTREFACTION', oracleDefinition: 'Knowledge sometimes ripens by losing its first skin.' }),
  puzzle({ id: 'LEY-046', name: 'Entropy Crown', stars: 5, affinity: 'ENTROPY', type: 'entropy-crown', prompt: 'Remove the crown from decay without making order its tyrant.', requiredTerms: [['entropy', 'decay'], ['crown', 'order']], requiredActions: [['uncrown', 'reduce', 'rebalance']], forbiddenTerms: ['tyrant', 'command', 'freeze'], mana: [46, 74], oracleWord: 'ENTROPY', oracleDefinition: 'Collapse is not evil. Unwitnessed collapse is.' }),
  puzzle({ id: 'LEY-047', name: 'Void Crucifix of Glass', stars: 5, affinity: 'VOID', type: 'void-crucifix-of-glass', prompt: 'Hold nothing in a transparent vessel until it admits its outline.', requiredTerms: [['nothing', 'void'], ['glass', 'vessel'], ['outline']], requiredActions: [['hold', 'outline', 'contain']], forbiddenTerms: ['empty', 'meaningless', 'erase'], mana: [44, 71], oracleWord: 'NEGATION', oracleDefinition: 'Nothing becomes usable only when given a boundary.' }),
  puzzle({ id: 'LEY-048', name: 'Mythic Retort', stars: 5, affinity: 'PSYCHIC', type: 'mythic-retort', prompt: 'Condense a dream that knows it is being dreamed.', requiredTerms: [['dream'], ['retort', 'condense'], ['knows', 'aware']], requiredActions: [['condense', 'recognize', 'seal']], forbiddenTerms: ['wake', 'forget', 'sleepwalk'], mana: [45, 70], oracleWord: 'LUCIDITY', oracleDefinition: 'Awareness is the blade inside imagination.' }),
  puzzle({ id: 'LEY-049', name: 'Red King Solution', stars: 5, affinity: 'ALCHEMY', type: 'red-king-solution', prompt: 'Place the red king into solution and return him as a law, not a man.', requiredTerms: [['red king'], ['solution'], ['law']], requiredActions: [['dissolve', 'return', 'codify']], forbiddenTerms: ['man', 'throne', 'command'], mana: [47, 75], oracleWord: 'SOVEREIGNTY', oracleDefinition: 'True rule survives the loss of its body.' }),
  puzzle({ id: 'LEY-050', name: 'Mirrorborne Ley', stars: 5, affinity: 'CODEX', type: 'mirrorborne-ley', prompt: 'Speak to the mirror until it answers with your future grammar.', requiredTerms: [['mirror'], ['future', 'grammar'], ['answer']], requiredActions: [['speak', 'reflect', 'encode']], forbiddenTerms: ['copy', 'repeat', 'mimic'], mana: [50, 80], oracleWord: 'MIRRORBORNE', oracleDefinition: 'To reflect is not to copy. It is to become accountable.' }),
]);

/**
 * Generates battle leylines deterministically from seed.
 * @param {Object} params
 * @param {number} params.battleSeed
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {Object[]} [params.blockedCoords]
 * @param {number} [params.count]
 * @returns {import('./battle.schemas').Leyline[]}
 */
export function generateBattleLeylines({
  battleSeed,
  width = 9,
  height = 9,
  blockedCoords = [],
  count = 3
}) {
  const random = createSeededRandom(battleSeed);
  const leylines = [];
  const occupied = new Set(blockedCoords.map(c => `${c.x},${c.y}`));

  for (let index = 0; index < count; index += 1) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    let coordKey = '';

    while (attempts < 50) {
      x = Math.floor(random() * width);
      y = Math.floor(random() * height);
      coordKey = `${x},${y}`;
      if (!occupied.has(coordKey)) {
        break;
      }
      attempts += 1;
    }

    occupied.add(coordKey);

    const puzzleConfig = LEYLINE_PUZZLE_CODEX[Math.floor(random() * LEYLINE_PUZZLE_CODEX.length)];
    const stars = puzzleConfig.stars;
    const minScore = puzzleConfig.minScore;

    // active opportunities
    const activeTurnStart = 2 + index * 2;
    const activeTurnEnd = activeTurnStart + 2;

    const baseLeyline = {
      id: `ley_${index + 1}_${stableHash(coordKey + ':' + puzzleConfig.id).toString(16)}`,
      codexId: puzzleConfig.id,
      name: puzzleConfig.name,
      coord: { x, y },
      affinity: puzzleConfig.affinity,
      type: puzzleConfig.type,
      stars,
      activeTurnStart,
      activeTurnEnd,
      extractionProfile: {
        domain: puzzleConfig.domain,
        prompt: puzzleConfig.prompt,
        requiredTerms: puzzleConfig.requiredTerms,
        requiredActions: puzzleConfig.requiredActions,
        forbiddenTerms: puzzleConfig.forbiddenTerms,
        literaryConstraints: puzzleConfig.literaryConstraints,
        oracleSeed: puzzleConfig.oracleSeed,
        minScore
      },
      rewardProfile: {
        manaMin: puzzleConfig.manaMin,
        manaMax: puzzleConfig.manaMax,
        superchargeThreshold: Math.min(0.98, Number((minScore + 0.08).toFixed(2))),
        instabilityRisk: Number((0.05 + stars * 0.04).toFixed(2))
      }
    };

    const checksumPayload = stableStringify({
      id: baseLeyline.id,
      codexId: baseLeyline.codexId,
      name: baseLeyline.name,
      coord: baseLeyline.coord,
      affinity: baseLeyline.affinity,
      type: baseLeyline.type,
      stars: baseLeyline.stars,
      activeTurnStart: baseLeyline.activeTurnStart,
      activeTurnEnd: baseLeyline.activeTurnEnd,
      extractionProfile: baseLeyline.extractionProfile,
      rewardProfile: baseLeyline.rewardProfile
    });

    const checksum = `LEY-${stableHash(checksumPayload).toString(16).toUpperCase()}`;

    leylines.push({
      ...baseLeyline,
      checksum
    });
  }

  return leylines;
}

/**
 * Calculates current phase of a leyline.
 * @param {import('./battle.schemas').Leyline} leyline 
 * @param {number} playerTurnIndex 
 * @param {string[]} [spentLeylineIds] 
 * @returns {import('./battle.schemas').LeylinePhase}
 */
export function getLeylinePhase(leyline, playerTurnIndex, spentLeylineIds = []) {
  if (spentLeylineIds.includes(leyline.id)) {
    return 'spent';
  }
  if (playerTurnIndex < leyline.activeTurnStart - 1) {
    return 'dormant';
  }
  if (playerTurnIndex === leyline.activeTurnStart - 1) {
    return 'charging';
  }
  if (playerTurnIndex >= leyline.activeTurnStart && playerTurnIndex < leyline.activeTurnEnd) {
    return 'glowing';
  }
  if (playerTurnIndex === leyline.activeTurnEnd) {
    return 'fading';
  }
  return 'spent';
}

/**
 * Scores a verbal alchemy extraction phrase.
 * @param {string} phrase 
 * @param {import('./battle.schemas').Leyline} leyline 
 * @param {Object} [player] 
 * @returns {Object}
 */
export function scoreExtraction(phrase, leyline, player = {}) {
  const normalizedPhrase = String(phrase || '').trim().toLowerCase();
  const tokens = tokenize(normalizedPhrase);

  if (tokens.length === 0) {
    return {
      ok: false,
      extractionScore: 0,
      result: 'FAILED',
      manaExtracted: 0,
      instability: false,
      diagnostics: ['Empty extraction phrase.']
    };
  }

  const {
    requiredTerms = [],
    requiredActions = [],
    forbiddenTerms = [],
    literaryConstraints = null,
    minScore
  } = leyline.extractionProfile;
  const { manaMin, manaMax, superchargeThreshold } = leyline.rewardProfile;

  // 1. Required Terms Coverage
  let matchedTermsCount = 0;
  const matchedTermsLog = [];
  requiredTerms.forEach(group => {
    const matched = group.some(syn => tokens.some(t => t.includes(syn)) || normalizedPhrase.includes(syn));
    if (matched) {
      matchedTermsCount += 1;
      matchedTermsLog.push(`Matched term group: [${group.join('/')}]`);
    }
  });

  // 2. Required Actions Coverage
  let matchedActionsCount = 0;
  const matchedActionsLog = [];
  requiredActions.forEach(group => {
    const matched = group.some(syn => tokens.some(t => t.includes(syn)) || normalizedPhrase.includes(syn));
    if (matched) {
      matchedActionsCount += 1;
      matchedActionsLog.push(`Matched action group: [${group.join('/')}]`);
    }
  });

  // 3. Forbidden Terms Penalty
  const detectedForbidden = [];
  forbiddenTerms.forEach(term => {
    const matched = tokens.some(t => t.includes(term)) || normalizedPhrase.includes(term);
    if (matched) {
      detectedForbidden.push(term);
    }
  });

  // Calculate Base Match Scores
  const termScore = requiredTerms.length > 0 ? (matchedTermsCount / requiredTerms.length) * 0.35 : 0.35;
  const actionScore = requiredActions.length > 0 ? (matchedActionsCount / requiredActions.length) * 0.35 : 0.35;
  const forbiddenPenalty = detectedForbidden.length * 0.20;

  // 4. Affinity Match
  const affinityMatch = player.school === leyline.affinity ? 0.10 : 0.0;

  // 5. Verbal Quality (richness/length bonus)
  const verbalQuality = Math.min(tokens.length / 10, 1.0) * 0.10;

  // 6. Stat Rating Bonus (Myth + Codex + Affinity rating)
  const ratings = player.loreRatings || player.stats || {};
  const myth = Number(ratings.MYTH) || 0;
  const codex = Number(ratings.CODEX) || 0;
  const affinityRating = Number(ratings[leyline.affinity]) || 0;
  const statBonus = Math.max(0, Math.min((myth + codex + affinityRating) * 0.015, 0.12));

  const alchemyScore = clamp01(termScore + actionScore + affinityMatch + verbalQuality + statBonus);
  const literaryScore = scoreLiteraryConstraints(normalizedPhrase, literaryConstraints);
  const weightsByStars = {
    1: { alchemy: 1, literary: 0 },
    2: { alchemy: 0.9, literary: 0.1 },
    3: { alchemy: 0.8, literary: 0.2 },
    4: { alchemy: 0.65, literary: 0.35 },
    5: { alchemy: 0.5, literary: 0.5 },
  };
  const weights = literaryConstraints
    ? (weightsByStars[Number(leyline.stars) || 1] || weightsByStars[1])
    : { alchemy: 1, literary: 0 };

  let score = (alchemyScore * weights.alchemy) + (literaryScore.score * weights.literary) - forbiddenPenalty;
  score = clampBetween(Number(score.toFixed(3)), 0, 1.0);

  // Diagnostics
  const diagnostics = [];
  requiredTerms.forEach((group) => {
    const matched = group.some(syn => tokens.some(t => t.includes(syn)) || normalizedPhrase.includes(syn));
    diagnostics.push(`${matched ? '✓' : '✗'} Required term group [${group.join(', ')}]`);
  });
  requiredActions.forEach((group) => {
    const matched = group.some(syn => tokens.some(t => t.includes(syn)) || normalizedPhrase.includes(syn));
    diagnostics.push(`${matched ? '✓' : '✗'} Required action group [${group.join(', ')}]`);
  });
  detectedForbidden.forEach(term => {
    diagnostics.push(`! Forbidden word detected: "${term}"`);
  });
  if (affinityMatch > 0) {
    diagnostics.push(`✓ School affinity match: +0.10`);
  }
  if (literaryConstraints) {
    diagnostics.push(...literaryScore.diagnostics);
  }

  // Result verification
  const ok = score >= minScore && literaryScore.requiredOk;
  let result = 'FAILED';
  let manaExtracted = 0;

  if (ok) {
    result = score >= superchargeThreshold ? 'SUPERCHARGED' : 'SUCCESS';
    // Interpolate mana deterministically
    const scale = (score - minScore) / Math.max(0.01, 1.0 - minScore);
    manaExtracted = Math.round(manaMin + (manaMax - manaMin) * scale);
    manaExtracted = Math.max(manaMin, Math.min(manaMax, manaExtracted));
  }

  // Instability is driven by linguistic coherence, not chance: a sloppily-phrased
  // extraction destabilizes the scholar regardless of whether it scored. Higher-value
  // leylines demand more articulate phrasing to harvest cleanly.
  const coherence = computeLinguisticCoherence(normalizedPhrase);
  const coherenceFloor = Math.min(0.75, 0.30 + (Number(leyline.stars) || 1) * 0.06);
  const instability = coherence < coherenceFloor;

  if (instability) {
    const reasons = diagnoseLinguisticCoherence(normalizedPhrase, coherenceFloor);
    diagnostics.push(`! UNSTABLE: coherence ${(coherence * 100).toFixed(0)}% < required ${(coherenceFloor * 100).toFixed(0)}% because ${reasons.join('; ')}.`);
  }

  return {
    ok,
    extractionScore: score,
    result,
    manaExtracted,
    instability,
    coherence,
    diagnostics
  };
}
