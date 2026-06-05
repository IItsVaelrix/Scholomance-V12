import { describe, expect, it, vi } from 'vitest';
import { runDiagnostic } from '../../codex/core/diagnostic/diagnostic-runner.js';
import { verifyReport } from '../../codex/core/diagnostic/DiagnosticReport.js';
import { buildDiagnosticMemoryArtifacts, runDiagnosticMemoryInfusion } from '../../codex/core/diagnostic/diagnostic-memory-infusion.js';
import { BytecodeError, ERROR_CODES } from '../../codex/core/pixelbrain/bytecode-error.js';
import { encodeBytecodeHealth } from '../../codex/core/diagnostic/BytecodeHealth.js';
import { verifyBytecodeXPMemoryEnvelope } from '../../codex/core/diagnostic/QbitMemoryPersistence.js';

const VIOLATION_FILE = {
  content: 'const x = Math.random();\n',
  path: 'codex/core/analysis/score.js',
};

describe('diagnostic memory infusion', () => {
  it('writes BytecodeXP/QBIT memory envelopes during opt-in scans', async () => {
    const memoryClient = {
      set: vi.fn(async memoryPayload => ({ stored: true, key: memoryPayload.key })),
    };

    const report = await runDiagnostic({
      snapshot: { root: '/fake/project', timestamp: 1 },
      files: [VIOLATION_FILE],
      commitHash: 'test',
      trigger: 'test',
      cellFilter: ['IMMUNITY_SCAN'],
      memoryInfusion: {
        enabled: true,
        memoryClient,
        maxArtifacts: 4,
        agentId: 'test-diagnostic',
      },
    });

    expect(report.memoryInfusion).toMatchObject({
      enabled: true,
      dryRun: false,
      requestedArtifacts: 1,
      written: 1,
      failed: 0,
    });
    expect(memoryClient.set).toHaveBeenCalledTimes(1);
    const payload = memoryClient.set.mock.calls[0][0];
    expect(payload.agent_id).toBe('test-diagnostic');
    expect(payload.key).toMatch(/^scholomance:bytecode-xp:PB-XP-v1-/);
    expect(verifyBytecodeXPMemoryEnvelope(payload.value)).toBe(true);
    expect(verifyReport(report).valid).toBe(true);
  });

  it('produces replayable dry-run payloads when no memory client is injected', async () => {
    const report = await runDiagnostic({
      snapshot: { root: '/fake/project', timestamp: 1 },
      files: [VIOLATION_FILE],
      commitHash: 'test',
      trigger: 'test',
      cellFilter: ['IMMUNITY_SCAN'],
      memoryInfusion: {
        enabled: true,
        maxArtifacts: 4,
      },
    });

    expect(report.memoryInfusion.dryRun).toBe(true);
    expect(report.memoryInfusion.writes[0].payload).toMatchObject({
      key: report.memoryInfusion.writes[0].memoryKey,
      value: {
        schema: 'SCHOL-BYTXP-MEM-v1',
      },
    });
  });

  it('can include passing health signals when requested', async () => {
    const result = {
      cellId: 'FIXTURE_SHAPE',
      errors: [],
      health: [encodeBytecodeHealth('FIXTURE_SHAPE', 'fixture-clean', {
        moduleId: 'tests/example.test.js',
      })],
      skipped: [],
    };
    const summary = await runDiagnosticMemoryInfusion([result], {
      enabled: true,
      includePassing: true,
      maxArtifacts: 2,
    });

    expect(summary.requestedArtifacts).toBe(1);
    expect(summary.writes[0].sourceKind).toBe('health');
    expect(verifyBytecodeXPMemoryEnvelope(summary.writes[0].payload.value)).toBe(true);
  });

  it('caps memory artifacts deterministically', () => {
    const errors = [0, 1, 2].map(i => new BytecodeError('VALUE', 'WARN', 'IMMUNE', ERROR_CODES.TEST_MISSING, {
      sourceFile: `codex/core/${i}.js`,
      ruleId: 'TEST_MISSING',
    }));
    const artifacts = buildDiagnosticMemoryArtifacts([{
      cellId: 'IMMUNITY_SCAN',
      errors,
      health: [],
      skipped: [],
    }], {
      enabled: true,
      maxArtifacts: 2,
    });

    expect(artifacts).toHaveLength(2);
    expect(artifacts.map(a => a.sourceId)).toEqual([
      'TEST_MISSING:codex/core/0.js',
      'TEST_MISSING:codex/core/1.js',
    ]);
  });
});
