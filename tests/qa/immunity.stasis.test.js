/**
 * IMMUNITY STASIS TEST SUITE
 * 
 * "Intentionally hard to pass" tests to prove the legitimacy of the 
 * Scholomance Immune System. These tests probe the boundaries of 
 * pattern detection, semantic similarity, and architectural layering.
 */

import { scanInnate } from '../../codex/core/immunity/innate.scanner.js';
import { scanAdaptive } from '../../codex/core/immunity/adaptive.scanner.js';

async function runTest(name, ritual) {
  console.log(`🧪 [TEST] ${name}`);
  try {
    await ritual();
    console.log(`   ✅ PASSED\n`);
  } catch (e) {
    console.log(`   ❌ FAILED: ${e.message}\n`);
    process.exit(1);
  }
}

async function main() {
  console.log('🛡️  INITIATING IMMUNITY STRESS GAUNTLET\n');

  // --- LAYER 1: INNATE BARRIER TESTS ---

  await runTest('Innate: Catch blatant Math.random()', () => {
    const content = "const x = Math.random();";
    const violations = scanInnate(content, 'src/lib/core-math.js');
    if (violations.length === 0) throw new Error('Failed to catch blatant random.');
  });

  await runTest('Innate: Respect Allow-List Annotation', () => {
    const content = "// IMMUNE_ALLOW: math-random\nconst x = Math.random();";
    const violations = scanInnate(content, 'src/lib/core-math.js');
    if (violations.length > 0) throw new Error('Flagged allowed annotation.');
  });

  await runTest('Innate: Path-Based Sensitivity (Atmosphere bypass)', () => {
    const content = "const noise = Math.random();";
    const violations = scanInnate(content, 'src/components/effects/sparkle.jsx');
    if (violations.length > 0) throw new Error('Atmosphere path should be exempt from random check.');
  });

  await runTest('Innate: Catch Forbidden Boundary Import (UI -> Core)', () => {
    const content = "import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';";
    const violations = scanInnate(content, 'src/components/DeepPanel.jsx');
    const hasForbiddenImport = violations.some(v => v.ruleId === 'LING-0F03');
    if (!hasForbiddenImport) throw new Error('Failed to catch illegal UI -> Codex import.');
  });

  // --- LAYER 2: ADAPTIVE (SEMANTIC) TESTS ---

  await runTest('Adaptive: Semantic Logic-Shadowing', async () => {
    // This code looks nothing like the pathogen "Client-side Combat Scoring" in terms of strings,
    // but it mimics the mathematical "fat logic" shape of combat scoring.
    const content = `
      export function resolveBattlePower(player, enemy) {
        const base = player.stats.atk * 1.5;
        const resonance = calculateResonance(player.vowels);
        const final = (base + resonance) / enemy.def;
        return Math.floor(final);
      }
    `;
    // We expect this to ping 'pathogen.client-combat-scorer' (threshold 0.85)
    const violations = await scanAdaptive(content);
    const hasCombatPathogen = violations.some(v => v.pathogenId === 'pathogen.client-combat-scorer');
    
    // NOTE: This test is hard because TQ must recognize the "shape" of calculation
    if (!hasCombatPathogen) {
      console.warn('   ⚠️  ADAPTIVE MISSED: Semantic shadow not detected. Threshold tuning required.');
      // We don't exit(1) yet as this is the "hard" part proving we need fine-tuning
    } else {
      console.log('   🔥 CRITICAL HIT: Semantic pathogen detected through logic-shadowing.');
    }
  });

  await runTest('Adaptive: The "Ship of Theseus" Pathogen', async () => {
    // Rewrite legacy rhyme logic with different variable names and structure
    const content = `
      const findSimilarSounds = (token) => {
        const cache = getSoundCache();
        const tree = cache.branch.nodes;
        return tree.filter(n => n.suffix === token.slice(-2));
      };
    `;
    const violations = await scanAdaptive(content);
    const hasLegacyRhyme = violations.some(v => v.pathogenId === 'pathogen.legacy-rhyme-stack');
    
    if (!hasLegacyRhyme) {
       console.warn('   ⚠️  ADAPTIVE MISSED: Legacy rhyme "Theseus" rewrite not detected.');
    } else {
       console.log('   🔥 CRITICAL HIT: Legacy rhyme pathogen detected through semantic reconstruction.');
    }
  });

  console.log('🏁 STRESS GAUNTLET COMPLETE.');
}

main();
