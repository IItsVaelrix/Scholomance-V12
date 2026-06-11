/**
 * Iso Tile Schema
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

import type { IsoTile } from './isoScene.schema';

export type { IsoTile };

export const TERRAIN_TYPES = ['stone', 'grass', 'water', 'void', 'metal', 'crystal', 'fabric', 'energy'] as const;

export function createIsoTile(col: number, row: number, terrain: IsoTile['terrain']): IsoTile {
  return {
    id: `tile-${col}-${row}`,
    col,
    row,
    height: 0,
    terrain,
    walkable: terrain !== 'water' && terrain !== 'void',
    blocksSight: false,
    movementCost: 1,
    elevation: 0,
    textureSeed: `${col},${row}`,
  };
}