import { describe, expect, it } from 'vitest';
import { BytecodeError, ERROR_CODES } from '../../codex/core/pixelbrain/bytecode-error.js';
import { encodeBytecodeXPVaccineFromCccb, encodeBytecodeXPVaccineFromError } from '../../codex/core/diagnostic/BytecodeXPVaccine.js';
import {
  buildCleriProbeHotspots,
  buildProbeHypothesis,
  buildQbitHotspotsFromCleriReport,
  buildQbitPulseNodeWithCleriProbe,
  runProteinProbe,
} from '../../codex/core/diagnostic/QbitProbeEnrichment.js';
import { checksumQbitPulse, verifyQbitPulseNode } from '../../codex/core/diagnostic/QbitPulse.js';
import { buildInvestigationReport } from '../../codex/core/immunity/cleri-probe/canonical-report.js';
import { createEvidence, createFinding } from '../../codex/core/immunity/cleri-probe/contracts.js';

function createErrorVaccine() {
  return encodeBytecodeXPVaccineFromError(new BytecodeError('VALUE', 'WARN', 'IMMUNE', ERROR_CODES.TEST_MISSING, {
    layer: 'coverage',
    sourceFile: 'codex/core/example.js',
    ruleId: 'TEST_MISSING',
  }));
}

describe('QbitProbeEnrichment', () => {
  it('derives deterministic probe hypotheses from vaccine context', () => {
    const vaccine = createErrorVaccine();

    expect(buildProbeHypothesis(vaccine)).toBe([
      'error',
      vaccine.semanticSlug,
      'TEST_MISSING',
      'TEST_MISSING',
      '0x0F10',
      '3856',
      'codex/core/example.js',
    ].join(' '));
    expect(buildProbeHypothesis(vaccine, { hypothesis: ' explicit hypothesis ' })).toBe('explicit hypothesis');
  });

  it('normalizes injected probe hits into bounded QBIT hotspots', async () => {
    const vaccine = createErrorVaccine();
    const result = await buildCleriProbeHotspots(vaccine, [
      { path: 'a.js', content: 'a'.repeat(100) },
      { path: 'b.js', content: 'b'.repeat(100) },
      { path: 'c.js', content: 'c'.repeat(100) },
    ], {
      maxFiles: 2,
      maxHotspots: 2,
      maxFileBytes: 4,
      probeRunner: ({ files }) => [
        { file_path: files[0].path, score: 0.7, preview: files[0].content },
        { path: files[1].path, resonance: 1.2, reason: 'direct match' },
        { path: 'ignored.js', resonance: 0.9 },
      ],
    });

    expect(result.hotspots).toEqual([
      { path: 'b.js', resonance: 1, reason: 'direct match' },
      { path: 'ignored.js', resonance: 0.9, reason: 'cleri-probe resonance' },
    ]);
    expect(result.metadata).toMatchObject({
      probe: 'cleri-probe',
      timedOut: false,
      scannedFiles: 2,
      maxFileBytes: 4,
      maxHotspots: 2,
    });
  });

  it('builds a QBIT pulse from cleri-probe hotspots without checksum metadata drift', async () => {
    const vaccine = encodeBytecodeXPVaccineFromCccb('SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c');
    const probeRunner = () => [
      { path: 'codex/core/diagnostic/cccbEncoder.js', resonance: 0.8, reason: 'cccb function' },
    ];

    const a = await buildQbitPulseNodeWithCleriProbe(vaccine, [
      { path: 'codex/core/diagnostic/cccbEncoder.js', content: 'function parseCccbBlock() {}'.repeat(10) },
    ], { probeRunner });
    const b = await buildQbitPulseNodeWithCleriProbe(vaccine, [
      { path: 'codex/core/diagnostic/cccbEncoder.js', content: 'function parseCccbBlock() {}'.repeat(10) },
    ], { probeRunner });

    expect(a.pulse).toEqual(b.pulse);
    expect(verifyQbitPulseNode(a.pulse)).toBe(true);
    expect(checksumQbitPulse(a.pulse)).toBe(a.pulse.checksum);
    expect(a.enrichment.metadata.durationMs).toEqual(expect.any(Number));
  });

  it('returns skipped metadata for empty explicit substrate', async () => {
    const result = await buildCleriProbeHotspots(createErrorVaccine(), []);

    expect(result.hotspots).toEqual([]);
    expect(result.metadata).toMatchObject({
      skipped: true,
      reason: 'EMPTY_SUBSTRATE',
      scannedFiles: 0,
    });
  });

  it('returns timeout metadata without pulse hotspots', async () => {
    const result = await buildCleriProbeHotspots(createErrorVaccine(), [
      { path: 'slow.js', content: 'x'.repeat(100) },
    ], {
      maxRuntimeMs: 1,
      probeRunner: () => new Promise(resolve => {
        setTimeout(() => resolve([{ path: 'slow.js', resonance: 1 }]), 20);
      }),
    });

    expect(result.hotspots).toEqual([]);
    expect(result.metadata).toMatchObject({
      timedOut: true,
      maxRuntimeMs: 1,
      scannedFiles: 1,
    });
  });

  it('bounds the default synchronous probe by its wall-clock deadline', async () => {
    const heavyFiles = Array.from({ length: 16 }, (_, i) => ({
      path: `f${i}.js`,
      content: 'function parseThing(){ return doWork(); }\n'.repeat(400),
    }));

    // Deadline already in the past: the real probe must stop before processing
    // any file instead of running the full CPU-bound scan.
    const stopped = await runProteinProbe({
      hypothesis: 'parse thing do work',
      files: heavyFiles,
      minResonance: 0,
      deadline: performance.now() - 1,
    });
    expect(stopped).toEqual([]);

    // No deadline: the same probe processes the substrate and returns hits.
    const ran = await runProteinProbe({
      hypothesis: 'parse thing do work',
      files: heavyFiles.slice(0, 2),
      minResonance: 0,
      deadline: Infinity,
    });
    expect(ran.length).toBeGreaterThan(0);
  });

  it('keeps the default probe within a small multiple of maxRuntimeMs', async () => {
    const heavyFiles = Array.from({ length: 40 }, (_, i) => ({
      path: `f${i}.js`,
      content: 'function parseThing(){ return doWork(); }\n'.repeat(400),
    }));

    const startedAt = performance.now();
    await buildCleriProbeHotspots(createErrorVaccine(), heavyFiles, { maxRuntimeMs: 5, minResonance: 0 });
    const elapsed = performance.now() - startedAt;

    // Unbounded, this substrate scans for hundreds of ms; the deadline guard
    // must keep it to a small multiple of the 5ms budget (generous CI ceiling).
    expect(elapsed).toBeLessThan(120);
  });

  it('rejects non-explicit substrates and malformed files', async () => {
    await expect(buildCleriProbeHotspots(createErrorVaccine(), null)).rejects.toThrow(/explicit files array/);
    await expect(buildCleriProbeHotspots(createErrorVaccine(), [{ content: 'x' }])).rejects.toThrow(/file.path/);
  });

  it('freezes returned enrichment artifacts', async () => {
    const result = await buildCleriProbeHotspots(createErrorVaccine(), [
      { path: 'a.js', content: 'a'.repeat(100) },
    ], {
      probeRunner: () => [{ path: 'a.js', resonance: 0.8 }],
    });

    expect(() => { result.hotspots[0].path = 'mutated.js'; }).toThrow();
    expect(() => { result.metadata.scannedFiles = 9; }).toThrow();
  });
});

describe('QBIT hotspots derived from a verified Cleri report', () => {
  function buildReport(findings = []) {
    return buildInvestigationReport({
      hypothesis: 'leaked event listener subscription missing cleanup',
      normalizedHypothesis: 'leaked event listener subscription missing cleanup',
      scope: ['src'],
      plan: { profileId: 'scholomance/default', version: '1.0.0' },
      configuration: { includeTests: false },
      substrateFiles: [{ path: 'src/RoomPanel.jsx', contentHash: 'abc' }],
      findings,
      coverage: { requestedPaths: ['src'], analyzedPaths: ['src/RoomPanel.jsx'], complete: true },
      diagnostics: [],
    });
  }

  function makeFinding(path = 'src/RoomPanel.jsx') {
    const span = {
      path,
      startLine: 7,
      startColumn: 5,
      endLine: 7,
      endColumn: 40,
      symbol: 'RoomPanel',
      excerptDigest: null,
    };

    return createFinding({
      pathologyClass: 'LEAKED_LISTENER_SUBSCRIPTION',
      verdict: 'VERIFIED',
      span,
      summary: 'useEffect registers a listener its cleanup does not remove',
      supportingEvidence: [createEvidence({
        kind: 'SUPPORTING',
        predicateId: 'EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION',
        observed: true,
        span,
        explanation: 'The effect callback registers a listener',
      })],
      counterEvidenceChecked: [createEvidence({
        kind: 'COUNTERCHECK',
        predicateId: 'MATCHING_REMOVE_IN_RETURNED_CLEANUP',
        observed: false,
        span,
        explanation: 'No matching removal in the returned cleanup',
      })],
      verifier: { id: 'listener-lifecycle/v1', version: '1.0.0' },
    });
  }

  it('derives hotspots only from verified findings', () => {
    const report = buildReport([makeFinding(), makeFinding('src/Other.jsx')]);
    const enrichment = buildQbitHotspotsFromCleriReport(report);

    expect(enrichment.hotspots.map(hotspot => hotspot.path).sort()).toEqual([
      'src/Other.jsx',
      'src/RoomPanel.jsx',
    ]);
    expect(enrichment.hotspots.every(hotspot => hotspot.resonance === 1)).toBe(true);
    expect(enrichment.hotspots[0].reason).toContain('listener-lifecycle/v1');
  });

  it('produces no hotspots when nothing was verified', () => {
    const enrichment = buildQbitHotspotsFromCleriReport(buildReport([]));
    expect(enrichment.hotspots).toEqual([]);
    expect(enrichment.metadata.status).toBe('NO_VERIFIED_FINDINGS');
  });

  it('keeps duration and cache metadata outside the canonical report', () => {
    const report = buildReport([makeFinding()]);
    const enrichment = buildQbitHotspotsFromCleriReport(report);

    expect(enrichment.metadata.reportId).toBe(report.reportId);
    expect(enrichment.metadata.source).toBe('SCHOL-CLERI-PROBE-v2');
    expect(report).not.toHaveProperty('durationMs');
    expect(report).not.toHaveProperty('cache');
  });

  it('bounds the hotspot count', () => {
    const findings = Array.from({ length: 30 }, (_, index) => makeFinding(`src/Panel${index}.jsx`));
    const enrichment = buildQbitHotspotsFromCleriReport(buildReport(findings), { maxHotspots: 3 });
    expect(enrichment.hotspots.length).toBe(3);
  });

  it('refuses a tampered report', () => {
    const report = buildReport([makeFinding()]);
    const tampered = { ...report, status: 'NO_VERIFIED_FINDINGS' };

    expect(() => buildQbitHotspotsFromCleriReport(tampered)).toThrow(BytecodeError);
  });

  it('refuses an artifact that does not carry the contract', () => {
    expect(() => buildQbitHotspotsFromCleriReport({ findings: [] })).toThrow(BytecodeError);
  });
});
