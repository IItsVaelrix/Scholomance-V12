import { PORTAL_TILE, PORTAL_WARDEN_ID } from './portalPhase.js';

export const VOID_ACOLYTE_STAT_DEFAULTS = Object.freeze({
  id: PORTAL_WARDEN_ID,
  label: 'Void Acolyte',
  shortLabel: 'Acolyte',
  hp: 120,
  maxHp: 120,
  weaveObjects: Object.freeze(['VOID', 'FLESH', 'SPIRIT']),
  school: 'VOID',
  interactionPriority: 500,
  intelligence: 52,
  scholomanceOverrides: Object.freeze({ BAPO: 22, SONIC: 8 }),
  movementPoints: 4,
  attackRange: 1,
});

export function getVoidAcolyteSpawnTile() {
  return { ...PORTAL_TILE };
}

export function isPortalWardenId(id) {
  return id === PORTAL_WARDEN_ID;
}