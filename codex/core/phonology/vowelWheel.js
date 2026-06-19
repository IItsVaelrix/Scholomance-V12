/**
 * Vowel Wheel — Phonemic Color & Viseme System
 *
 * Hue assignments follow three converging bodies of research:
 *
 *   1. Cross-modal correspondence (Marks 1975; Spence & Deroy 2012):
 *      Higher F2 (spectral brightness) → cooler/brighter hues (blue, cyan).
 *      Higher F1 (openness/loudness) → warmer hues (red, orange).
 *
 *   2. Chromesthesia / grapheme-color synesthesia (Ward & Simner 2003;
 *      Simner et al. 2006; Cytowic 2002):
 *      Canonical anchors — /i/ → blue-white; /a/ → red-orange; /u/ → deep blue.
 *      Intermediate vowels interpolate around the spectral arc.
 *
 *   3. Perceptual color-space geometry (Kim & Kim 2017; Brang et al. 2011):
 *      The IPA vowel chart (F1 vs F2) maps topologically onto the hue wheel.
 *      Adjacent vowels in formant space receive adjacent hues.
 *
 * Formant reference: Peterson & Barney (1952), updated by Hillenbrand et al.
 * (1995) — averaged across male, female, and child speakers.
 *
 * Column guide:   Family  |  F1 (Hz)  |  F2 (Hz)  |  perceptual anchor
 *   IY              270      2290         blue-white (highest F2)
 *   IH              390      1990         cyan-blue
 *   EY              530      1840         teal  (diphthong glides into IY)
 *   EH              610      1720         green (open-mid front)
 *   AE              860      1550         gold  (near-open, warmth from high F1)
 *   AA              730      1090         red   (open back — /a/ anchor)
 *   AH              640      1190         orange-red (open-mid central)
 *   AO              570       840         orange (open-mid back, rounded)
 *   OW              460      1100         amber  (mid-back, closing diphthong)
 *   UH              440      1020         violet (near-close back, dark/round)
 *   UW              300       870         deep blue (close back — /u/ anchor)
 *   ER              490      1350         amber-brown (r-colored central)
 *   AX              500      1500         grey-blue (schwa: neutral, unstressed)
 *   AY (diphthong AE→IY)  perceptual midpoint: yellow-green
 *   AW (diphthong AA→UW)  perceptual midpoint wraps around spectrum: crimson
 *   OY (diphthong AO→IY)  perceptual midpoint: purple
 *   UR (diphthong UH→ER)  near-UH territory: violet-amber
 */

/**
 * Hue (degrees, 0-360) for each canonical ARPAbet vowel family.
 * Used by getVowelHue() → resolveSonicChroma() → the HSL sonic color path.
 * The OKLCh path (resolveVerseIrColor) uses school colorHsl + PCA projection
 * and is independent of this table.
 */
export const VOWEL_HUE_MAP = Object.freeze({
  // ── Front vowels: high F2 → cool, bright ─────────────────────────────────
  IY: 210,   // close front        F2=2290  electric blue  (Ward & Simner /i/)
  IH: 193,   // near-close front   F2=1990  cyan
  EY: 163,   // close-mid front    F2=1840  teal (glides toward IY)
  EH: 142,   // open-mid front     F2=1720  green (F2 still high, F1 rising)

  // ── Near-open / open: high F1 adds warmth ────────────────────────────────
  AE:  52,   // near-open front    F1=860   gold  (Marks: open = warm)
  AA:  12,   // open back          F1=730   red   (Cytowic /a/ → red)
  AH:  20,   // open-mid central   F1=640   orange-red
  AO:  33,   // open-mid back      F1=570   orange  (rounded, warm)

  // ── Mid-back closing diphthong ────────────────────────────────────────────
  OW:  44,   // close-mid back     F2=1100  amber-orange (diphthong glides up)

  // ── Back vowels: low F2, rounded → dark/purple ───────────────────────────
  UH: 268,   // near-close back    F2=1020  violet  (dark, rounded)
  UW: 248,   // close back         F2= 870  deep blue (Cytowic /u/ → dark blue)

  // ── Rhotic / central ─────────────────────────────────────────────────────
  ER:  28,   // mid-central rhotic F2=1350  amber-brown (earthy; Jürgens 2007)
  AX: 215,   // mid-central schwa  F2=1500  grey-blue   (neutral, unstressed)

  // ── Diphthongs: perceptual arc midpoints ─────────────────────────────────
  AY:  72,   // AE→IY: warm→cool arc    yellow-green (Brang 2011 midpoint)
  AW: 332,   // AA→UW: red→blue arc     wraps through crimson
  OY: 283,   // AO→IY: orange→blue arc  purple
  UR: 272,   // UH→ER: violet→amber     violet-earthy
});

/**
 * V12 Canonical Identity Map
 *
 * Maps every surface-level variant (including alias spellings, legacy IDs,
 * G2P outputs) to a canonical ARPAbet family that has an entry in
 * VOWEL_HUE_MAP and PCA_VOWEL_FORMANTS.
 *
 * Rules (per Vaelrix Law 8):
 *   - Canonical families map to themselves.
 *   - Alias folds are one-directional (alias → canonical) and documented.
 *   - No circular folds.
 */
export const FAMILY_IDENTITY = Object.freeze({
  // Canonical — each maps to itself
  IY: 'IY', IH: 'IH', EY: 'EY', EH: 'EH', AE: 'AE',
  AA: 'AA', AH: 'AH', AO: 'AO', OW: 'OW', UH: 'UH',
  UW: 'UW', ER: 'ER', AX: 'AX',
  AY: 'AY', AW: 'AW', OY: 'OY', UR: 'UR',

  // Notation aliases — same vowel, alternate spelling
  OH:  'OW',   // OH is a common notation for OW ("go")
  OO:  'UH',   // OO = "book" vowel /ʊ/ = UH
  EE:  'IY',   // EE = "see" vowel
  IN:  'IH',   // IN notation used by some G2P engines
  A:   'AA',   // bare "A" shorthand → open back

  // Y-glide variants — the /j/ onset folds into the base nucleus
  YUW: 'UW',   // "you" /juː/
  YOO: 'UW',   // alternate spelling of YUW
  YOW: 'OW',   // "yo" with closing diphthong (rare)

  // Diphthong alternates
  AI:  'AY',   // alternate romanization for /aɪ/
  OI:  'OY',   // alternate romanization for /ɔɪ/
  OU:  'OW',   // British/IPA "ou" → OW nucleus
  OUR: 'UR',   // "our" /aʊər/ reduced form
});

/**
 * Viseme Metrics
 *
 * Visual properties derived from articulatory phonetics (Stevens 1998;
 * Ladefoged & Johnson 2014):
 *
 *   radius    — corner radius (px). Inversely proportional to F1 (jaw height):
 *               open vowels have large mouth aperture → large visual radius.
 *               close vowels have small aperture → sharp, angular tokens.
 *
 *   tracking  — letter-spacing (em). Positive for spread lips (front vowels);
 *               negative for rounded/pursed lips (back vowels).
 *               Based on lip aperture width norms (Maeda 1990).
 *
 *   skew      — rotational tilt (deg). Positive (rightward) for front vowels
 *               reflecting tongue advancement; negative for back retraction.
 *               Central vowels at zero.
 */
export const VISEME_METRICS = Object.freeze({
  // ── Front, spread ────────────────────────────────────────────────────────
  IY: { radius:  2, tracking:  0.12, skew:  8 },  // close front — sharpest
  IH: { radius:  3, tracking:  0.08, skew:  6 },  // near-close front
  EY: { radius:  4, tracking:  0.06, skew:  5 },  // close-mid front
  EH: { radius:  5, tracking:  0.05, skew:  4 },  // open-mid front

  // ── Near-open / open ─────────────────────────────────────────────────────
  AE: { radius:  7, tracking:  0.10, skew:  3 },  // near-open front (wide)
  AA: { radius: 11, tracking:  0.14, skew:  0 },  // open back — widest jaw
  AH: { radius:  9, tracking:  0.11, skew:  1 },  // open-mid central
  AO: { radius:  8, tracking: -0.02, skew: -2 },  // open-mid back, rounded

  // ── Back, rounded ─────────────────────────────────────────────────────────
  OW: { radius:  7, tracking: -0.04, skew: -3 },  // close-mid back
  UH: { radius:  5, tracking: -0.06, skew: -4 },  // near-close back
  UW: { radius:  3, tracking: -0.09, skew: -6 },  // close back — most rounded

  // ── Central / rhotic ─────────────────────────────────────────────────────
  ER: { radius:  5, tracking:  0.02, skew:  0 },  // r-colored mid-central
  AX: { radius:  5, tracking:  0.00, skew:  0 },  // schwa (neutral baseline)

  // ── Diphthongs: metrics reflect the stressed onset position ──────────────
  AY: { radius:  7, tracking:  0.09, skew:  3 },  // starts near AE
  AW: { radius:  9, tracking:  0.06, skew: -1 },  // starts near AA
  OY: { radius:  7, tracking: -0.03, skew: -2 },  // starts near AO
  UR: { radius:  4, tracking: -0.05, skew: -4 },  // starts near UH
});

/**
 * Resolves the fixed hue for a given ARPAbet vowel.
 * Strips stress digits and normalises via FAMILY_IDENTITY before lookup.
 *
 * @param {string} vowel - ARPAbet vowel, optionally with stress digit (e.g. "IY1", "AA0").
 * @returns {number} Hue in degrees [0, 360).
 */
export function getVowelHue(vowel) {
  const base = String(vowel || '').replace(/[0-2]/g, '').toUpperCase().trim();
  const canonical = FAMILY_IDENTITY[base] || base;
  return VOWEL_HUE_MAP[canonical] ?? 215;
}
