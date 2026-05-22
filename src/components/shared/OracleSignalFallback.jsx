import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import './OracleSignalFallback.css';

/**
 * OracleSignalFallback — the "Oracle signal fading" overlay (Pillar 4, S-Gate).
 *
 * A localized, in-world degraded surface shown when the Lexicon Oracle cannot
 * be reached, is still warming, or a panel crashed. It never replaces the IDE
 * frame — it occupies only the divination surface and offers a reconnect rite.
 */

const COPY = {
  disconnected: {
    glyph: '✴',
    title: 'The Oracle signal fades',
    body: 'The Lexicon Oracle cannot be reached. Your scroll is safe — only divination is paused.',
  },
  initializing: {
    glyph: '✵',
    title: 'The Oracle is warming',
    body: 'The lexical archive is still hydrating. Divination will resume in a moment.',
  },
  timeout: {
    glyph: '✴',
    title: 'The Oracle fell silent',
    body: 'No answer returned in time. The weave may be slow — try the rite again.',
  },
  crashed: {
    glyph: '✶',
    title: 'The divination surface faltered',
    body: 'A disturbance disrupted this panel. The rest of the IDE remains intact.',
  },
  error: {
    glyph: '✶',
    title: 'The Oracle connection faltered',
    body: 'Something interrupted the divination. Recommune to try again.',
  },
};

function OracleSignalFallback({ status = 'disconnected', error = null, onReconnect, isReconnecting = false }) {
  const reducedMotion = usePrefersReducedMotion();
  const copy = COPY[status] || COPY.error;
  const detail = error && typeof error === 'object'
    ? (error.message || error.code || null)
    : (error || null);

  return (
    <motion.div
      className={`oracle-signal-fallback oracle-signal-fallback--${status}`}
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.32, ease: 'easeInOut' }}
    >
      <span className="oracle-signal-fallback__glyph" aria-hidden="true">{copy.glyph}</span>
      <p className="oracle-signal-fallback__title">{copy.title}</p>
      <p className="oracle-signal-fallback__body">{copy.body}</p>
      {detail && <p className="oracle-signal-fallback__detail">{detail}</p>}
      {typeof onReconnect === 'function' && (
        <button
          type="button"
          className="oracle-signal-fallback__reconnect"
          onClick={onReconnect}
          disabled={isReconnecting}
          aria-label="Recommune with the Lexicon Oracle"
        >
          {isReconnecting ? 'Recommuning…' : 'Recommune with the Oracle'}
        </button>
      )}
    </motion.div>
  );
}

OracleSignalFallback.propTypes = {
  status: PropTypes.oneOf(['disconnected', 'initializing', 'timeout', 'crashed', 'error']),
  error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  onReconnect: PropTypes.func,
  isReconnecting: PropTypes.bool,
};

export default OracleSignalFallback;
