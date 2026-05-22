import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CombatLog.jsx — CombatLogDrawer
 *
 * Chronicle of combat events. Supports collapse/expand modes so the log
 * supports MUD information density without drowning the battlefield.
 *
 * Modes:
 *   collapsed — shows last 2 entries + fade + toggle button
 *   expanded  — full scrollable chronicle (current behavior)
 *
 * Animation sync with board events is preserved from original implementation.
 */

export default function CombatLog({ history, isResolving, activeIntent, isCollapsed = false, onToggle }) {
  const [visibleHistory, setVisibleHistory] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    if (history.length === 0) {
      setVisibleHistory([]);
      return;
    }
    const lastEntry = history[history.length - 1];
    if (visibleHistory.find(h => h.id === lastEntry.id || (h.narrativeLog === lastEntry.narrativeLog && h.timestamp === lastEntry.timestamp))) {
      return;
    }
    if (!activeIntent) {
      setVisibleHistory(history);
    }
  }, [history, activeIntent, visibleHistory]);

  useEffect(() => {
    if (!activeIntent && history.length > visibleHistory.length) {
      setVisibleHistory(history.slice(0, visibleHistory.length + 1));
    }
  }, [activeIntent, history, visibleHistory]);

  useEffect(() => {
    if (logRef.current && !isCollapsed) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleHistory, isResolving, isCollapsed]);

  const displayEntries = isCollapsed
    ? visibleHistory.slice(-2)
    : visibleHistory;

  return (
    <div className={`combat-log battle-panel${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="combat-log-header">
        <span className="combat-log-title">CHRONICLE</span>
        {onToggle && (
          <button
            className="log-toggle-btn"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expand chronicle' : 'Collapse chronicle'}
            title={isCollapsed ? 'Expand [` key]' : 'Collapse [` key]'}
            type="button"
          >
            {isCollapsed ? '▲ EXPAND' : '▼ COLLAPSE'}
          </button>
        )}
      </div>

      <div className={`log-entries${isCollapsed ? ' log-entries-collapsed' : ''}`} ref={logRef}>
        <AnimatePresence initial={false}>
          {displayEntries.map((turn, i) => (
            <LogEntry
              key={turn.id ?? `${turn.narrativeLog}-${i}`}
              turn={turn}
            />
          ))}
        </AnimatePresence>

        {isResolving && (
          <div className="log-resolving-indicator" aria-label="Resolving">
            <div className="resolving-dot" />
            <div className="resolving-dot" />
            <div className="resolving-dot" />
          </div>
        )}
      </div>

      {isCollapsed && visibleHistory.length > 2 && (
        <div className="log-collapsed-fade" aria-hidden="true" />
      )}
    </div>
  );
}

function LogEntry({ turn }) {
  const timestamp = turn?.timestamp
    ? new Date(turn.timestamp)
    : new Date();
  const badges = Array.isArray(turn?.scoreSummary?.badges)
    ? turn.scoreSummary.badges.slice(0, 4)
    : [];
  const counterTokens = Array.isArray(turn?.counterTokens)
    ? turn.counterTokens.slice(0, 3)
    : [];
  const traceLine = Array.isArray(turn?.explainTrace)
    ? turn.explainTrace
      .slice(0, 2)
      .map((trace) => `${String(trace?.heuristic || '').replaceAll('_', ' ')} ${Math.round(Number(trace?.contribution) || 0)}`)
      .filter(Boolean)
      .join(' · ')
    : '';

  return (
    <motion.div
      className="log-entry"
      data-outcome={turn.damageMap?.[0]?.outcomeLabel}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <span className="log-timestamp">
        [{timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
      </span>
      <span className="log-text">{turn.narrativeLog}</span>
      {turn.commentary && turn.commentary !== turn.narrativeLog && (
        <div className="log-commentary">{turn.commentary}</div>
      )}
      {badges.length > 0 && (
        <div className="log-badges">{badges.join(' · ')}</div>
      )}
      {turn.telegraph?.summary && (
        <div className="log-telegraph">TELEGRAPH: {turn.telegraph.summary}</div>
      )}
      {counterTokens.length > 0 && (
        <div className="log-counter-tokens">COUNTER TOKENS: {counterTokens.join(', ')}</div>
      )}
      {traceLine && (
        <div className="log-traces">TRACES: {traceLine}</div>
      )}
    </motion.div>
  );
}
