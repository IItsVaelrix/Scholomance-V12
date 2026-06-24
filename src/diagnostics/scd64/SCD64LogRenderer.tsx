import React from 'react';
import { SCD64HoverTooltip } from './SCD64HoverTooltip';
import { SCD64_REGEX } from '../../core/scd64/constants';

interface SCD64LogRendererProps {
  logText: string;
}

export const SCD64LogRenderer: React.FC<SCD64LogRendererProps> = ({ logText }) => {
  // A naive approach to split text and find SCD64 hashes
  const words = logText.split(/(\b[0-9A-F]{64}\b)/);

  return (
    <div className="scd64-log-renderer" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {words.map((part, index) => {
        if (SCD64_REGEX.test(part)) {
          return <SCD64HoverTooltip key={index} checksum64={part} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};
