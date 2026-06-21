import { describe, it, expect } from 'vitest';
import {
  runImmuneScan,
  scanInvariants,
  INVARIANTS,
} from '../../codex/core/diagnostic/truesightImmuneProbe.js';
import { HEALTH_CODES } from '../../codex/core/diagnostic/diagnostic-constants.js';

function node(i, charStart, token, { left, width, styleLeft = left, styleWidth = width, lineIndex = 0, hasBox = true } = {}) {
  return {
    index: i, charStart, token, lineIndex, isWord: true,
    styleLeft, styleWidth, styleHeight: 30,
    rectLeft: left, rectTop: lineIndex * 30, rectWidth: width, rectHeight: 30,
    hasBox, boxWidth: width, boxHeight: 30,
  };
}

const healthy = {
  ok: true, shellCount: 3, lineCount: 1,
  nodes: [
    node(0, 0, 'Alpha', { left: 0, width: 50 }),
    node(1, 6, 'beta', { left: 60, width: 40 }),
    node(2, 11, 'gamma', { left: 110, width: 50 }),
  ],
};

describe('TrueSight Immune Probe — invariant scan', () => {
  it('reports a healthy lattice as zero distress', () => {
    const report = runImmuneScan(healthy, { expectedWordCount: 3 });
    expect(report.healthy).toBe(true);
    expect(report.distress).toHaveLength(0);
    expect(report.redExosomeCount).toBe(0);
    expect(report.rootNode).toBeNull();
  });

  it('detects collapse (zero-width box) via I2', () => {
    const collapsed = {
      ok: true, shellCount: 1, lineCount: 1,
      nodes: [node(0, 0, 'Alpha', { left: 0, width: 0 })],
    };
    const violations = scanInvariants(collapsed.nodes, { expectedWordCount: 1 });
    expect(violations.some((v) => v.invariant.id === INVARIANTS.FINITE_POSITIVE.id)).toBe(true);
  });

  it('detects "only the first word rendered" via I3 and names a root node', () => {
    const onlyFirst = {
      ok: true, shellCount: 1, lineCount: 1,
      nodes: [node(0, 0, 'Alpha', { left: 0, width: 50 })],
    };
    const report = runImmuneScan(onlyFirst, { expectedWordCount: 3 });
    expect(report.healthy).toBe(false);
    expect(report.distress.some((d) => d.invariant === INVARIANTS.SHELL_PER_WORD.id)).toBe(true);
    expect(report.rootNode).not.toBeNull();
    expect(report.antibody).not.toBeNull();
    expect(report.antibody.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('detects boxes stacked on the first word (overlap) via I1', () => {
    const stacked = {
      ok: true, shellCount: 3, lineCount: 1,
      nodes: [
        node(0, 0, 'Alpha', { left: 0, width: 50 }),
        node(1, 6, 'beta', { left: 0, width: 50 }),
        node(2, 11, 'gamma', { left: 0, width: 50 }),
      ],
    };
    const report = runImmuneScan(stacked, { expectedWordCount: 3 });
    expect(report.distress.some((d) => d.invariant === INVARIANTS.MONOTONIC_NONOVERLAP.id)).toBe(true);
    expect(report.peakCell).not.toBeNull();
  });

  it('detects style↔layout desync via I4', () => {
    const desync = {
      ok: true, shellCount: 2, lineCount: 1,
      nodes: [
        node(0, 0, 'Alpha', { left: 0, width: 50, styleLeft: 0 }),
        // overlay wrote left:60 but the browser laid it out at 80 (drift)
        node(1, 6, 'beta', { left: 80, width: 40, styleLeft: 60 }),
      ],
    };
    const violations = scanInvariants(desync.nodes, { expectedWordCount: 2 });
    expect(violations.some((v) => v.invariant.id === INVARIANTS.STYLE_LAYOUT_AGREEMENT.id)).toBe(true);
  });

  it('produces deterministic exosome RNA (same input → same checksums)', () => {
    const a = runImmuneScan(healthy, { expectedWordCount: 3 });
    const b = runImmuneScan(healthy, { expectedWordCount: 3 });
    expect(a.exosomes.map((e) => e.checksum)).toEqual(b.exosomes.map((e) => e.checksum));
    expect(a.exosomes[0].code).toBe(HEALTH_CODES.TRUESIGHT_NODE_HEALTHY);
  });
});
