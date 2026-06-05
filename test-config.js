import { SCHOOL_AUDIO_CONFIG, getPlayableSchoolIds } from './src/lib/ambient/schoolAudio.config.js';
import { SCHOOLS } from './src/data/schools.js';

console.log("SCHOOL_AUDIO_CONFIG VOID:", SCHOOL_AUDIO_CONFIG['VOID']);
console.log("Playable Schools:", getPlayableSchoolIds(Object.keys(SCHOOLS)));
