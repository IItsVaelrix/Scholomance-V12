/**
 * Catalog schema DDL — v18 (lyrics, annotations, track musical metadata).
 *
 * These are the left-page ("VERSES & VERITAS") substrate from the Grimoire
 * concept: timed lyrics for karaoke highlight, Genius-style line annotations,
 * and the BPM/KEY/GENRE metadata rows. Exported as constants so the migration
 * (codex/server/user.persistence.js) and the schema test apply the exact same
 * DDL — single source of truth, no drift.
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §11.3.
 */

/** Additive columns on `tracks`. Applied with duplicate-column tolerance. */
export const TRACK_MUSICAL_META_ALTERS = Object.freeze([
  'ALTER TABLE tracks ADD COLUMN bpm REAL',
  'ALTER TABLE tracks ADD COLUMN musical_key TEXT',
  'ALTER TABLE tracks ADD COLUMN genre TEXT',
]);

/** Timed lyric lines. `words_json` is optional word-level timing for highlight. */
export const TRACK_LYRICS_SQL = `
CREATE TABLE IF NOT EXISTS track_lyrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL,
  line_index INTEGER NOT NULL,
  start_ms INTEGER,
  end_ms INTEGER,
  text TEXT NOT NULL,
  words_json TEXT,
  UNIQUE(track_id, line_index),
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lyrics_track ON track_lyrics(track_id, line_index);
`;

/** Genius-style annotations, anchored to an inclusive line range. */
export const TRACK_ANNOTATIONS_SQL = `
CREATE TABLE IF NOT EXISTS track_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  author_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_annotations_track ON track_annotations(track_id, start_line);
`;

/**
 * Apply the v18 DDL against a better-sqlite3-style synchronous db (the migration
 * runner's `database` handle, or a test's in-memory Database). ALTERs tolerate
 * a re-run via duplicate-column detection.
 */
export function applyCatalogV18(database) {
  for (const alter of TRACK_MUSICAL_META_ALTERS) {
    try {
      database.exec(alter);
    } catch (err) {
      if (!/duplicate column name/i.test(err?.message || '')) throw err;
    }
  }
  database.exec(TRACK_LYRICS_SQL);
  database.exec(TRACK_ANNOTATIONS_SQL);
}

/** Commerce schema: purchases & payouts tables. */
export const COMMERCE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS purchases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,
  email        TEXT,
  release_id   INTEGER,
  track_id     INTEGER,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  provider     TEXT NOT NULL DEFAULT 'stripe',
  provider_ref TEXT,
  download_token TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS payouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id    INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'accrued',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_artist ON payouts(artist_id);
`;

/** Social and analytics schema: follows, track_comments, plays. */
export const SOCIAL_ANALYTICS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,
  artist_id   INTEGER NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, artist_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS track_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id    INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  at_ms       INTEGER,
  body        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS plays (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id    INTEGER NOT NULL,
  user_id     INTEGER,
  ms_played   INTEGER NOT NULL DEFAULT 0,
  source      TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_follows_artist ON follows(artist_id);
CREATE INDEX IF NOT EXISTS idx_comments_track ON track_comments(track_id);
CREATE INDEX IF NOT EXISTS idx_plays_track ON plays(track_id);
`;

export function applyCatalogV19(database) {
  database.exec(COMMERCE_SCHEMA_SQL);
}

export function applyCatalogV20(database) {
  database.exec(SOCIAL_ANALYTICS_SCHEMA_SQL);
}

