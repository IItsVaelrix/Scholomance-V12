/**
 * Catalog persistence — artist → release → track, plus the provenance ledger
 * and resonance-sidecar registry.
 *
 * Reuses the single shared async DB wrapper from userPersistence so catalog
 * rows live in the same SQLite/Turso database as `users` (artists.user_id FKs
 * to it). Tables are created by USER_MIGRATIONS v15–v17.
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING — Phase 0.
 */

import { userPersistence } from './user.persistence.js';
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../core/pixelbrain/bytecode-error.js';
import {
  normalizeProvenance,
  signProvenance,
  verifyProvenance,
} from './catalog/provenance.sign.js';

const MOD = MODULE_IDS.SHARED;

/** The single shared connection, resolved lazily so import order is safe. */
function db() {
  return userPersistence.db;
}

function toId(result) {
  const raw = result?.lastInsertRowid;
  return raw === undefined || raw === null ? null : Number(raw);
}

function provenanceSecret() {
  return process.env.PROVENANCE_SIGNING_SECRET || process.env.SESSION_SECRET || 'dev-provenance-secret';
}

// ── Artists ──────────────────────────────────────────────────────────────────

async function createArtist({ userId, handle, displayName, bio = null, avatarUrl = null, bannerUrl = null, primarySchool = null }) {
  const result = await db().execute(
    `INSERT INTO artists (user_id, handle, display_name, bio, avatar_url, banner_url, primary_school)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, handle, displayName, bio, avatarUrl, bannerUrl, primarySchool],
  );
  return findArtistById(toId(result));
}

async function findArtistById(id) {
  const result = await db().execute('SELECT * FROM artists WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function findArtistByHandle(handle) {
  const result = await db().execute('SELECT * FROM artists WHERE handle = ?', [handle]);
  return result.rows[0] || null;
}

async function listArtistsByUser(userId) {
  const result = await db().execute(
    'SELECT * FROM artists WHERE user_id = ? ORDER BY created_at ASC, id ASC',
    [userId],
  );
  return result.rows || [];
}

// ── Releases ─────────────────────────────────────────────────────────────────

async function createRelease({
  artistId, slug, title, kind = 'album', coverUrl = null, about = null,
  priceMode = 'nyp', priceMinCents = 0, currency = 'USD', visibility = 'draft',
}) {
  const result = await db().execute(
    `INSERT INTO releases
       (artist_id, slug, title, kind, cover_url, about, price_mode, price_min_cents, currency, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [artistId, slug, title, kind, coverUrl, about, priceMode, priceMinCents, currency, visibility],
  );
  return findReleaseById(toId(result));
}

async function findReleaseById(id) {
  const result = await db().execute('SELECT * FROM releases WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function findReleaseBySlug(artistId, slug) {
  const result = await db().execute(
    'SELECT * FROM releases WHERE artist_id = ? AND slug = ?',
    [artistId, slug],
  );
  return result.rows[0] || null;
}

async function listReleasesByArtist(artistId, { includeDrafts = false } = {}) {
  const sql = includeDrafts
    ? 'SELECT * FROM releases WHERE artist_id = ? ORDER BY created_at DESC, id DESC'
    : "SELECT * FROM releases WHERE artist_id = ? AND visibility = 'public' ORDER BY published_at DESC, id DESC";
  const result = await db().execute(sql, [artistId]);
  return result.rows || [];
}

async function publishRelease(id) {
  await db().execute(
    "UPDATE releases SET visibility = 'public', published_at = datetime('now') WHERE id = ?",
    [id],
  );
  return findReleaseById(id);
}

// ── Tracks ───────────────────────────────────────────────────────────────────

async function createTrack({
  releaseId, position, title, durationMs = null, school = null, explicit = false,
  streamUrl = null, downloadUrl = null, waveformUrl = null, fingerprintId = null,
  bpm = null, musicalKey = null, genre = null,
}) {
  const result = await db().execute(
    `INSERT INTO tracks
       (release_id, position, title, duration_ms, school, explicit, stream_url, download_url, waveform_url, fingerprint_id, bpm, musical_key, genre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [releaseId, position, title, durationMs, school, explicit ? 1 : 0, streamUrl, downloadUrl, waveformUrl, fingerprintId, bpm, musicalKey, genre],
  );
  return findTrackById(toId(result));
}

async function setTrackMusicalMeta(id, { bpm, musicalKey, genre }) {
  await db().execute(
    `UPDATE tracks SET
       bpm         = COALESCE(?, bpm),
       musical_key = COALESCE(?, musical_key),
       genre       = COALESCE(?, genre)
     WHERE id = ?`,
    [bpm ?? null, musicalKey ?? null, genre ?? null, id],
  );
  return findTrackById(id);
}

async function findTrackById(id) {
  const result = await db().execute('SELECT * FROM tracks WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function findTrackByStreamUrl(streamUrl) {
  const result = await db().execute('SELECT * FROM tracks WHERE stream_url = ?', [streamUrl]);
  return result.rows[0] || null;
}

async function listTracksByRelease(releaseId) {
  const result = await db().execute(
    'SELECT * FROM tracks WHERE release_id = ? ORDER BY position ASC, id ASC',
    [releaseId],
  );
  return result.rows || [];
}

async function setTrackAssets(id, { streamUrl, downloadUrl, waveformUrl, durationMs }) {
  await db().execute(
    `UPDATE tracks SET
       stream_url   = COALESCE(?, stream_url),
       download_url = COALESCE(?, download_url),
       waveform_url = COALESCE(?, waveform_url),
       duration_ms  = COALESCE(?, duration_ms)
     WHERE id = ?`,
    [streamUrl ?? null, downloadUrl ?? null, waveformUrl ?? null, durationMs ?? null, id],
  );
  return findTrackById(id);
}

async function setTrackFingerprint(id, fingerprintId) {
  await db().execute('UPDATE tracks SET fingerprint_id = ? WHERE id = ?', [fingerprintId, id]);
  return findTrackById(id);
}

async function addTrackTag(trackId, tag) {
  await db().execute(
    'INSERT OR IGNORE INTO track_tags (track_id, tag) VALUES (?, ?)',
    [trackId, String(tag).trim().toLowerCase()],
  );
}

async function listTrackTags(trackId) {
  const result = await db().execute(
    'SELECT tag FROM track_tags WHERE track_id = ? ORDER BY tag ASC',
    [trackId],
  );
  return (result.rows || []).map((r) => r.tag);
}

// ── Provenance ledger (the wedge) ────────────────────────────────────────────

/**
 * Declare provenance for a track. Validates the origin enum, signs the canonical
 * record, and inserts a new version. Edits never mutate a prior row — each
 * declaration is a new immutable version, so the history is visible.
 */
async function declareProvenance(input) {
  let record;
  try {
    record = normalizeProvenance(input);
  } catch (err) {
    throw new BytecodeError(
      ERROR_CATEGORIES.VALUE, ERROR_SEVERITY.WARN, MOD,
      ERROR_CODES.INVALID_VALUE,
      { parameter: 'origin', reason: err.message },
    );
  }

  // Auto-increment version per track.
  const head = await db().execute(
    'SELECT COALESCE(MAX(version), 0) AS v FROM track_provenance WHERE track_id = ?',
    [record.trackId],
  );
  record.version = Number(head.rows[0]?.v || 0) + 1;

  const signature = signProvenance(record, provenanceSecret());

  const result = await db().execute(
    `INSERT INTO track_provenance
       (track_id, version, origin, model, prompt_lineage, human_edit_ratio, stems_available, license, declared_by, signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.trackId, record.version, record.origin, record.model,
      record.promptLineage === null ? null : JSON.stringify(record.promptLineage),
      record.humanEditRatio, record.stemsAvailable, record.license, record.declaredBy, signature,
    ],
  );
  return getProvenanceById(toId(result));
}

function rowToProvenanceRecord(row) {
  if (!row) return null;
  let promptLineage = null;
  if (row.prompt_lineage) {
    try { promptLineage = JSON.parse(row.prompt_lineage); } catch { promptLineage = row.prompt_lineage; }
  }
  return {
    trackId: Number(row.track_id),
    version: Number(row.version),
    origin: row.origin,
    model: row.model ?? null,
    promptLineage,
    humanEditRatio: row.human_edit_ratio ?? null,
    stemsAvailable: Number(row.stems_available) ? 1 : 0,
    license: row.license,
    declaredBy: Number(row.declared_by),
  };
}

async function getProvenanceById(id) {
  const result = await db().execute('SELECT * FROM track_provenance WHERE id = ?', [id]);
  return result.rows[0] || null;
}

/** Latest declared provenance version for a track. */
async function getLatestProvenance(trackId) {
  const result = await db().execute(
    'SELECT * FROM track_provenance WHERE track_id = ? ORDER BY version DESC, id DESC LIMIT 1',
    [trackId],
  );
  return result.rows[0] || null;
}

/** Tamper-check the latest provenance row's signature. */
async function verifyLatestProvenance(trackId) {
  const row = await getLatestProvenance(trackId);
  if (!row) return { ok: false, reason: 'not_found' };
  const ok = verifyProvenance(rowToProvenanceRecord(row), row.signature, provenanceSecret());
  return ok ? { ok: true } : { ok: false, reason: 'signature_invalid' };
}

// ── Resonance sidecar registry ───────────────────────────────────────────────

async function registerResonance({ fingerprintId, trackId, sidecarUrl, schemaVersion, analysisVersion, sourceDurationMs, status = 'ready' }) {
  await db().execute(
    `INSERT INTO track_resonance
       (fingerprint_id, track_id, sidecar_url, schema_version, analysis_version, source_duration_ms, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(fingerprint_id) DO UPDATE SET
       track_id           = excluded.track_id,
       sidecar_url        = excluded.sidecar_url,
       schema_version     = excluded.schema_version,
       analysis_version   = excluded.analysis_version,
       source_duration_ms = excluded.source_duration_ms,
       status             = excluded.status`,
    [fingerprintId, trackId, sidecarUrl, schemaVersion, analysisVersion, sourceDurationMs, status],
  );
  return findResonanceByFingerprint(fingerprintId);
}

async function findResonanceByFingerprint(fingerprintId) {
  const result = await db().execute('SELECT * FROM track_resonance WHERE fingerprint_id = ?', [fingerprintId]);
  return result.rows[0] || null;
}

async function setResonanceStatus(fingerprintId, status) {
  await db().execute('UPDATE track_resonance SET status = ? WHERE fingerprint_id = ?', [status, fingerprintId]);
  return findResonanceByFingerprint(fingerprintId);
}

// ── Lyrics (timed, for karaoke highlight) ────────────────────────────────────

/**
 * Replace all lyric lines for a track in one shot (the common edit). Each line:
 * { lineIndex, text, startMs?, endMs?, words? } where `words` is an optional
 * array of word-level timings ([{ t, d, w }]) serialized to words_json.
 */
async function replaceLyricsForTrack(trackId, lines = []) {
  await db().execute('DELETE FROM track_lyrics WHERE track_id = ?', [trackId]);
  let index = 0;
  for (const line of lines) {
    const lineIndex = Number.isInteger(line.lineIndex) ? line.lineIndex : index;
    await db().execute(
      `INSERT INTO track_lyrics (track_id, line_index, start_ms, end_ms, text, words_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        trackId, lineIndex,
        line.startMs ?? null, line.endMs ?? null, String(line.text ?? ''),
        Array.isArray(line.words) && line.words.length ? JSON.stringify(line.words) : null,
      ],
    );
    index += 1;
  }
  return listLyricsForTrack(trackId);
}

async function listLyricsForTrack(trackId) {
  const result = await db().execute(
    'SELECT * FROM track_lyrics WHERE track_id = ? ORDER BY line_index ASC',
    [trackId],
  );
  return (result.rows || []).map((row) => {
    let words = null;
    if (row.words_json) {
      try { words = JSON.parse(row.words_json); } catch { words = null; }
    }
    return {
      id: Number(row.id),
      trackId: Number(row.track_id),
      lineIndex: Number(row.line_index),
      startMs: row.start_ms ?? null,
      endMs: row.end_ms ?? null,
      text: row.text,
      words,
    };
  });
}

// ── Annotations (Genius-style, anchored to a line range) ─────────────────────

async function createAnnotation({ trackId, startLine, endLine = null, title = null, body, authorUserId = null }) {
  const end = Number.isInteger(endLine) ? endLine : startLine;
  const result = await db().execute(
    `INSERT INTO track_annotations (track_id, start_line, end_line, title, body, author_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [trackId, startLine, end, title, String(body ?? ''), authorUserId],
  );
  return getAnnotationById(toId(result));
}

async function getAnnotationById(id) {
  const result = await db().execute('SELECT * FROM track_annotations WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function listAnnotationsForTrack(trackId) {
  const result = await db().execute(
    'SELECT * FROM track_annotations WHERE track_id = ? ORDER BY start_line ASC, id ASC',
    [trackId],
  );
  return result.rows || [];
}

async function deleteAnnotation(id) {
  await db().execute('DELETE FROM track_annotations WHERE id = ?', [id]);
}

// ── Commerce ─────────────────────────────────────────────────────────────────

async function createPurchase({ userId = null, email = null, releaseId = null, trackId = null, amountCents, currency = 'USD', provider = 'stripe', providerRef = null, downloadToken = null }) {
  const result = await db().execute(
    `INSERT INTO purchases (user_id, email, release_id, track_id, amount_cents, currency, provider, provider_ref, download_token, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, email, releaseId, trackId, amountCents, currency, provider, providerRef, downloadToken]
  );
  return findPurchaseById(toId(result));
}

async function findPurchaseById(id) {
  const result = await db().execute('SELECT * FROM purchases WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function listPurchasesByUser(userId) {
  const result = await db().execute('SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return result.rows || [];
}

async function updatePurchaseStatus(id, status) {
  await db().execute('UPDATE purchases SET status = ? WHERE id = ?', [status, id]);
  return findPurchaseById(id);
}

async function createPayout({ artistId, amountCents, status = 'accrued' }) {
  const result = await db().execute(
    `INSERT INTO payouts (artist_id, amount_cents, status)
     VALUES (?, ?, ?)`,
    [artistId, amountCents, status]
  );
  return findPayoutById(toId(result));
}

async function findPayoutById(id) {
  const result = await db().execute('SELECT * FROM payouts WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function listPayoutsByArtist(artistId) {
  const result = await db().execute('SELECT * FROM payouts WHERE artist_id = ? ORDER BY created_at DESC', [artistId]);
  return result.rows || [];
}

async function updatePayoutStatus(id, status) {
  await db().execute('UPDATE payouts SET status = ? WHERE id = ?', [status, id]);
  return findPayoutById(id);
}

// ── Social ───────────────────────────────────────────────────────────────────

async function followArtist(followerId, artistId) {
  await db().execute(
    'INSERT OR IGNORE INTO follows (follower_id, artist_id) VALUES (?, ?)',
    [followerId, artistId]
  );
}

async function unfollowArtist(followerId, artistId) {
  await db().execute(
    'DELETE FROM follows WHERE follower_id = ? AND artist_id = ?',
    [followerId, artistId]
  );
}

async function isFollowingArtist(followerId, artistId) {
  const result = await db().execute(
    'SELECT 1 FROM follows WHERE follower_id = ? AND artist_id = ?',
    [followerId, artistId]
  );
  return result.rows.length > 0;
}

async function listFollowersForArtist(artistId) {
  const result = await db().execute(
    'SELECT follower_id FROM follows WHERE artist_id = ? ORDER BY created_at DESC',
    [artistId]
  );
  return (result.rows || []).map(row => Number(row.follower_id));
}

async function listFollowingForUser(followerId) {
  const result = await db().execute(
    'SELECT artist_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC',
    [followerId]
  );
  return (result.rows || []).map(row => Number(row.artist_id));
}

async function createComment({ trackId, userId, atMs = null, body }) {
  const result = await db().execute(
    `INSERT INTO track_comments (track_id, user_id, at_ms, body)
     VALUES (?, ?, ?, ?)`,
    [trackId, userId, atMs, String(body ?? '')]
  );
  return getCommentById(toId(result));
}

async function getCommentById(id) {
  const result = await db().execute('SELECT * FROM track_comments WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function deleteComment(id) {
  await db().execute('DELETE FROM track_comments WHERE id = ?', [id]);
}

async function listCommentsForTrack(trackId) {
  const result = await db().execute(
    'SELECT * FROM track_comments WHERE track_id = ? ORDER BY at_ms ASC, created_at ASC',
    [trackId]
  );
  return result.rows || [];
}

// ── Analytics ────────────────────────────────────────────────────────────────

async function recordPlay({ trackId, userId = null, msPlayed = 0, source = null }) {
  const result = await db().execute(
    `INSERT INTO plays (track_id, user_id, ms_played, source)
     VALUES (?, ?, ?, ?)`,
    [trackId, userId, msPlayed, source]
  );
  return getPlayById(toId(result));
}

async function getPlayById(id) {
  const result = await db().execute('SELECT * FROM plays WHERE id = ?', [id]);
  return result.rows[0] || null;
}

async function listPlaysForTrack(trackId) {
  const result = await db().execute(
    'SELECT * FROM plays WHERE track_id = ? ORDER BY created_at DESC',
    [trackId]
  );
  return result.rows || [];
}

export const catalogPersistence = {
  artists: {
    create: createArtist,
    findById: findArtistById,
    findByHandle: findArtistByHandle,
    listByUser: listArtistsByUser,
  },
  releases: {
    create: createRelease,
    findById: findReleaseById,
    findBySlug: findReleaseBySlug,
    listByArtist: listReleasesByArtist,
    publish: publishRelease,
  },
  tracks: {
    create: createTrack,
    findById: findTrackById,
    findByStreamUrl: findTrackByStreamUrl,
    listByRelease: listTracksByRelease,
    setAssets: setTrackAssets,
    setFingerprint: setTrackFingerprint,
    setMusicalMeta: setTrackMusicalMeta,
    addTag: addTrackTag,
    listTags: listTrackTags,
  },
  lyrics: {
    replaceForTrack: replaceLyricsForTrack,
    listByTrack: listLyricsForTrack,
  },
  annotations: {
    create: createAnnotation,
    getById: getAnnotationById,
    listByTrack: listAnnotationsForTrack,
    delete: deleteAnnotation,
  },
  provenance: {
    declare: declareProvenance,
    getLatest: getLatestProvenance,
    verifyLatest: verifyLatestProvenance,
  },
  resonance: {
    register: registerResonance,
    findByFingerprint: findResonanceByFingerprint,
    setStatus: setResonanceStatus,
  },
  commerce: {
    purchases: {
      create: createPurchase,
      findById: findPurchaseById,
      listByUser: listPurchasesByUser,
      updateStatus: updatePurchaseStatus,
    },
    payouts: {
      create: createPayout,
      findById: findPayoutById,
      listByArtist: listPayoutsByArtist,
      updateStatus: updatePayoutStatus,
    },
  },
  social: {
    follows: {
      follow: followArtist,
      unfollow: unfollowArtist,
      isFollowing: isFollowingArtist,
      listFollowers: listFollowersForArtist,
      listFollowing: listFollowingForUser,
    },
    comments: {
      create: createComment,
      delete: deleteComment,
      listByTrack: listCommentsForTrack,
    },
  },
  analytics: {
    plays: {
      record: recordPlay,
      listByTrack: listPlaysForTrack,
    },
  },
};
