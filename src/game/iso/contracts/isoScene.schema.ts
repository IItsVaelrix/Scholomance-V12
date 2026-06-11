/**
 * IsoScene Contracts - Schema definitions
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

import type { IsoFacing, PixelLotusAnimationName } from '../../../pixel-lotus/actor-forge/pixelLotusActor.schema';

export type IsoTile = {
  id: string;
  col: number;
  row: number;
  height: number;
  terrain:
    | 'stone'
    | 'grass'
    | 'water'
    | 'void'
    | 'metal'
    | 'crystal'
    | 'fabric'
    | 'energy';
  walkable: boolean;
  blocksSight: boolean;
  movementCost: number;
  elevation: number;
  schoolAffinity?: string;
  textureSeed: string;
};

export type IsoActorState = {
  id: string;
  actorBuildId: string;
  spriteSheetId: string;
  animationManifestId: string;
  animation: PixelLotusAnimationName;
  facing: IsoFacing;
  gridPosition: {
    col: number;
    row: number;
    z: number;
  };
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
  };
  radius: number;
  team: 'player' | 'enemy' | 'neutral';
};

export type IsoProp = {
  id: string;
  col: number;
  row: number;
  height: number;
  width: number;
  spriteId: string;
  blocksMovement: boolean;
  blocksSight: boolean;
  layerOffset?: number;
};

export type IsoSpellFieldShape =
  | 'line'
  | 'cone'
  | 'circle'
  | 'ring'
  | 'sigil'
  | 'thread'
  | 'fractal'
  | 'tile-pattern';

export type IsoSpellField = {
  id: string;
  casterId: string;
  shape: IsoSpellFieldShape;
  schoolId: string;
  createdAtMs: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  geometry: {
    origin: { col: number; row: number; z: number };
    target?: { col: number; row: number; z: number };
    radius?: number;
    width?: number;
    angleDeg?: number;
    formulaId?: string;
  };
  damage?: {
    amount: number;
    type: string;
  };
};

export type IsoScene = {
  schemaVersion: 'iso-scene-v1';
  id: string;
  tileWidth: number;
  tileHeight: number;
  origin: {
    x: number;
    y: number;
  };
  map: {
    cols: number;
    rows: number;
    tiles: IsoTile[];
  };
  actors: IsoActorState[];
  props: IsoProp[];
  spellFields: IsoSpellField[];
};

// Re-export for use by other modules
export type { IsoFacing, PixelLotusAnimationName };