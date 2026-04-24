import React from 'react';
import { motion } from 'framer-motion';
import SigilEntity from './SigilEntity.jsx';

export default function PlayerDisplay({ playerHP, playerMaxHP, playerMP, playerMaxMp, school, isPlayerTurn }) {
  const hpPct = playerHP / playerMaxHP;
  const mpPct = playerMP / playerMaxMp;

  return (
    <div className={`player-display battle-panel ${isPlayerTurn ? 'is-active-turn' : ''}`}>
      <div className="player-portrait-frame">
        <SigilEntity 
          school={school}
          effectClass={isPlayerTurn ? 'HARMONIC' : 'RESONANT'}
          glowIntensity={isPlayerTurn ? 0.8 : 0.4}
          size={50}
        />
      </div>
      <div className="player-info">
        <div className="player-name">SCHOLAR</div>
        <div className="player-school-badge">{school}</div>
      </div>

      <div className="player-stats">
        <div className="player-hp-bar">
          <div className="hp-label">HP</div>
          <div className="hp-bar-track">
            <motion.div 
              className="hp-bar-fill"
              initial={false}
              animate={{ width: `${hpPct * 100}%` }}
            />
          </div>
          <div className="hp-text">{playerHP} / {playerMaxHP}</div>
        </div>

        <div className="player-mp-bar">
          <div className="mp-label">MP</div>
          <div className="mp-bar-track">
            <motion.div 
              className="mp-bar-fill"
              initial={false}
              animate={{ width: `${mpPct * 100}%` }}
            />
          </div>
          <div className="mp-text">{playerMP} / {playerMaxMp}</div>
        </div>
      </div>

      {isPlayerTurn && (
        <div className="player-turn-indicator">
          YOUR TURN
        </div>
      )}
    </div>
  );
}
