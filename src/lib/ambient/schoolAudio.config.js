import { SCHOOLS, generateSchoolColor } from "../../data/schools";
import { pickRandomSonicStationTrack } from "../../data/sonicStationBuckets";

function getPrimaryTrackUrl(schoolId) {
  return pickRandomSonicStationTrack({ schoolId }) || null;
}

export const SCHOOL_AUDIO_CONFIG = Object.freeze(
  Object.values(SCHOOLS).reduce((acc, school) => {
    const trackUrl = getPrimaryTrackUrl(school.id);
    acc[school.id] = {
      schoolId: school.id,
      paletteKey: school.id.toLowerCase(),
      orbSkinKey: school.id.toLowerCase(),
      color: generateSchoolColor(school.id),
      trackUrl,
    };
    return acc;
  }, {})
);

export function getSchoolAudioConfig(schoolId) {
  return SCHOOL_AUDIO_CONFIG[schoolId] || null;
}

export function getRandomizedStationTrackUrl(schoolId, { excludeUrl = null } = {}) {
  const config = getSchoolAudioConfig(schoolId);
  return pickRandomSonicStationTrack({ schoolId, excludeUrl }) || config?.trackUrl || null;
}

export function getPlayableSchoolIds(unlockedSchools = []) {
  const ids = Array.isArray(unlockedSchools) ? unlockedSchools : [];

  // When no specific schools are unlocked, expose ALL schools that have tracks.
  // SONIC no longer gets unconditional priority — the radio has no allegiance.
  const baseSchools = ids.length === 0
    ? Object.keys(SCHOOL_AUDIO_CONFIG)
    : ids;

  return Object.values(SCHOOL_AUDIO_CONFIG)
    .filter((config) => baseSchools.includes(config.schoolId) && Boolean(config?.trackUrl))
    .map((config) => config.schoolId);
}

// Round-robin counter — advances on every call, no Math.random, no PRNG seed.
// This ensures the initial station selection rotates sporadically across the
// available pool without any school having allegiance.
let _rrCounter = 0;

export function getDefaultSchoolId(playableSchoolIds = []) {
  if (!Array.isArray(playableSchoolIds) || playableSchoolIds.length === 0) {
    return null;
  }
  // Advance the counter and pick the next school in rotation.
  const index = _rrCounter % playableSchoolIds.length;
  _rrCounter = (_rrCounter + 1) % (playableSchoolIds.length * 16); // avoid overflow
  return playableSchoolIds[index];
}
