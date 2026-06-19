#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { forgeCharacter } from '../codex/core/pixelbrain/character-foundry.js';
import {
  decodeFoundryAsepriteBinary,
  exportFoundryToAseprite,
  exportFoundryToAsepriteBinary,
} from '../codex/core/pixelbrain/foundry-aseprite-bridge.js';

const OUT_DIR = resolve('output/foundry/starbound-esper-void-chibi');
const DIRECTIONS = ['south', 'east', 'north', 'west'];
const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 48;

function buildSpec() {
  return {
    contract: 'CHARACTER-SPEC-v1',
    id: 'character.starbound-esper.void-chibi.v1',
    class: 'character',
    archetype: 'human',
    canvas: { width: FRAME_WIDTH, height: FRAME_HEIGHT, gridSize: 1 },
    seed: 9917,
    bytecode: 'VW-STARBOUND-ESPER-CHIBI',
    presentation: {
      gender: 'androgynous',
      heightClass: 'short',
      buildClass: 'average',
    },
    directions: DIRECTIONS,
    materials: {
      skin: 'skin_voidborne',
      hair: 'hair_void',
      eyes: 'eye_void_glow',
    },
    body: {
      profile: 'character.body.chibi.starboundEsper',
      params: { compact: 0.72 },
    },
    face: [
      { id: 'leftEye', profile: 'character.face.eye.humanSoft', params: { iris: 'eye_void_glow' }, attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.humanSoft', params: { iris: 'eye_void_glow' }, attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose', profile: 'character.face.nose.humanSoft', attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth', profile: 'character.face.mouth.humanSoft', attach: { parent: 'body', at: 'face.mouth' } },
    ],
    hair: {
      profile: 'character.hair.longStraight',
      params: { color: 'hair_void', streak: 'neon_mint_signal' },
      attach: { parent: 'body', at: 'headTop' },
    },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.psychicStreetShorts', params: { color: 'cloth_psychic_denim', trim: 'trim_comet_gold' } },
      { id: 'top', profile: 'character.clothing.top.starboundJacket', params: { color: 'cloth_star_jacket', trim: 'trim_comet_gold', signal: 'neon_mint_signal' } },
      { id: 'shoes', profile: 'character.clothing.shoes.cometBoots', params: { color: 'leather_brown', trim: 'trim_comet_gold' } },
    ],
    accessories: [
      { id: 'antenna', profile: 'character.accessory.signalAntenna', params: { stem: 'trim_comet_gold', signal: 'neon_mint_signal' } },
    ],
    details: [
      { id: 'constellation', profile: 'character.detail.jacketConstellation', params: { color: 'neon_mint_signal', gold: 'trim_comet_gold' } },
      { id: 'cheekBlush', profile: 'character.detail.cheekPixelBlush', params: { color: '#F08A78' } },
      { id: 'shadow', profile: 'character.detail.castShadow', params: { color: '#1c1c2e' } },
    ],
  };
}

function buildSheetCoordinates(character) {
  const coordinates = [];
  DIRECTIONS.forEach((direction, frameIndex) => {
    const xOffset = frameIndex * FRAME_WIDTH;
    for (const coord of character.fills[direction].coordinates) {
      coordinates.push({
        ...coord,
        x: coord.x + xOffset,
        y: coord.y,
        sourceX: coord.x,
        sourceY: coord.y,
        direction,
        partId: coord.partId || 'body',
        slot: direction,
        source: 'pixelbrain-character-foundry',
      });
    }
  });
  return coordinates;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const spec = buildSpec();
  const character = forgeCharacter(spec);
  const coordinates = buildSheetCoordinates(character);
  const foundryBundle = {
    spec: {
      ...spec,
      id: 'character.starbound-esper.void-chibi.aseprite-sheet.v1',
      canvas: { width: FRAME_WIDTH * DIRECTIONS.length, height: FRAME_HEIGHT, gridSize: 1 },
      directions: ['sheet'],
      hash: character.specHash,
    },
    canvas: { width: FRAME_WIDTH * DIRECTIONS.length, height: FRAME_HEIGHT, gridSize: 1 },
    coordinates,
  };

  const asepritePayload = exportFoundryToAseprite(foundryBundle, {
    id: foundryBundle.spec.id,
    layerBy: 'part',
    duration: 120,
  });
  asepritePayload.meta.characterSheet = {
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    directions: DIRECTIONS,
    layout: 'horizontal',
    sourceSpecHash: character.specHash,
  };

  const asepriteBinary = exportFoundryToAsepriteBinary(foundryBundle, {
    id: foundryBundle.spec.id,
    layerBy: 'part',
    duration: 120,
  });
  const decoded = decodeFoundryAsepriteBinary(asepriteBinary);

  writeFileSync(resolve(OUT_DIR, 'starbound-esper-void-chibi.aseprite'), asepriteBinary);
  writeFileSync(resolve(OUT_DIR, 'starbound-esper-void-chibi.aseprite.json'), `${JSON.stringify(asepritePayload, null, 2)}\n`);
  writeFileSync(resolve(OUT_DIR, 'starbound-esper-void-chibi.spec.json'), `${JSON.stringify(spec, null, 2)}\n`);
  writeFileSync(resolve(OUT_DIR, 'starbound-esper-void-chibi.spritesheet.png'), character.spritesheet);

  console.log(JSON.stringify({
    outDir: OUT_DIR,
    files: [
      'starbound-esper-void-chibi.aseprite',
      'starbound-esper-void-chibi.aseprite.json',
      'starbound-esper-void-chibi.spec.json',
      'starbound-esper-void-chibi.spritesheet.png',
    ],
    specHash: character.specHash,
    aseprite: {
      width: asepritePayload.width,
      height: asepritePayload.height,
      layers: asepritePayload.frames[0].layers.map((layer) => layer.name),
      decodedFrames: decoded.frames.length,
      decodedLayers: decoded.frames[0].layers.length,
    },
    diagnostics: character.diagnostics,
  }, null, 2));
}

main();
