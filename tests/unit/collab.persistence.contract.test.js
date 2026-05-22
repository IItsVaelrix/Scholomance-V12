import { describe, it, expect } from 'vitest';
import { collabPersistence } from '../../codex/server/collab/collab.persistence.js';

const PERSISTENCE_CONTRACT = [
    'agents.register', 'agents.heartbeat', 'agents.offline', 'agents.getAll', 'agents.getAllRaw', 'agents.getById',
    'agents.unassignTasks', 'agents.delete',
    'tasks.create', 'tasks.getAll', 'tasks.getById', 'tasks.getCounts', 'tasks.update',
    'tasks.assignWithLocks', 'tasks.delete',
    'bug_reports.create', 'bug_reports.getAll', 'bug_reports.getById',
    'bug_reports.update', 'bug_reports.delete',
    'pipelines.create', 'pipelines.getAll', 'pipelines.getById',
    'pipelines.getCounts', 'pipelines.advance', 'pipelines.fail',
    'activity.log', 'activity.getRecent',
    'memories.set', 'memories.get', 'memories.getAll', 'memories.delete',
    'agent_keys.create', 'agent_keys.getAll', 'agent_keys.getByAgentId',
    'agent_keys.getById', 'agent_keys.revoke', 'agent_keys.revokeAll',
    'agent_keys.delete', 'agent_keys.expire',
    'ledger.getById', 'ledger.ingest', 'ledger.updateStatus', 'ledger.list',
    'locks.acquire', 'locks.release', 'locks.releaseForAgent',
    'locks.releaseForTask', 'locks.check', 'locks.getAll', 'locks.updateMcp',
    'close', 'getStatus',
];

describe('Collab Persistence Contract', () => {
    PERSISTENCE_CONTRACT.forEach(path => {
        it(`should have method: ${path}`, () => {
            const parts = path.split('.');
            let current = collabPersistence;
            for (const part of parts) {
                current = current?.[part];
            }
            expect(typeof current).toBe('function');
        });
    });
});
