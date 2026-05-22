import { createClient } from '@libsql/client';
import { createWriteQueue } from './sqliteWriteQueue.js';

/**
 * Creates a unified database client wrapper that supports both synchronous
 * better-sqlite3 (local) and asynchronous @libsql/client (Turso).
 *
 * It forces an asynchronous interface for both to ensure application-level
 * consistency regardless of the underlying driver.
 *
 * All mutating operations are funnelled through a per-wrapper write queue
 * (see sqliteWriteQueue.js) so concurrent writers cannot trip SQLITE_BUSY.
 * Reads stay direct to preserve concurrency.
 */

// Statements that mutate the database — used to route libsql traffic, where the
// driver gives us no reader/writer flag the way better-sqlite3 does.
const WRITE_SQL = /^\s*(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE|VACUUM|REINDEX)\b/i;

export function createDbWrapper(options) {
    const { type, config } = options;

    if (type === 'libsql') {
        const client = createClient(config);
        const writeQueue = createWriteQueue();

        return {
            type: 'libsql',
            client,
            writeQueue,
            async execute(sql, params = []) {
                const op = async () => {
                    const result = await client.execute({ sql, args: params });
                    return {
                        rows: result.rows,
                        rowsAffected: result.rowsAffected,
                        lastInsertRowid: result.lastInsertRowid?.toString(),
                    };
                };
                return WRITE_SQL.test(sql) ? writeQueue.enqueue(op) : op();
            },
            async batch(statements) {
                return writeQueue.enqueue(() => client.batch(statements));
            },
            async transaction(callback) {
                // libsql batch is atomic by default when not in read-only mode
                // Use execute with BEGIN/COMMIT wrappers for explicit transaction
                return writeQueue.enqueue(async () => {
                    const results = [];
                    await client.execute({ sql: 'BEGIN' });
                    try {
                        results.push(await callback(client));
                        await client.execute({ sql: 'COMMIT' });
                        return results;
                    } catch (err) {
                        await client.execute({ sql: 'ROLLBACK' });
                        throw err;
                    }
                });
            },
            getWriteQueueStats() {
                return writeQueue.stats();
            },
            async close() {
                await writeQueue.drain();
                await client.close();
            }
        };
    }

    if (type === 'better-sqlite3') {
        const db = options.db; // Already instantiated Database instance
        const writeQueue = createWriteQueue();

        return {
            type: 'better-sqlite3',
            client: db,
            writeQueue,
            async execute(sql, params = []) {
                const stmt = db.prepare(sql);
                if (stmt.reader) {
                    const rows = stmt.all(...params);
                    return { rows, rowsAffected: 0 };
                }
                return writeQueue.enqueue(() => {
                    const result = stmt.run(...params);
                    return {
                        rows: [],
                        rowsAffected: result.changes,
                        lastInsertRowid: result.lastInsertRowid?.toString(),
                    };
                });
            },
            async batch(statements) {
                // simple serial execution for compatibility
                return writeQueue.enqueue(() => {
                    const results = [];
                    const transaction = db.transaction((stmts) => {
                        for (const s of stmts) {
                            const stmt = db.prepare(typeof s === 'string' ? s : s.sql);
                            const args = typeof s === 'string' ? [] : (s.args || []);
                            const result = stmt.run(...args);
                            results.push({
                                rowsAffected: result.changes,
                                lastInsertRowid: result.lastInsertRowid?.toString(),
                            });
                        }
                    });
                    transaction(statements);
                    return results;
                });
            },
            async transaction(callback) {
                return writeQueue.enqueue(() => {
                    const results = [];
                    const tx = db.transaction(() => {
                        results.push(callback(db));
                    });
                    tx();
                    return results;
                });
            },
            getWriteQueueStats() {
                return writeQueue.stats();
            },
            async close() {
                await writeQueue.drain();
                db.close();
            }
        };
    }

    throw new Error(`Unsupported database type: ${type}`);
}
