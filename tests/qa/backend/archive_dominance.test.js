import { describe, it, expect, beforeAll } from 'vitest';
import { collabService } from '../../../codex/server/collab/collab.service.js';
import { collabPersistence } from '../../../codex/server/collab/collab.persistence.js';

describe('Archive of Dominance - Backend Verification', () => {
    it('should archive all tasks', async () => {
        // Create a dummy task
        const task = await collabService.createTask({
            title: 'Test Task for Archiving',
            created_by: 'tester'
        });
        
        expect(task.status).not.toBe('archived');
        
        const result = await collabService.archiveAllTasks('tester-agent');
        expect(result.ok).toBe(true);
        
        const archivedTask = await collabService.getTask(task.id);
        expect(archivedTask.status).toBe('archived');
    });

    it('should list codebase files', async () => {
        const files = await collabService.listCodebaseFiles();
        expect(Array.isArray(files)).toBe(true);
    });

    it('should perform hybrid search', async () => {
        const results = await collabService.searchHybrid('task');
        expect(results).toHaveProperty('literal');
        expect(results).toHaveProperty('semantic');
        expect(results).toHaveProperty('phonetic');
        expect(results).toHaveProperty('linkedDocs');
    }, 30000);

    it('should find file neighbors', async () => {
        const files = await collabService.listCodebaseFiles();
        if (files.length > 0) {
            const neighbors = await collabService.getFileNeighbors(files[0]);
            expect(neighbors).toHaveProperty('semantic');
            expect(neighbors).toHaveProperty('phonetic');
            expect(neighbors).toHaveProperty('linkedDocs');
        }
    });
});
