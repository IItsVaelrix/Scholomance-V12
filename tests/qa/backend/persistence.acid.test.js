import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDbWrapper } from '../../../codex/server/db/persistence.wrapper.js';

describe('ACID Persistence Wrapper', () => {
    let rawDb;
    let db;

    beforeEach(() => {
        // Use an in-memory db for testing, but it must be shared across the wrapper
        // However, in-memory DBs don't normally block concurrency the same way file DBs do, 
        // so to truly test the write queue we just verify it executes things in order
        // and safely handles async callbacks.
        rawDb = new Database(':memory:');
        rawDb.exec(`
            CREATE TABLE counter (id INTEGER PRIMARY KEY, value INTEGER);
            INSERT INTO counter (id, value) VALUES (1, 0);
        `);
        db = createDbWrapper({ type: 'better-sqlite3', db: rawDb });
    });

    afterEach(async () => {
        await db.close();
    });

    it('should serialize concurrent writes and prevent state drift', async () => {
        // We will fire 100 concurrent async writes
        const NUM_WRITES = 100;
        
        const ops = Array.from({ length: NUM_WRITES }).map(async () => {
            // Using a CTE UPDATE which would have bypassed the old regex
            return db.execute(`
                WITH current AS (SELECT value FROM counter WHERE id = 1)
                UPDATE counter SET value = (SELECT value + 1 FROM current) WHERE id = 1
            `);
        });

        await Promise.all(ops);

        const result = await db.execute('SELECT value FROM counter WHERE id = 1');
        expect(result.rows[0].value).toBe(NUM_WRITES);
        
        // Ensure the queue actually processed them
        const stats = db.getWriteQueueStats();
        expect(stats.processed).toBeGreaterThanOrEqual(NUM_WRITES);
    });

    it('should support async better-sqlite3 transactions without premature commits', async () => {
        await db.transaction(async (txClient) => {
            await txClient.execute('UPDATE counter SET value = value + 10 WHERE id = 1');
            
            // Artificial async delay to test if transaction prematurely commits
            await new Promise(resolve => setTimeout(resolve, 50));
            
            await txClient.execute('UPDATE counter SET value = value + 5 WHERE id = 1');
        });

        const result = await db.execute('SELECT value FROM counter WHERE id = 1');
        expect(result.rows[0].value).toBe(15);
    });

    it('should rollback transaction on error', async () => {
        try {
            await db.transaction(async (txClient) => {
                await txClient.execute('UPDATE counter SET value = value + 99 WHERE id = 1');
                throw new Error('Simulated failure');
            });
        } catch (err) {
            expect(err.message).toBe('Simulated failure');
        }

        const result = await db.execute('SELECT value FROM counter WHERE id = 1');
        // Should remain 0
        expect(result.rows[0].value).toBe(0);
    });
});
