/**
 * GhostIcon — Arcade Ghost Mascot
 * Adapted from PAC-MAN aesthetic for bug severity.
 */

import React from 'react';
import { motion } from 'framer-motion';

export function GhostIcon({ color = '#FF0000', size = 16, shouldAnimate = true }) {
    return (
        <motion.div
            className="ghost-icon"
            style={{ 
                '--ghost-color': color, 
                width: size, 
                height: Math.round(size * 1.3),
                position: 'relative',
                display: 'inline-block'
            }}
            animate={shouldAnimate ? { y: [0, -2, 0] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
        >
            <div className="ghost-icon__body">
                <div className="ghost-icon__eye ghost-icon__eye--left" />
                <div className="ghost-icon__eye ghost-icon__eye--right" />
                <div className="ghost-icon__skirt" />
            </div>
        </motion.div>
    );
}

export function DiagnosticGhost() {
    return (
        <motion.div
            className="diagnostic-ghost"
            style={{ position: 'relative', display: 'inline-block' }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-label="Diagnostic ghost mascot"
        >
            <div className="diagnostic-ghost__hat" aria-hidden="true" />
            <div className="diagnostic-ghost__body">
                <div className="diagnostic-ghost__eye diagnostic-ghost__eye--left" />
                <div className="diagnostic-ghost__eye diagnostic-ghost__eye--right" />
                <div className="diagnostic-ghost__skirt" />
            </div>
            <motion.div
                className="diagnostic-ghost__aura"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
        </motion.div>
    );
}
