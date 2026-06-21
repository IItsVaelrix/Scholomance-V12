/**
 * CollabStatusDisplay — Display sync status with conflict integration
 * Adapted from PixelBrain StatusDisplay
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckIcon,
  LoadingIcon,
  WarningIcon,
  ErrorIcon,
  CodeIcon
} from "../../components/Icons.jsx";
import { isBytecode } from '../../lib/bytecode-error.adapter.js';
import { decodeBytecodeError } from '../../lib/pixelbrain.adapter.js';
import { isActiveCriticalBug } from './bug-status.js';

const STATUS_CONFIG = {
  idle: {
    label: 'Ready',
    icon: CheckIcon,
    className: 'status-idle'
  },
  syncing: {
    label: 'Syncing...',
    icon: LoadingIcon,
    className: 'status-syncing'
  },
  processing: {
    label: 'Processing...',
    icon: LoadingIcon,
    className: 'status-processing'
  },
  ready: {
    label: 'Ready',
    icon: CheckIcon,
    className: 'status-ready'
  },
  conflict: {
    label: 'Conflict Detected',
    icon: WarningIcon,
    className: 'status-conflict'
  },
  error: {
    label: 'Error',
    icon: ErrorIcon,
    className: 'status-error'
  }
};

export default function CollabStatusDisplay({ status, conflict, context, bugs = [] }) {
  const reduceMotion = useReducedMotion();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const Icon = config.icon;

  const activeCriticalBugs = bugs.filter(isActiveCriticalBug);
  const hasFatal = activeCriticalBugs.some(b => b.severity === 'FATAL');

  return (
    <>
      {activeCriticalBugs.length > 0 && (
        <motion.div 
            className={`incident-banner incident-banner--${hasFatal ? 'critical' : 'warning'}`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            role="alert"
            aria-live="assertive"
        >
            <div className="incident-banner__body">
                <motion.span
                    className="incident-banner__icon-shell"
                    animate={reduceMotion ? undefined : { opacity: [1, 0.52, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                >
                    <WarningIcon className="incident-banner__icon" />
                </motion.span>
                <div className="incident-banner__content">
                    <span className="incident-banner__kicker">
                        {hasFatal ? 'VOID COLLAPSE DETECTED' : 'SYSTEM INCIDENT DETECTED'}
                    </span>
                    <span className="incident-banner__text">
                        {activeCriticalBugs.length} critical artifact{activeCriticalBugs.length === 1 ? '' : 's'} require review
                    </span>
                </div>
            </div>
            <button
                type="button"
                className="incident-banner__action"
                onClick={() => window.dispatchEvent(new CustomEvent('collab:switch-tab', { detail: 'bugs' }))}
            >
                VIEW ARTIFACTS
            </button>
        </motion.div>
      )}
      <motion.div
        className={`collab-status-display ${config.className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      aria-live="polite"
    >
      <Icon className="status-icon" />
      <span className="status-label">{config.label}</span>

      {context && !isBytecode(context) && (
        <span className="status-context">{context}</span>
      )}

      {context && isBytecode(context) && (
        <div className="status-bytecode-breakdown" style={{ marginLeft: '12px', fontSize: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-collab-text-dim)' }}>[</span>
          <span style={{ color: 'var(--color-collab-info)', fontWeight: 'bold' }}>{decodeBytecodeError(context)?.errorCodeHex || '0x????'}</span>
          <span style={{ color: 'var(--color-collab-text-dim)' }}>:</span>
          <span style={{ color: 'var(--color-collab-text-muted)' }}>{decodeBytecodeError(context)?.category || 'UNKNOWN'}</span>
          <span style={{ color: 'var(--color-collab-text-dim)' }}>]</span>
          <span style={{ color: 'var(--color-collab-text-dim)', fontStyle: 'italic' }}>{decodeBytecodeError(context)?.context?.error || 'System failure'}</span>
        </div>
      )}

      {conflict && (
        <div className="conflict-details">
          <div className="conflict-header">
            <span className="conflict-type">{conflict.type}</span>
            <span className="conflict-severity">{conflict.severity}</span>
          </div>

          {conflict.message && (
            <p className="conflict-message">
              {conflict.message}
            </p>
          )}

          {conflict.affected_files && (
            <div className="conflict-files">
              <span className="files-label">Affected Files:</span>
              <code className="files-list">
                {conflict.affected_files.join(', ')}
              </code>
            </div>
          )}

          {conflict.locked_by && (
            <div className="conflict-lock">
              <CodeIcon className="lock-icon" />
              <span className="lock-text">
                Locked by <strong>{conflict.locked_by}</strong>
                {conflict.task_id && ` (Task: ${conflict.task_id.slice(0, 8)}...)`}
              </span>
            </div>
          )}

          {conflict.recovery_hints && (
            <ul className="conflict-hints">
              {conflict.recovery_hints.map((hint, index) => (
                <li key={index}>→ {hint}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.div>
    </>
  );
}
