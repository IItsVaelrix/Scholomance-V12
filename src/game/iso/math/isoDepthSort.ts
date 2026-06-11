/**
 * IsoScene Depth Sorting
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 */

import type { IsoTile, IsoActorState, IsoProp, IsoSpellField } from '../contracts/isoScene.schema';

type SortableEntity = {
  id: string;
  col: number;
  row: number;
  z?: number;
  layerOffset?: number;
  height?: number;
};

// Convert renderable entities to sortable format
function toSortable(item: IsoTile | IsoActorState | IsoProp | IsoSpellField): SortableEntity {
  if ('gridPosition' in item) {
    // Actor
    return {
      id: item.id,
      col: item.gridPosition.col,
      row: item.gridPosition.row,
      z: item.gridPosition.z,
    };
  }
  if ('col' in item && 'row' in item) {
    // Prop or Tile
    return {
      id: item.id,
      col: item.col,
      row: item.row,
      z: 'height' in item ? item.height : undefined,
      layerOffset: 'layerOffset' in item ? item.layerOffset : undefined,
    };
  }
  return {
    id: item.id,
    col: 0,
    row: 0,
    z: 0,
  };
}

// Get depth sort key for entity
function getDepthKey(entity: SortableEntity): number {
  return (entity.col + entity.row) * 1000 + (entity.z ?? 0) + (entity.layerOffset ?? 0);
}

// Sort all renderable entities for correct visual order
export function sortSceneEntities(
  tiles: IsoTile[],
  props: IsoProp[],
  actors: IsoActorState[],
  spellFields: IsoSpellField[]
): { tiles: IsoTile[]; props: IsoProp[]; actors: IsoActorState[]; spellFields: IsoSpellField[] } {
  // Sort tiles by depth (ground level first for overlap)
  const sortedTiles = [...tiles].sort((a, b) => getDepthKey(toSortable(a)) - getDepthKey(toSortable(b)));
  
  // Sort props by depth (taller props may need different ordering)
  const sortedProps = [...props].sort((a, b) => {
    const keyA = getDepthKey(toSortable(a));
    const keyB = getDepthKey(toSortable(b));
    // For props with same base position, taller ones render behind
    if (keyA === keyB && a.height && b.height) {
      return b.height - a.height;
    }
    return keyA - keyB;
  });
  
  // Sort actors by depth
  const sortedActors = [...actors].sort((a, b) => getDepthKey(toSortable(a)) - getDepthKey(toSortable(b)));
  
  // Sort spell fields by depth + creation time for consistent phasing
  const sortedSpellFields = [...spellFields].sort((a, b) => {
    const keyA = getDepthKey(toSortable(a));
    const keyB = getDepthKey(toSortable(b));
    if (keyA === keyB) {
      return a.createdAtMs - b.createdAtMs;
    }
    return keyA - keyB;
  });

  return { tiles: sortedTiles, props: sortedProps, actors: sortedActors, spellFields: sortedSpellFields };
}