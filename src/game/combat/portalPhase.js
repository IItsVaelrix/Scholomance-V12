/** NE dimensional portal grid anchor (matches drawTeleportationPortal). */
export const PORTAL_TILE = Object.freeze({ tx: 8, ty: 0 });

export const PORTAL_PHASE = Object.freeze({
  DORMANT: 'dormant',
  UNSEALING: 'unsealing',
  BECKONING: 'beckoning',
  ENGAGED: 'engaged',
  CLEARED: 'cleared',
});

export const PORTAL_WARDEN_ID = 'portal-warden';