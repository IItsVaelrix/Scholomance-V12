/**
 * Iso Actor Schema
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

import type { IsoActorState } from './isoScene.schema';
import type { IsoFacing, PixelLotusAnimationName } from '../../../pixel-lotus/actor-forge/pixelLotusActor.schema';

export type { IsoActorState };

export function createIsoActorState(
  id: string,
  buildId: string,
  col: number,
  row: number,
  facing: IsoFacing,
  team: IsoActorState['team'] = 'player'
): IsoActorState {
  return {
    id,
    actorBuildId: buildId,
    spriteSheetId: `sheet-${buildId}`,
    animationManifestId: 'default-8dir',
    animation: 'idle',
    facing,
    gridPosition: { col, row, z: 0 },
    worldPosition: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0 },
    radius: 0.5,
    team,
  };
}