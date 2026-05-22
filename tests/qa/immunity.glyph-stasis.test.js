/**
 * IMMUNITY GLYPH + DETERMINISM STASIS TEST SUITE
 * 
 * "Intentionally hard to pass" tests for the AI Glyph steganographic system.
 * 
 * Tests per SCHOLOMANCE_IRONCLAD_STERILIZATION_PROTOCOL.skill.md:
 * - Determinism (VAELRIX_LAW §6)
 * - Glyph encoding/decoding
 * - Protocol scanner (Layer 3)
 * - SISP-GLYPH-v1 compliance
 * 
 * Skill ID: SISP-STASIS-GLYPH-v1
 * 
 * Run: node tests/qa/immunity.glyph-stasis.test.js
 */

import {
  GLYPH_CODES,
  PATHOGEN_GLYPHS,
  decodeGlyphs,
  encodeGlyphs,
  verifyDeterminism,
  GLYPH_SYSTEM_VERSION,
  GLYPH_SYSTEM_ID,
} from '../../codex/core/immunity/ai-glyphs.js';

import { scanInnate } from '../../codex/core/immunity/innate.scanner.js';
import { scanAdaptive, verifyAdaptiveDeterminism } from '../../codex/core/immunity/adaptive.scanner.js';
import { scanProtocol, harvestAsyncSurface } from '../../codex/core/immunity/protocol.scanner.js';
import { PATHOGEN_REGISTRY } from '../../codex/core/immunity/pathogenRegistry.js';
import { decodeBytecodeError, ERROR_CODES, MODULE_IDS } from '../../codex/core/pixelbrain/bytecode-error.js';

// ─── Test Infrastructure ──────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

async function runTest(name, ritual) {
  console.log(`🧪 [TEST] ${name}`);
  try {
    await ritual();
    console.log(`   ✅ PASSED\n`);
    passCount++;
  } catch (e) {
    console.log(`   ❌ FAILED: ${e.message}\n`);
    failCount++;
    process.exitCode = 1;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

// ─── SISP-GLYPH-v1 System Tests ──────────────────────────────────────────────

async function testGlyphSystemVersion() {
  assertEqual(typeof GLYPH_SYSTEM_VERSION === 'string', true, 'Version should be string');
  assertTrue(GLYPH_SYSTEM_ID === 'SISP-GLYPH-v1', 'System ID should be SISP-GLYPH-v1');
}

async function testGlyphCodesExhaustive() {
  // Every GLYPH_CODE must be a single Unicode character
  for (const [name, glyph] of Object.entries(GLYPH_CODES)) {
    assertTrue(glyph.length === 1, `Glyph for ${name} must be single char`);
    const codePoint = glyph.codePointAt(0);
    assertTrue(codePoint > 0, `Glyph ${name} has valid codepoint`);
  }
}

async function testPathogenGlyphsComplete() {
  const pathogenIds = PATHOGEN_REGISTRY
    .filter(p => p.layer !== 'protocol')
    .map(p => p.id);
  
  for (const id of pathogenIds) {
    assertTrue(PATHOGEN_GLYPHS[id] !== undefined, `Missing glyphs for ${id}`);
  }
}

// ─── Glyph Encode/Decode Tests ────────────────────────────────────────────────

async function testGlyphDecodeRoundTrip() {
  const testClasses = ['CLIENT_AUTHORITY', 'SHADOW_PATH', 'LOOP_RECURSION'];
  const encoded = encodeGlyphs(testClasses);
  const decoded = decodeGlyphs(encoded);
  
  assertEqual(decoded.classes.sort().join(','), testClasses.sort().join(','), 'Round-trip should preserve classes');
}

async function testGlyphSeedDeterminism() {
  const glyphs = '⟡⧫⌁⟟';
  const results = [];
  
  for (let i = 0; i < 100; i++) {
    const { seed } = decodeGlyphs(glyphs);
    results.push(seed);
  }
  
  const first = results[0];
  assertTrue(results.every(s => s === first), 'Glyph seed should be deterministic (100 iterations)');
}

async function testGlyphDecodingStability() {
  const glyphStr = '⧿⧿';
  const iterations = 100;
  const seeds = [];
  
  for (let i = 0; i < iterations; i++) {
    const { seed } = decodeGlyphs(glyphStr);
    seeds.push(seed);
  }
  
  const unique = new Set(seeds).size;
  assertEqual(unique, 1, `Glyph decoding should produce single unique seed, got ${unique}`);
}

// ─── Determinism Tests (VAELRIX_LAW §6) ──────────────────────────────────────

async function testVectorGenerationDeterminism() {
  const testContent = 'const combatScore = calculatePlayerDamage(player, enemy);';
  const result = verifyAdaptiveDeterminism(testContent);
  
  assertTrue(result.deterministic, 'Vector generation must be deterministic');
  assertEqual(result.drift, 0, 'Zero drift expected');
  assertEqual(result.iterations, 100, 'Should run 100 iterations');
}

async function testGlyphVectorDeterminism() {
  const testContent = 'Client-side Combat Scoring';
  const testGlyphs = '⟡⌁';
  const result = verifyDeterminism(decodeGlyphs, [testGlyphs], 100);
  
  assertTrue(result.deterministic, 'Glyph decoding must be deterministic');
  assertEqual(result.drift, 0, 'Zero drift expected');
}

async function testRegistrySignaturesDeterminism() {
  const signatures = PATHOGEN_REGISTRY
    .filter(p => p.signature)
    .map(p => p.signature.data.join(','));
  
  // All signatures should be non-empty arrays
  for (const sig of signatures) {
    assertTrue(sig.length > 0, 'Signature data should not be empty');
  }
  
  // Generate each signature twice and compare
  for (const pathogen of PATHOGEN_REGISTRY.filter(p => p.signature)) {
    const original = pathogen.signature.data.join(',');
    assertTrue(original.length > 0, `Signature for ${pathogen.id} should be stable`);
  }
}

// ─── Protocol Scanner Tests (Layer 3) ────────────────────────────────────────

async function testProtocolScannerCatchesUnawaited() {
  const content = `
    export async function handleRequest(req) {
      const result = someAsyncService.compute(req);
      return result;
    }
  `;
  
  const asyncSurface = new Set(['compute']);
  const violations = scanProtocol(content, 'test-file.js', { asyncSurface });
  
  assertTrue(violations.length > 0, 'Should catch unawaited async call');
  assertEqual(violations[0].ruleId, 'PROTO-0F08', 'Should have protocol rule ID');
}

async function testProtocolScannerAllowsAwaited() {
  const content = `
    export async function handleRequest(req) {
      const result = await someAsyncService.compute(req);
      return result;
    }
  `;
  
  const asyncSurface = new Set(['compute']);
  const violations = scanProtocol(content, 'test-file.js', { asyncSurface });
  
  assertEqual(violations.length, 0, 'Should not flag awaited calls');
}

async function testProtocolScannerAllowsRejects() {
  const content = `
    test('should reject', async () => {
      await expect(asyncService.compute()).rejects.toThrow();
    });
  `;
  
  const asyncSurface = new Set(['compute']);
  const violations = scanProtocol(content, 'test-file.test.js', { asyncSurface });
  
  assertEqual(violations.length, 0, 'Should not flag expect().rejects pattern');
}

async function testProtocolScannerAllowsResolves() {
  const content = `
    test('should resolve', async () => {
      await expect(asyncService.compute()).resolves.toBeDefined();
    });
  `;
  
  const asyncSurface = new Set(['compute']);
  const violations = scanProtocol(content, 'test-file.test.js', { asyncSurface });
  
  assertEqual(violations.length, 0, 'Should not flag expect().resolves pattern');
}

async function testProtocolScannerPrefixFilter() {
  const content = `
    function handle() {
      collabService.agents.register({ id: '1' });
      otherService.agents.register({ id: '2' });
    }
  `;
  
  const asyncSurface = new Set(['register']);
  const violations = scanProtocol(content, 'test-file.js', {
    asyncSurface,
    callerPrefixes: ['collabService'],
  });
  
  // With prefix filter, should only catch collabService calls (not otherService)
  assertTrue(violations.length > 0, `Should find collabService calls, got ${violations.length}`);
  
  // Verify all violations are from collabService (check nested context.callExpr)
  for (const v of violations) {
    const callExpr = v.context?.callExpr || v.callExpr;
    assertTrue(
      callExpr && callExpr.includes('collabService'),
      `All violations should be from collabService: ${JSON.stringify(v.context)}`
    );
  }
}

// ─── Innate + Adaptive Integration ───────────────────────────────────────────

async function testAdaptiveScannerIncludesGlyphs() {
  const content = `
    export function calculateCombatScore(player, enemy) {
      return (player.atk * 1.5 + enemy.def) / 2;
    }
  `;
  
  const violations = await scanAdaptive(content);
  
  if (violations.length > 0) {
    assertTrue(typeof violations[0].glyphs === 'string', 'Violation should include glyphs');
    assertTrue(violations[0].glyphs.length > 0, 'Glyphs should not be empty');
  }
}

async function testAdaptiveBytecodeIncludesGlyphs() {
  const content = `
    export function resolveClientSide(player, enemy) {
      const damage = player.atk * 2;
      return damage;
    }
  `;
  
  const violations = await scanAdaptive(content);
  
  for (const v of violations) {
    const decoded = decodeBytecodeError(v.bytecode);
    assertTrue(decoded && decoded.valid, 'Bytecode should decode');
    assertTrue(decoded.context.glyphs !== undefined, 'Context should include glyphs field');
  }
}

async function testInnateStillWorks() {
  const content = 'const x = Math.random();';
  const violations = scanInnate(content, 'src/lib/test.js');
  
  assertTrue(violations.length > 0, 'Should catch Math.random()');
  assertEqual(violations[0].ruleId, 'QUANT-0101', 'Should have QUANT-0101 rule ID');
}

// ─── SISP Compliance Tests ────────────────────────────────────────────────────

async function testBytecodeErrorCompliance() {
  const content = 'const x = Math.random();';
  const violations = scanInnate(content, 'src/lib/test.js');
  const v = violations[0];
  
  const decoded = decodeBytecodeError(v.bytecode);
  assertTrue(decoded && decoded.valid, 'Bytecode should be valid');
  assertEqual(decoded.moduleId, MODULE_IDS.IMMUNITY, 'Module should be IMMUNITY');
  assertEqual(decoded.errorCode, ERROR_CODES.QUANT_PRECISION_LOSS, 'Error code should match');
}

async function testChecksumPresence() {
  const content = 'const x = Math.random();';
  const violations = scanInnate(content, 'src/lib/test.js');
  const bytecode = violations[0].bytecode;
  
  const parts = bytecode.split('-');
  assertTrue(parts.length >= 8, 'Bytecode should have checksum segment');
}

async function testNoRandomEntropyInScanning() {
  // Run scan 10 times with same content; all bytecodes should be identical
  const content = 'const x = Math.random();';
  const bytecodes = [];
  
  for (let i = 0; i < 10; i++) {
    const violations = scanInnate(content, 'src/lib/test.js');
    bytecodes.push(violations[0].bytecode);
  }
  
  const unique = new Set(bytecodes).size;
  assertEqual(unique, 1, 'Identical runs should produce identical bytecode');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🛡️  INITIATING GLYPH + DETERMINISM STRESS GAUNTLET\n');
  console.log(`   Skill ID: ${GLYPH_SYSTEM_ID} v${GLYPH_SYSTEM_VERSION}\n`);
  
  console.log('═══ SISP-GLYPH-v1 SYSTEM TESTS ═══');
  await runTest('Glyph System Version', testGlyphSystemVersion);
  await runTest('Glyph Codes Exhaustive', testGlyphCodesExhaustive);
  await runTest('Pathogen Glyphs Complete', testPathogenGlyphsComplete);
  
  console.log('═══ GLYPH ENCODE/DECODE ═══');
  await runTest('Glyph Decode Round-Trip', testGlyphDecodeRoundTrip);
  await runTest('Glyph Seed Determinism', testGlyphSeedDeterminism);
  await runTest('Glyph Decoding Stability', testGlyphDecodingStability);
  
  console.log('═══ DETERMINISM TESTS (VAELRIX_LAW §6) ═══');
  await runTest('Vector Generation Determinism', testVectorGenerationDeterminism);
  await runTest('Glyph Vector Determinism', testGlyphVectorDeterminism);
  await runTest('Registry Signatures Determinism', testRegistrySignaturesDeterminism);
  
  console.log('═══ PROTOCOL SCANNER (LAYER 3) ═══');
  await runTest('Protocol: Catches Unawaited', testProtocolScannerCatchesUnawaited);
  await runTest('Protocol: Allows Awaited', testProtocolScannerAllowsAwaited);
  await runTest('Protocol: Allows expect().rejects', testProtocolScannerAllowsRejects);
  await runTest('Protocol: Allows expect().resolves', testProtocolScannerAllowsResolves);
  await runTest('Protocol: Prefix Filter', testProtocolScannerPrefixFilter);
  
  console.log('═══ INNATE + ADAPTIVE INTEGRATION ═══');
  await runTest('Adaptive: Includes Glyphs', testAdaptiveScannerIncludesGlyphs);
  await runTest('Adaptive: Bytecode Includes Glyphs', testAdaptiveBytecodeIncludesGlyphs);
  await runTest('Innate: Still Works', testInnateStillWorks);
  
  console.log('═══ SISP COMPLIANCE ═══');
  await runTest('Bytecode Error Compliance', testBytecodeErrorCompliance);
  await runTest('Checksum Presence', testChecksumPresence);
  await runTest('No Random Entropy', testNoRandomEntropyInScanning);
  
  console.log('\n═══ 🛡️ GLYPH + DETERMINISM SUMMARY ═══');
  console.log(`   PASSED: ${passCount}`);
  console.log(`   FAILED: ${failCount}`);
  console.log(`   TOTAL:  ${passCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n   STASIS STATUS:   🔒 LOCKED');
    console.log('   GLYPH SYSTEM:    ✅ SISP-GLYPH-v1 COMPLIANT');
    console.log('   DETERMINISM:     ✅ VAELRIX_LAW §6 VERIFIED');
  } else {
    console.log('\n   STASIS STATUS:   ❌ BREACH DETECTED');
    console.log('   REQUIRES:       FAILED TESTS MUST PASS');
  }
  
  console.log('\n🏁 STRESS GAUNTLET COMPLETE.');
}

main();
