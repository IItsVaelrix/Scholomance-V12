import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useCombatBoard } from './hooks/useCombatBoard.js';
import { useCombatAnimationQueue } from './hooks/useCombatAnimationQueue.js';
import { CombatUIStateProvider, deriveCombatMode } from './state/useCombatUIState.js';
import BattleChrome from './BattleChrome.jsx';
import BattleArena from './BattleArena.jsx';
import OracleScribe from './OracleScribe.jsx';
import CombatLog from './CombatLog.jsx';
import OpponentDisplay from './OpponentDisplay.jsx';
import EnemyDetailsModal from './components/EnemyDetailsModal.jsx';
import ScholarStatusPanel from './components/ScholarStatusPanel.jsx';
import TileInspector from './components/TileInspector.jsx';
import BottomCommandBand from './components/BottomCommandBand.jsx';
import { getCrossPattern } from './state/combatPreviewUtils.js';
import { combatBridge } from './combatBridge.js';
import GodotOverlay from './components/GodotOverlay.jsx';
import './CombatPage.css';

export default function CombatPage() {
  const arenaRef = useRef(null);
  const { enqueue, isPlaying, activeIntent } = useCombatAnimationQueue();
  const [showEnemyDetails, setShowEnemyDetails] = useState(false);
  const [arenaReady, setArenaReady] = useState(false);
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const [bridgeState, setBridgeState] = useState('PLAYER_TURN');
  const [scoreResult, setScoreResult] = useState(null);

  const {
    battleState,
    startBattle,
    submitScroll,
    channelEnergy,
    waitTurn,
    moveEntity,
    fleeBattle,
    isResolving,
    turnTimeRemaining,
    isPlayerTurn,
    selectedAction,
    setSelectedAction,
    cursorTile,
    setCursorTile,
    tileViewModels,
    renderedUnits,
    encounterHeader,
    scholar,
    opponent,
    cellLabel,
    range,
  } = useCombatBoard();

  // Derive UI mode from game state — drives data-combat-mode on shell
  const mode = useMemo(
    () => deriveCombatMode(selectedAction, isResolving),
    [selectedAction, isResolving]
  );

  const handleConfirmMove = useCallback((target) => {
    if (!scholar || isPlaying) return;
    const dx = target.x - scholar.position.x;
    const dy = target.y - scholar.position.y;
    moveEntity({ dx, dy });
    if (arenaRef.current) {
      enqueue({ type: 'MOVE', unitId: scholar.id, path: target }, arenaRef.current);
    }
    setSelectedAction(null);
  }, [scholar, isPlaying, moveEntity, enqueue, setSelectedAction]);

  const handleActionSelect = useCallback((action) => {
    if (isPlaying) return;
    if (action === 'FLEE') { fleeBattle(); return; }

    if (action === 'CHANNEL') {
      if (arenaRef.current) {
        enqueue({ type: 'TURN_SHIFT', activeSide: 'scholar' }, arenaRef.current);
      }
      channelEnergy();
      setSelectedAction(null);
      return;
    }

    if (action === 'WAIT') {
      if (arenaRef.current) {
        enqueue({ type: 'TURN_SHIFT', activeSide: 'scholar' }, arenaRef.current);
      }
      waitTurn();
      setSelectedAction(null);
      return;
    }

    setSelectedAction(selectedAction === action ? null : action);
  }, [isPlaying, fleeBattle, setSelectedAction, selectedAction, channelEnergy, waitTurn, enqueue]);

  const handleSelectCell = useCallback((cell) => {
    setCursorTile(cell);

    if (isPlayerTurn && scholar && cell.x === scholar.position.x && cell.y === scholar.position.y && !isPlaying) {
      setSelectedAction('MOVE');
      return;
    }

    if (selectedAction === 'MOVE') {
      const isReachable = tileViewModels.find(t => t.coord.x === cell.x && t.coord.y === cell.y)?.isReachable;
      if (isReachable) handleConfirmMove(cell);
    }
  }, [isPlayerTurn, scholar, selectedAction, tileViewModels, isPlaying, setCursorTile, handleConfirmMove, setSelectedAction]);

  useEffect(() => {
    const onKey = (e) => {
      // Backtick toggles the combat log
      if (e.key === '`') {
        setIsLogCollapsed(c => !c);
        return;
      }

      if (isPlaying || !isPlayerTurn) return;

      // Number hotkeys for action selection
      const numKeys = { '1': 'INSCRIBE', '2': 'MOVE', '3': 'CHANNEL', '4': 'WAIT', '5': 'FLEE' };
      if (numKeys[e.key]) {
        handleActionSelect(numKeys[e.key]);
        return;
      }

      if (e.key === 'Enter') {
        if (selectedAction === 'MOVE' && cursorTile) {
          const isReachable = tileViewModels.find(t => t.coord.x === cursorTile.x && t.coord.y === cursorTile.y)?.isReachable;
          if (isReachable) handleConfirmMove(cursorTile);
        }
      }
      if (e.key === 'Escape') setSelectedAction(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, isPlayerTurn, selectedAction, cursorTile, tileViewModels, handleConfirmMove, setSelectedAction, handleActionSelect]);

  const handleCast = useCallback((text, weave) => {
    if (arenaRef.current && scholar && cursorTile && !isPlaying) {
      const affectedCells = getCrossPattern(cursorTile, 1);
      enqueue({ type: 'CAST', unitId: scholar.id, target: cursorTile, school: scholar.school }, arenaRef.current);
      enqueue({ type: 'HIT', affectedTiles: affectedCells, school: scholar.school }, arenaRef.current);
      submitScroll(text, weave, cursorTile, affectedCells);
    }
  }, [arenaRef, scholar, cursorTile, isPlaying, enqueue, submitScroll]);

  const activeLabel = encounterHeader?.activeLabel;
  useEffect(() => {
    if (!arenaReady || !activeLabel || !arenaRef.current) return;
    enqueue({ type: 'TURN_SHIFT', activeSide: activeLabel.toLowerCase() }, arenaRef.current);
  }, [activeLabel, arenaReady, enqueue]);

  useEffect(() => {
    startBattle('void_wraith_01');
  }, [startBattle]);

  useEffect(() => {
    const offStateUpdate = combatBridge.on('state:update', (payload) => {
      if (payload.state) setBridgeState(payload.state);
    });
    const offActionInscribe = combatBridge.on('action:inscribe', () => {
      setBridgeState('CASTING');
    });
    const offAnimDone = combatBridge.on('anim:player:done', () => {
      setBridgeState('SCORE_REVEAL');
    });
    return () => {
      offStateUpdate();
      offActionInscribe();
      offAnimDone();
    };
  }, []);

  const handleCastBridge = useCallback(async (text, weave) => {
    try {
      const resp = await fetch('/api/combat/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, weave }),
      });
      const data = await resp.json();
      setScoreResult(data);
      setBridgeState('SPELL_FLYING');
    } catch {
      setBridgeState('PLAYER_TURN');
    }
  }, []);

  const handleCastWrapper = useCallback((text, weave) => {
    if (bridgeState === 'CASTING') {
      handleCastBridge(text, weave);
    } else {
      handleCast(text, weave);
    }
  }, [bridgeState, handleCast, handleCastBridge]);

  if (!battleState) {
    return <div className="battle-page-loading">The Arena Stirs...</div>;
  }

  const arenaSchool = encounterHeader.arenaSchool;
  const cursorVM = tileViewModels.find(t => t.isCursor);
  const occupantEntity = cursorVM?.occupantId
    ? battleState.entities.find(e => e.id === cursorVM.occupantId)
    : null;
  const latestPlayerTurn = [...battleState.history]
    .reverse()
    .find((turn) => turn.entityId === scholar?.id) || null;
  const latestOpponentTurn = [...battleState.history]
    .reverse()
    .find((turn) => turn.entityId === opponent?.id) || null;

  const uiStateValue = { mode, isLogCollapsed, setIsLogCollapsed };

  return (
    <CombatUIStateProvider value={uiStateValue}>
        <div
          className={`battle-page-root${isPlaying ? ' is-animating' : ''}${bridgeState !== 'PLAYER_TURN' ? ' bridge-active' : ''}`}
          data-combat-mode={mode}
          data-state={bridgeState}
        >
        <div className="battle-immersive-mode">
          <BattleChrome
            school={arenaSchool}
            round={battleState.round}
            onFlee={fleeBattle}
            timeRemaining={turnTimeRemaining}
            mode={mode}
            isPlayerTurn={isPlayerTurn}
            isResolving={isResolving}
          />

          <main className="battle-main-layout">
            <aside className="battle-column-left">
              <OracleScribe
                onSubmit={handleCastWrapper}
                isDisabled={bridgeState === 'CASTING' ? false : (!isPlayerTurn || isResolving || isPlaying)}
                school={arenaSchool}
              />
            </aside>

            <section className="battle-column-center">
              <div className="center-top-strip" aria-live="polite">
                TURN {encounterHeader.round}
                <span className="top-strip-divider">·</span>
                {encounterHeader.activeLabel} ACTING
              </div>
              <div className="center-middle-block">
                <BattleArena
                  ref={arenaRef}
                  arenaSchool={arenaSchool}
                  tileViewModels={tileViewModels}
                  renderedUnits={renderedUnits}
                  cursorTile={cursorTile}
                  onSelectCell={handleSelectCell}
                  onReady={() => setArenaReady(true)}
                />
                <GodotOverlay />
              </div>
              <BottomCommandBand
                selectedAction={selectedAction}
                onActionSelect={handleActionSelect}
                isDisabled={isPlaying}
                movesRemaining={scholar?.movesRemaining}
              />
            </section>

            <aside className="battle-column-right">
              <div className="bottom-subpanel-title">ENCOUNTER</div>
              {opponent && (
                <OpponentDisplay
                  archetype={opponent}
                  currentHP={opponent.hp}
                  maxHP={opponent.maxHp}
                  phase={battleState.phase}
                  onShowDetails={() => setShowEnemyDetails(true)}
                />
              )}

              <ScholarStatusPanel scholar={scholar} latestTurn={latestPlayerTurn} />

              {mode !== 'inscribe' && (
                <TileInspector
                  cellLabel={cellLabel}
                  range={range}
                  occupantEntity={occupantEntity}
                  scholarRange={scholar?.range || 2}
                />
              )}

              <CombatLog
                history={battleState.history}
                isResolving={isResolving}
                activeIntent={activeIntent}
                isCollapsed={isLogCollapsed}
                onToggle={() => setIsLogCollapsed(c => !c)}
              />
            </aside>
          </main>

          <div className="hotkey-footer" aria-hidden="true">
            [WASD] MOVE CURSOR
            <span className="footer-divider">·</span>
            [ENTER] CONFIRM
            <span className="footer-divider">·</span>
            [ESC] CANCEL
            <span className="footer-divider">·</span>
            [1–5] ACTIONS
            <span className="footer-divider">·</span>
            [`] LOG
          </div>
        </div>

        {bridgeState === 'SCORE_REVEAL' && scoreResult && (
          <div className="bridge-score-overlay">
            <div className="bridge-score-panel" role="region" aria-label="Spell score breakdown">
              <h2>VERSE AFTERMATH</h2>
              <div className="bridge-score-content">
                <div className="bridge-score-stat">
                  <span className="bridge-score-label">TOTAL DAMAGE</span>
                  <span className="bridge-score-value">{scoreResult.damage}</span>
                </div>
                <div className="bridge-score-stat">
                  <span className="bridge-score-label">SCORE</span>
                  <span className="bridge-score-value">{scoreResult.totalScore}</span>
                </div>
              </div>
              <div className="battle-log">{scoreResult.commentary}</div>
              <button type="button" className="btn btn-primary" onClick={() => setBridgeState('VICTORY')}>
                Claim victory
              </button>
            </div>
          </div>
        )}

        {bridgeState === 'VICTORY' && (
          <div className="bridge-victory-overlay">
            <div className="bridge-victory-dialog" role="dialog" aria-label="Victory">
              <h2>THE RITE IS COMPLETE</h2>
              <p>Your verse has triumphed in the arena.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setBridgeState('PLAYER_TURN');
                  setScoreResult(null);
                }}
              >
                Begin a new combat rite
              </button>
            </div>
          </div>
        )}

        <EnemyDetailsModal
          isOpen={showEnemyDetails}
          onClose={() => setShowEnemyDetails(false)}
          enemy={opponent}
          latestTurn={latestOpponentTurn}
        />
      </div>
    </CombatUIStateProvider>
  );
}
