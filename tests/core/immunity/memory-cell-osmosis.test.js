import { describe, expect, it } from 'vitest';
import { parseErrorForAI } from '../../../codex/core/pixelbrain/bytecode-error.js';
import {
  buildIdeWhitespaceBaselineCell,
  buildIdeWhitespaceVector,
  createMemoryCellPacket,
  evaluateIdeWhitespaceOsmosis,
  evaluateMemoryCellOsmosis,
  scanMemoryCells,
  verifyMemoryCellPacket,
} from '../../../codex/core/immunity/memory-cell-osmosis.js';

describe('memory-cell osmosis', () => {
  it('builds deterministic immutable memory-cell packets', () => {
    const vector = new Float32Array(128);
    vector[0] = 1;
    vector[12] = 0.25;

    const a = createMemoryCellPacket({
      id: 'test.baseline',
      family: 'immunity',
      vector,
      membrane: { similarityFloor: 0.97, driftCeiling: 0.04 },
      stableContext: { detector: 'unit' },
    });
    const b = createMemoryCellPacket({
      id: 'test.baseline',
      family: 'immunity',
      vector,
      membrane: { similarityFloor: 0.97, driftCeiling: 0.04 },
      stableContext: { detector: 'unit' },
    });

    expect(a).toEqual(b);
    expect(verifyMemoryCellPacket(a)).toBe(true);
    expect(() => { a.stableContext.detector = 'mutated'; }).toThrow();
    expect(a.stableContext.detector).toBe('unit');
  });

  it('keeps baseline observations silent when vector shape remains close', () => {
    const cell = buildIdeWhitespaceBaselineCell({
      membrane: { similarityFloor: 0.9, driftCeiling: 0.2, concentrationLimit: 0.99 },
    });
    const result = evaluateIdeWhitespaceOsmosis({
      totalDeltaPx: 0,
      maxWordDriftPx: 0,
      meanWordDriftPx: 0,
      wordDriftsPx: [0, 0, 0],
      plainTotalPx: 300,
      styledTotalPx: 300,
      wordCount: 3,
      tolerancePx: 0.5,
    }, cell);

    expect(result.status).toBe('silent');
    expect(result.anomalyKind).toBe('none');
    expect(result.similarity).toBeGreaterThan(0.9);
  });

  it('flags IDE whitespace drift as a baseline anomaly', () => {
    const cell = buildIdeWhitespaceBaselineCell({
      membrane: { similarityFloor: 0.98, driftCeiling: 0.03, concentrationLimit: 0.99 },
    });
    const result = evaluateIdeWhitespaceOsmosis({
      totalDeltaPx: 4.2,
      maxWordDriftPx: 3.1,
      meanWordDriftPx: 1.4,
      wordDriftsPx: [0, 0.7, 1.4, 2.6, 3.1],
      plainTotalPx: 420,
      styledTotalPx: 424.2,
      wordCount: 5,
      tolerancePx: 0.5,
    }, cell);

    expect(result.status).toBe('anomaly');
    expect(['baseline_drift', 'concentration']).toContain(result.anomalyKind);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects known-bad antigen resonance without issuing repairs', () => {
    const badVector = buildIdeWhitespaceVector({
      totalDeltaPx: 3,
      maxWordDriftPx: 2,
      meanWordDriftPx: 1,
      wordDriftsPx: [0, 0.5, 1, 2],
      tolerancePx: 0.5,
    });
    const antigen = createMemoryCellPacket({
      id: 'test.antigen.spacing',
      family: 'immunity',
      mode: 'antigen',
      vector: badVector,
      membrane: { similarityFloor: 0.95 },
      stableContext: { detector: 'unit-antigen' },
    });

    const result = evaluateMemoryCellOsmosis(antigen, { vector: badVector });

    expect(result.status).toBe('anomaly');
    expect(result.anomalyKind).toBe('antigen_match');
    expect(result).not.toHaveProperty('fixPath');
    expect(result).not.toHaveProperty('recommendation');
  });

  it('scanMemoryCells returns only anomaly results by default', () => {
    const silent = buildIdeWhitespaceBaselineCell({
      id: 'test.silent',
      membrane: { similarityFloor: 0.1, driftCeiling: 1, concentrationLimit: 1 },
    });
    const loud = buildIdeWhitespaceBaselineCell({
      id: 'test.loud',
      membrane: { similarityFloor: 0.98, driftCeiling: 0.03, concentrationLimit: 0.9 },
    });
    const observation = {
      vector: buildIdeWhitespaceVector({
        totalDeltaPx: 3,
        maxWordDriftPx: 2,
        wordDriftsPx: [0, 1, 2],
        tolerancePx: 0.5,
      }),
      concentration: 0.95,
    };

    const anomalies = scanMemoryCells([silent, loud], observation);

    expect(anomalies.length).toBe(1);
    expect(anomalies[0].cellId).toBe('test.loud');
    expect(anomalies.every((result) => result.status === 'anomaly')).toBe(true);
  });

  it('throws PB-ERR-v1 for malformed packet input', () => {
    try {
      createMemoryCellPacket({
        id: 'bad.raw-text',
        family: 'immunity',
        vector: new Float32Array(128),
        stableContext: { content: 'raw user text must not persist' },
      });
      throw new Error('expected packet construction to fail');
    } catch (error) {
      const parsed = parseErrorForAI(error);
      expect(parsed.valid).toBe(true);
      expect(parsed.bytecode).toMatch(/^PB-ERR-v1-/);
      expect(parsed.context.subsystem).toBe('memory-cell-osmosis');
    }
  });
});
