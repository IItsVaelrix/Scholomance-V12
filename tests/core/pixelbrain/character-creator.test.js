import { describe, it, expect } from 'vitest';
import { forgeCharacter, normalizeCharacterSpec, hashCharacterSpec } from '../../../codex/core/pixelbrain/character-foundry.js';

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function buildScholarSpec() {
  return {
    contract: 'CHARACTER-SPEC-v1',
    id: 'scholar.human.female.v1',
    class: 'character',
    archetype: 'human',
    canvas: { width: 32, height: 48, gridSize: 1 },
    seed: 604782,
    bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
    presentation: {
      gender: 'feminine',
      heightClass: 'average',
      buildClass: 'slender',
    },
    directions: ['south', 'east', 'north', 'west'],
    materials: {
      skin: 'skin_light',
      hair: 'hair_brown',
      eyes: 'eye_brown',
    },
    body: {
      profile: 'character.body.human.feminine',
      params: { heightClass: 'average', buildClass: 'slender' },
    },
    face: [
      { id: 'leftEye',  profile: 'character.face.eye.almond',  attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.almond',  attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose',     profile: 'character.face.nose.small',   attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth',    profile: 'character.face.mouth.small',  attach: { parent: 'body', at: 'face.mouth' } },
      { id: 'leftEar',  profile: 'character.face.ear.round',    attach: { parent: 'body', at: 'face.earLeft' } },
      { id: 'rightEar', profile: 'character.face.ear.round',    attach: { parent: 'body', at: 'face.earRight' } },
    ],
    hair: {
      profile: 'character.hair.longStraight',
      params: { color: 'hair_brown' },
      attach: { parent: 'body', at: 'headTop' },
    },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.beginnerSkirt' },
      { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
      { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
    ],
  };
}

describe('character-creator', () => {
  it('forges a complete character from CHARACTER-SPEC-v1', () => {
    const character = forgeCharacter(buildScholarSpec());
    expect(character).toBeTruthy();
    expect(character.spec).toBeTruthy();
    expect(character.specHash).toBeTruthy();
    expect(character.canvas).toEqual({ width: 32, height: 48, gridSize: 1 });
    expect(character.spritesheet).toBeInstanceOf(Uint8Array);
    expect(character.spritesheet.length).toBeGreaterThan(0);
    expect(character.sprites).toBeTruthy();
    expect(character.sprites.south).toBeInstanceOf(Uint8Array);
    expect(character.sprites.east).toBeInstanceOf(Uint8Array);
    expect(character.sprites.north).toBeInstanceOf(Uint8Array);
    expect(character.sprites.west).toBeInstanceOf(Uint8Array);
  });

  it('produces a Phaser pipeline config', () => {
    const character = forgeCharacter(buildScholarSpec());
    expect(character.phaserPipeline).toBeTruthy();
    expect(character.phaserPipeline.pipeline).toBe('phaser.character.v1');
    expect(character.phaserPipeline.frameConfig.frameWidth).toBe(32);
    expect(character.phaserPipeline.frameConfig.frameHeight).toBe(48);
    expect(character.phaserPipeline.frameConfig.frames.walkSouth).toEqual([0]);
    expect(character.phaserPipeline.frameConfig.frames.walkEast).toEqual([1]);
    expect(character.phaserPipeline.frameConfig.frames.walkNorth).toEqual([2]);
    expect(character.phaserPipeline.frameConfig.frames.walkWest).toEqual([3]);
  });

  it('produces a Godot scene string', () => {
    const character = forgeCharacter(buildScholarSpec());
    expect(character.godotScene).toBeTruthy();
    expect(typeof character.godotScene).toBe('string');
    expect(character.godotScene).toContain('[gd_scene');
    expect(character.godotScene).toContain('AnimatedSprite2D');
    expect(character.godotScene).toContain('scholar.human.female.v1');
  });

  it('produces a Pixel Lotus combat actor', () => {
    const character = forgeCharacter(buildScholarSpec());
    expect(character.pixelLotusActor).toBeTruthy();
    expect(character.pixelLotusActor.actorId).toBe('scholar.human.female.v1');
    expect(character.pixelLotusActor.combatProfile).toBeTruthy();
    expect(character.pixelLotusActor.combatProfile.hp).toBe(100);
    expect(character.pixelLotusActor.combatProfile.school).toBe('SCHOLAR');
    expect(character.pixelLotusActor.appearance.frameWidth).toBe(32);
    expect(character.pixelLotusActor.appearance.frameHeight).toBe(48);
  });

  it('is deterministic: same spec produces identical output', () => {
    const specA = buildScholarSpec();
    const specB = buildScholarSpec();
    const a = forgeCharacter(specA);
    const b = forgeCharacter(specB);
    expect(a.specHash).toBe(b.specHash);
    expect(arraysEqual(a.spritesheet, b.spritesheet)).toBe(true);
    expect(arraysEqual(a.sprites.south, b.sprites.south)).toBe(true);
    expect(arraysEqual(a.sprites.east, b.sprites.east)).toBe(true);
    expect(arraysEqual(a.sprites.north, b.sprites.north)).toBe(true);
    expect(arraysEqual(a.sprites.west, b.sprites.west)).toBe(true);
  });

  it('generates all 4 directions', () => {
    const character = forgeCharacter(buildScholarSpec());
    expect(character.diagnostics.directions).toEqual(['south', 'east', 'north', 'west']);
    expect(character.diagnostics.totalCells).toBeGreaterThan(0);
    for (const dir of ['south', 'east', 'north', 'west']) {
      expect(character.diagnostics.paletteSizes[dir]).toBeGreaterThan(0);
    }
  });

  it('throws on missing body', () => {
    expect(() => {
      forgeCharacter({ contract: 'CHARACTER-SPEC-v1', id: 'bad', seed: 0, bytecode: 'TEST' });
    }).toThrow();
  });

  it('throws on missing id', () => {
    expect(() => {
      forgeCharacter({ contract: 'CHARACTER-SPEC-v1', body: { profile: 'character.body.human.feminine' } });
    }).toThrow();
  });

  it('normalizes and hashes spec', () => {
    const spec = buildScholarSpec();
    const normalized = normalizeCharacterSpec(spec);
    expect(normalized.contract).toBe('CHARACTER-SPEC-v1');
    expect(normalized.presentation.gender).toBe('feminine');
    const h1 = hashCharacterSpec(normalized);
    const h2 = hashCharacterSpec(normalizeCharacterSpec(buildScholarSpec()));
    expect(h1).toBe(h2);
  });

  it('enforces palette budget of ≤ 32 colors', () => {
    const character = forgeCharacter(buildScholarSpec());
    for (const dir of ['south', 'east', 'north', 'west']) {
      expect(character.diagnostics.paletteSizes[dir]).toBeLessThanOrEqual(32);
    }
  });

  it('produces a valid spritesheet (128×48 logical, 512×192 at 4x)', () => {
    const character = forgeCharacter(buildScholarSpec());
    const png = character.spritesheet;
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
    const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
    const height = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
    expect(width).toBe(512);  // 128 logical * 4 scale
    expect(height).toBe(192);
  });
});
