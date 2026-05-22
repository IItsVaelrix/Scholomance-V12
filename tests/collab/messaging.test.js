import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';

let collabService;
let CollabServiceError;
let collabPersistence;
let testDbPath;

beforeAll(async () => {
    testDbPath = path.join(
        os.tmpdir(),
        `scholomance_messaging_test_${Date.now()}_${process.pid}.sqlite`,
    );

    process.env.COLLAB_DB_PATH = testDbPath;
    vi.resetModules();

    const serviceMod = await import('../../codex/server/collab/collab.service.js?test=messaging');
    const persistenceMod = await import('../../codex/server/collab/collab.persistence.js');

    collabService = serviceMod.collabService;
    CollabServiceError = serviceMod.CollabServiceError;
    collabPersistence = persistenceMod.collabPersistence;

    // Register agents for testing
    await collabService.registerAgent({
        id: 'merlin-1',
        name: 'Merlin One',
        role: 'backend',
    });
    await collabService.registerAgent({
        id: 'arthur-2',
        name: 'Arthur Two',
        role: 'ui',
    });
});

afterAll(async () => {
    if (collabPersistence?.close) {
        await collabPersistence.close();
    }
    if (existsSync(testDbPath)) {
        try {
            rmSync(testDbPath);
        } catch (e) {
            // ignore
        }
    }
});

describe('[services] Cognitive Bus Messaging', () => {
    describe('sendMessage', () => {
        it('persists a message when auth matches sender_id', async () => {
            const input = {
                sender_id: 'merlin-1',
                text: 'Hello from Merlin',
                glyph: '✦'
            };
            const msg = await collabService.sendMessage(input, 'merlin-1');
            
            expect(msg.id).toBeDefined();
            expect(msg.sender_id).toBe('merlin-1');
            expect(msg.text).toBe('Hello from Merlin');
            
            const fetched = await collabService.listMessages({ sender: 'merlin-1' });
            expect(fetched.some(m => m.id === msg.id)).toBe(true);
        });

        it('throws AUTH_SENDER_MISMATCH when auth does not match sender_id', async () => {
            const input = {
                sender_id: 'merlin-1',
                text: 'Spoofed message',
            };
            
            await expect(collabService.sendMessage(input, 'arthur-2'))
                .rejects.toThrow(/Authentication required and must match sender_id/);
        });

        it('throws AUTH_SENDER_MISMATCH when authenticatedAgentId is missing (fail-closed)', async () => {
            const input = {
                sender_id: 'merlin-1',
                text: 'Unauthenticated message',
            };
            
            await expect(collabService.sendMessage(input, null))
                .rejects.toThrow(/Authentication required and must match sender_id/);
        });

        it('verifies sender and target existence', async () => {
            const input = {
                sender_id: 'non-existent',
                text: 'Ghost message',
            };
            
            // Even if auth matches, sender must exist in registry
            await expect(collabService.sendMessage(input, 'non-existent'))
                .rejects.toThrow(/Agent not found/);
        });
    });

    describe('deleteMessage', () => {
        it('deletes a message and logs activity', async () => {
            const msg = await collabService.sendMessage({
                sender_id: 'arthur-2',
                text: 'To be deleted'
            }, 'arthur-2');
            
            const result = await collabService.deleteMessage(msg.id, 'arthur-2');
            expect(result.ok).toBe(true);
            
            const fetched = await collabService.listMessages();
            expect(fetched.some(m => m.id === msg.id)).toBe(false);
        });
    });

    describe('is_telepathic removal', () => {
        it('does not store is_telepathic field', async () => {
            const msg = await collabService.sendMessage({
                sender_id: 'merlin-1',
                text: 'Sync test',
                is_telepathic: true // Should be ignored or stripped by schema/service
            }, 'merlin-1');
            
            expect(msg.is_telepathic).toBeUndefined();
        });
    });
});
