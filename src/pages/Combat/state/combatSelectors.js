/**
 * combatSelectors.js
 *
 * Pure functions that derive compact render models from raw battle state.
 * Components and Phaser receive shaped data — never raw combat truth.
 *
 * Phase 1: selectors for tiles, units, and scholar status.
 * Phase 2+: preview selectors (reachable, targetable, aoe) added here.
 */

import { coordToLabel } from './combatBoardUtils.js';
import { getCrossPattern } from './combatPreviewUtils.js';

// ---------------------------------------------------------------------------
// Board tiles
// ---------------------------------------------------------------------------

/**
 * Derive 25 BoardTileViewModels from battle state + UI state.
 * Always returns exactly 25 tiles in row-major order (y=0..4, x=0..4).
 *
 * @param {import('../../../hooks/useBattleSession.js').BattleState} battleState
 * @param {{ cursorTile?: {x:number,y:number}|null, selectedTile?: {x:number,y:number}|null, hoveredTile?: {x:number,y:number}|null, selectedAction?: string|null, targetingMode?: string }} uiState
 * @returns {import('./combatBoardTypes.js').BoardTileViewModel[]}
 */
export function selectBoardTiles(battleState, uiState = {}) {
  const { 
    cursorTile = null, 
    selectedTile = null, 
    hoveredTile = null,
    selectedAction = null,
    targetingMode = 'none'
  } = uiState;
  
  if (!battleState) return [];

  const scholar = battleState.entities?.find(e => e.id === 'player');
  const tiles = [];

  const gridWidth = battleState.gridWidth || 9;
  const gridHeight = battleState.gridHeight || 9;

  // Phase 2/3 Preview Logic
  const reachableSet = new Set();
  if (targetingMode === 'move' && scholar) {
    const mov = scholar.mov || 2;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        // Manhattan distance check
        const dist = Math.abs(x - scholar.position.x) + Math.abs(y - scholar.position.y);
        if (dist > 0 && dist <= mov && !battleState.grid[y][x].occupantId) {
          reachableSet.add(`${x},${y}`);
        }
      }
    }
  }

  const targetableSet = new Set();
  const aoeSet = new Set();
  
  if (targetingMode === 'spell' && scholar) {
    const range = scholar.range || 2;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const dist = Math.abs(x - scholar.position.x) + Math.abs(y - scholar.position.y);
        if (dist <= range) {
          targetableSet.add(`${x},${y}`);
        }
      }
    }

    // Phase 3: AOE Preview
    if (cursorTile) {
      // Default AOE pattern: Cross Radius 1 for testing
      const aoeTiles = getCrossPattern(cursorTile, 1);
      aoeTiles.forEach(t => aoeSet.add(`${t.x},${t.y}`));
    }
  }

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const gridCell = battleState.grid?.[y]?.[x];
      const occupantId = gridCell?.occupantId ?? null;
      const key = `${x},${y}`;

      tiles.push({
        coord: { x, y },
        label: coordToLabel({ x, y }),
        isOccupied: !!occupantId,
        occupantId,
        isCursor:   !!(cursorTile   && cursorTile.x   === x && cursorTile.y   === y),
        isHovered:  !!(hoveredTile  && hoveredTile.x  === x && hoveredTile.y  === y),
        isSelected: !!(selectedTile && selectedTile.x === x && selectedTile.y === y),
        isReachable:  reachableSet.has(key),
        isTargetable: targetableSet.has(key),
        isThreatened: false,
        hasHazard:    !!gridCell?.fieldEffect,
        hazardKind:   gridCell?.fieldEffect?.type ?? null,
        previewKind:  aoeSet.has(key) ? 'aoe' : (targetingMode === 'move' && reachableSet.has(key) ? 'move' : null),
      });
    }
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

/**
 * Derive the minimal render shape for every entity on the board.
 *
 * @param {object} battleState
 * @returns {import('./combatBoardTypes.js').RenderedUnit[]}
 */
export function selectRenderedUnits(battleState) {
  if (!battleState?.entities) return [];
  return battleState.entities.map(entity => ({
    id:          entity.id,
    name:        entity.name,
    school:      entity.school || 'SONIC',
    side:        entity.id === 'player' ? 'scholar' : 'enemy',
    position:    entity.position,
    visualState: 'idle',
    hp:          entity.hp,
    maxHp:       entity.maxHp,
  }));
}

// ---------------------------------------------------------------------------
// Scholar status
// ---------------------------------------------------------------------------

/**
 * Derive the scholar's panel data for ScholarStatusPanel.
 *
 * @param {object} battleState
 * @returns {{ hp: number, maxHp: number, mp: number, maxMp: number, school: string, statusEffects: Array, isActive: boolean }|null}
 */
export function selectScholarStatusModel(battleState) {
  const scholar = battleState?.entities?.find(e => e.id === 'player');
  if (!scholar) return null;
  return {
    hp:            scholar.hp,
    maxHp:         scholar.maxHp,
    mp:            scholar.mp,
    maxMp:         scholar.maxMp,
    school:        scholar.school || 'SONIC',
    statusEffects: scholar.statusEffects || [],
    isActive:      battleState.activeEntityId === 'player',
  };
}

// ---------------------------------------------------------------------------
// Encounter header
// ---------------------------------------------------------------------------

/**
 * Data for the center-top encounter strip.
 *
 * @param {object} battleState
 * @returns {{ round: number, phase: string, activeLabel: string, arenaSchool: string }}
 */
export function selectEncounterHeaderModel(battleState) {
  if (!battleState) return { round: 0, phase: 'idle', activeLabel: '--', arenaSchool: 'SONIC' };
  const isPlayer = battleState.activeEntityId === 'player';
  return {
    round:       battleState.round,
    phase:       battleState.phase,
    activeLabel: isPlayer ? 'PLAYER' : 'OPPONENT',
    arenaSchool: battleState.metadata?.arenaSchool || 'SONIC',
  };
}
