import { describe, expect, it } from 'vitest';
import { selectBoardTiles } from '../../src/pages/Combat/state/combatSelectors.js';

function makeGrid(width = 3, height = 3) {
  return Array.from({ length: height }, (_, y) => (
    Array.from({ length: width }, (_, x) => ({
      position: { x, y },
      occupantId: null,
      fieldEffect: null,
    }))
  ));
}

function makeBattleState(movesRemaining) {
  const grid = makeGrid();
  grid[1][1].occupantId = 'player';

  return {
    gridWidth: 3,
    gridHeight: 3,
    grid,
    leylines: [],
    spentLeylineIds: [],
    playerTurnIndex: 1,
    entities: [{
      id: 'player',
      position: { x: 1, y: 1 },
      mov: 1,
      movesRemaining,
    }],
  };
}

describe('Combat board movement lock', () => {
  it('does not expose reachable movement tiles after movement is spent', () => {
    const tiles = selectBoardTiles(makeBattleState(0), { targetingMode: 'move' });

    expect(tiles.some((tile) => tile.isReachable)).toBe(false);
  });

  it('exposes reachable movement tiles when movement remains', () => {
    const tiles = selectBoardTiles(makeBattleState(1), { targetingMode: 'move' });

    expect(tiles.filter((tile) => tile.isReachable)).toHaveLength(4);
  });
});
