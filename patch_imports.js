import fs from 'fs';

const p = 'src/lib/ambient/ambientPlayer.service.js';
let src = fs.readFileSync(p, 'utf8');

src = src.replace('getSchoolAudioConfig,', 'getSchoolAudioConfig, getConfigForTrackUrl,');
src = src.replace('const config = getSchoolConfig(schoolId);', 'const config = getConfigForTrackUrl(trackUrl);');

fs.writeFileSync(p, src);
