import {
  ENTITY_TYPES,
  INTENT_KEYWORDS,
  SUBJECT_KEYWORDS,
  MATERIAL_KEYWORDS,
  COLOR_KEYWORDS,
  STYLE_KEYWORDS,
  LIGHTING_KEYWORDS,
  MOOD_KEYWORDS
} from './constants.js';
import { LEXICAL_VISUAL_DB } from '../../semantic/visual-extractor.js';

// Inline keyword groups also matched by extractEntities (kept in sync below).
const COMPOSITION_KEYWORDS = ['centered', 'symmetric', 'radial', 'spiral', 'balanced', 'asymmetric'];
const EFFECT_KEYWORDS = ['fire', 'ice', 'lightning', 'glow', 'sparkle', 'shadow', 'wind', 'storm'];

// Common function words that are never visual subjects. Words shorter than the
// length gate (< 4) don't need listing here; this covers the longer ones.
const STOPWORDS = new Set([
  'this', 'that', 'these', 'those', 'with', 'into', 'from', 'over', 'under',
  'your', 'their', 'them', 'they', 'will', 'would', 'could', 'should', 'have',
  'very', 'really', 'just', 'some', 'more', 'most', 'than', 'then', 'when',
  'what', 'which', 'where', 'while', 'about', 'around', 'like', 'looks',
]);

const MIN_CANDIDATE_LENGTH = 4;

/**
 * Every word the closed-vocabulary extractor can already recognize, used to
 * decide whether a token is out-of-vocabulary (OOV).
 */
const KNOWN_WORDS = (() => {
  const known = new Set();
  const addAll = (arr) => { for (const w of arr) known.add(w); };

  addAll(SUBJECT_KEYWORDS);
  addAll(COMPOSITION_KEYWORDS);
  addAll(EFFECT_KEYWORDS);
  for (const group of [
    INTENT_KEYWORDS, MATERIAL_KEYWORDS, COLOR_KEYWORDS,
    STYLE_KEYWORDS, LIGHTING_KEYWORDS, MOOD_KEYWORDS,
  ]) {
    for (const keywords of Object.values(group)) addAll(keywords);
  }
  for (const key of LEXICAL_VISUAL_DB.keys()) known.add(key);

  return known;
})();

/**
 * Extract entities from tokens
 * @param {Object} payload - { tokens: string[], fullText: string }
 * @returns {Object} entities
 */
export function extractEntities({ tokens, fullText }) {
  const entities = {
    [ENTITY_TYPES.SUBJECT]: [],
    [ENTITY_TYPES.MATERIAL]: [],
    [ENTITY_TYPES.COLOR]: [],
    [ENTITY_TYPES.STYLE]: [],
    [ENTITY_TYPES.EFFECT]: [],
    [ENTITY_TYPES.LIGHTING]: [],
    [ENTITY_TYPES.COMPOSITION]: [],
    [ENTITY_TYPES.MOOD]: [],
  };
  
  // Extract subjects
  for (const subject of SUBJECT_KEYWORDS) {
    if (tokens.includes(subject)) {
      entities[ENTITY_TYPES.SUBJECT].push(subject);
    }
  }
  
  // Extract materials
  for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (tokens.includes(keyword)) {
        entities[ENTITY_TYPES.MATERIAL].push(material);
        break;
      }
    }
  }
  
  // Extract colors
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (tokens.includes(keyword)) {
        entities[ENTITY_TYPES.COLOR].push(color);
        break;
      }
    }
  }
  
  // Extract styles
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (tokens.includes(keyword) || fullText.toLowerCase().includes(keyword)) {
        entities[ENTITY_TYPES.STYLE].push(style);
        break;
      }
    }
  }
  
  // Extract lighting
  for (const [lighting, keywords] of Object.entries(LIGHTING_KEYWORDS)) {
    for (const keyword of keywords) {
      if (tokens.includes(keyword)) {
        entities[ENTITY_TYPES.LIGHTING].push(lighting);
        break;
      }
    }
  }
  
  // Extract mood
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (tokens.includes(keyword)) {
        entities[ENTITY_TYPES.MOOD].push(mood);
        break;
      }
    }
  }
  
  // Extract composition keywords
  const compositionKeywords = ['centered', 'symmetric', 'radial', 'spiral', 'balanced', 'asymmetric'];
  for (const keyword of compositionKeywords) {
    if (tokens.includes(keyword)) {
      entities[ENTITY_TYPES.COMPOSITION].push(keyword);
    }
  }
  
  // Extract effects
  const effectKeywords = ['fire', 'ice', 'lightning', 'glow', 'sparkle', 'shadow', 'wind', 'storm'];
  for (const keyword of effectKeywords) {
    if (tokens.includes(keyword) && !entities[ENTITY_TYPES.SUBJECT].includes(keyword)) {
      entities[ENTITY_TYPES.EFFECT].push(keyword);
    }
  }
  
  // Deduplicate
  for (const key of Object.keys(entities)) {
    entities[key] = [...new Set(entities[key])];
  }

  return Object.freeze(entities);
}

/**
 * Pick the single best out-of-vocabulary token for subject resolution.
 *
 * Returns the leftmost token that the closed-vocabulary extractor could not
 * recognize, so a downstream resolver can map it onto a known subject. Only
 * fires when no subject was extracted (the conservative trigger policy).
 *
 * Pure and deterministic — no I/O.
 *
 * @param {string[]} tokens - Tokenized prompt.
 * @param {Object} entities - Result of extractEntities (reads SUBJECT slot).
 * @returns {string|null} The OOV candidate, or null if none qualifies.
 */
export function selectOOVCandidate(tokens, entities) {
  const subjects = entities?.[ENTITY_TYPES.SUBJECT] ?? [];
  if (subjects.length > 0) return null;
  if (!Array.isArray(tokens)) return null;

  for (const token of tokens) {
    if (typeof token !== 'string') continue;
    if (token.length < MIN_CANDIDATE_LENGTH) continue;
    if (!/^[a-z]+$/.test(token)) continue;
    if (STOPWORDS.has(token)) continue;
    if (KNOWN_WORDS.has(token)) continue;
    return token;
  }

  return null;
}