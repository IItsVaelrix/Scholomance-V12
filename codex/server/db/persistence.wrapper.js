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

// Statements that read from the database safely without mutating state.
// If a query doesn't match this, we aggressively assume it mutates state.
const IS_SELECT = /^\s*(?:WITH\b.*?\b)?SELECT\b/i;
const IS_READ_PRAGMA = /^\s*PRAGMA\s+[\w_]+\s*(?:;|\s*$)/i;

function isReadOnly(sql) {
    if (IS_SELECT.test(sql)) return true;
    if (IS_READ_PRAGMA.test(sql)) return true;
    // PRAGMA ... = ... is a write. Everything else is assumed write.
    return false;
}

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
                return !isReadOnly(sql) ? writeQueue.enqueue(op) : op();
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
                return writeQueue.enqueue(async () => {
                    const results = [];
                    const beginStmt = db.prepare('BEGIN');
                    const commitStmt = db.prepare('COMMIT');
                    const rollbackStmt = db.prepare('ROLLBACK');
                    
                    beginStmt.run();
                    try {
                        const txClient = {
                            execute: async (sql, params = []) => {
                                const stmt = db.prepare(sql);
                                if (stmt.reader) {
                                    const rows = stmt.all(...params);
                                    return { rows, rowsAffected: 0 };
                                }
                                const result = stmt.run(...params);
                                return {
                                    rows: [],
                                    rowsAffected: result.changes,
                                    lastInsertRowid: result.lastInsertRowid?.toString(),
                                };
                            }
                        };
                        results.push(await callback(txClient));
                        commitStmt.run();
                        return results;
                    } catch (err) {
                        if (db.inTransaction) {
                            rollbackStmt.run();
                        }
                        throw err;
                    }
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
