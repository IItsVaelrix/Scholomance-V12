import { describe, it, expect } from 'vitest';
import { assembleGrimoireView, assembleReleaseView } from '../../codex/server/catalog/grimoire.view.js';

/** Minimal in-memory catalog api (row-shaped, snake_case like the real DB). */
function makeMockApi() {
  const artist = {
    id: 1, handle: 'lumen-arcanum', display_name: 'Lumen Arcanum',
    bio: null, avatar_url: null, banner_url: null, primary_school: 'VOID', user_id: 9,
  };
  const release = {
    id: 5, artist_id: 1, slug: 'umbrae-prophetica', title: 'Umbrae Prophetica',
    kind: 'album', cover_url: 'https://x/cover.jpg', about: null, price_mode: 'nyp',
    price_min_cents: 0, currency: 'USD', visibility: 'public', published_at: '2025-05-03',
  };
  const track = {
    id: 42, release_id: 5, position: 1, title: 'Echoes of the Veil', duration_ms: 277000,
    school: 'VOID', explicit: 0, stream_url: 'https://x/echoes.mp3', download_url: null,
    waveform_url: null, fingerprint_id: '7F3A9C1D2B6EE7A9', bpm: 136, musical_key: 'Dm',
    genre: 'Darkwave',
  };
  const lyrics = [
    { id: 1, track_id: 42, lineIndex: 0, startMs: 0, endMs: 4000, text: 'We drift where the old stars bleed', words: null },
    { id: 5, track_id: 42, lineIndex: 4, startMs: 138000, endMs: 141000, text: 'Through the veil, the echoes call', words: null },
  ];
  const annotations = [
    { id: 7, track_id: 42, start_line: 4, end_line: 4, title: 'Echoes Call', body: 'the threshold between known and forgotten' },
  ];
  const provenanceRow = {
    version: 1, origin: 'ai_assisted', model: 'suno-v3.5',
    prompt_lineage: '{"prompt":"darkwave occult"}', human_edit_ratio: 0.35,
    stems_available: 1, license: 'all_rights_reserved', declared_by: 9, signature: 'abc',
  };

  return {
    artists: { findById: async (id) => (Number(id) === 1 ? artist : null) },
    releases: {
      findById: async (id) => (Number(id) === 5 ? release : null),
      listByArtist: async () => [release],
    },
    tracks: {
      findById: async (id) => (Number(id) === 42 ? track : null),
      listByRelease: async () => [track],
      listTags: async () => ['veil', 'threshold', 'memory'],
    },
    lyrics: { listByTrack: async () => lyrics },
    annotations: { listByTrack: async () => annotations },
    provenance: {
      getLatest: async () => provenanceRow,
      verifyLatest: async () => ({ ok: true }),
    },
  };
}

describe('[Server] assembleGrimoireView (the two-page payload)', () => {
  it('returns null for a missing track', async () => {
    const api = makeMockApi();
    expect(await assembleGrimoireView({ api, trackId: 999 })).toBeNull();
  });

  it('composes artist + release + track meta', async () => {
    const view = await assembleGrimoireView({ api: makeMockApi(), trackId: 42 });
    expect(view.artist.displayName).toBe('Lumen Arcanum');
    expect(view.release.title).toBe('Umbrae Prophetica');
    expect(view.track.bpm).toBe(136);
    expect(view.track.musicalKey).toBe('Dm');
    expect(view.track.streamUrl).toBe('https://x/echoes.mp3');
  });

  it('left page carries lyrics, annotations, and verified provenance', async () => {
    const view = await assembleGrimoireView({ api: makeMockApi(), trackId: 42 });
    expect(view.leftPage.lyrics).toHaveLength(2);
    expect(view.leftPage.annotations[0].startLine).toBe(4);
    expect(view.leftPage.provenance.origin).toBe('ai_assisted');
    expect(view.leftPage.provenance.verified).toBe(true);
    expect(view.leftPage.provenance.promptLineage).toEqual({ prompt: 'darkwave occult' });
  });

  it('right page is the deterministic genome (with concept readouts)', async () => {
    const view = await assembleGrimoireView({ api: makeMockApi(), trackId: 42 });
    expect(view.rightPage.baseHue).toBe(270); // VOID anchor
    expect(view.rightPage.readouts.bytecodeSeed).toBe('0xVEIL-136-Dm');
    expect(view.rightPage.readouts.semanticMap).toContain('Veil');
    expect(view.rightPage.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('genome is stable across repeated assembly (same fingerprint → same checksum)', async () => {
    const a = await assembleGrimoireView({ api: makeMockApi(), trackId: 42 });
    const b = await assembleGrimoireView({ api: makeMockApi(), trackId: 42 });
    expect(a.rightPage.checksum).toBe(b.rightPage.checksum);
  });

  it('flags unverified provenance (tamper) without dropping the panel', async () => {
    const api = makeMockApi();
    api.provenance.verifyLatest = async () => ({ ok: false, reason: 'signature_invalid' });
    const view = await assembleGrimoireView({ api, trackId: 42 });
    expect(view.leftPage.provenance.verified).toBe(false);
    expect(view.leftPage.provenance.origin).toBe('ai_assisted');
  });
});

describe('[Server] assembleReleaseView', () => {
  it('returns artist + release + ordered tracks', async () => {
    const view = await assembleReleaseView({ api: makeMockApi(), releaseId: 5 });
    expect(view.artist.handle).toBe('lumen-arcanum');
    expect(view.release.title).toBe('Umbrae Prophetica');
    expect(view.tracks).toHaveLength(1);
    expect(view.tracks[0].title).toBe('Echoes of the Veil');
  });

  it('returns null for a missing release', async () => {
    expect(await assembleReleaseView({ api: makeMockApi(), releaseId: 999 })).toBeNull();
  });
});
