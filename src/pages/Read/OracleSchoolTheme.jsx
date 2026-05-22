import { SCHOOLS } from '../../data/schools.js';

const SCHOOL_SCANLINES = Object.freeze({
  SONIC: 'vertical-wave',
  PSYCHIC: 'diagonal-cross',
  ALCHEMY: 'hex-grid',
  WILL: 'radial-burst',
  VOID: 'static-noise',
  NECROMANCY: 'root-vein',
  ABJURATION: 'ward-ring',
  DIVINATION: 'star-chart',
});

const DEFAULT_THEME = Object.freeze({
  id: 'DEFAULT',
  name: 'Unbound Lexicon',
  glyph: '✦',
  cssClass: 'default',
  scanline: 'veil',
});

export function getOracleSchoolTheme(selectedSchool) {
  const id = String(selectedSchool || '').trim().toUpperCase();
  const school = SCHOOLS[id];

  if (!school) {
    return DEFAULT_THEME;
  }

  return {
    id: school.id,
    name: school.name,
    glyph: school.glyph || DEFAULT_THEME.glyph,
    cssClass: school.id.toLowerCase(),
    scanline: SCHOOL_SCANLINES[school.id] || DEFAULT_THEME.scanline,
  };
}

export default getOracleSchoolTheme;
