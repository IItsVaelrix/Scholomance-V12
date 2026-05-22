/**
 * @file src/components/ArchiveEventRingPulse.jsx
 * @owner Claude
 * 
 * A ceremonial visual effect for high-priority lore/archetype events.
 * Radiates an expanding ring from the component center.
 */

import React from 'react';
import './ArchiveEventRingPulse.css';

/**
 * ArchiveEventRingPulse Component
 * 
 * @param {Object} props
 * @param {string} props.color - The ring color
 * @param {boolean} props.active - Whether the pulse is firing
 * @param {number} [props.duration=1200] - Duration of the pulse in ms
 */
export function ArchiveEventRingPulse({ color, active, duration = 1200 }) {
  if (!active) return null;

  return (
    <div 
      className="archive-event-ring-pulse"
      style={{
        '--pulse-color': color,
        '--pulse-duration': `${duration}ms`
      }}
    />
  );
}

export default ArchiveEventRingPulse;
