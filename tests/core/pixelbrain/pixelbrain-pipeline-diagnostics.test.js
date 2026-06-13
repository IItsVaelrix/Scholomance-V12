/**
 * QA Validation: Operation Pipeline — canonical error taxonomy
 *
 * Regression for the opencode disparity finding: the connective-tissue
 * pipeline emitted ad-hoc diagnostic shapes (code: 'PIPELINE_STAGE_FAILED',
 * errors: [string]) while the canonical BytecodeError taxonomy existed
 * unused. Stage failures must surface as PB-ERR bytecodes so the immunity
 * scanner and diagnostics tooling can parse them.
 */

import { describe, it, expect } from 'vitest';
import { runPixelBrainOperationPipeline } from '../../../codex/core/pixelbrain/pixelbrain-operation-pipeline.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../../../codex/core/pixelbrain/bytecode-error.js';

const MINIMAL_INPUT = {
  canvas: { width: 8, height: 8 },
  coordinates: [{ x: 1, y: 1, color: '#FF0000' }],
};

describe('runPixelBrainOperationPipeline diagnostics', () => {
  it('keeps the legacy success shape for ok stages', () => {
    const result = runPixelBrainOperationPipeline({ ...MINIMAL_INPUT, stages: ['normalize'] });
    expect(result.ok).toBe(true);
    expect(result.diagnostics[0].stageId).toBe('normalize');
    expect(result.diagnostics[0].status).toBe('ok');
  });

  it('preserves a thrown BytecodeError as the diagnostic code verbatim', () => {
    const thrown = new BytecodeError(
      ERROR_CATEGORIES.RENDER,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.SHADER,
      ERROR_CODES.RENDER_FAILED,
      { reason: 'test' }
    );
    const result = runPixelBrainOperationPipeline(
      { ...MINIMAL_INPUT, stages: [{ id: 'export', options: { target: 'json' } }] },
      { exportPacket: () => { throw thrown; } }
    );

    expect(result.ok).toBe(false);
    const entry = result.diagnostics.find(d => d.status === 'error');
    expect(entry).toBeDefined();
    expect(entry.code).toBe(thrown.bytecode);
    expect(entry.code.startsWith('PB-ERR-v1')).toBe(true);
    expect(entry.errors[0]).toMatchObject({
      category: ERROR_CATEGORIES.RENDER,
      severity: ERROR_SEVERITY.CRIT,
      moduleId: MODULE_IDS.SHADER,
    });
  });

  it('wraps a plain Error into a canonical STATE/CRIT bytecode', () => {
    const result = runPixelBrainOperationPipeline(
      { ...MINIMAL_INPUT, stages: [{ id: 'export', options: { target: 'json' } }] },
      { exportPacket: () => { throw new Error('plain failure'); } }
    );

    expect(result.ok).toBe(false);
    const entry = result.diagnostics.find(d => d.status === 'error');
    expect(entry).toBeDefined();
    expect(entry.code.startsWith('PB-ERR-v1')).toBe(true);
    expect(entry.errors[0]).toMatchObject({
      category: ERROR_CATEGORIES.STATE,
      severity: ERROR_SEVERITY.CRIT,
    });
    // The human-readable message must survive the encoding
    expect(entry.message).toContain('plain failure');
  });
});
