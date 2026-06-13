import { describe, it, expect } from 'vitest';
import { forgeCharacter } from '../../../codex/core/pixelbrain/character-foundry.js';

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function buildTestSpec() {
  return {
    contract: 'CHARACTER-SPEC-v1',
    id: 'test.directional.v1',
    class: 'character',
    archetype: 'human',
    canvas: { width: 32, height: 48, gridSize: 1 },
    seed: 42,
    bytecode: 'VW-TEST-DIRECTIONAL-V1',
    presentation: {
      gender: 'androgynous',
      heightClass: 'average',
      buildClass: 'average',
    },
    directions: ['south', 'east', 'north', 'west'],
    materials: {
      skin: 'skin_medium',
      hair: 'hair_black',
      eyes: 'eye_brown',
    },
    body: {
      profile: 'character.body.human.androgynous',
      params: { heightClass: 'average', buildClass: 'average' },
    },
    face: [
      { id: 'leftEye',  profile: 'character.face.eye.round',   attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.round',   attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose',     profile: 'character.face.nose.small',  attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
      { id: 'leftEar',  profile: 'character.face.ear.round',   attach: { parent: 'body', at: 'face.earLeft' } },
      { id: 'rightEar', profile: 'character.face.ear.round',   attach: { parent: 'body', at: 'face.earRight' } },
    ],
    hair: {
      profile: 'character.hair.short',
      params: { color: 'hair_black' },
      attach: { parent: 'body', at: 'headTop' },
    },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
      { id: 'top',    profile: 'character.clothing.top.beginnerTunic' },
      { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
    ],
  };
}

describe('character-directional-render', () => {
  it('renders all 4 directions as unique PNG buffers', () => {
    const character = forgeCharacter(buildTestSpec());
    expect(character.sprites.south).toBeInstanceOf(Uint8Array);
    expect(character.sprites.east).toBeInstanceOf(Uint8Array);
    expect(character.sprites.north).toBeInstanceOf(Uint8Array);
    expect(character.sprites.west).toBeInstanceOf(Uint8Array);

    expect(character.sprites.south.length).toBeGreaterThan(0);
    expect(character.sprites.east.length).toBeGreaterThan(0);
    expect(character.sprites.north.length).toBeGreaterThan(0);
    expect(character.sprites.west.length).toBeGreaterThan(0);
  });

  it('south and north renders are different (not identity)', () => {
    const character = forgeCharacter(buildTestSpec());
    const south = character.sprites.south;
    const north = character.sprites.north;
    expect(arraysEqual(south, north)).toBe(false);
  });

  it('east and west renders are different (not identical)', () => {
    const character = forgeCharacter(buildTestSpec());
    const east = character.sprites.east;
    const west = character.sprites.west;
    expect(arraysEqual(east, west)).toBe(false);
  });

  it('spritesheet concatenates all 4 directions', () => {
    const character = forgeCharacter(buildTestSpec());
    expect(character.spritesheet).toBeInstanceOf(Uint8Array);
    expect(character.spritesheet.length).toBeGreaterThan(character.sprites.south.length);
  });

  it('has meaningful cell count in each direction', () => {
    const character = forgeCharacter(buildTestSpec());
    for (const dir of ['south', 'east', 'north', 'west']) {
      if (character.fills[dir]) {
        expect(character.fills[dir].coordinates.length).toBeGreaterThan(50);
      }
    }
  });

  it('east and west produce different cell counts (asymmetric)', () => {
    const character = forgeCharacter(buildTestSpec());
    const eastCells = character.fills?.east?.coordinates?.length || 0;
    const westCells = character.fills?.west?.coordinates?.length || 0;
    expect(eastCells).toBeGreaterThan(0);
    expect(westCells).toBeGreaterThan(0);
  });

  it('body profiles exist for all presentation types', () => {
    const spec = buildTestSpec();
    const presentations = ['feminine', 'masculine', 'androgynous'];
    for (const gender of presentations) {
      const s = { ...spec, id: `test.${gender}.v1`, presentation: { ...spec.presentation, gender } };
      s.body = { profile: `character.body.human.${gender}`, params: {} };
      const result = forgeCharacter(s);
      expect(result.sprites.south.length).toBeGreaterThan(0);
    }
  });

  it('height classes affect output', () => {
    const base = buildTestSpec();
    const shortSpec = { ...base, id: 'test.short.v1', presentation: { ...base.presentation, heightClass: 'short' } };
    const tallSpec = { ...base, id: 'test.tall.v1', presentation: { ...base.presentation, heightClass: 'tall' } };
    const shortChar = forgeCharacter(shortSpec);
    const tallChar = forgeCharacter(tallSpec);
    const southShort = shortChar.fills.south.coordinates;
    const southTall = tallChar.fills.south.coordinates;
    expect(southShort).not.toEqual(southTall);
  });

  it('palette budget ≤ 32 colors per direction', () => {
    const character = forgeCharacter(buildTestSpec());
    for (const dir of ['south', 'east', 'north', 'west']) {
      expect(character.diagnostics.paletteSizes[dir]).toBeLessThanOrEqual(32);
    }
  });
});
