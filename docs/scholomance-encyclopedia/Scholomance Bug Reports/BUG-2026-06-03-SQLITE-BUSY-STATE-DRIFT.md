# BUG-2026-06-03-SQLITE-BUSY-STATE-DRIFT

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-TEMPLATE`

## Bug Description
The application suffered from intermittent `SQLITE_BUSY` errors and database state drift during heavy parallel mutation workloads (e.g., from Collab agents, pipeline pressure, and reapers). Even though a SQLite write serialization queue (`sqliteWriteQueue.js`) was nominally implemented, certain concurrent operations continued to overlap and fracture state.

## Root Cause
The bug was a multi-layered failure in the database wrapper (`codex/server/db/persistence.wrapper.js`):
1. **Flawed Mutation Detection (`libsql`)**: The Turso/libsql branch relied on a `WRITE_SQL` regex `(?:INSERT|UPDATE|DELETE|...)` to decide whether to enqueue queries. This regex failed to catch Common Table Expressions (`WITH ... UPDATE`), pragmas, and complex statements, causing these mutations to bypass the serialization queue entirely.
2. **Synchronous Transactions (`better-sqlite3`)**: The local branch executed `db.transaction(callback)` synchronously. If an asynchronous callback was passed, the transaction instantly committed the closure before any internal promises resolved, completely destroying atomicity.

## Thought Process
1. **First observation**: The `cleri:probe` Antigen successfully matched "unserialized SQLite mutations persistence wrapper state drift" against `persistence.wrapper.js` with an extremely high resonance (101.6%).
2. **Investigation path**: 
   - Audited `persistence.wrapper.js` to see why the `sqliteWriteQueue` wasn't working.
   - Identified the `WRITE_SQL` regex bypass issue.
   - Investigated how `better-sqlite3` handled `.transaction()` and discovered it natively ignores promises.
3. **Solution derived**:
   - Instead of trying to regex-match every possible write verb, invert the logic: `isReadOnly()` checks if the query is strictly a `SELECT` or a read-only `PRAGMA`. Everything else is assumed to be a mutation and queued.
   - Replace the native `db.transaction()` wrapper with explicit `BEGIN`, `COMMIT`, and `ROLLBACK` SQL executions running sequentially inside the Promise-based `writeQueue`, preserving async atomicity.
   - Create ACID unit tests to mathematically prove the queue correctly handles 100 concurrent async writes without a single `SQLITE_BUSY` error.

## Changes Made

| File | Lines Changed | Rationale |
|------|---------------|-----------|
| `codex/server/db/persistence.wrapper.js` | ~30 | Replaced `WRITE_SQL` with `isReadOnly`, replaced `db.transaction` with explicit async boundaries |
| `tests/qa/backend/persistence.acid.test.js` | ~60 (NEW) | Added aggressive ACID concurrency unit tests for the write queue |

## Testing

1. Created `persistence.acid.test.js`.
2. Fired 100 concurrent asynchronous CTE (`WITH ... UPDATE`) mutations.
3. Fired asynchronous transactions with internal artificial delays.
4. Ran `npx vitest run tests/qa/backend/persistence.acid.test.js` - successful test pass (0 `SQLITE_BUSY` errors, perfect final integer states).

## Lessons Learned

1. **Never use regex to detect writes:** SQL is too complex for basic regex `(INSERT|UPDATE)`. It is much safer to assume any query is a mutation unless it is structurally proven to be a read-only `SELECT` or `PRAGMA`.
2. **Know your underlying driver limits:** `better-sqlite3` is fundamentally synchronous. Passing `async/await` into its native `.transaction()` closure creates silent, devastating failures by committing instantly. You must orchestrate manual `BEGIN` and `COMMIT` commands when bridging to an asynchronous queue.
3. **Antigens work:** Using semantic vector scanning (`cleri:probe`) was highly effective at narrowing down the structural anomaly based strictly on a natural language hypothesis.

---

*Entry Status: FIXED | Last Updated: 2026-06-03*
