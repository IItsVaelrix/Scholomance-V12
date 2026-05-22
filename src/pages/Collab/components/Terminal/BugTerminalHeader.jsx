/**
 * BugTerminalHeader — Viewport Status Strip
 * Displays bytecode metadata for the loaded target.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function BugTerminalHeader({ bug }) {
    if (!bug) return null;

    return (
        <div className="terminal-header">
            <div className="terminal-header__top">
                <span className="terminal-bug-id">BUG-{bug.id.slice(0, 8)}</span>
                <span className="terminal-bug-title">{bug.title.toUpperCase()}</span>
                <div className="terminal-bug-severity" style={{ color: `var(--severity-${bug.severity.toLowerCase()})` }}>
                    [{bug.severity}]
                </div>
            </div>
            
            <div className="terminal-header__bottom">
                <span className="terminal-meta-item">MODULE: {bug.module_id || 'UNKNOWN'}</span>
                <span className="terminal-meta-item">CODE: 0x{bug.error_code?.toString(16).toUpperCase() || '0000'}</span>
                <span className="terminal-meta-item">CATEGORY: {bug.category || 'GENERAL'}</span>
                <div className="terminal-checksum">
                    <span className={`checksum-indicator ${bug.checksum_verified ? 'ok' : 'fail'}`}>
                        {bug.checksum_verified ? 'CHECKSUM: OK' : 'CHECKSUM: FAIL'}
                    </span>
                    <button 
                        className="terminal-copy-btn" 
                        onClick={() => {
                            if (bug.bytecode) {
                                navigator.clipboard.writeText(bug.bytecode);
                            }
                        }}
                        title="Copy Bytecode [C]"
                    >
                        [C] COPY
                    </button>
                </div>
            </div>
        </div>
    );
}
