/**
 * DIAGNOSTIC MCP HELPERS — direct unit coverage for the Phase 3 wiring.
 *
 * Verifies that the helpers under `codex/server/collab/diagnostic.mcp.js`
 * resolve, filter, and execute correctly against the real persisted reports
 * (or the empty fallback when the directory is missing).
 */

import { describe, it, expect } from 'vitest';
import {
  getLatestReport,
  getReportById,
  queryViolations,
  queryHealth,
  runCells,
  summary,
} from '../../codex/server/collab/diagnostic.mcp.js';

describe('diagnostic.mcp helpers', () => {
  describe('summary()', () => {
    it('returns a shape with reportId/summary/recentReportIds keys', async () => {
      const s = await summary();
      expect(s).toHaveProperty('reportId');
      expect(s).toHaveProperty('summary');
      expect(s).toHaveProperty('recentReportIds');
      expect(Array.isArray(s.recentReportIds)).toBe(true);
    });

    it('caps recentReportIds at 20', async () => {
      const s = await summary();
      expect(s.recentReportIds.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getLatestReport()', () => {
    it('returns null or a report with reportId + summary + checksum', async () => {
      const r = await getLatestReport();
      if (r === null) return;
      expect(r.reportId).toMatch(/^PB-DIAG-v1-/);
      expect(r.summary).toHaveProperty('totalErrors');
      expect(r.summary).toHaveProperty('totalHealth');
      expect(r.checksum).toBeDefined();
    });
  });

  describe('getReportById()', () => {
    it('rejects malformed reportId', async () => {
      await expect(getReportById({ reportId: 'not-a-real-id' })).rejects.toThrow(/Invalid reportId/);
    });

    it('returns null for a well-formed but missing reportId', async () => {
      const r = await getReportById({ reportId: 'PB-DIAG-v1-1-zzzz' });
      expect(r).toBeNull();
    });
  });

  describe('queryViolations()', () => {
    it('returns a count + violations[] shape', async () => {
      const r = await queryViolations({ severity: 'CRIT', limit: 5 });
      expect(r).toHaveProperty('count');
      expect(r).toHaveProperty('violations');
      expect(Array.isArray(r.violations)).toBe(true);
      expect(r.violations.length).toBeLessThanOrEqual(5);
    });

    it('filters by severity', async () => {
      const r = await queryViolations({ severity: 'CRIT' });
      for (const v of r.violations) {
        expect(v.severity).toBe('CRIT');
      }
    });

    it('filters by ruleId', async () => {
      const r = await queryViolations({ ruleId: 'QUANT-0101', limit: 100 });
      for (const v of r.violations) {
        expect(v.context?.ruleId).toBe('QUANT-0101');
      }
    });
  });

  describe('queryHealth()', () => {
    it('returns a count + health[] shape', async () => {
      const r = await queryHealth({ limit: 5 });
      expect(r).toHaveProperty('count');
      expect(r).toHaveProperty('health');
      expect(r.health.length).toBeLessThanOrEqual(5);
    });

    it('filters by cellId', async () => {
      const r = await queryHealth({ cellId: 'LAYER_BOUNDARY', limit: 100 });
      for (const h of r.health) {
        expect(h.cellId).toBe('LAYER_BOUNDARY');
      }
    });
  });

  describe('runCells()', () => {
    it('runs in-memory without persisting and returns a report', async () => {
      const files = [
        { path: 'codex/core/example/clean.js', content: 'export const X = 1;\n' },
      ];
      const report = await runCells({ files, cellFilter: ['LAYER_BOUNDARY'] });
      expect(report.reportId).toMatch(/^PB-DIAG-v1-/);
      expect(report.cells).toEqual(['LAYER_BOUNDARY']);
      expect(report.checksum).toBeDefined();
    });

    it('rejects non-array files', async () => {
      await expect(runCells({ files: 'oops' })).rejects.toThrow(/must be an array/);
    });
  });
});
