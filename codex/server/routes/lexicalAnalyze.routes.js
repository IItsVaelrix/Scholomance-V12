// Submit-only poetic search over the lexical graph. One POST; no keystroke path.
import { createHash } from 'crypto';
import { z } from 'zod';

const MAX_QUERY_LEN = 80;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 500;
const bodySchema = z.object({ query: z.string().trim().min(1).max(MAX_QUERY_LEN) });

export async function lexicalAnalyzeRoutes(fastify, opts) {
  const service = opts.service;
  const cache = new Map();
  const keyOf = (q) => createHash('sha256').update(q.toLowerCase()).digest('hex');

  fastify.post('/analyze', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid query' });
    const query = parsed.data.query;
    const key = keyOf(query);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.v;
    const result = service.analyze(query);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { t: Date.now(), v: result });
    return result;
  });
}

export default lexicalAnalyzeRoutes;
