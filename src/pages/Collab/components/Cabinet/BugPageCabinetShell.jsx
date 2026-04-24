/**
 * BugPageCabinetShell — Deterministic Machine Frame
 * Implements the centered, 3-panel arcade cabinet layout.
 */

import React from 'react';
import { motion } from 'framer-motion';
import '../../BugCabinet.css';

export function BugPageCabinetShell({ 
    children, 
    leftWing, 
    rightWing,
    marquee,
    deck,
    className = "" 
}) {
    return (
        <div className={`bug-cabinet-shell ${className}`}>
            <motion.div 
                className="bug-cabinet-container"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Diagnostic Anchor Points (PixelBrain Logic) */}
                <div className="anchor-point marquee_center" style={{ top: 30, left: '50%' }} />
                <div className="anchor-point terminal_center" style={{ top: '50%', left: '50%' }} />
                <div className="anchor-point deck_center" style={{ bottom: 50, left: '50%' }} />
                <div className="anchor-point left_wing_origin" style={{ top: 60, left: 'var(--cabinet-h-gap)' }} />
                <div className="anchor-point right_wing_origin" style={{ top: 60, right: 'var(--cabinet-h-gap)' }} />

                {/* Symmetric Side Rails */}
                <div className="cabinet-rail cabinet-rail--left">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="rail-bracket" style={{ top: i * 100 }} />
                    ))}
                </div>
                <div className="cabinet-rail cabinet-rail--right">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="rail-bracket" style={{ top: i * 100 }} />
                    ))}
                </div>

                {/* --- LEFT WING --- */}
                <aside className="cabinet-wing cabinet-wing--left">
                    <div className="wing-content">
                        {leftWing}
                    </div>
                </aside>

                {/* --- CENTER CABINET --- */}
                <main className="cabinet-center">
                    {/* Cabinet Marquee */}
                    <div className="cabinet-marquee">
                        {marquee}
                    </div>

                    {/* Main Viewport (Children) */}
                    <div className="cabinet-viewport-area">
                        {children}
                    </div>

                    {/* Control Deck */}
                    <div className="cabinet-deck">
                        {deck}
                    </div>
                </main>

                {/* --- RIGHT WING --- */}
                <aside className="cabinet-wing cabinet-wing--right">
                    <div className="wing-content">
                        {rightWing}
                    </div>
                </aside>
            </motion.div>
        </div>
    );
}
