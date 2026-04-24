/**
 * Vowel Color Wheel
 * Maps ARPAbet vowels to fixed hue positions on the 360-degree color wheel.
 * Aligned with RhymeDesign-style linguistic visualization.
 */

export const VOWEL_HUE_MAP = Object.freeze({
  'IY': 0,    // Lime (High Front) - 0
  'IH': 30,   // Yellow-Green - 30
  'EY': 60,   // Yellow - 60
  'EH': 90,   // Gold - 90
  'AE': 120,  // Orange (Low Front) - 120
  'AA': 180,  // Red (Low Back) - 180
  'AH': 150,  // Orange-Red - 150
  'AO': 210,  // Deep Blue (Low Back Round) - 210
  'OW': 240,  // Indigo - 240
  'UH': 270,  // Violet - 270
  'UW': 300,  // Magenta (High Back) - 300
  'ER': 330,  // Rose - 330
  'AY': 45,   // Yellow-Orange (Diphthong IY-AA blend)
  'AW': 165,  // Red-Orange (Diphthong AA-UW blend)
  'OY': 225,  // Blue-Violet (Diphthong AO-IY blend)
  'UR': 315,  // Pink
});

/**
 * Resolves the fixed hue for a given ARPAbet vowel.
 * @param {string} vowel - ARPAbet vowel (e.g. "IY", "AA1")
 * @returns {number} Hue in degrees (0-360)
 */
export function getVowelHue(vowel) {
  const base = String(vowel || '').replace(/[0-2]/g, '').toUpperCase();
  return VOWEL_HUE_MAP[base] ?? 180; // Default to AA-like Red if unknown
}

// Coda weight for Saturation
const CODA_SONORITY_WEIGHT = {
  'P': 5, 'T': 5, 'K': 5,  // Plosives - Sharp, saturated
  'B': 4, 'D': 4, 'G': 4,
  'F': 3, 'S': 3, 'TH': 3, // Fricatives - Less saturated
  'V': 2, 'Z': 2, 'DH': 2,
  'M': 1, 'N': 1, 'NG': 1, // Nasals - Soft, muted
  'L': 1, 'R': 1,          // Liquids
};

/**
 * Resolves a ChromaSignature from a phoneme sequence.
 * This is a UI-safe bridge for phonetic color resolution.
 * @param {string[]} phonemes ARPAbet phonemes (e.g. ["L", "AO1", "F", "T"])
 * @returns {{h: number, s: number, l: number, bytecode: string}}
 */
export function resolveSonicChroma(phonemes = []) {
  if (!phonemes || phonemes.length === 0) {
    return { h: 0, s: 0, l: 50, bytecode: 'PB-CHROMA-0000' };
  }

  let nucleus = null;
  let stress = 1;
  let nucleusIndex = -1;

  // 1. Identify Nucleus (Stressed Vowel)
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    const base = p.replace(/[0-2]/g, '').toUpperCase();
    if (getVowelHue(base) !== 180 || base === 'AA') { 
      nucleus = base;
      stress = p.match(/[0-2]/) ? parseInt(p.match(/[0-2]/)[0]) : 1;
      nucleusIndex = i;
      break;
    }
  }

  if (!nucleus) {
    return { h: 180, s: 0, l: 40, bytecode: 'PB-CHROMA-NULL' };
  }

  const h = getVowelHue(nucleus);

  const coda = phonemes.slice(nucleusIndex + 1);
  let codaWeight = 0;
  coda.forEach(p => {
    const base = p.replace(/[0-2]/g, '');
    codaWeight += (CODA_SONORITY_WEIGHT[base] || 0);
  });

  const s = Math.min(100, 65 + (codaWeight * 6));

  let l = 50;
  if (stress === 1) l = 60;
  if (stress === 0) l = 45;

  const hueHex = h.toString(16).padStart(3, '0');
  const satHex = s.toString(16).padStart(2, '0');
  const litHex = l.toString(16).padStart(2, '0');
  const bytecode = `PB-CHROMA-${hueHex}${satHex}${litHex}${nucleus}`;

  return { h, s, l, bytecode };
}

