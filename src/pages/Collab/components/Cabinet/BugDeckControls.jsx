/**
 * BugDeckControls — Cabinet Button Interface
 * Governed geometry for arcade controls.
 */

import React from 'react';
import { motion } from 'framer-motion';

const ControlButton = ({ label, hint, onClick, color = "#6a2a9e", disabled = false, primary = false }) => (
    <motion.button
        className={`deck-btn ${primary ? 'deck-btn--primary' : ''}`}
        whileHover={!disabled ? { scale: 1.05, backgroundColor: color } : {}}
        whileTap={!disabled ? { scale: 0.95, y: 2 } : {}}
        onClick={onClick}
        disabled={disabled}
        style={{ '--btn-color': color }}
    >
        <span className="deck-btn__top" />
        <span className="deck-btn__label">{label}</span>
        {hint && <span className="deck-btn__hint">[{hint}]</span>}
    </motion.button>
);

export function BugDeckControls({ 
    onPrev, onNext, onSelect, 
    onCreateTask, onStartPipeline,
    onAssign, onVerify, onDuplicate
}) {
    return (
        <div className="bug-deck">
            {/* Navigation Cluster */}
            <div className="deck-cluster deck-cluster--nav">
                <ControlButton label="PREV" hint="&uarr;" onClick={onPrev} />
                <ControlButton label="SELECT" hint="ENT" onClick={onSelect} primary color="#FFB800" />
                <ControlButton label="NEXT" hint="&darr;" onClick={onNext} />
            </div>

            {/* Action Cluster (Primary) */}
            <div className="deck-cluster deck-cluster--primary">
                <ControlButton label="CREATE TASK" hint="T" onClick={onCreateTask} color="#00FFFF" />
                <ControlButton label="START PIPELINE" hint="P" onClick={onStartPipeline} color="#FFB8FF" />
            </div>

            {/* Resolution Cluster */}
            <div className="deck-cluster deck-cluster--resolution">
                <ControlButton label="ASSIGN" hint="A" onClick={onAssign} />
                <ControlButton label="DUPE" hint="D" onClick={onDuplicate} />
                <ControlButton label="VERIFY" hint="V" onClick={onVerify} color="#4CAF50" />
            </div>
        </div>
    );
}
