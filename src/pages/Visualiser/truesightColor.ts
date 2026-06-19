import { PhonemeEngine, generateSchoolColor } from '../../lib/engine.adapter.js';

// Color hygiene: function words stay neutral so colour marks meaning, not noise.
export const VISUALISER_FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
  'with', 'from', 'into', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its',
  'i', 'we', 'you', 'he', 'she', 'they', 'me', 'my', 'your', 'his', 'her', 'our', 'their',
  'this', 'that', 'these', 'those', 'where', 'what', 'when', 'who', 'all', 'no', 'not',
  'so', 'if', 'then', 'than', 'through', 'still', 'do', 'will', 'would', 'can',
]);

export function cleanVisualiserWord(word: string): string {
  return String(word || '').replace(/[^A-Za-z]/g, '');
}

/** Truesight: a content word's dominant vowel family -> school -> colour.
 * School resolution goes through the engine's own resolver, which normalizes
 * alias families (OO -> UH, YUW -> UW, ...) before the school lookup — a raw
 * map hit would silently disagree with every normalized consumer. */
export function wordTruesight(word: string): { color: string; school: string; analysis: any } | null {
  const clean = cleanVisualiserWord(word);
  if (!clean) return null;
  if (VISUALISER_FUNCTION_WORDS.has(clean.toLowerCase())) return null;
  // Contractions: "I'm" → stem "i", "you're" → stem "you", etc.
  const apostrophe = String(word || '').indexOf("'");
  if (apostrophe > 0) {
    const stem = word.slice(0, apostrophe).replace(/[^A-Za-z]/g, '').toLowerCase();
    if (stem && VISUALISER_FUNCTION_WORDS.has(stem)) return null;
  }
  const engine = PhonemeEngine as {
    analyzeDeep?: (w: string) => any | null;
    getSchoolFromVowelFamily?: (f: string) => string | null;
  };
  const analysis = engine.analyzeDeep?.(clean) || null;
  const family = analysis?.vowelFamily;
  const school = (family && engine.getSchoolFromVowelFamily?.(family)) || 'VOID';
  return { color: generateSchoolColor(school), school, analysis };
}
