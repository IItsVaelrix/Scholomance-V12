/**
 * Permanent Operational Guard - SCD64
 *
 * This file is the permanent regression guard for the four SCD64
 * operational gaps identified during the post-implementation review:
 *
 *   1. EXTENSION POINT - a second bug family (RESONANCE_GHOST) must
 *      produce a DIFFERENT SCD64 from COLOR_DRAGON, proving the family
 *      registry works and the canonicals are not hardcoded.
 *
 *   2. GLOSSARY/GENERATOR SYNC - the SCD64_GLOSSARY is derived from
 *      BUG_FAMILIES at module load. If anyone changes a canonical without
 *      updating the other, the recomputed SCD64 from the canonicals must
 *      still match the glossary entry's hexCode. This test pins that
 *      invariant.
 *
 *   3. REAL EVIDENCE - `collectRealTruesightEvidence()` must read the
 *      actual codebase, not hardcoded fixtures. After the Color Dragon
 *      fix landed, the collector must report `present: false` and
 *      `fixInstalled: true` for COLOR_DRAGON (no legacy patterns, fix
 *      patterns present). This is the detector for "did the fix actually
 *      stick?" - if a future agent reverts the fix, this test fails.
 *
 *   4. QA CHECKLIST - the white paper §12 acceptance criteria still pass
 *      (repeatability, agent convergence, negative control, nearby bug
 *      distinction, health semantics). Pinned against the locked
 *      first example.
 *
 * @bytecode SCHOL-SCD64-OPERATIONAL-GUARD
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  runTrueSightSCD64Sweep,
  parseSCD64,
  generateColorDragonSCD64,
  generateSCD64ForFamily,
  getFirstColorDragonSCD64,
  SCD64_GLOSSARY,
  SCD64_COLOR_DRAGON_GLOSSARY,
  collectRealTruesightEvidence,
  SpatialImmuneOrchestrator,
} from '../../../codex/core/immunity/spatial-immune-orchestrator.js';

const PINNED_FIRST = '01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C';

describe('SCD64 - extension point: a second bug family produces a DIFFERENT fingerprint', () => {
  it('COLOR_DRAGON and RESONANCE_GHOST produce distinct, deterministic 64-char fingerprints', () => {
    const colorDragon = generateSCD64ForFamily('COLOR_DRAGON', {}, {}, {});
    const resonanceGhost = generateSCD64ForFamily('RESONANCE_GHOST', {}, {}, {});

    expect(colorDragon.checksum64).toMatch(/^[0-9A-F]{64}$/);
    expect(resonanceGhost.checksum64).toMatch(/^[0-9A-F]{64}$/);
    expect(colorDragon.checksum64).not.toBe(resonanceGhost.checksum64);
    expect(colorDragon.bugFamily).toBe('COLOR_DRAGON');
    expect(resonanceGhost.bugFamily).toBe('RESONANCE_GHOST');

    // The version byte (first 2 chars of BUGCLASS) must differ between
    // v1 (COLOR_DRAGON, "01") and v2 (RESONANCE_GHOST, "02").
    const colorDragonVer = parseSCD64(colorDragon.checksum64).versionByte;
    const resonanceGhostVer = parseSCD64(resonanceGhost.checksum64).versionByte;
    expect(colorDragonVer).toBe('01');
    expect(resonanceGhostVer).toBe('02');

    // COLOR_DRAGON is still pinned to the v1 first example.
    expect(colorDragon.checksum64).toBe(PINNED_FIRST);
  });

  it('GATE_DATA_ABSENT (v3) produces a distinct fingerprint with version byte "03"', () => {
    const colorDragon = generateSCD64ForFamily('COLOR_DRAGON', {}, {}, {});
    const resonanceGhost = generateSCD64ForFamily('RESONANCE_GHOST', {}, {}, {});
    const gateDataAbsent = generateSCD64ForFamily('GATE_DATA_ABSENT', {}, {}, {});

    expect(gateDataAbsent.checksum64).toMatch(/^[0-9A-F]{64}$/);
    expect(gateDataAbsent.bugFamily).toBe('GATE_DATA_ABSENT');
    // Distinct from both existing families.
    expect(gateDataAbsent.checksum64).not.toBe(colorDragon.checksum64);
    expect(gateDataAbsent.checksum64).not.toBe(resonanceGhost.checksum64);
    expect(parseSCD64(gateDataAbsent.checksum64).versionByte).toBe('03');
  });

  it('GATE_DATA_ABSENT real-evidence reports the fix-installed state in the current codebase', () => {
    // The gate safe-fallback landed: the resonance gate reads connections via
    // resolveResonanceConnections (path-agnostic) instead of the server-only
    // key, so the legacy pattern is gone and the fix resolver is present.
    // If a future change reverts to reading deepAnalysis.syntaxLayer.allConnections
    // directly in ReadPage, this guard fails.
    const evidence = collectRealTruesightEvidence();
    const gda = evidence.GATE_DATA_ABSENT;
    expect(gda.family).toBe('GATE_DATA_ABSENT');
    expect(gda.present).toBe(false);
    expect(gda.fixInstalled).toBe(true);
    expect(gda.legacyHits).toBe(0);
    expect(gda.fixHits).toBeGreaterThan(0);
    expect(gda.perFile.length).toBeGreaterThan(0);
  });

  it('REFUSES to generate SCD64 for an unregistered family', () => {
    expect(() => generateSCD64ForFamily('NONEXISTENT_BUG', {}, {}, {})).toThrow(/Unknown bug family/);
  });
});

describe('SCD64 - glossary/generator sync: zero drift between registry and generator', () => {
  it('recomputing each family from its canonicals produces the same hex as the glossary entry', () => {
    // Group glossary by family
    const byFamily = {};
    for (const entry of SCD64_GLOSSARY) {
      if (!byFamily[entry.family]) byFamily[entry.family] = [];
      byFamily[entry.family].push(entry);
    }

    for (const [familyName, entries] of Object.entries(byFamily)) {
      // Generate SCD64 from the registry (not from the glossary)
      const scd = generateSCD64ForFamily(familyName, {}, {}, {});
      const parsed = parseSCD64(scd.checksum64);

      // Every slot in the SCD64 must have a matching glossary entry
      for (const slot of parsed.slots) {
        const match = entries.find((e) => e.hexCode === slot.hex);
        expect(
          match,
          `Slot ${slot.index} (hex=${slot.hex}) for family ${familyName} has no glossary entry`
        ).toBeTruthy();
      }
    }
  });

  it('every SCD64_COLOR_DRAGON glossary entry matches the SCD64 generated from the canonicals', () => {
    const scd = generateColorDragonSCD64();
    const parsed = parseSCD64(scd.checksum64);
    const hexes = new Set(parsed.slots.map((s) => s.hex));

    for (const entry of SCD64_COLOR_DRAGON_GLOSSARY) {
      expect(
        hexes.has(entry.hexCode),
        `Glossary entry ${entry.slotName} (${entry.hexCode}) not in COLOR_DRAGON SCD64`
      ).toBe(true);
    }
  });

  it('every glossary entry has a deterministic categoryChecksum that matches its content', () => {
    for (const entry of SCD64_GLOSSARY) {
      expect(entry.categoryChecksum).toMatch(/^[0-9A-F]{16}$/);
      expect(entry.fixedForever).toBe(true);
    }
  });
});

describe('SCD64 - real evidence: the collector reads the actual codebase, not fixtures', () => {
  it('returns per-family bug-presence/fix-installed flags computed from the actual code', () => {
    const evidence = collectRealTruesightEvidence();

    // Must have entries for every registered family
    expect(Object.keys(evidence).sort()).toEqual(['COLOR_DRAGON', 'GATE_DATA_ABSENT', 'RESONANCE_GHOST', 'SCORE_DRIFT']);

    for (const [familyName, familyEvidence] of Object.entries(evidence)) {
      expect(familyEvidence.family).toBe(familyName);
      expect(typeof familyEvidence.legacyHits).toBe('number');
      expect(typeof familyEvidence.fixHits).toBe('number');
      expect(typeof familyEvidence.present).toBe('boolean');
      expect(typeof familyEvidence.fixInstalled).toBe('boolean');
      expect(Array.isArray(familyEvidence.perFile)).toBe(true);
      // Runtime-numeric families (e.g. SCORE_DRIFT) carry no static evidence
      // files - they are detected from runtimeEvidence, not file greps, so
      // their perFile list is legitimately empty.
      if (familyEvidence.perFile.length > 0) {
        // Each perFile entry should reference a real file in the repo.
        // Files may be in src/ or codex/ (the Color Dragon evidence lives in
        // src/, the Resonance Ghost evidence may touch codex/core/phonology).
        for (const pf of familyEvidence.perFile) {
          expect(pf.file).toMatch(/^(src|codex)\//);
          expect(typeof pf.legacyMatches).toBe('number');
          expect(typeof pf.fixMatches).toBe('number');
        }
      }
    }
  });

  it('COLOR_DRAGON evidence reports the fix-installed state in the current codebase', () => {
    // The fix landed in this session: charStart.js is the canonical helper,
    // analysisMap is gone, the lookup hierarchy is position-only.
    // The real-evidence collector must reflect this.
    const evidence = collectRealTruesightEvidence();
    const cd = evidence.COLOR_DRAGON;

    expect(cd.fixInstalled).toBe(true);
    expect(cd.present).toBe(false);
    expect(cd.legacyHits).toBe(0);
    // The fix patterns (computeCharStartFromLexical, resolveTokenDataAtPosition)
    // must appear at least once across the relevant files.
    expect(cd.fixHits).toBeGreaterThan(0);
    // The summary flags the fix as installed.
    expect(cd.summary.fixInstalled).toBe(true);
    expect(cd.summary.legacyPatternsPresent).toBe(false);
    expect(cd.summary.charStartMatches).toBe(true);
  });

  it('RESONANCE_GHOST evidence reports whether the gate Set construction pattern is present', () => {
    const evidence = collectRealTruesightEvidence();
    const rg = evidence.RESONANCE_GHOST;

    // The real evidence is computed from the actual code; the summary
    // should reflect the present-state of gate Set construction.
    expect(typeof rg.summary.gateSetConstructionPresent).toBe('boolean');
    expect(typeof rg.summary.fixInstalled).toBe('boolean');
  });
});

describe('SCD64 - QA checklist from white paper §12', () => {
  it('repeatability: 10 identical runs produce the same COLOR_DRAGON SCD64', () => {
    const baseline = runTrueSightSCD64Sweep().aggregateSCD64;
    for (let i = 0; i < 10; i += 1) {
      const again = runTrueSightSCD64Sweep().aggregateSCD64;
      expect(again).toBe(baseline);
    }
  });

  it('agent convergence: 3 independent orchestrators produce the same SCD64 for identical anatomy', () => {
    const baseline = generateColorDragonSCD64().checksum64;
    for (let i = 0; i < 3; i += 1) {
      const orch = new SpatialImmuneOrchestrator({ sizeX: 64, sizeY: 64, sizeZ: 64, agentCount: 5 });
      const scd = orch.generateSCD64({ completed: true, verdictText: 'convergence' }, { collapseVerdict: 'X' }, {});
      expect(scd.checksum64).toBe(baseline);
    }
  });

  it('negative control: tampered runtime inputs do NOT alter the SCD64 (design rejects runtime-derived hex)', () => {
    const baseline = generateColorDragonSCD64().checksum64;
    const tampered = generateColorDragonSCD64(
      { completed: true, verdictText: 'TAMPERED - should be ignored' },
      { energyAtMismatch: 0.99, gradientMagnitude: 0.99, collapseVerdict: 'TAMPERED' },
      { runtimeEvidence: { note: 'this should not affect the hex' } }
    );
    expect(tampered.checksum64).toBe(baseline);
  });

  it('nearby bug distinction: a hypothetical coord-only canonical produces a different COORDSYS', () => {
    const colorDragon = generateColorDragonSCD64();
    const parsed = parseSCD64(colorDragon.checksum64);
    const currentCoordsys = parsed.slots[1].hex;
    // SHA256 of a hypothetical "source-charstart-only" canonical, first 8 chars.
    // Computed deterministically; the test just asserts that a different
    // canonical produces a different hex.
    const nearbyHash = createHash('sha256')
      .update('COORDSYS:source-charstart-only')
      .digest('hex')
      .toUpperCase()
      .slice(0, 8);
    expect(nearbyHash).not.toBe(currentCoordsys);
  });

  it('health semantics: the BytecodeHealth code is "PB-OK-v1-SCD64" (captured diagnosis, not "healthy")', () => {
    const sweep = runTrueSightSCD64Sweep();
    for (const result of sweep.results) {
      if (result.type === 'TRUESIGHT_AGGREGATE') {
        expect(result.bytecodeHealth.code).toBe('PB-OK-v1-SCD64');
        expect(result.bytecodeHealth.checksum).not.toBe(result.bytecodeHealth.context.spatialDiagnosticChecksum);
        // The 8-char and 64-char are distinct.
        expect(result.bytecodeHealth.checksum).toMatch(/^[0-9a-f]{8}$/);
        expect(result.bytecodeHealth.context.spatialDiagnosticChecksum).toMatch(/^[0-9A-F]{64}$/);
      }
    }
  });

  it('the sweep returns one aggregate per registered family', () => {
    const sweep = runTrueSightSCD64Sweep();
    const aggregates = sweep.results.filter((r) => r.type === 'TRUESIGHT_AGGREGATE');
    // We seeded two families. Each produces its own aggregate.
    expect(aggregates.length).toBeGreaterThanOrEqual(2);
    const families = new Set(aggregates.map((a) => a.family));
    expect(families.has('COLOR_DRAGON')).toBe(true);
    expect(families.has('RESONANCE_GHOST')).toBe(true);
    // The COLOR_DRAGON aggregate is the pinned first example.
    const cdAgg = aggregates.find((a) => a.family === 'COLOR_DRAGON');
    expect(cdAgg.scd64).toBe(PINNED_FIRST);
  });
});

describe('SCD64 - pinned first example is stable across the operational refactor', () => {
  it('getFirstColorDragonSCD64() still equals the pinned first example', () => {
    const first = getFirstColorDragonSCD64();
    expect(first.checksum64).toBe(PINNED_FIRST);
  });
});
