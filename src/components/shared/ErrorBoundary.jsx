import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary — the final safety net (Pillar 4, S-Gate).
 *
 * Catches render-time crashes in its subtree so a failing panel degrades in
 * place instead of unmounting the whole IDE frame.
 *
 * Props:
 *  - fallback: ReactNode | (error, reset) => ReactNode — custom degraded UI.
 *  - label:    string — heading for the default fallback.
 *  - onError:  (error, errorInfo) => void — side-channel for logging/telemetry.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback, label } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }
      if (fallback) {
        return fallback;
      }
      return (
        <div className="error-boundary" role="alert">
          <span className="error-boundary-glyph" aria-hidden="true">&#x2736;</span>
          <h1 className="error-boundary-title">{label || 'The rite was interrupted.'}</h1>
          <p className="error-boundary-message">A disturbance in the weave has disrupted this surface. Please refresh to restore the binding.</p>
          {!import.meta.env.PROD && this.state.error && (
            <pre className="error-boundary-details">{this.state.error.toString()}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
