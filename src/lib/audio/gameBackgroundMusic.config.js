/** Scholomance ambient score — served from /public/audio/scholosound */
export const GAME_BACKGROUND_MUSIC_TRACK = Object.freeze({
  id: 'the-beginning',
  title: 'The Beginning',
  url: '/audio/scholosound/the-beginning.mp3',
  /** Authoritative source archive path (encyclopedia) */
  sourcePath: 'docs/scholomance-encyclopedia/scholosound/songs/The Beginning.mp3',
});

/** Combat arena battle score — served from /public/audio/scholosound */
export const GAME_BATTLE_MUSIC_TRACK = Object.freeze({
  id: 'battle-on',
  title: 'Battle On!',
  url: '/audio/scholosound/battle-on.mp3',
  sourcePath: 'docs/scholomance-encyclopedia/scholosound/songs/Battle On!.mp3',
});

/** Each cycle replays the loop after a fresh random interval in this band. */
export const GAME_BACKGROUND_MUSIC_CYCLE_MS = Object.freeze({
  min: 5 * 60 * 1000,
  max: 7 * 60 * 1000,
});

export const GAME_BACKGROUND_MUSIC_SETTINGS_KEY = 'scholomance.gameMusic.settings.v1';

export const GAME_BACKGROUND_MUSIC_DEFAULTS = Object.freeze({
  volume: 0.38,
  enabled: true,
});

/**
 * Authoritative pacing for "The Beginning".
 * Used by non-combat routes when beat sync is active.
 */
export const GAME_BACKGROUND_MUSIC_PACING = Object.freeze({
  bpm: 85,
  offsetMs: 0,
  timeSignature: Object.freeze([4, 4]),
});

/**
 * Authoritative pacing for combat "Battle On!".
 * Drives obelisk + brazier beat sync on /combat.
 */
export const GAME_BATTLE_MUSIC_PACING = Object.freeze({
  bpm: 128,
  offsetMs: 0,
  timeSignature: Object.freeze([4, 4]),
});

export function isCombatMusicRoute(pathname = '') {
  return pathname === '/combat' || pathname.startsWith('/combat/');
}

/**
 * Ambient profile for route entry. Combat free-roam keeps "The Beginning"
 * until sentinels aggro and battle engages.
 *
 * @returns {{ track: typeof GAME_BACKGROUND_MUSIC_TRACK, pacing: object, loopOnly: boolean }}
 */
export function resolveMusicProfileForPath(pathname = '') {
  return {
    track: GAME_BACKGROUND_MUSIC_TRACK,
    pacing: GAME_BACKGROUND_MUSIC_PACING,
    loopOnly: false,
  };
}

/**
 * Combat battle score — only after combat-battle-started (sentinel aggro).
 *
 * @returns {{ track: typeof GAME_BATTLE_MUSIC_TRACK, pacing: object, loopOnly: boolean }}
 */
export function resolveBattleMusicProfile() {
  return {
    track: GAME_BATTLE_MUSIC_TRACK,
    pacing: GAME_BATTLE_MUSIC_PACING,
    loopOnly: true,
  };
}

/**
 * Combat obelisk discharge cadence vs "The Beginning".
 * Snare hits land on beats 2 and 4 — two per measure in 4/4.
 */
export const GAME_OBELISK_MUSIC_SYNC = Object.freeze({
  dischargeEveryMeasures: 8,
  /** Fire obelisk SFX + discharge phase this many ms ahead of nominal beat. */
  leadMs: 500,
});