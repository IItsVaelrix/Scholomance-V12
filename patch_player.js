import fs from 'fs';
const p = 'src/lib/ambient/ambientPlayer.service.js';
let content = fs.readFileSync(p, 'utf8');

// Move lastResolvedTrackUrlBySchool and resolveTrackUrlForSchool
content = content.replace(
  '  const lastResolvedTrackUrlBySchool = new Map();\n',
  ''
);

content = content.replace(
  /  function resolveTrackUrlForSchool[\s\S]*?return resolvedTrackUrl;\n  }\n/m,
  ''
);

const resolveFunc = `
  const lastResolvedTrackUrlBySchool = new Map();
  function resolveTrackUrlForSchool(schoolId, fallbackTrackUrl = null) {
    if (!schoolId) return fallbackTrackUrl || null;
    const previousTrackUrl = lastResolvedTrackUrlBySchool.get(schoolId) || null;
    const randomizedTrackUrl = getRandomizedStationTrackUrl(schoolId, { excludeUrl: previousTrackUrl });
    const resolvedTrackUrl = randomizedTrackUrl || fallbackTrackUrl || null;
    if (resolvedTrackUrl) {
      lastResolvedTrackUrlBySchool.set(schoolId, resolvedTrackUrl);
    }
    return resolvedTrackUrl;
  }
`;

content = content.replace(
  '  let state = {',
  resolveFunc + '\n  let state = {'
);

// Fix initial trackUrl
content = content.replace(
  'trackUrl: schoolConfig?.trackUrl || null,',
  'trackUrl: resolveTrackUrlForSchool(initialSchoolId, schoolConfig?.trackUrl || null),'
);

// Fix applySchoolSelection
content = content.replace(
  'trackUrl: trackUrl || config?.trackUrl || null,',
  'trackUrl: trackUrl || resolveTrackUrlForSchool(schoolId, config?.trackUrl || null),'
);

fs.writeFileSync(p, content);
