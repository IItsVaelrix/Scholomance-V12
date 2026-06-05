import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  applyCatalogV18,
  applyCatalogV19,
  applyCatalogV20,
  TRACK_MUSICAL_META_ALTERS,
} from '../../codex/server/catalog/catalog.schema.js';

/**
 * Hermetic schema test for migration v18 (lyrics + annotations + track musical
 * metadata). Applies the *shipped* DDL constants to an in-memory SQLite db, so
 * the migration and this test can never drift. No server boot, no env, no file.
 */
function freshDbWithTracks() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  // Minimal prerequisites: tracks (the FK target) needs to exist.
  db.exec(`
    CREATE TABLE tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL
    );
    INSERT INTO tracks (id, release_id, position, title) VALUES (1, 1, 1, 'Echoes of the Veil');
  `);
  return db;
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

describe('[Server] catalog schema v18 (lyrics + annotations + track meta)', () => {
  let db;
  beforeEach(() => {
    db = freshDbWithTracks();
    applyCatalogV18(db);
  });

  it('adds bpm / musical_key / genre columns to tracks', () => {
    const cols = columnNames(db, 'tracks');
    expect(cols).toEqual(expect.arrayContaining(['bpm', 'musical_key', 'genre']));
    expect(TRACK_MUSICAL_META_ALTERS).toHaveLength(3);
  });

  it('is idempotent — re-applying tolerates duplicate columns', () => {
    expect(() => applyCatalogV18(db)).not.toThrow();
  });

  it('stores timed lyric lines with optional word-level timing', () => {
    db.prepare(
      'INSERT INTO track_lyrics (track_id, line_index, start_ms, end_ms, text, words_json) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(1, 4, 138000, 141000, 'Through the veil, the echoes call', JSON.stringify([{ t: 138000, d: 400, w: 'Through' }]));
    const row = db.prepare('SELECT * FROM track_lyrics WHERE track_id = 1 AND line_index = 4').get();
    expect(row.text).toContain('echoes call');
    expect(JSON.parse(row.words_json)[0].w).toBe('Through');
  });

  it('enforces one lyric row per (track, line_index)', () => {
    const ins = db.prepare('INSERT INTO track_lyrics (track_id, line_index, text) VALUES (1, 0, ?)');
    ins.run('first');
    expect(() => ins.run('dupe')).toThrow(/UNIQUE/i);
  });

  it('stores line-anchored annotations', () => {
    db.prepare(
      'INSERT INTO track_annotations (track_id, start_line, end_line, title, body) VALUES (?, ?, ?, ?, ?)',
    ).run(1, 4, 4, 'Echoes Call', "The 'veil' is the threshold between the known and forgotten.");
    const row = db.prepare('SELECT * FROM track_annotations WHERE track_id = 1').get();
    expect(row.title).toBe('Echoes Call');
    expect(row.start_line).toBe(4);
  });

  it('cascades lyrics and annotations when the track is deleted', () => {
    db.prepare('INSERT INTO track_lyrics (track_id, line_index, text) VALUES (1, 0, ?)').run('line');
    db.prepare('INSERT INTO track_annotations (track_id, start_line, end_line, body) VALUES (1, 0, 0, ?)').run('note');
    db.prepare('DELETE FROM tracks WHERE id = 1').run();
    expect(db.prepare('SELECT COUNT(*) c FROM track_lyrics').get().c).toBe(0);
    expect(db.prepare('SELECT COUNT(*) c FROM track_annotations').get().c).toBe(0);
  });
});

describe('[Server] catalog schema v19 (commerce)', () => {
  let db;
  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE artists (id INTEGER PRIMARY KEY);
      CREATE TABLE releases (id INTEGER PRIMARY KEY);
      CREATE TABLE tracks (id INTEGER PRIMARY KEY);
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO artists (id) VALUES (1);
      INSERT INTO releases (id) VALUES (5);
      INSERT INTO tracks (id) VALUES (42);
    `);
    applyCatalogV19(db);
  });

  it('creates purchases and payouts tables', () => {
    const colsPurchases = columnNames(db, 'purchases');
    expect(colsPurchases).toEqual(expect.arrayContaining(['user_id', 'release_id', 'track_id', 'amount_cents', 'currency', 'status']));
    
    const colsPayouts = columnNames(db, 'payouts');
    expect(colsPayouts).toEqual(expect.arrayContaining(['artist_id', 'amount_cents', 'status']));
  });

  it('cascades payouts when artist is deleted', () => {
    db.prepare('INSERT INTO payouts (artist_id, amount_cents) VALUES (1, 1000)').run();
    db.prepare('DELETE FROM artists WHERE id = 1').run();
    expect(db.prepare('SELECT COUNT(*) c FROM payouts').get().c).toBe(0);
  });
});

describe('[Server] catalog schema v20 (social + analytics)', () => {
  let db;
  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      CREATE TABLE artists (id INTEGER PRIMARY KEY);
      CREATE TABLE tracks (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (9);
      INSERT INTO artists (id) VALUES (1);
      INSERT INTO tracks (id) VALUES (42);
    `);
    applyCatalogV20(db);
  });

  it('creates follows, track_comments, and plays tables', () => {
    const colsFollows = columnNames(db, 'follows');
    expect(colsFollows).toEqual(expect.arrayContaining(['follower_id', 'artist_id']));

    const colsComments = columnNames(db, 'track_comments');
    expect(colsComments).toEqual(expect.arrayContaining(['track_id', 'user_id', 'body']));

    const colsPlays = columnNames(db, 'plays');
    expect(colsPlays).toEqual(expect.arrayContaining(['track_id', 'user_id', 'ms_played']));
  });

  it('cascades comments and follows when parent records are deleted', () => {
    db.prepare('INSERT INTO follows (follower_id, artist_id) VALUES (9, 1)').run();
    db.prepare("INSERT INTO track_comments (track_id, user_id, body) VALUES (42, 9, 'Love it')").run();
    
    db.prepare('DELETE FROM artists WHERE id = 1').run();
    expect(db.prepare('SELECT COUNT(*) c FROM follows').get().c).toBe(0);

    db.prepare('DELETE FROM tracks WHERE id = 42').run();
    expect(db.prepare('SELECT COUNT(*) c FROM track_comments').get().c).toBe(0);
  });
});

