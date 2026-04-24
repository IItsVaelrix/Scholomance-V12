/**
 * BugRecoveryModule — AI-led Recovery Hints
 * Surfaces deterministic steps for resolving a bytecode error.
 */

import React from 'react';

export function BugRecoveryModule({ hints = [] }) {
    return (
        <div className="recovery-module">
            <div className="recovery-header">RECOVERY_INTELLIGENCE</div>
            <div className="recovery-list">
                {hints.length > 0 ? (
                    hints.map((hint, idx) => (
                        <div key={idx} className="recovery-item">
                            <span className="recovery-index">0{idx + 1}</span>
                            <span className="recovery-text">{hint}</span>
                        </div>
                    ))
                ) : (
                    <div className="recovery-empty">NO RECOVERY HINTS FOUND</div>
                )}
            </div>
            <div className="recovery-footer">SYSTEM_ANALYST_v1.0</div>
        </div>
    );
}
