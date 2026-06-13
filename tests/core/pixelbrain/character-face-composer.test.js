import { describe, it, expect } from 'vitest';
import { getPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

import '../../../codex/core/pixelbrain/character-face-profiles.js';

describe('character-face-composer', () => {
  describe('eye profiles', () => {
    it('round eyes emit 4 cells for left side', () => {
      const profile = getPartProfile('character.face.eye.round');
      const result = profile({ cx: -2, cy: 0 }, { side: 'left' });
      expect(result.cells.length).toBe(4);
      expect(result.anchors.base).toEqual({ x: -2, y: 0 });
    });

    it('round eyes emit 4 cells for right side', () => {
      const profile = getPartProfile('character.face.eye.round');
      const result = profile({ cx: 2, cy: 0 }, { side: 'right' });
      expect(result.cells.length).toBe(4);
    });

    it('almond eyes emit 5 cells', () => {
      const profile = getPartProfile('character.face.eye.almond');
      const result = profile({}, { side: 'left' });
      expect(result.cells.length).toBe(5);
    });

    it('narrow eyes emit 3 cells', () => {
      const profile = getPartProfile('character.face.eye.narrow');
      const result = profile({}, { side: 'left' });
      expect(result.cells.length).toBe(3);
    });

    it('void-touched eyes include glow cells', () => {
      const profile = getPartProfile('character.face.eye.voidTouched');
      const result = profile({}, { side: 'left' });
      const glowCells = result.cells.filter(c => c.color);
      expect(glowCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('nose profiles', () => {
    it('small nose emits 2 cells', () => {
      const profile = getPartProfile('character.face.nose.small');
      const result = profile({});
      expect(result.cells.length).toBe(2);
    });

    it('straight nose emits 3 cells', () => {
      const profile = getPartProfile('character.face.nose.straight');
      const result = profile({});
      expect(result.cells.length).toBe(3);
    });

    it('broad nose emits 4 cells', () => {
      const profile = getPartProfile('character.face.nose.broad');
      const result = profile({});
      expect(result.cells.length).toBe(4);
    });
  });

  describe('mouth profiles', () => {
    it('small mouth emits 2 cells', () => {
      const profile = getPartProfile('character.face.mouth.small');
      const result = profile({});
      expect(result.cells.length).toBe(2);
    });

    it('wide mouth emits 3 cells', () => {
      const profile = getPartProfile('character.face.mouth.wide');
      const result = profile({});
      expect(result.cells.length).toBe(3);
    });

    it('smile mouth emits 4 cells', () => {
      const profile = getPartProfile('character.face.mouth.smile');
      const result = profile({});
      expect(result.cells.length).toBe(4);
    });
  });

  describe('ear profiles', () => {
    it('round ear emits 2 cells', () => {
      const profile = getPartProfile('character.face.ear.round');
      const result = profile({}, { side: 'left' });
      expect(result.cells.length).toBe(2);
    });

    it('pointed ear emits 3 cells', () => {
      const profile = getPartProfile('character.face.ear.pointed');
      const result = profile({}, { side: 'left' });
      expect(result.cells.length).toBe(3);
    });

    it('elongated ear emits 4 cells', () => {
      const profile = getPartProfile('character.face.ear.elongated');
      const result = profile({}, { side: 'left' });
      expect(result.cells.length).toBe(4);
    });
  });

  it('all profiles have anchors', () => {
    const profiles = ['character.face.eye.round', 'character.face.eye.almond', 'character.face.eye.narrow',
      'character.face.eye.voidTouched', 'character.face.nose.small', 'character.face.nose.straight',
      'character.face.nose.broad', 'character.face.mouth.small', 'character.face.mouth.wide',
      'character.face.mouth.smile', 'character.face.ear.round', 'character.face.ear.pointed',
      'character.face.ear.elongated'];
    for (const pid of profiles) {
      const profile = getPartProfile(pid);
      const result = profile({}, { side: 'left' });
      expect(result.anchors).toBeTruthy();
      expect(result.anchors.base).toBeTruthy();
    }
  });
});
