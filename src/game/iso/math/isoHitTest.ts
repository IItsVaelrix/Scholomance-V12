/**
 * IsoScene Hit Testing
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

import type { IsoScene, IsoTile, IsoProp, IsoActorState } from '../contracts/isoScene.schema';
import { screenToIsoCell } from './isoProjection';

// Check if screen point hits a tile
export function screenPointToTile(
  screenX: number,
  screenY: number,
  scene: IsoScene
): IsoTile | null {
  return scene.map.tiles.find(t => {
    const screen = isoCellToScreen(t.col, t.row, t.height, scene);
    const halfTileW = scene.tileWidth / 2;
    const halfTileH = scene.tileHeight / 2;
    
    // Check if point is within diamond bounds
    const dx = Math.abs(screenX - screen.x);
    const dy = Math.abs(screenY - screen.y);
    
    return dx <= halfTileW && dy <= halfTileH && dx + dy <= halfTileW + halfTileH;
  }) ?? null;
}

// Helper - reuse projection
function isoCellToScreen(col: number, row: number, z: number, scene: IsoScene): { x: number; y: number } {
  const x = scene.origin.x + ((col - row) * scene.tileWidth) / 2;
  const y = scene.origin.y + ((col + row) * scene.tileHeight) / 2 - z;
  return { x, y };
}

// Check if screen point hits an actor
export function screenPointToActor(
  screenX: number,
  screenY: number,
  scene: IsoScene,
  actorRadius: number = 0.5
): IsoActorState | null {
  for (const actor of scene.actors) {
    const screen = isoCellToScreen(
      actor.gridPosition.col,
      actor.gridPosition.row,
      actor.gridPosition.z,
      scene
    );
    
    const distance = Math.sqrt(
      Math.pow(screenX - screen.x, 2) + Math.pow(screenY - screen.y, 2)
    );
    
    if (distance <= actorRadius * Math.max(scene.tileWidth, scene.tileHeight)) {
      return actor;
    }
  }
  return null;
}

// Check if screen point hits a prop
export function screenPointToProp(
  screenX: number,
  screenY: number,
  scene: IsoScene
): IsoProp | null {
  for (const prop of scene.props) {
    const screen = isoCellToScreen(prop.col, prop.row, prop.height, scene);
    
    // Simple bounding box check
    const propWidth = prop.width * scene.tileWidth;
    const propHeight = prop.height * scene.tileHeight;
    
    if (
      screenX >= screen.x - propWidth / 2 &&
      screenX <= screen.x + propWidth / 2 &&
      screenY >= screen.y - propHeight &&
      screenY <= screen.y
    ) {
      return prop;
    }
  }
  return null;
}

// Combined hit test returning what was clicked
export function hitTestScreenPoint(
  screenX: number,
  screenY: number,
  scene: IsoScene
): { type: 'tile' | 'actor' | 'prop'; entity: IsoTile | IsoActorState | IsoProp | null } {
  const actor = screenPointToActor(screenX, screenY, scene);
  if (actor) return { type: 'actor', entity: actor };
  
  const prop = screenPointToProp(screenX, screenY, scene);
  if (prop) return { type: 'prop', entity: prop };
  
  const tile = screenPointToTile(screenX, screenY, scene);
  return { type: 'tile', entity: tile };
}