/**
 * Catalog read routes — public listening surface (Sonic Exchange, Phase 1).
 *
 * Serves the artist / release / track catalog and the full grimoire spread
 * payload (left page = meaning, right page = deterministic visual genome) that
 * the React surface and the player consume.
 *
 * Read-only here; upload/Studio/commerce routes land in later phases.
 * PDR-2026-06-05-SONIC-EXCHANGE-NATIVE-LISTENING §13 Phase 1.
 */

import { catalogPersistence } from '../catalog.persistence.js';
import { assembleGrimoireView, assembleReleaseView } from '../catalog/grimoire.view.js';

const READ_RATE = { max: 120, timeWindow: '1 minute' };

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** A release is viewable if public, or if the requester owns its artist. */
async function canViewRelease(release, request) {
  if (!release) return false;
  if (release.visibility === 'public') return true;
  const sessionUserId = request.session?.user?.id;
  if (!sessionUserId) return false;
  const artist = await catalogPersistence.artists.findById(Number(release.artist_id ?? release.artistId));
  return artist ? Number(artist.user_id) === Number(sessionUserId) : false;
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function catalogRoutes(fastify, _opts) {
  // Artist by handle, with their public releases.
  fastify.get('/api/catalog/artists/:handle', {
    config: { rateLimit: READ_RATE },
    handler: async (request, reply) => {
      const handle = String(request.params.handle || '').trim().toLowerCase();
      if (!handle) return reply.status(400).send({ error: 'Invalid handle' });

      const artist = await catalogPersistence.artists.findByHandle(handle);
      if (!artist) return reply.status(404).send({ error: 'Artist not found' });

      const releases = await catalogPersistence.releases.listByArtist(artist.id, { includeDrafts: false });
      return {
        artist: {
          id: artist.id,
          handle: artist.handle,
          displayName: artist.display_name,
          bio: artist.bio ?? null,
          avatarUrl: artist.avatar_url ?? null,
          bannerUrl: artist.banner_url ?? null,
          primarySchool: artist.primary_school ?? null,
        },
        releases: releases.map((r) => ({
          id: r.id, slug: r.slug, title: r.title, kind: r.kind,
          coverUrl: r.cover_url ?? null, priceMode: r.price_mode,
          priceMinCents: Number(r.price_min_cents) || 0, currency: r.currency,
          publishedAt: r.published_at ?? null,
        })),
      };
    },
  });

  // Release with ordered tracks.
  fastify.get('/api/catalog/releases/:id', {
    config: { rateLimit: READ_RATE },
    handler: async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: 'Invalid release id' });

      const releaseRow = await catalogPersistence.releases.findById(id);
      if (!releaseRow || !(await canViewRelease(releaseRow, request))) {
        return reply.status(404).send({ error: 'Release not found' });
      }

      const view = await assembleReleaseView({ api: catalogPersistence, releaseId: id });
      return view;
    },
  });

  // Resolve track ID by streamUrl.
  fastify.get('/api/catalog/tracks/resolve', {
    config: { rateLimit: READ_RATE },
    handler: async (request, reply) => {
      const streamUrl = String(request.query.streamUrl || '').trim();
      if (!streamUrl) return reply.status(400).send({ error: 'Missing streamUrl parameter' });

      const track = await catalogPersistence.tracks.findByStreamUrl(streamUrl);
      if (!track) return reply.status(404).send({ error: 'Track not found' });

      return { trackId: track.id };
    },
  });

  // Full grimoire spread for a track.
  fastify.get('/api/catalog/tracks/:id/grimoire', {
    config: { rateLimit: READ_RATE },
    handler: async (request, reply) => {
      const id = parseId(request.params.id);
      if (!id) return reply.status(400).send({ error: 'Invalid track id' });

      const trackRow = await catalogPersistence.tracks.findById(id);
      if (!trackRow) return reply.status(404).send({ error: 'Track not found' });

      const releaseRow = await catalogPersistence.releases.findById(Number(trackRow.release_id));
      if (!(await canViewRelease(releaseRow, request))) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const view = await assembleGrimoireView({ api: catalogPersistence, trackId: id });
      if (!view) return reply.status(404).send({ error: 'Track not found' });
      return view;
    },
  });
}
