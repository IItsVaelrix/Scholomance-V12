import { z } from 'zod';
import { requireAuth } from '../auth-pre-handler.js';
import { getEqPresets, getEqPreset, saveEqPreset, deleteEqPreset } from '../eqPresets.persistence.js';

const eqPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  school: z.string().nullable().optional(),
  bytecode: z.string().min(1),
  checksum: z.string().min(1),
});

export async function eqPresetsRoutes(fastify) {
  fastify.get('/api/eq-presets', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const userId = request.session.user.id;
      try {
        const presets = await getEqPresets(userId);
        return reply.send({ success: true, presets });
      } catch (err) {
        request.log.error(err, 'Failed to fetch eq presets');
        return reply.status(500).send({ error: 'Failed to fetch presets' });
      }
    }
  });

  fastify.post('/api/eq-presets', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const userId = request.session.user.id;
      const parsed = eqPresetSchema.safeParse(request.body);
      
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request',
          details: parsed.error.issues,
        });
      }

      try {
        const saved = await saveEqPreset(userId, parsed.data);
        return reply.send({ success: true, preset: saved });
      } catch (err) {
        request.log.error(err, 'Failed to save eq preset');
        return reply.status(500).send({ error: 'Failed to save preset' });
      }
    }
  });

  fastify.delete('/api/eq-presets/:id', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      const userId = request.session.user.id;
      const { id } = request.params;
      
      try {
        const success = await deleteEqPreset(id, userId);
        if (!success) {
          return reply.status(404).send({ error: 'Preset not found' });
        }
        return reply.send({ success: true });
      } catch (err) {
        request.log.error(err, 'Failed to delete eq preset');
        return reply.status(500).send({ error: 'Failed to delete preset' });
      }
    }
  });
}
