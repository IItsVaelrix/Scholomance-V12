import { motion } from 'framer-motion';
import { NavSigil } from './NavSigils.jsx';
import { useHaptic } from '../../hooks/useHaptic.ts';

const TABS = [
  { id: 'EDITOR',  label: 'Editor'  },
  { id: 'SCROLLS', label: 'Scrolls' },
  { id: 'ORACLE',  label: 'Oracle'  },
  { id: 'HEX',     label: 'Hex'     },
  { id: 'POWER',   label: 'Power'   },
];

export default function MobileBottomNav({ activeTab, onTabChange, editorSubtitle, hapticEnabled = false }) {
  const { haptic } = useHaptic(hapticEnabled);

  function handlePress(tabId) {
    haptic(tabId === 'EDITOR' ? 'select' : 'tap');
    onTabChange(tabId);
  }

  return (
    <nav className="ide-bottom-nav" role="tablist" aria-label="Scribe workspace sections">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            className={`ide-bottom-nav-tab${isActive ? ' active' : ''}`}
            onClick={() => handlePress(tab.id)}
          >
            {isActive && (
              <motion.div
                className="ide-bottom-nav-indicator"
                layoutId="nav-indicator"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <NavSigil tab={tab.id} className="ide-bottom-nav-sigil" />
            <span className="ide-bottom-nav-label">{tab.label}</span>
            {tab.id === 'EDITOR' && isActive && editorSubtitle && (
              <span className="ide-bottom-nav-subtitle">{editorSubtitle}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
