/**
 * BugChecksumShrine — Bytecode Integrity Monitor
 * Visualizes the checksum state of a bug artifact.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function BugChecksumShrine({ verified = false, checksum = "" }) {
    return (
        <div className="checksum-shrine">
            <div className="shrine-header">CHECKSUM SHRINE</div>
            <div className="shrine-body">
                <motion.div 
                    className={`shrine-orb ${verified ? 'verified' : 'failed'}`}
                    animate={{ 
                        boxShadow: verified 
                            ? [
                                "0 0 10px rgba(76, 175, 80, 0.4)", 
                                "0 0 30px rgba(76, 175, 80, 0.8)", 
                                "0 0 10px rgba(76, 175, 80, 0.4)"
                              ]
                            : [
                                "0 0 10px rgba(255, 82, 82, 0.4)", 
                                "0 0 30px rgba(255, 82, 82, 0.8)", 
                                "0 0 10px rgba(255, 82, 82, 0.4)"
                              ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="shrine-data">
                    <span className="shrine-label">HASH:</span>
                    <span className="shrine-hash">{checksum || 'UNREAD'}</span>
                    <span className={`shrine-status ${verified ? 'ok' : 'fail'}`}>
                        {verified ? 'VERIFIED' : 'TAMPERED'}
                    </span>
                </div>
            </div>
            <div className="shrine-footer">PIXELBRAIN_INTEGRITY_V1.1</div>
        </div>
    );
}
