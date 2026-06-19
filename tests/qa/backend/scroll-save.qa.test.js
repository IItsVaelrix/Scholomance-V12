/**
 * QA: Scroll Save Pipeline
 *
 * Tests the full server-side scroll persistence surface:
 *   - create (new scroll)
 *   - upsert (autosave / re-save)
 *   - submit flag → submittedAt locked on first submit
 *   - cross-user ID collision guard (security)
 *   - delete
 *   - list ordering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runSqliteMigrations } from '../../../codex/server/db/sqlite.migrations.js';
import { createDbWrapper } from '../../../codex/server/db/persistence.wrapper.js';

// ── Mirror the migration subset needed for scrolls ────────────────────────
const SCROLL_MIGRATIONS = [
  {
    version: 1,
    name: 'create_users_table',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 2,
    name: 'create_scrolls_table',
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS scrolls (
          id TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id)
        );
      `);
    },
  },
  {
    version: 3,
    name: 'add_scroll_submittedAt',
    up(database) {
      const hasCol = (table, col) =>
        database.prepare(`PRAGMA table_info("${table}")`).all().some(c => c.name === col);
      if (!hasCol('scrolls', 'submittedAt')) {
        database.exec('ALTER TABLE scrolls ADD COLUMN submittedAt DATETIME');
      }
    },
  },
];

// ── Inline scroll CRUD (mirrors user.persistence.js logic) ────────────────

function buildScrollOps(db) {
  async function getScroll(scrollId, userId) {
    const r = await db.execute('SELECT * FROM scrolls WHERE id = ? AND userId = ?', [scrollId, userId]);
    return r.rows[0] || null;
  }

  async function getScrolls(userId) {
    const r = await db.execute(
      'SELECT id, title, content, createdAt, updatedAt, submittedAt FROM scrolls WHERE userId = ? ORDER BY updatedAt DESC',
      [userId],
    );
    return r.rows;
  }

  async function saveScroll(scrollId, userId, { title, content, submit = false }) {
    const now = new Date().toISOString();
    const existing = await getScroll(scrollId, userId);
    const createdAt = existing?.createdAt || now;
    const submittedAt = existing?.submittedAt || (submit ? now : null);

    await db.execute(`
      INSERT INTO scrolls (id, userId, title, content, createdAt, updatedAt, submittedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        updatedAt = excluded.updatedAt,
        submittedAt = excluded.submittedAt
      WHERE scrolls.userId = excluded.userId
    `, [scrollId, userId, title, content, createdAt, now, submittedAt]);

    return await getScroll(scrollId, userId);
  }

  async function deleteScroll(scrollId, userId) {
    const r = await db.execute('DELETE FROM scrolls WHERE id = ? AND userId = ?', [scrollId, userId]);
    return r.rowsAffected > 0;
  }

  return { getScroll, getScrolls, saveScroll, deleteScroll };
}

// ── Test scaffolding ───────────────────────────────────────────────────────

let rawDb, db, ops;
let userA, userB;

beforeEach(async () => {
  rawDb = new Database(':memory:');
  runSqliteMigrations(rawDb, { namespace: 'test', migrations: SCROLL_MIGRATIONS });
  db = createDbWrapper({ type: 'better-sqlite3', db: rawDb });
  ops = buildScrollOps(db);

  rawDb.prepare(`INSERT INTO users (username, email, password) VALUES ('alice', 'alice@test.com', 'x')`).run();
  rawDb.prepare(`INSERT INTO users (username, email, password) VALUES ('bob', 'bob@test.com', 'x')`).run();
  userA = rawDb.prepare(`SELECT id FROM users WHERE username = 'alice'`).get().id;
  userB = rawDb.prepare(`SELECT id FROM users WHERE username = 'bob'`).get().id;
});

afterEach(async () => {
  await db.close();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('scroll save — QA', () => {
  it('creates a new scroll', async () => {
    const saved = await ops.saveScroll('scroll-1', userA, { title: 'First', content: 'Hello world', submit: false });
    expect(saved).not.toBeNull();
    expect(saved.id).toBe('scroll-1');
    expect(saved.title).toBe('First');
    expect(saved.content).toBe('Hello world');
    expect(saved.submittedAt).toBeNull();
    expect(saved.userId).toBe(userA);
  });

  it('upserts (autosave) without changing submittedAt', async () => {
    await ops.saveScroll('scroll-2', userA, { title: 'Draft', content: 'v1', submit: false });
    const updated = await ops.saveScroll('scroll-2', userA, { title: 'Draft', content: 'v2', submit: false });
    expect(updated.content).toBe('v2');
    expect(updated.submittedAt).toBeNull();
  });

  it('sets submittedAt on first submit and locks it on subsequent saves', async () => {
    await ops.saveScroll('scroll-3', userA, { title: 'Poem', content: 'verse', submit: false });
    const submitted = await ops.saveScroll('scroll-3', userA, { title: 'Poem', content: 'verse', submit: true });
    expect(submitted.submittedAt).not.toBeNull();

    const ts = submitted.submittedAt;
    await new Promise(r => setTimeout(r, 10));

    // Re-save with submit:true must NOT move submittedAt forward
    const resaved = await ops.saveScroll('scroll-3', userA, { title: 'Poem', content: 'verse v2', submit: true });
    expect(resaved.submittedAt).toBe(ts);
  });

  it('lists scrolls in updatedAt DESC order', async () => {
    await ops.saveScroll('old', userA, { title: 'Old', content: '', submit: false });
    await new Promise(r => setTimeout(r, 5));
    await ops.saveScroll('new', userA, { title: 'New', content: '', submit: false });

    const list = await ops.getScrolls(userA);
    expect(list[0].id).toBe('new');
    expect(list[1].id).toBe('old');
  });

  it('deletes a scroll belonging to the requesting user', async () => {
    await ops.saveScroll('del-1', userA, { title: 'Gone', content: '', submit: false });
    const deleted = await ops.deleteScroll('del-1', userA);
    expect(deleted).toBe(true);
    expect(await ops.getScroll('del-1', userA)).toBeNull();
  });

  it('refuses to delete a scroll belonging to another user', async () => {
    await ops.saveScroll('del-2', userA, { title: 'Alice', content: '', submit: false });
    const deleted = await ops.deleteScroll('del-2', userB);
    expect(deleted).toBe(false);
    // Alice's scroll untouched
    expect(await ops.getScroll('del-2', userA)).not.toBeNull();
  });

  // ── Security: cross-user ID collision guard ──────────────────────────────

  it('does NOT overwrite another user scroll when IDs collide', async () => {
    const SHARED_ID = 'collision-id';
    await ops.saveScroll(SHARED_ID, userA, { title: 'Alice scroll', content: 'secret', submit: false });

    // Bob tries to claim / overwrite Alice's scroll ID
    const bobResult = await ops.saveScroll(SHARED_ID, userB, { title: 'Bob hijack', content: 'hacked', submit: false });

    // Bob gets null back — the ID belongs to Alice
    expect(bobResult).toBeNull();

    // Alice's content is intact
    const aliceScroll = await ops.getScroll(SHARED_ID, userA);
    expect(aliceScroll.title).toBe('Alice scroll');
    expect(aliceScroll.content).toBe('secret');
    expect(aliceScroll.userId).toBe(userA);
  });

  it('does not surface another user\'s scroll in getScrolls', async () => {
    await ops.saveScroll('a-only', userA, { title: 'Alice', content: '', submit: false });
    await ops.saveScroll('b-only', userB, { title: 'Bob', content: '', submit: false });

    const aliceList = await ops.getScrolls(userA);
    const bobList   = await ops.getScrolls(userB);

    expect(aliceList.map(s => s.id)).toEqual(['a-only']);
    expect(bobList.map(s => s.id)).toEqual(['b-only']);
  });

  it('preserves createdAt across upserts', async () => {
    const first = await ops.saveScroll('ts-1', userA, { title: 'T', content: 'v1', submit: false });
    const created = first.createdAt;
    await new Promise(r => setTimeout(r, 10));
    const second = await ops.saveScroll('ts-1', userA, { title: 'T', content: 'v2', submit: false });
    expect(second.createdAt).toBe(created);
    expect(second.updatedAt).not.toBe(created);
  });
});
