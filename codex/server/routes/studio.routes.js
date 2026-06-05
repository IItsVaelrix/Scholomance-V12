import { requireAuth } from '../auth-pre-handler.js';
import { catalogPersistence } from '../catalog.persistence.js';
import { ingestTrackAudio } from '../catalog/ingest.service.js';

export async function studioRoutes(fastify, options) {
  const { localAudioAdapter } = options;

  // 1. Upload audio for a track
  fastify.post('/api/artist/releases/:id/tracks', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const releaseId = Number(request.params.id);
      if (!Number.isInteger(releaseId)) {
        return reply.status(400).send({ error: 'Invalid release id' });
      }

      // Check ownership
      const release = await catalogPersistence.releases.findById(releaseId);
      if (!release) return reply.status(404).send({ error: 'Release not found' });
      
      const artist = await catalogPersistence.artists.findById(Number(release.artist_id));
      if (!artist || Number(artist.user_id) !== Number(request.session.user.id)) {
        return reply.status(403).send({ error: 'Not authorized to upload to this release' });
      }

      const parts = request.parts();
      let audioBuffer = null;
      let fields = {};

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'audio') {
          audioBuffer = await part.toBuffer();
        } else if (part.type === 'field') {
          fields[part.fieldname] = part.value;
        }
      }

      if (!audioBuffer) {
        return reply.status(400).send({ error: 'Missing audio file' });
      }

      // If trackId is provided in fields, use it. Otherwise create a new track.
      let trackId = fields.trackId ? Number(fields.trackId) : null;
      
      if (!trackId) {
        const title = fields.title || 'Untitled Track';
        const position = Number(fields.position) || 1;
        const newTrack = await catalogPersistence.tracks.create({
          releaseId,
          title,
          position,
        });
        trackId = newTrack.id;
      }

      try {
        const summary = await ingestTrackAudio({
          api: catalogPersistence,
          trackId,
          bytes: audioBuffer,
          storage: localAudioAdapter,
        });
        
        return reply.send({ success: true, summary });
      } catch (err) {
        request.log.error(err, 'Audio ingestion failed');
        return reply.status(500).send({ error: 'Audio ingestion failed', details: err.message });
      }
    }
  });

  // 2. Declare provenance for a track
  fastify.post('/api/artist/tracks/:id/provenance', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const trackId = Number(request.params.id);
      if (!Number.isInteger(trackId)) {
        return reply.status(400).send({ error: 'Invalid track id' });
      }

      const track = await catalogPersistence.tracks.findById(trackId);
      if (!track) return reply.status(404).send({ error: 'Track not found' });

      const release = await catalogPersistence.releases.findById(Number(track.release_id));
      if (!release) return reply.status(404).send({ error: 'Release not found' });
      
      const artist = await catalogPersistence.artists.findById(Number(release.artist_id));
      if (!artist || Number(artist.user_id) !== Number(request.session.user.id)) {
        return reply.status(403).send({ error: 'Not authorized for this track' });
      }

      const { origin, model, promptLineage, humanEditRatio, stemsAvailable, license } = request.body;

      try {
        const declared = await catalogPersistence.provenance.declare({
          trackId,
          origin,
          model,
          promptLineage,
          humanEditRatio,
          stemsAvailable,
          license,
          declaredBy: request.session.user.id,
        });
        
        return reply.send({ success: true, provenance: declared });
      } catch (err) {
        request.log.error(err, 'Provenance declaration failed');
        return reply.status(400).send({ error: 'Provenance declaration failed', details: err.message });
      }
    }
  });
}
