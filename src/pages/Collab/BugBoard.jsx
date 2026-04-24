/**
 * BugBoard — Arcade Cabinet Bug Tracker
 * World-law: Bugs are ghosts haunting the codebase.
 * The Diagnostic Ghost (medical cross hat) is the chamber's arcane pathologist —
 * it hunts, classifies, and ultimately consumes the errors that lurk in the syntax void.
 */

import { motion, AnimatePresence } from 'framer-motion';
import './BugBoard.css';

// Severity → ghost color + Pac-Man ghost name (diagnostic triage roster)
const GHOST_MAP = {
    CRIT:  { color: '#FF0000', name: 'BLINKY' },
    HIGH:  { color: '#FFB8FF', name: 'PINKY'  },
    MED:   { color: '#00FFFF', name: 'INKY'   },
    LOW:   { color: '#FFB847', name: 'CLYDE'  },
    INFO:  { color: '#9B59B6', name: 'SUE'    },
};

function GhostIcon({ color = '#FF0000', size = 28, animate: shouldAnimate = true }) {
    return (
        <motion.div
            className="ghost-icon"
            style={{ '--ghost-color': color, width: size, height: Math.round(size * 1.3) }}
            animate={shouldAnimate ? { y: [0, -3, 0] } : {}}
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

function DiagnosticGhost() {
    return (
        <motion.div
            className="diagnostic-ghost"
            animate={{ y: [0, -8, 0] }}
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
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
        </motion.div>
    );
}

function PacDots({ count = 5 }) {
    return (
        <div className="pac-dots" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <motion.span
                    key={i}
                    className="pac-dot"
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 0.55, delay: i * 0.1, repeat: Infinity }}
                />
            ))}
        </div>
    );
}

function MazeRow({ bug, index, onClick }) {
    const ghost = GHOST_MAP[bug.severity] || GHOST_MAP.INFO;

    return (
        <motion.div
            className="maze-row"
            onClick={() => onClick(bug)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ backgroundColor: 'rgba(33, 33, 222, 0.22)' }}
            role="button"
            tabIndex={0}
            aria-label={`Bug: ${bug.title}, severity ${bug.severity}`}
            onKeyDown={(e) => e.key === 'Enter' && onClick(bug)}
        >
            <div className="maze-row__ghost-col">
                <GhostIcon color={ghost.color} size={22} animate={bug.status === 'new'} />
                <span className="maze-row__ghost-name" style={{ color: ghost.color }}>
                    {ghost.name}
                </span>
            </div>

            <div className="maze-row__title-col">
                <span className="maze-row__title">{bug.title}</span>
                <span className="maze-row__id">BUG-{bug.id.slice(0, 8)}</span>
            </div>

            <div className="maze-row__cat-col">{bug.category || 'GENERAL'}</div>

            <div className="maze-row__status-col">
                <span className={`maze-status maze-status--${bug.status}`}>
                    {bug.status.toUpperCase()}
                </span>
            </div>

            <div className="maze-row__integrity-col">
                <span
                    className={`integrity-dot ${bug.checksum_verified ? 'integrity-dot--ok' : 'integrity-dot--fail'}`}
                    title={bug.checksum_verified ? 'Checksum verified' : 'Checksum mismatch'}
                />
                <span
                    className={`integrity-dot ${bug.parseable ? 'integrity-dot--ok' : 'integrity-dot--warn'}`}
                    title={bug.parseable ? 'Parseable' : 'Partial parse'}
                />
            </div>
        </motion.div>
    );
}

export default function BugBoard({ bugs, onBugClick, onReportClick }) {
    const handleImportQa = async () => {
        const payload = prompt('Paste QA Result JSON (single or array):');
        if (!payload) return;
        try {
            const data = JSON.parse(payload);
            const response = await fetch('/collab/bugs/import-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                alert('QA Results imported successfully.');
                onReportClick?.();
            } else {
                const err = await response.json();
                alert(`Import failed: ${err.error}`);
            }
        } catch {
            alert('Invalid JSON payload.');
        }
    };

    if (!bugs || bugs.length === 0) {
        return (
            <div className="bug-arcade bug-arcade--empty">
                <div className="bug-arcade__screen">
                    <div className="arcade-scanlines" aria-hidden="true" />
                    <div className="bug-arcade__empty-content">
                        <DiagnosticGhost />
                        <motion.p
                            className="arcade-text arcade-text--title"
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                        >
                            CHAMBER STABLE
                        </motion.p>
                        <p className="arcade-text arcade-text--sub">NO GHOSTS DETECTED</p>
                        <PacDots count={7} />
                        <div className="arcade-btn-row">
                            <button className="arcade-btn arcade-btn--ghost"
                                onClick={handleImportQa}
                                aria-label="Import QA results">
                                IMPORT QA
                            </button>
                            <button className="arcade-btn arcade-btn--coin"
                                onClick={onReportClick}
                                aria-label="Report a bug">
                                ♟ INSERT COIN
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bug-arcade__coin-slot" aria-hidden="true">
                    <span className="coin-slot-text">COIN SLOT</span>
                </div>
            </div>
        );
    }

    const critCount = bugs.filter(b => b.severity === 'CRIT').length;
    const newCount  = bugs.filter(b => b.status === 'new').length;

    return (
        <div className="bug-arcade">
            <div className="bug-arcade__bezel bug-arcade__bezel--top" aria-hidden="true" />

            <div className="bug-arcade__screen">
                <div className="arcade-scanlines" aria-hidden="true" />

                <div className="arcade-header">
                    <div className="arcade-header__left">
                        <DiagnosticGhost />
                    </div>
                    <div className="arcade-header__center">
                        <motion.h3
                            className="arcade-title"
                            animate={{ textShadow: [
                                '0 0 8px #FFB800',
                                '0 0 24px #FFB800, 0 0 48px #FF6B00',
                                '0 0 8px #FFB800',
                            ]}}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            BUG REPORT
                        </motion.h3>
                        <div className="arcade-stats">
                            <span className="arcade-stat">
                                <GhostIcon color="#FF0000" size={12} animate={critCount > 0} />
                                {critCount} CRIT
                            </span>
                            <span className="arcade-stat-sep">·</span>
                            <span className="arcade-stat">{bugs.length} TOTAL</span>
                            <span className="arcade-stat-sep">·</span>
                            <span className="arcade-stat">{newCount} NEW</span>
                        </div>
                    </div>
                    <div className="arcade-header__right">
                        <button className="arcade-btn arcade-btn--ghost"
                            onClick={handleImportQa}
                            aria-label="Import QA results">
                            IMPORT
                        </button>
                        <button className="arcade-btn arcade-btn--coin"
                            onClick={onReportClick}
                            aria-label="Report a bug">
                            + REPORT
                        </button>
                    </div>
                </div>

                <div className="maze-header" aria-hidden="true">
                    <span className="maze-header__col maze-header__col--ghost">GHOST</span>
                    <span className="maze-header__col maze-header__col--title">ARTIFACT</span>
                    <span className="maze-header__col maze-header__col--cat">CATEGORY</span>
                    <span className="maze-header__col maze-header__col--status">STATUS</span>
                    <span className="maze-header__col maze-header__col--integrity">SIGNAL</span>
                </div>

                <div className="maze-body" role="list" aria-label="Bug reports">
                    <AnimatePresence>
                        {bugs.map((bug, i) => (
                            <MazeRow
                                key={bug.id}
                                bug={bug}
                                index={i}
                                onClick={onBugClick}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                <div className="arcade-footer" aria-hidden="true">
                    <PacDots count={14} />
                    <span className="arcade-footer__score">SCORE  {String(bugs.length * 100).padStart(6, '0')}</span>
                </div>
            </div>

            <div className="bug-arcade__bezel bug-arcade__bezel--bottom" aria-hidden="true">
                <div className="bug-arcade__coin-slot">
                    <span className="coin-slot-text">COIN SLOT</span>
                </div>
                <div className="bug-arcade__speaker">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="speaker-dot" />
                    ))}
                </div>
            </div>
        </div>
    );
}
