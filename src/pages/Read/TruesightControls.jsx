import PropTypes from 'prop-types';
import { ANALYSIS_MODES } from '../../lib/truesight/compiler/analysisModes';

/**
 * Truesight mode control panel.
 * Provides toggle for Truesight and mode selection.
 */
export default function TruesightControls({
  isTruesight,
  onToggle,
  analysisMode,
  onModeChange,
  isAnalyzing = false,
  disabled = false,
  isPredictive = false,
  onTogglePredictive = () => {},
}) {
  return (
    <div className="truesight-controls">
      <button
        type="button"
        className={`toolbar-btn toolbar-btn--truesight ${isTruesight ? 'toolbar-btn--active' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isTruesight}
        title="Toggle Truesight analysis overlay"
      >
        <span aria-hidden="true">&#x1F441;</span>
        Truesight
      </button>

      <button
        type="button"
        className={`toolbar-btn toolbar-btn--predictive ${isPredictive ? 'toolbar-btn--active' : ''}`}
        onClick={onTogglePredictive}
        disabled={disabled}
        aria-pressed={isPredictive}
        title="Toggle Weighted Ritual Prediction"
      >
        <span aria-hidden="true">&#x2728;</span>
        Predict
      </button>

      <button
        type="button"
        className={`toolbar-btn toolbar-btn--astrology ${analysisMode === ANALYSIS_MODES.ASTROLOGY ? 'toolbar-btn--active' : ''}`}
        onClick={() => onModeChange(ANALYSIS_MODES.ASTROLOGY)}
        disabled={disabled}
        aria-pressed={analysisMode === ANALYSIS_MODES.ASTROLOGY}
        title="Summon the rhyme astrology observatory"
      >
        <span aria-hidden="true">&#x2736;</span>
        Astrology
      </button>

      <button
        type="button"
        className={`toolbar-btn toolbar-btn--analyze ${analysisMode === ANALYSIS_MODES.ANALYZE ? 'toolbar-btn--active' : ''}`}
        onClick={() => onModeChange(ANALYSIS_MODES.ANALYZE)}
        disabled={disabled}
        aria-pressed={analysisMode === ANALYSIS_MODES.ANALYZE}
        title="Poetic and structural analysis"
      >
        <span aria-hidden="true">&#x2697;</span>
        Analyze
      </button>

      {isAnalyzing && (
        <span className="analyzing-indicator" aria-live="polite">
          Analyzing...
        </span>
      )}
    </div>
  );
}

TruesightControls.propTypes = {
  isTruesight: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  analysisMode: PropTypes.oneOf(Object.values(ANALYSIS_MODES)),
  onModeChange: PropTypes.func.isRequired,
  isAnalyzing: PropTypes.bool,
  disabled: PropTypes.bool,
  isPredictive: PropTypes.bool,
  onTogglePredictive: PropTypes.func,
};
