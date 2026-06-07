function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampBetween(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const normalizeScore = (value, max) =>
  clampBetween((Number(value) || 0) / max, 0, 1) * 100;

function normalizeProfilePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric <= 1 ? clamp01(numeric) * 100 : clampBetween(numeric, 0, 100);
}

function normalizeVerseIRScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 2) return clampBetween(numeric, 0, 100);
  return clampBetween((numeric - 1) / 0.12, 0, 1) * 100;
}

function readDamageAmount(entry) {
  if (Array.isArray(entry?.damageMap)) {
    return entry.damageMap.reduce((sum, damage) => (
      Number(damage?.amount) > 0 ? sum + Number(damage.amount) : sum
    ), 0);
  }
  return Number(entry?.damageDealt) || 0;
}

function readHealingAmount(entry) {
  if (Array.isArray(entry?.damageMap)) {
    return entry.damageMap.reduce((sum, damage) => (
      Number(damage?.amount) < 0 ? sum + Math.abs(Number(damage.amount)) : sum
    ), 0);
  }
  return Number(entry?.healingDone) || 0;
}

function scoreCodexSpell(action) {
  const damageDealt = readDamageAmount(action);
  const healingDone = readHealingAmount(action);
  const damageScore = normalizeScore(damageDealt, 150);
  const healingScore = normalizeScore(healingDone, 150);
  const rhymeScore = normalizeProfilePercent(action.profile?.rhymeQuality);
  const verseIRScore = normalizeVerseIRScore(action.profile?.verseIRMultiplier);
  const syntacticalChessScore = normalizeProfilePercent(action.profile?.syntacticalChess?.score);

  const leylineScore = action.wasSupercharged ? 100 : 0;
  const clutchScore = clampBetween(1 - (Number(action.playerHpAtCast) || 1000) / (Number(action.playerMaxHpAtCast) || 1000), 0, 1) * 100;

  const efficiencyScore = action.mpCost > 0
    ? clampBetween((damageDealt + healingDone) / action.mpCost / 12, 0, 1) * 100
    : 50;

  const scoreComponents = {
    damageScore: Number(damageScore.toFixed(1)),
    healingScore: Number(healingScore.toFixed(1)),
    rhymeScore: Number(rhymeScore.toFixed(1)),
    verseIRScore: Number(verseIRScore.toFixed(1)),
    leylineScore: Number(leylineScore.toFixed(1)),
    clutchScore: Number(clutchScore.toFixed(1)),
    efficiencyScore: Number(efficiencyScore.toFixed(1)),
  };

  const codexScore = Number((
    damageScore * 0.28
    + healingScore * 0.12
    + rhymeScore * 0.18
    + verseIRScore * 0.18
    + leylineScore * 0.12
    + clutchScore * 0.08
    + efficiencyScore * 0.04
  ).toFixed(1));

  const reasons = [];
  if (scoreComponents.verseIRScore >= 42) reasons.push('High VerseIR novelty');
  if (scoreComponents.rhymeScore >= 70) reasons.push('Strong rhyme architecture');
  if (action.wasSupercharged) reasons.push('Leyline supercharge applied');
  if (action.profile?.affinity) reasons.push('Affinity resonance matched');
  if (action.profile?.syntacticalChess?.state === 'advantage') {
    const matched = action.profile.syntacticalChess.matchedWeaknessFamilies?.join('/') || 'symbolic weakness';
    reasons.push(`Syntactical Chess advantage: ${matched}`);
  } else if (syntacticalChessScore >= 60) {
    reasons.push('Strong enemy-specific counter-sentence');
  }
  if (reasons.length === 0) reasons.push('Coherent syntactic flow');

  return {
    ...action,
    damageDealt,
    healingDone,
    codexScore,
    scoreComponents,
    syntacticalChessScore: Number(syntacticalChessScore.toFixed(1)),
    reasons,
  };
}

function deriveCombatStats(history, scoredSpells, battleState) {
  const turnsTaken = Number(battleState?.round) || 1;
  const totalDamageDealt = scoredSpells.reduce((sum, action) => sum + (Number(action.damageDealt) || 0), 0);
  
  let totalDamageTaken = 0;
  history.forEach((entry) => {
    if (entry?.entityId === 'opponent' && Array.isArray(entry.damageMap)) {
      entry.damageMap.forEach((d) => {
        if (d?.targetId === 'player' && d.amount > 0) {
          totalDamageTaken += d.amount;
        }
      });
    }
  });

  const leylinesExtracted = Array.isArray(battleState?.spentLeylineIds)
    ? battleState.spentLeylineIds.length
    : 0;

  const superchargedCasts = scoredSpells.filter((action) => action.wasSupercharged).length;

  const highestRhymeQuality = scoredSpells.length > 0
    ? Math.max(...scoredSpells.map((action) => Number(action.profile?.rhymeQuality) || 0))
    : 0;

  const highestVerseIRMultiplier = scoredSpells.length > 0
    ? Math.max(...scoredSpells.map((action) => Number(action.profile?.verseIRMultiplier) || 1.0))
    : 1.0;

  return {
    turnsTaken,
    totalDamageDealt,
    totalDamageTaken,
    leylinesExtracted,
    superchargedCasts,
    highestRhymeQuality: Number(highestRhymeQuality.toFixed(3)),
    highestVerseIRMultiplier: Number(highestVerseIRMultiplier.toFixed(3)),
  };
}

function resolveCombatGrade(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function resolveOracleMarginalia({ result, grade, stats, mostImpressiveSpell }) {
  if (result === 'defeat') {
    return {
      triggered: true,
      word: 'ENTROPY',
      message: 'ENTROPY answers when even the most perfect meter collapses under broken focus. Let the rhythm settle before you forge the next line.',
      tooltip: {
        title: 'ENTROPY',
        category: 'Syntactic Decay',
        body: 'The silent decay of syntactic force. A single broken phoneme or delayed cadence allows reality to reclaim its ordinary shape.',
      },
    };
  }

  // S Victory / high impressiveness
  if (grade === 'S' || (mostImpressiveSpell && mostImpressiveSpell.codexScore >= 90)) {
    return {
      triggered: true,
      word: 'ARCHITECTURE',
      message: 'You did not cast with force. You cast with ARCHITECTURE. Reality has fewer places to refuse such structure.',
      tooltip: {
        title: 'ARCHITECTURE',
        category: 'Alchemical Constraint',
        body: 'The hidden skeleton of a spell: rhyme, intent, constraint, and consequence arranged so cleanly that reality has fewer places to refuse.',
      },
    };
  }

  // Resonance trigger
  if (stats.superchargedCasts >= 1 && stats.highestVerseIRMultiplier >= 1.08) {
    return {
      triggered: true,
      word: 'RESONANCE',
      message: 'The lattice enters RESONANCE. The elements did not merely answer your call; they echoed your voice.',
      tooltip: {
        title: 'RESONANCE',
        category: 'Harmonic Frequency',
        body: 'The state where the board\'s latent mana lines align perfectly with the phoneme frequency of the cast, magnifying the output exponentially.',
      },
    };
  }

  // Lore trigger
  if (stats.leylinesExtracted >= 2) {
    return {
      triggered: true,
      word: 'LORE',
      message: 'LORE gathers behind your casting like a hundred compiled grimoires. The leylines bent to your grammar.',
      tooltip: {
        title: 'LORE',
        category: 'Semantic Depth',
        body: 'The semantic depth of words. The older and more bound to the history of the Scholomance a word is, the heavier its kinetic impact.',
      },
    };
  }

  // Clutch victory
  if (mostImpressiveSpell?.scoreComponents?.clutchScore >= 70) {
    return {
      triggered: true,
      word: 'CLUTCH',
      message: 'CLUTCH is not panic; it is grammar refusing to falter in extremis. Under pressure, form holds.',
      tooltip: {
        title: 'CLUTCH',
        category: 'Kinetic Preservation',
        body: 'The art of maintaining syntactic coherence under extreme kinetic pressure, when the speaker\'s own vital thread is fraying.',
      },
    };
  }

  return {
    triggered: false,
    word: null,
    message: null,
    tooltip: null,
  };
}

export function buildCombatRundown(battleState) {
  const history = Array.isArray(battleState?.history) ? battleState.history : [];
  const playerCasts = history.filter((entry) => entry?.type === 'PLAYER_CAST' || (entry?.entityId === 'player' && entry?.actionType === 'cast'));

  const scoredSpells = playerCasts.map(scoreCodexSpell);
  const mostImpressiveSpell = scoredSpells
    .slice()
    .sort((a, b) => b.codexScore - a.codexScore)[0] || null;

  const stats = deriveCombatStats(history, scoredSpells, battleState);
  const grade = resolveCombatGrade(mostImpressiveSpell?.codexScore || 0, stats);
  const oracleMessage = resolveOracleMarginalia({
    result: battleState?.phase,
    grade,
    stats,
    mostImpressiveSpell,
  });

  return {
    result: battleState?.phase || 'victory',
    grade,
    stats,
    mostImpressiveSpell,
    oracleMessage,
    generatedAtTurn: battleState?.playerTurnIndex ?? null,
  };
}
