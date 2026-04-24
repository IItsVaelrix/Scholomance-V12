/**
 * BugMarquee — Cabinet Header
 * Visual identity and pulse for the machine.
 */

import React from 'react';
import { motion } from 'framer-motion';

const SEVERITY_COLOR = {
    CRIT: '#FF0000',
    HIGH: '#FFB8FF',
    MED:  '#00FFFF',
    LOW:  '#FFB847',
    INFO: '#9B59B6',
};

export function BugMarquee({ title = "PAC-OPS BUG CABINET", severity = "INFO" }) {
    const color = SEVERITY_COLOR[severity] || SEVERITY_COLOR.INFO;

    return (
        <div className="bug-marquee">
            <motion.div 
                className="marquee-glow"
                animate={{ 
                    opacity: [0.1, 0.4, 0.1],
                    scale: [1, 1.05, 1]
                }}
                transition={{ 
                    duration: severity === 'CRIT' ? 1.2 : 2.4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                style={{ backgroundColor: color }}
            />
            
            <motion.h2 
                className="marquee-text"
                animate={{ 
                    textShadow: [
                        `0 0 8px ${color}`,
                        `0 0 24px ${color}, 0 0 48px ${color}`,
                        `0 0 8px ${color}`,
                    ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                {title}
            </motion.h2>

            <div className="marquee-accent marquee-accent--left">
                <div className="marquee-dot" style={{ backgroundColor: color }} />
                <div className="marquee-line" style={{ backgroundColor: color }} />
            </div>

            <div className="marquee-accent marquee-accent--right">
                <div className="marquee-line" style={{ backgroundColor: color }} />
                <div className="marquee-dot" style={{ backgroundColor: color }} />
            </div>
        </div>
    );
}
