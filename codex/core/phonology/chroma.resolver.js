/**
 * Sonic Color Logic (SCL) Resolver
 * Translates ARPAbet phoneme sequences into deterministic HSL chroma signatures.
 */

import { getVowelHue } from '../../../src/lib/phonology/vowelWheel.js';

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
    if (getVowelHue(base) !== 180 || base === 'AA') { // 180 is the default/fallback
      nucleus = base;
      stress = p.match(/[0-2]/) ? parseInt(p.match(/[0-2]/)[0]) : 1;
      nucleusIndex = i;
      break;
    }
  }

  if (!nucleus) {
    return { h: 180, s: 0, l: 40, bytecode: 'PB-CHROMA-NULL' };
  }

  // 2. Resolve Hue (H) from Nucleus
  const h = getVowelHue(nucleus);

  // 3. Resolve Saturation (S) from Coda (Consonants after Nucleus)
  const coda = phonemes.slice(nucleusIndex + 1);
  let codaWeight = 0;
  coda.forEach(p => {
    const base = p.replace(/[0-2]/g, '');
    codaWeight += (CODA_SONORITY_WEIGHT[base] || 0);
  });

  // Base saturation 65%, plus weight up to 35%
  const s = Math.min(100, 65 + (codaWeight * 6));

  // 4. Resolve Lightness (L) from Stress
  // Stress 1 = 60%, Stress 2 = 50%, Stress 0 = 40%
  let l = 50;
  if (stress === 1) l = 60;
  if (stress === 0) l = 45;

  // 5. Generate Bytecode Artifact (PB-CHROMA-v1)
  // Encoded as: H(3 chars) S(2 chars) L(2 chars) nucleus(2 chars)
  const hueHex = h.toString(16).padStart(3, '0');
  const satHex = s.toString(16).padStart(2, '0');
  const litHex = l.toString(16).padStart(2, '0');
  const bytecode = `PB-CHROMA-${hueHex}${satHex}${litHex}${nucleus}`;

  return { h, s, l, bytecode };
}
