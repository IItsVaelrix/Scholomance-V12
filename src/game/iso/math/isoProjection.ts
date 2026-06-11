/**
 * IsoScene Projection Math
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 * 
 * Shared deterministic projection contract for rendering, movement,
 * hit testing, and spell targeting.
 */

import type { IsoScene, IsoFacing, IsoTile, IsoProp, IsoActorState, PixelLotusAnimationName } from '../contracts/isoScene.schema';

// Cell to Screen projection (shared contract - no private math allowed)
export function isoCellToScreen(
  col: number,
  row: number,
  z: number,
  scene: Pick<IsoScene, 'tileWidth' | 'tileHeight' | 'origin'>
): { x: number; y: number } {
  const x = scene.origin.x + ((col - row) * scene.tileWidth) / 2;
  const y = scene.origin.y + ((col + row) * scene.tileHeight) / 2 - z;
  return { x, y };
}

// Screen to Cell projection (inverse)
export function screenToIsoCell(
  screenX: number,
  screenY: number,
  scene: Pick<IsoScene, 'tileWidth' | 'tileHeight' | 'origin'>
): { col: number; row: number } {
  const localX = screenX - scene.origin.x;
  const localY = screenY - scene.origin.y;

  const col = Math.floor((localY / (scene.tileHeight / 2) + localX / (scene.tileWidth / 2)) / 2);
  const row = Math.floor((localY / (scene.tileHeight / 2) - localX / (scene.tileWidth / 2)) / 2);

  return { col, row };
}

// Depth sort key for correct rendering order
export function getIsoDepthSortKey(entity: {
  col: number;
  row: number;
  z?: number;
  layerOffset?: number;
}): number {
  return (entity.col + entity.row) * 1000 + (entity.z ?? 0) + (entity.layerOffset ?? 0);
}

// Resolve iso tile at screen point
export function resolveIsoTileAtScreenPoint(
  screenX: number,
  screenY: number,
  scene: IsoScene
): IsoTile | null {
  const { col, row } = screenToIsoCell(screenX, screenY, scene);
  return scene.map.tiles.find(t => t.col === col && t.row === row) ?? null;
}

// Velocity to facing direction (8-direction)
export function velocityToFacing(dx: number, dy: number): IsoFacing {
  if (dx === 0 && dy === 0) return 'S';

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'E';
  if (normalized < 67.5) return 'SE';
  if (normalized < 112.5) return 'S';
  if (normalized < 157.5) return 'SW';
  if (normalized < 202.5) return 'W';
  if (normalized < 247.5) return 'NW';
  if (normalized < 292.5) return 'N';
  return 'NE';
}

// Check if actor is moving
export function isActorMoving(actor: IsoActorState): boolean {
  return Math.abs(actor.velocity.x) > 0.001 || Math.abs(actor.velocity.y) > 0.001;
}