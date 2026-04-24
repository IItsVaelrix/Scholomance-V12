/**
 * useBattleScoring.js
 * 
 * Provides real-time scoring and rating for the Battle UI.
 * Implements the logic for live meter displays and tactical feedback.
 */

import { useCallback, useRef } from 'react';
import { analyzeText } from '../../codex/core/analysis.pipeline.js';
import { createCombatScoringEngine } from '../../codex/core/scoring.defaults.js';

const RATING_THRESHOLDS = [
  { label: 'NEOPHYTE', min: 0 },
  { label: 'ADEPT', min: 30 },
  { label: 'MASTER', min: 65 },
  { label: 'GODLIKE', min: 90 },
];

export function useBattleScoring() {
  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = createCombatScoringEngine();
  }

  /**
   * Calculates a live score and rating for the given text.
   * This is intended for real-time feedback during typing.
   * 
   * @param {string} text 
   * @returns {{ totalScore: number, rating: string }}
   */
  const scoreLive = useCallback(async (text) => {
    if (!text || text.trim().length === 0) {
      return { totalScore: 0, rating: 'NEOPHYTE' };
    }

    try {
      const doc = analyzeText(text);
      const result = await engineRef.current.calculateScore(doc);
      const totalScore = Math.round(result.totalScore * 100); // Normalize to 0-100

      let rating = 'NEOPHYTE';
      for (const threshold of RATING_THRESHOLDS) {
        if (totalScore >= threshold.min) {
          rating = threshold.label;
        }
      }

      return { totalScore, rating };
    } catch (err) {
      console.error('[useBattleScoring] Live scoring failed:', err);
      return { totalScore: 0, rating: 'NEOPHYTE' };
    }
  }, []);

  return {
    scoreLive,
  };
}
