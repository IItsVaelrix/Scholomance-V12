// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';
import {
    encodeBytecodeError,
    ERROR_CATEGORIES,
    ERROR_SEVERITY,
    MODULE_IDS,
} from '../../codex/core/pixelbrain/bytecode-error.js';

let collabDiagnostic;
let collabPersistence;
let testDbPath;

beforeAll(async () => {
    testDbPath = path.join(
        os.tmpdir(),
        `scholomance_collab_diagnostic_${Date.now()}_${process.pid}.sqlite`,
    );

    process.env.COLLAB_DB_PATH = testDbPath;
    vi.resetModules();

    const diagnosticMod = await import('../../codex/server/collab/collab.diagnostic.js?test=collab-diagnostic');
    const persistenceMod = await import('../../codex/server/collab/collab.persistence.js?test=collab-diagnostic');

    collabDiagnostic = diagnosticMod.collabDiagnostic;
    collabPersistence = persistenceMod.collabPersistence;
});

afterAll(() => {
    try {
        collabPersistence?.close?.();
    } catch {
        // Best-effort close for test cleanup.
    }

    for (const suffix of ['', '-wal', '-shm']) {
        const candidate = `${testDbPath}${suffix}`;
        if (existsSync(candidate)) {
            try {
                rmSync(candidate, { force: true });
            } catch {
                // Ignore cleanup errors in test environment.
            }
        }
    }
});

describe('collab diagnostic', () => {
    it('completes and emits bytecode findings for async persistence-backed ghost state', async () => {
        await collabPersistence.agents.register({
            id: 'diag-agent',
            name: 'Diagnostic Agent',
            role: 'backend',
            capabilities: ['diagnostics'],
        });

        await collabPersistence.tasks.create({
            id: 'diag-task',
            title: 'Ghost assignment fixture',
            description: 'Seeds a ghost assigned_agent invariant',
            priority: 1,
            file_paths: [],
            depends_on: [],
            created_by: 'test',
        });
        await collabPersistence.tasks.update('diag-task', {
            assigned_agent: 'ghost-agent',
        });

        await collabPersistence.locks.acquire({
            file_path: 'src/pages/Read/ReadPage.jsx',
            agent_id: 'ghost-agent',
            task_id: null,
            ttl_minutes: 30,
        });

        await collabPersistence.bug_reports.create({
            id: 'diag-bug',
            title: 'Checksum mismatch fixture',
            source_type: 'qa',
            bytecode: encodeBytecodeError(
                ERROR_CATEGORIES.STATE,
                ERROR_SEVERITY.WARN,
                MODULE_IDS.SHARED,
                0x0301,
                { fixture: true },
            ),
            checksum_verified: 0,
        });

        const result = await collabDiagnostic.scan();

        expect(result.summary.status).toBe('INFECTED');
        expect(result.summary.pixelbrain_error_count).toBeGreaterThanOrEqual(3);
        expect(Array.isArray(result.pixelbrain)).toBe(true);
        expect(result.pixelbrain.every(entry => typeof entry === 'string')).toBe(true);
        expect(result.pixelbrain.every(entry => entry.startsWith('PB-ERR-v1-'))).toBe(true);
    });
});
