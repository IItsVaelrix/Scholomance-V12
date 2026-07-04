import { describe, expect, it } from 'vitest';
import {
  GAME_BATTLE_MUSIC_TRACK,
  GAME_BACKGROUND_MUSIC_TRACK,
  GAME_BATTLE_MUSIC_PACING,
  GAME_BACKGROUND_MUSIC_PACING,
  isCombatMusicRoute,
  resolveBattleMusicProfile,
  resolveMusicProfileForPath,
} from '../../src/lib/audio/gameBackgroundMusic.config.js';

describe('gameBackgroundMusic.config', () => {
  it('uses ambient music on combat routes during free roam', () => {
    const profile = resolveMusicProfileForPath('/combat');
    expect(profile.track).toEqual(GAME_BACKGROUND_MUSIC_TRACK);
    expect(profile.pacing).toEqual(GAME_BACKGROUND_MUSIC_PACING);
    expect(profile.loopOnly).toBe(false);
  });

  it('uses ambient music on non-combat routes', () => {
    const profile = resolveMusicProfileForPath('/read');
    expect(profile.track).toEqual(GAME_BACKGROUND_MUSIC_TRACK);
    expect(profile.pacing).toEqual(GAME_BACKGROUND_MUSIC_PACING);
    expect(profile.loopOnly).toBe(false);
  });

  it('exposes battle music only through the battle profile resolver', () => {
    const profile = resolveBattleMusicProfile();
    expect(profile.track).toEqual(GAME_BATTLE_MUSIC_TRACK);
    expect(profile.pacing).toEqual(GAME_BATTLE_MUSIC_PACING);
    expect(profile.loopOnly).toBe(true);
  });

  it('recognizes combat routes', () => {
    expect(isCombatMusicRoute('/combat')).toBe(true);
    expect(isCombatMusicRoute('/combat/arena')).toBe(true);
    expect(isCombatMusicRoute('/read')).toBe(false);
  });
});