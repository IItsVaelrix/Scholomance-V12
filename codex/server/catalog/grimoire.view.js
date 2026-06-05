/**
 * Grimoire view assembler — composes the full two-page payload for the listening
 * surface from the catalog persistence layer.
 *
 *   leftPage  = the song's MEANING  (metadata, provenance, timed lyrics, annotations)
 *   rightPage = the song's IDENTITY (the deterministic visual genome)
 *
 * Pure with respect to I/O: it takes a `catalogPersistence`-shaped `api`, so it
 * is unit-testable with a mock (mirrors codex/server/oauth/oauth.link.js). The
 * right page is derived, never stored — `deriveVisualGenome` is deterministic
 * from the track's fingerprint + semantic cues.
 *
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §11.
 */

import { deriveVisualGenome } from './visual.genome.js';

function normalizeArtist(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    bannerUrl: row.banner_url ?? null,
    primarySchool: row.primary_school ?? null,
  };
}

function normalizeRelease(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    artistId: Number(row.artist_id),
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    coverUrl: row.cover_url ?? null,
    about: row.about ?? null,
    priceMode: row.price_mode,
    priceMinCents: Number(row.price_min_cents) || 0,
    currency: row.currency,
    visibility: row.visibility,
    publishedAt: row.published_at ?? null,
  };
}

function normalizeTrack(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    releaseId: Number(row.release_id),
    position: Number(row.position),
    title: row.title,
    durationMs: row.duration_ms ?? null,
    school: row.school ?? null,
    explicit: Number(row.explicit) ? true : false,
    streamUrl: row.stream_url ?? null,
    downloadUrl: row.download_url ?? null,
    waveformUrl: row.waveform_url ?? null,
    fingerprintId: row.fingerprint_id ?? null,
    bpm: row.bpm ?? null,
    musicalKey: row.musical_key ?? null,
    genre: row.genre ?? null,
  };
}

function normalizeProvenance(row, verified) {
  if (!row) return null;
  let promptLineage = null;
  if (row.prompt_lineage) {
    try { promptLineage = JSON.parse(row.prompt_lineage); } catch { promptLineage = row.prompt_lineage; }
  }
  return {
    version: Number(row.version),
    origin: row.origin,
    model: row.model ?? null,
    promptLineage,
    humanEditRatio: row.human_edit_ratio ?? null,
    stemsAvailable: Number(row.stems_available) ? true : false,
    license: row.license,
    verified: Boolean(verified),
  };
}

function normalizeAnnotation(row) {
  return {
    id: Number(row.id),
    startLine: Number(row.start_line),
    endLine: Number(row.end_line),
    title: row.title ?? null,
    body: row.body,
  };
}

/**
 * Assemble the full grimoire spread for a single track.
 * @returns {Promise<object|null>} null when the track does not exist
 */
export async function assembleGrimoireView({ api, trackId }) {
  const trackRow = await api.tracks.findById(trackId);
  if (!trackRow) return null;
  const track = normalizeTrack(trackRow);

  const [releaseRow, lyrics, annotationRows, tags, provenanceRow] = await Promise.all([
    api.releases.findById(track.releaseId),
    api.lyrics.listByTrack(track.id),
    api.annotations.listByTrack(track.id),
    api.tracks.listTags(track.id),
    api.provenance.getLatest(track.id),
  ]);

  const release = normalizeRelease(releaseRow);
  const artistRow = release ? await api.artists.findById(release.artistId) : null;
  const artist = normalizeArtist(artistRow);

  let provenance = null;
  if (provenanceRow) {
    const check = await api.provenance.verifyLatest(track.id);
    provenance = normalizeProvenance(provenanceRow, check?.ok);
  }

  // Right page — deterministic from the audio fingerprint + semantic cues.
  const lyricsText = (lyrics || []).map((l) => l.text).join(' ');
  const genome = deriveVisualGenome({
    fingerprintId: track.fingerprintId || `track:${track.id}`,
    school: track.school,
    tags,
    semanticTokens: tags,
    lyricsText,
    bpm: track.bpm,
    durationMs: track.durationMs,
    title: track.title,
    musicalKey: track.musicalKey,
  });

  return {
    artist,
    release,
    track,
    leftPage: {
      lyrics: lyrics || [],
      annotations: (annotationRows || []).map(normalizeAnnotation),
      provenance,
      tags: tags || [],
    },
    rightPage: genome,
  };
}

/**
 * Assemble a release view: artist + release + ordered track summaries (no
 * per-track grimoire payload — that is fetched per track).
 * @returns {Promise<object|null>}
 */
export async function assembleReleaseView({ api, releaseId }) {
  const releaseRow = await api.releases.findById(releaseId);
  if (!releaseRow) return null;
  const release = normalizeRelease(releaseRow);
  const artist = normalizeArtist(await api.artists.findById(release.artistId));
  const trackRows = await api.tracks.listByRelease(release.id);
  return {
    artist,
    release,
    tracks: (trackRows || []).map(normalizeTrack),
  };
}

export { normalizeArtist, normalizeRelease, normalizeTrack };
