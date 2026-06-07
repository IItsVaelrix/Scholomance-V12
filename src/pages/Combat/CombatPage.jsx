import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useCombatBoard } from './hooks/useCombatBoard.js';
import { useSpellScoringFlow } from './hooks/useSpellScoringFlow.js';
import { CombatUIStateProvider, deriveCombatMode } from './state/useCombatUIState.js';
import { HOTKEY_TO_ACTION, buildActionHotkeyFooter } from './state/combatActions.js';
import BattleChrome from './BattleChrome.jsx';
import BattleArena from './BattleArena.jsx';
import OracleScribe from './OracleScribe.jsx';
import ExtractionScribe from './components/ExtractionScribe.jsx';
import CombatLog from './CombatLog.jsx';
import OpponentDisplay from './OpponentDisplay.jsx';
import EnemyDetailsModal from './components/EnemyDetailsModal.jsx';
import ScholarStatusPanel from './components/ScholarStatusPanel.jsx';
import TileInspector from './components/TileInspector.jsx';
import BottomCommandBand from './components/BottomCommandBand.jsx';
import { getCrossPattern } from './state/combatPreviewUtils.js';
import ShaderArenaBackdrop from './components/ShaderArenaBackdrop.jsx';
import CombatRundownModal from './components/CombatRundownModal.jsx';
import { connectCombatBridge, onCombatCommand, broadcastCombatInit, broadcastCombatAction, buildActionPayload, disconnectCombatBridge } from './combatBridge.js';
import './CombatPage.css';

export default function CombatPage() {
  const arenaRef = useRef(null);
  const [showEnemyDetails, setShowEnemyDetails] = useState(false);
  const [arenaReady, setArenaReady] = useState(false);
  const [isLogCollapsed, setIsLogCollapsed] = useState(false);
  const lastAnimatedOpponentTurnRef = useRef(null);
  const [opponentMotionHold, setOpponentMotionHold] = useState(null);

  const {
    battleState,
    startBattle,
    submitScroll,
    submitExtraction,
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

  const canExtract = useMemo(
    () => tileViewModels.some((t) => t.canExtractLeyline),
    [tileViewModels]
  );
  const arenaSchool = encounterHeader?.arenaSchool || 'SONIC';
  const latestHistoryTurn = battleState?.history?.[battleState.history.length - 1] || null;
  const pendingOpponentMotion = useMemo(() => (
    latestHistoryTurn?.entityId === 'opponent'
      && latestHistoryTurn?.motion?.origin
      && latestHistoryTurn?.id !== opponentMotionHold?.completedTurnId
      ? {
        turnId: latestHistoryTurn.id,
        origin: latestHistoryTurn.motion.origin,
      }
      : null
  ), [latestHistoryTurn, opponentMotionHold?.completedTurnId]);
  const displayedRenderedUnits = useMemo(() => {
    const hold = opponentMotionHold?.turnId === pendingOpponentMotion?.turnId
      ? opponentMotionHold
      : pendingOpponentMotion;
    if (!hold?.origin) return renderedUnits;
    return renderedUnits.map((unit) => (
      unit.id === 'opponent'
        ? { ...unit, position: hold.origin }
        : unit
    ));
  }, [opponentMotionHold, pendingOpponentMotion, renderedUnits]);

  // Derive UI mode from game state — drives data-combat-mode on shell
  const mode = useMemo(
    () => deriveCombatMode(selectedAction, isResolving),
    [selectedAction, isResolving]
  );

  useEffect(() => {
    connectCombatBridge();

    return onCombatCommand((commandText, packet) => {
      // Execute the command via React state
      if (commandText.startsWith("MOVE ")) {
        const parts = commandText.split(" ");
        const dx = parseInt(parts[1], 10);
        const dy = parseInt(parts[2], 10);
        moveEntity({ dx, dy });
      } else {
        submitScroll(commandText);
      }
    });
  }, [submitScroll, moveEntity]);

  const lastInitIdRef = useRef(null);
  const lastHistoryLengthRef = useRef(0);

  useEffect(() => {
    if (!battleState) return;
    
    // Detect new battle and broadcast INIT
    if (battleState.id !== lastInitIdRef.current) {
      lastInitIdRef.current = battleState.id;
      lastHistoryLengthRef.current = 0;
      const seed = battleState.metadata?.battleSeed || 'default';
      broadcastCombatInit(seed, battleState);
    }
    
    // Detect new history actions and broadcast ACTION
    if (battleState.history && battleState.history.length > lastHistoryLengthRef.current) {
      const newActions = battleState.history.slice(lastHistoryLengthRef.current);
      newActions.forEach(turnResult => {
        const payload = buildActionPayload(turnResult);
        if (payload) {
          broadcastCombatAction(payload);
        }
      });
      lastHistoryLengthRef.current = battleState.history.length;
    }
  }, [battleState, tileViewModels]);

  const handleConfirmMove = useCallback((target) => {
    if (!scholar || (Number(scholar.movesRemaining) || 0) <= 0 || battleState?.phase === 'victory' || battleState?.phase === 'defeat') return;
    const dx = target.x - scholar.position.x;
    const dy = target.y - scholar.position.y;
    moveEntity({ dx, dy });
    setSelectedAction(null);
  }, [scholar, battleState?.phase, moveEntity, setSelectedAction]);

  const handleActionSelect = useCallback((action) => {
    if (battleState?.phase === 'victory' || battleState?.phase === 'defeat') return;
    if (action === 'FLEE') { fleeBattle(); return; }
    if (action === 'MOVE' && (Number(scholar?.movesRemaining) || 0) <= 0) {
      setSelectedAction(null);
      return;
    }

    if (action === 'CHANNEL') {
      channelEnergy();
      setSelectedAction(null);
      return;
    }

    if (action === 'WAIT') {
      waitTurn();
      setSelectedAction(null);
      return;
    }

    setSelectedAction(selectedAction === action ? null : action);
  }, [battleState?.phase, fleeBattle, scholar?.movesRemaining, setSelectedAction, selectedAction, channelEnergy, waitTurn]);

  const handleSelectCell = useCallback((cell) => {
    if (battleState?.phase === 'victory' || battleState?.phase === 'defeat') return;
    setCursorTile(cell);

    if (isPlayerTurn && scholar && (Number(scholar.movesRemaining) || 0) > 0 && cell.x === scholar.position.x && cell.y === scholar.position.y) {
      setSelectedAction('MOVE');
      return;
    }

    const clickedTileVM = tileViewModels.find(t => t.coord.x === cell.x && t.coord.y === cell.y);
    if (isPlayerTurn && clickedTileVM?.occupantId === 'opponent') {
      setSelectedAction('INSCRIBE');
      return;
    }

    if (selectedAction === 'MOVE') {
      const isReachable = tileViewModels.find(t => t.coord.x === cell.x && t.coord.y === cell.y)?.isReachable;
      if (isReachable) handleConfirmMove(cell);
    }
  }, [battleState?.phase, isPlayerTurn, scholar, selectedAction, tileViewModels, setCursorTile, handleConfirmMove, setSelectedAction]);

  useEffect(() => {
    const onKey = (e) => {
      // Backtick toggles the combat log
      if (e.key === '`') {
        setIsLogCollapsed(c => !c);
        return;
      }

      if (!isPlayerTurn || battleState?.phase === 'victory' || battleState?.phase === 'defeat') return;

      // Number hotkeys for action selection — derived from ACTION_DEFS
      const actionId = HOTKEY_TO_ACTION[e.key];
      if (actionId) {
        if (actionId === 'EXTRACT' && !canExtract) return;
        handleActionSelect(actionId);
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
  }, [isPlayerTurn, battleState?.phase, selectedAction, cursorTile, tileViewModels, handleConfirmMove, setSelectedAction, handleActionSelect, canExtract]);

  const handleCast = useCallback((text, weave) => {
    if (scholar && cursorTile && battleState?.phase !== 'victory' && battleState?.phase !== 'defeat') {
      const affectedCells = getCrossPattern(cursorTile, 1);
      submitScroll(text, weave, cursorTile, affectedCells);
    }
  }, [scholar, cursorTile, battleState?.phase, submitScroll]);

  const activeLabel = encounterHeader?.activeLabel;

  useEffect(() => {
    if (!arenaReady || !battleState?.history?.length) return;

    const latestTurn = battleState.history[battleState.history.length - 1];
    if (!latestTurn || latestTurn.entityId !== 'opponent' || latestTurn.id === lastAnimatedOpponentTurnRef.current) return;

    lastAnimatedOpponentTurnRef.current = latestTurn.id;
    const origin = latestTurn.motion?.origin || latestTurn.previousPosition || latestTurn.origin;
    if (origin) {
      setOpponentMotionHold({ turnId: latestTurn.id, origin });
    }
  }, [arenaReady, battleState?.history]);

  useEffect(() => {
    if (!opponentMotionHold?.turnId) return;
    // Instantly complete opponent motion hold since we have no local isPlaying blocker anymore
    setOpponentMotionHold({ completedTurnId: opponentMotionHold.turnId });
  }, [opponentMotionHold]);

  useEffect(() => {
    startBattle('void_wraith_01');
  }, [startBattle]);

  // Clear any active action highlight when combat ends so the bottom
  // command band doesn't show a stale "is-active" button over the
  // post-battle modal.
  useEffect(() => {
    if (battleState?.phase === 'victory' || battleState?.phase === 'defeat') {
      setSelectedAction(null);
    }
  }, [battleState?.phase, setSelectedAction]);



  const {
    bridgeState,
    scoreResult,
    combatRundown,
    isRundownOpen,
    submitCast: submitScoringCast,
    claimVictory,
    dismissRundown,
    clearForRestart,
  } = useSpellScoringFlow({
    battleState,
    scholar,
    arenaSchool,
    isPlaying: false,
    isResolving,
    isCombatEnded: battleState?.phase === 'victory' || battleState?.phase === 'defeat',
    onLocalCast: handleCast,
  });

  if (!battleState) {
    return <div className="battle-page-loading">The Arena Stirs...</div>;
  }

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
  const isCombatEnded = battleState.phase === 'victory' || battleState.phase === 'defeat';

  return (
    <CombatUIStateProvider value={uiStateValue}>
      <div
        className={`battle-page-root${bridgeState !== 'PLAYER_TURN' ? ' bridge-active' : ''}`}
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

          <main className="combat-page combat-page--codex">
            <section className="combat-book-spread" aria-label="Combat encounter">
              <section className="combat-text-page" aria-label="Battle transcript and commands">
                <header className="combat-mud-header">
                  <div className="combat-data-block combat-data-block--scholar">
                    <ScholarStatusPanel scholar={scholar} latestTurn={latestPlayerTurn} playerTurnIndex={battleState.playerTurnIndex} />
                  </div>

                  <div className="combat-data-block combat-data-block--opponent">
                    {opponent && (
                      <OpponentDisplay
                        archetype={opponent}
                        currentHP={opponent.hp}
                        maxHP={opponent.maxHp}
                        phase={battleState.phase}
                        onShowDetails={() => setShowEnemyDetails(true)}
                      />
                    )}
                  </div>
                </header>

                <section className="combat-transcript-shell" aria-label="Combat log">
                  <CombatLog
                    history={battleState.history}
                    isResolving={isResolving}
                    activeIntent={null}
                    isCollapsed={isLogCollapsed}
                    onToggle={() => setIsLogCollapsed(c => !c)}
                    variant="mud"
                  />
                </section>

                <footer className="combat-command-dock" aria-label="Combat command line">
                  <BottomCommandBand
                    selectedAction={selectedAction}
                    onActionSelect={handleActionSelect}
                    isDisabled={isCombatEnded}
                    movesRemaining={scholar?.movesRemaining}
                    canExtract={canExtract}
                    variant="inline"
                  />

                  {selectedAction === 'EXTRACT' ? (
                    <ExtractionScribe
                      leyline={battleState.leylines?.find(ley => ley.coord.x === scholar?.position.x && ley.coord.y === scholar?.position.y)}
                      onSubmit={async (phrase) => {
                        await submitExtraction(phrase, scholar?.position);
                        setSelectedAction(null);
                      }}
                      isDisabled={isCombatEnded || !isPlayerTurn || isResolving}
                      variant="terminal"
                    />
                  ) : (
                    <OracleScribe
                      onSubmit={submitScoringCast}
                      isDisabled={isCombatEnded || (bridgeState === 'CASTING' ? false : (!isPlayerTurn || isResolving))}
                      school={arenaSchool}
                      variant="terminal"
                    />
                  )}
                </footer>
              </section>

              <aside className="combat-illustration-page" aria-label="Battle illustration">
                <div className="combat-illustration-meta">
                  <span>ARENA PLATE</span>
                  <span>PHASER GRID</span>
                </div>

                <div className="combat-illustration-frame">
                  <ShaderArenaBackdrop school={arenaSchool} resonance={0.72} />
                  
                  <BattleArena
                    ref={arenaRef}
                    arenaSchool={arenaSchool}
                    tileViewModels={tileViewModels}
                    renderedUnits={displayedRenderedUnits}
                    cursorTile={cursorTile}
                    onSelectCell={handleSelectCell}
                    onReady={() => setArenaReady(true)}
                  />

                  {mode !== 'inscribe' && (
                    <div className="combat-floating-inspector" style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '0.5rem', border: '1px solid var(--combat-line)' }}>
                      <TileInspector
                        cellLabel={cellLabel}
                        range={range}
                        occupantEntity={occupantEntity}
                        scholarRange={scholar?.range || 2}
                        tile={cursorVM}
                      />
                    </div>
                  )}
                </div>
              </aside>
            </section>
          </main>

          <div className="hotkey-footer" aria-hidden="true">
            [WASD] MOVE CURSOR
            <span className="footer-divider">·</span>
            [ENTER] CONFIRM
            <span className="footer-divider">·</span>
            [ESC] CANCEL
            <span className="footer-divider">·</span>
            {buildActionHotkeyFooter()}
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={claimVictory}
              >
                Claim victory
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
        <CombatRundownModal
          isOpen={isRundownOpen}
          rundown={combatRundown}
          onClose={dismissRundown}
          onRestart={() => {
            clearForRestart();
            startBattle('void_wraith_01');
          }}
        />
      </div>
    </CombatUIStateProvider>
  );
}
