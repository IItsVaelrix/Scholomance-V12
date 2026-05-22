import React from 'react';
import ActionBar from './ActionBar.jsx';
import ActionHintStrip from './ActionHintStrip.jsx';

/**
 * BottomCommandBand.jsx
 *
 * The main interaction spine. Replaces the plain text action console.
 * Stacks ActionBar (tactical command buttons) + ActionHintStrip (context metadata).
 *
 * World-law connection: the bottom band is the ritual command threshold —
 * the point where the scholar's intent becomes a declared action.
 */
export default function BottomCommandBand({ selectedAction, onActionSelect, isDisabled, movesRemaining }) {
  return (
    <div className="bottom-command-band" role="region" aria-label="Command band">
      <ActionBar
        selectedAction={selectedAction}
        onActionSelect={onActionSelect}
        isDisabled={isDisabled}
      />
      <ActionHintStrip
        selectedAction={selectedAction}
        movesRemaining={movesRemaining}
      />
    </div>
  );
}
