import { describe, expect, it, vi } from 'vitest';
import { BytecodeError, ERROR_CODES } from '../../codex/core/pixelbrain/bytecode-error.js';
import { encodeBytecodeXPVaccineFromError } from '../../codex/core/diagnostic/BytecodeXPVaccine.js';
import { buildQbitPulseNode } from '../../codex/core/diagnostic/QbitPulse.js';
import {
  BYTECODE_XP_MEMORY_ARTIFACT_KIND,
  BYTECODE_XP_MEMORY_KEY_PREFIX,
  BYTECODE_XP_MEMORY_SCHEMA,
  buildBytecodeXPMemoryEnvelope,
  buildBytecodeXPMemoryKey,
  checksumBytecodeXPMemoryEnvelope,
  createBytecodeXPMemorySetPayload,
  persistBytecodeXPMemoryEnvelope,
  verifyBytecodeXPMemoryEnvelope,
} from '../../codex/core/diagnostic/QbitMemoryPersistence.js';

function createVaccineAndPulse() {
  const vaccine = encodeBytecodeXPVaccineFromError(new BytecodeError('VALUE', 'WARN', 'IMMUNE', ERROR_CODES.TEST_MISSING, {
    layer: 'coverage',
    sourceFile: 'codex/core/example.js',
    ruleId: 'TEST_MISSING',
  }));
  const pulse = buildQbitPulseNode(vaccine, {
    hotspots: [{ path: 'codex/core/example.js', resonance: 0.8, reason: 'same source' }],
  });
  return { vaccine, pulse };
}

describe('QbitMemoryPersistence', () => {
  it('builds deterministic BytecodeXP memory envelopes', () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const a = buildBytecodeXPMemoryEnvelope({
      vaccine,
      pulse,
      labels: ['diagnostic', 'diagnostic', 'qbit'],
    });
    const b = buildBytecodeXPMemoryEnvelope({
      vaccine,
      pulse,
      labels: ['qbit', 'diagnostic'],
    });

    expect(a).toEqual(b);
    expect(a.schema).toBe(BYTECODE_XP_MEMORY_SCHEMA);
    expect(a.artifactKind).toBe(BYTECODE_XP_MEMORY_ARTIFACT_KIND);
    expect(a.memoryKey).toBe(`${BYTECODE_XP_MEMORY_KEY_PREFIX}:${vaccine.vaccineId}`);
    expect(a.labels).toEqual(['diagnostic', 'qbit']);
    expect(verifyBytecodeXPMemoryEnvelope(a)).toBe(true);
    expect(checksumBytecodeXPMemoryEnvelope(a)).toBe(a.checksum);
  });

  it('builds stable memory keys from vaccines', () => {
    const { vaccine } = createVaccineAndPulse();

    expect(buildBytecodeXPMemoryKey(vaccine)).toBe(`${BYTECODE_XP_MEMORY_KEY_PREFIX}:${vaccine.vaccineId}`);
  });

  it('does not include volatile enrichment duration in envelope checksum', () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const stable = {
      hypothesis: 'test missing codex/core/example.js',
      hotspots: pulse.hotspots,
      metadata: {
        probe: 'cleri-probe',
        durationMs: 1.5,
        scannedFiles: 3,
        maxRuntimeMs: 250,
      },
    };
    const noisy = {
      ...stable,
      metadata: {
        ...stable.metadata,
        durationMs: 99.9,
      },
    };

    const a = buildBytecodeXPMemoryEnvelope({ vaccine, pulse, enrichment: stable });
    const b = buildBytecodeXPMemoryEnvelope({ vaccine, pulse, enrichment: noisy });

    expect(a.checksum).toBe(b.checksum);
    expect(a.enrichment.metadata.durationMs).toBeUndefined();
  });

  it('creates MCP memory set payloads without writing by default', () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const envelope = buildBytecodeXPMemoryEnvelope({ vaccine, pulse });
    const payload = createBytecodeXPMemorySetPayload(envelope, { agentId: 'codex' });

    expect(payload).toEqual({
      agent_id: 'codex',
      key: envelope.memoryKey,
      value: envelope,
    });
  });

  it('persists through an injected memory client only', async () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const memoryClient = {
      set: vi.fn(async payload => ({ stored: true, key: payload.key })),
    };
    const result = await persistBytecodeXPMemoryEnvelope(memoryClient, { vaccine, pulse }, { agentId: 'codex' });

    expect(memoryClient.set).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      dryRun: false,
      result: { stored: true, key: result.payload.key },
    });
    expect(verifyBytecodeXPMemoryEnvelope(result.payload.value)).toBe(true);
  });

  it('supports dry-run persistence payload generation', async () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const memoryClient = {
      set: vi.fn(),
    };
    const result = await persistBytecodeXPMemoryEnvelope(memoryClient, { vaccine, pulse }, { dryRun: true });

    expect(memoryClient.set).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(verifyBytecodeXPMemoryEnvelope(result.payload.value)).toBe(true);
  });

  it('rejects missing clients and invalid pulse checksums', async () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    await expect(persistBytecodeXPMemoryEnvelope(null, { vaccine, pulse })).rejects.toThrow(/injected memoryClient/);

    const invalidPulse = { ...pulse, checksum: 'bad' };
    expect(() => buildBytecodeXPMemoryEnvelope({ vaccine, pulse: invalidPulse })).toThrow(/valid QBIT pulse/);
  });

  it('freezes envelopes deeply', () => {
    const { vaccine, pulse } = createVaccineAndPulse();
    const envelope = buildBytecodeXPMemoryEnvelope({ vaccine, pulse });

    expect(() => { envelope.vaccine.vaccineId = 'mutated'; }).toThrow();
    expect(() => { envelope.pulse.hotspots[0].path = 'mutated.js'; }).toThrow();
  });
});
