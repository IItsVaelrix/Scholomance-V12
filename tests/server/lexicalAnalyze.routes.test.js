import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { lexicalAnalyzeRoutes } from '../../codex/server/routes/lexicalAnalyze.routes.js';

function build(service) {
  const app = Fastify();
  app.register(lexicalAnalyzeRoutes, { prefix: '/api/lexical', service });
  return app;
}
const fakeService = { analyze: (q) => ({ query: q, canonical: q, generatedAt: 'T', groups: [{ key: 'meaning', label: 'Meaning', items: [] }] }) };

describe('POST /api/lexical/analyze', () => {
  it('returns groups for a valid query', async () => {
    const app = build(fakeService);
    const res = await app.inject({ method: 'POST', url: '/api/lexical/analyze', payload: { query: 'dark' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).groups[0].key).toBe('meaning');
    await app.close();
  });
  it('rejects empty query with 400', async () => {
    const app = build(fakeService);
    const res = await app.inject({ method: 'POST', url: '/api/lexical/analyze', payload: { query: '' } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
