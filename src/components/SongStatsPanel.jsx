import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AnimatedSurface } from './AnimatedSurface';
import './SongStatsPanel.css';

function formatNumber(value, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '—';
}

function formatTechnicalDensity(value) {
  if (value == null) return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : '—';
}

function PillarCard({ title, value, secondary, fidelity }) {
  return (
    <AnimatedSurface className="song-stats-card">
      <div className="song-stats-card-heading">
        <h3>{title}</h3>
        {fidelity && (
          <span className={`song-stats-fidelity is-${fidelity}`}>
            {fidelity === 'aligned' ? 'Aligned' : 'Estimated'}
          </span>
        )}
      </div>
      <p className="song-stats-card-value">{value}</p>
      {secondary && <p className="song-stats-card-secondary">{secondary}</p>}
    </AnimatedSurface>
  );
}

/**
 * Renders the three canonical SongStats pillars and their composite.
 *
 * @param {{
 *   stats: import('../../codex/core/song-stats/types.js').SongStatsResult,
 *   visible: boolean,
 *   isEmbedded?: boolean,
 *   onClose?: (() => void) | null,
 * }} props
 */
export default function SongStatsPanel({
  stats,
  visible,
  isEmbedded = false,
  onClose = null,
}) {
  const reduceMotion = useReducedMotion();
  const densityExplanationId = useId();

  if (!visible || !stats) return null;

  const { composite, meta, pillars, wordCount } = stats;
  const rhyme = pillars.rhymeDensity;
  const vocabulary = pillars.uniqueVocabulary;
  const flow = pillars.flowAlignment;
  const isAligned = flow.fidelity === 'aligned';
  const flowSecondary = isAligned
    ? `Syncopation index ${formatNumber(flow.secondary?.syncopationIndex)}`
    : `Syncopation proxy ${formatNumber(flow.secondary?.stressDisplacementProxy)}`;
  const weights = composite.weights;

  const content = (
    <AnimatedSurface className="song-stats-surface">
      <header className="song-stats-header">
        <div className="song-stats-title-group">
          <span className="song-stats-kicker">CODEx metrics</span>
          <h2>Technical Density</h2>
          <p className="song-stats-density">
            {formatTechnicalDensity(composite.total0to100)} · {composite.band ?? 'Unscored'}
          </p>
          <span className="song-stats-explanation">
            <button
              type="button"
              className="song-stats-explanation-trigger"
              aria-label="About Technical Density"
              aria-describedby={densityExplanationId}
            >
              ?
            </button>
            <span
              id={densityExplanationId}
              className="song-stats-explanation-tooltip"
              role="tooltip"
            >
              Measures technical concentration, not artistic quality, emotional impact, or song effectiveness.
            </span>
          </span>
          {composite.provisional && (
            <span className="song-stats-provisional">
              Provisional
            </span>
          )}
        </div>

        <div className="song-stats-seal" aria-hidden="true">
          <span>TD</span>
          <i>{formatTechnicalDensity(composite.total0to100)}</i>
        </div>

        {!isEmbedded && onClose && (
          <button
            type="button"
            className="song-stats-close"
            onClick={onClose}
            aria-label="Close song statistics"
          >
            ×
          </button>
        )}
      </header>

      <div className="song-stats-grid">
        <PillarCard
          title="CODEx Rhyme Density"
          value={`RD_C ${formatNumber(rhyme.value)}`}
          secondary={`Malmi baseline ${formatNumber(rhyme.secondary?.malmiDensity)}`}
        />
        <PillarCard
          title="CODEx Lexical Diversity"
          value={`${formatNumber(vocabulary.value)} per 100 words`}
        />
        <PillarCard
          title="Flow"
          value={`SPS ${formatNumber(flow.value)}`}
          secondary={flowSecondary}
          fidelity={flow.fidelity}
        />
      </div>

      <footer className="song-stats-footer">
        <span>{wordCount} words</span>
        <span>window {meta.rhymeWindow}</span>
        <span>
          weights {Math.round(weights.rhymeDensity * 100)}/
          {Math.round(weights.uniqueVocabulary * 100)}/
          {Math.round(weights.flowAlignment * 100)}
        </span>
        <span>{meta.engineVersion}</span>
        <span>{meta.calibrationVersion}</span>
      </footer>
    </AnimatedSurface>
  );

  if (isEmbedded) {
    return (
      <aside className="song-stats-panel is-embedded" aria-label="CODEx song statistics">
        {content}
      </aside>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        className="song-stats-panel"
        initial={reduceMotion ? false : { opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: 32 }}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
        aria-label="CODEx song statistics"
      >
        {content}
      </motion.aside>
    </AnimatePresence>
  );
}
