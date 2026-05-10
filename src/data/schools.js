/**
 * Scholomance School Configuration
 * 
 * Defines all schools of magic with their visual properties,
 * unlock requirements, and progression data.
 * 
 * Angle spacing: 360° / 8 positions = 45° per school
 * This leaves room for 8 schools (current 5 + 3 future)
 */

import { 
  SCHOOLS as CORE_SCHOOLS, 
  VOWEL_FAMILY_TO_SCHOOL as CORE_VOWEL_MAPPING,
  computeSchoolWeights,
  computeSchoolWeightsFromHints,
  computeDominantSchool,
  generateSchoolColor as coreGenerateSchoolColor
} from '../../codex/core/constants/schools.js';

import { hslToHex } from '../../codex/core/pixelbrain/shared.js';

/**
 * Canonical mapping from ARPAbet vowel family to school of magic.
 */
export const VOWEL_FAMILY_TO_SCHOOL = CORE_VOWEL_MAPPING;

export {
  computeSchoolWeights,
  computeSchoolWeightsFromHints,
  computeDominantSchool
};

export const SCHOOLS = {
  ...CORE_SCHOOLS,
  // Add UI-only properties back to core schools
  SONIC: {
    ...CORE_SCHOOLS.SONIC,
    description: "The art of sonic manipulation and harmonic resonance",
    tracks: ["sonic_harmony"],
    vowelAffinities: ["AE", "EH"],
  },
  PSYCHIC: {
    ...CORE_SCHOOLS.PSYCHIC,
    description: "Mental discipline and psychic energy projection",
    tracks: ["schism"],
    vowelAffinities: ["IY", "IH"],
  },
  VOID: {
    ...CORE_SCHOOLS.VOID,
    description: "The space between spaces, where entropy reigns",
    tracks: ["void"],
    vowelAffinities: ["AX", "UH"],
  },
  ALCHEMY: {
    ...CORE_SCHOOLS.ALCHEMY,
    description: "The transmutation of meaning through spoken word",
    tracks: ["alchemy"],
    vowelAffinities: ["EY", "OY"],
  },
  WILL: {
    ...CORE_SCHOOLS.WILL,
    description: "Focusing raw will into reality-altering force",
    tracks: ["will"],
    vowelAffinities: ["AH"],
  },
  NECROMANCY: {
    ...CORE_SCHOOLS.NECROMANCY,
    description: "Communication with and manipulation of life force",
    tracks: [],
    vowelAffinities: ["AA", "A"],
  },
  ABJURATION: {
    ...CORE_SCHOOLS.ABJURATION,
    description: "Protective magic and negation of effects",
    tracks: [],
    vowelAffinities: ["UW", "OW"],
  },
  DIVINATION: {
    ...CORE_SCHOOLS.DIVINATION,
    description: "Seeing across time and space",
    tracks: [],
    vowelAffinities: ["AO", "AW"],
  },
};

/**
 * Get all schools sorted by unlock requirement
 * @returns {Array<School>} Sorted schools array
 */
export function getSchoolsByUnlock() {
  return Object.values(SCHOOLS).sort((a, b) => a.unlockXP - b.unlockXP);
}

/**
 * Get school by ID
 * @param {string} id - School ID (e.g., "SONIC")
 * @returns {School|undefined} School configuration
 */
export function getSchoolById(id) {
  return SCHOOLS[id];
}

/**
 * Check if a school is unlocked based on XP
 * @param {string} schoolId - School to check
 * @param {number} currentXP - Current experience points
 * @returns {boolean} Whether school is unlocked
 */
export function isSchoolUnlocked(schoolId, currentXP) {
  const school = SCHOOLS[schoolId];
  if (!school) return false;
  return currentXP >= school.unlockXP;
}

/**
 * Get lock tier for a school based on XP proximity
 * @param {string} schoolId - School to check
 * @param {number} currentXP - Current experience points
 * @returns {"unlocked"|"near"|"approaching"|"distant"} Lock tier
 */
export function getLockTier(schoolId, currentXP) {
  const school = SCHOOLS[schoolId];
  if (!school) return "distant";
  if (currentXP >= school.unlockXP) return "unlocked";
  const ratio = school.unlockXP > 0 ? currentXP / school.unlockXP : 0;
  if (ratio >= 0.75) return "near";
  if (ratio >= 0.25) return "approaching";
  return "distant";
}

/**
 * Get next unlockable school for a given XP
 * @param {number} currentXP - Current XP
 * @returns {School|null} Next school or null if all unlocked
 */
export function getNextSchool(currentXP) {
  const schools = getSchoolsByUnlock();
  for (const school of schools) {
    if (currentXP < school.unlockXP) {
      return school;
    }
  }
  return null;
}

/**
 * Generate color for schools without explicit color
 * @param {string} schoolId - School ID
 * @returns {string} Hex color
 */
export function generateSchoolColor(schoolId) {
  return coreGenerateSchoolColor(schoolId);
}

/**
 * Calculate wheel position for a school
 * @param {string} schoolId - School ID
 * @returns {number} Angle in degrees
 */
export function getSchoolAngle(schoolId) {
  const school = SCHOOLS[schoolId];
  return school?.angle ?? 0;
}

/**
 * Get CSS class for school badge
 * @param {string} schoolId - School ID
 * @param {boolean} isLocked - Whether school is locked
 * @returns {string} CSS class name
 */
export function getSchoolBadgeClass(schoolId, isLocked = false) {
  const base = isLocked ? "badge--locked" : `badge--${schoolId.toLowerCase()}`;
  return base;
}
