/**
 * IMMUNITY SERVICE
 * 
 * Server-side orchestrator for the Scholomance Immune System.
 */

import { scanInnate } from '../../core/immunity/innate.scanner.js';
import { scanAdaptive } from '../../core/immunity/adaptive.scanner.js';
import { emitViolationError } from '../../core/immunity/inflammatoryResponse.js';

export async function createImmunityService({ log, db }) {
  return {
    /**
     * Executes a full multi-layer scan on a file.
     */
    async scanFile(content, filePath, options = {}) {
      const { runAdaptive = false, throwOnError = false } = options;
      
      log?.info?.({ filePath }, '[Immunity] Initiating scan.');
      
      const innateViolations = scanInnate(content, filePath);
      
      // Heuristic: Layer 1 flags trigger Layer 2 (Adaptive)
      let adaptiveViolations = [];
      if (runAdaptive || innateViolations.length > 0) {
        adaptiveViolations = await scanAdaptive(content);
      }
      
      const result = {
        filePath,
        innate: innateViolations,
        adaptive: adaptiveViolations,
        timestamp: new Date().toISOString()
      };

      if (throwOnError && (innateViolations.length > 0 || adaptiveViolations.length > 0)) {
        const first = innateViolations[0] || adaptiveViolations[0];
        emitViolationError(first, filePath);
      }

      return result;
    },

    /**
     * Retrieves the global status of the immune system.
     */
    async getStatus() {
      // Mocked until DB integration
      return {
        innate: {
          enabled: true,
          rulesetVersion: '1.0.0',
          last24h: { scans: 42, blocks: 3, avgLatencyMs: 12 }
        },
        adaptive: {
          enabled: true,
          pathogenCount: 3,
          last24h: { scans: 15, blocks: 1, avgLatencyMs: 45 }
        },
        override: {
          last30d: []
        }
      };
    }
  };
}
