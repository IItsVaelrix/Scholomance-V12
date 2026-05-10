import React, { useState, useEffect } from 'react';
import { getAmpStatus } from '../../../../src/lib/amp-client.js';
import './MotionDebugBadge.css';

/**
 * MotionDebugBadge Component
 * 
 * A compact status badge for the Animation AMP system.
 * Shows active animation count and performance warnings.
 */
type AmpStatusShape = {
  isRunning: boolean;
  activeCount: number;
  config: { debug?: boolean };
};

export const MotionDebugBadge: React.FC = () => {
  const [status, setStatus] = useState<AmpStatusShape>({ isRunning: false, activeCount: 0, config: {} });

  useEffect(() => {
    const fetchStatus = async () => {
      const s = await getAmpStatus();
      setStatus(s as AmpStatusShape);
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!status.isRunning && !status.config.debug) return null;

  return (
    <div className={`motion-debug-badge ${status.activeCount > 0 ? 'active' : ''}`}>
      <div className="badge-indicator" />
      <span className="badge-text">AMP: {status.activeCount}</span>
    </div>
  );
};
