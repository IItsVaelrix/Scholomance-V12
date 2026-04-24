/**
 * BugQueueRail — Left Wing Module
 * Vertical target acquisition and bug queue navigation.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GhostIcon } from '../Common/GhostIcon.jsx';

const GHOST_MAP = {
    CRIT:  { color: '#FF0000', name: 'BLINKY' },
    HIGH:  { color: '#FFB8FF', name: 'PINKY'  },
    MED:   { color: '#00FFFF', name: 'INKY'   },
    LOW:   { color: '#FFB847', name: 'CLYDE'  },
    INFO:  { color: '#9B59B6', name: 'SUE'    },
};

const QueueRow = ({ bug, isSelected, onClick }) => {
    const ghost = GHOST_MAP[bug.severity] || GHOST_MAP.INFO;
    
    return (
        <motion.div
            className={`queue-row ${isSelected ? 'selected' : ''}`}
            onClick={() => onClick(bug)}
            whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <div className="queue-row__ghost-container">
                <GhostIcon color={ghost.color} size={14} shouldAnimate={isSelected} />
            </div>
            <div className="queue-row__info">
                <span className="queue-row__title">{bug.title.slice(0, 24)}{bug.title.length > 24 ? '...' : ''}</span>
                <span className="queue-row__id">BUG-{bug.id.slice(0, 6)}</span>
            </div>
            {isSelected && <div className="queue-row__indicator" style={{ backgroundColor: ghost.color }} />}
        </motion.div>
    );
};

export function BugQueueRail({ bugs, selectedBug, onBugClick }) {
    return (
        <div className="bug-queue-rail">
            <div className="rail-header">TARGET ACQUISITION</div>
            <div className="rail-scroll">
                <AnimatePresence>
                    {bugs.map((bug) => (
                        <QueueRow 
                            key={bug.id} 
                            bug={bug} 
                            isSelected={selectedBug?.id === bug.id}
                            onClick={onBugClick} 
                        />
                    ))}
                </AnimatePresence>
            </div>
            <div className="rail-footer">{bugs.length} GHOSTS LOADED</div>
        </div>
    );
}
