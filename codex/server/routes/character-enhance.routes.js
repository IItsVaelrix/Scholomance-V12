import Anthropic from '@anthropic-ai/sdk';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(v)));
}

function parseEnhancements(text) {
  let parsed;
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Haiku returned non-JSON: ' + text.slice(0, 120));
  }
  return {
    glowIntensity:     clamp(parsed.glowIntensity     ?? 0.7, 0.3, 1.5),
    rimColor:          HEX_RE.test(parsed.rimColor ?? '') ? parsed.rimColor : null,
    atmosphereOpacity: clamp(parsed.atmosphereOpacity ?? 0.3, 0.0, 0.8),
  };
}

export async function characterEnhanceRoutes(fastify) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  fastify.post('/api/character/enhance', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    handler: async (request, reply) => {
      const { imageDataUrl, schoolName, characterName } = request.body ?? {};

      if (!imageDataUrl || typeof imageDataUrl !== 'string' ||
          !imageDataUrl.startsWith('data:image/png;base64,')) {
        return reply.status(400).send({ error: 'imageDataUrl must be a base64 PNG data URL' });
      }
      if (!schoolName || typeof schoolName !== 'string') {
        return reply.status(400).send({ error: 'schoolName required' });
      }

      const base64Data = imageDataUrl.replace('data:image/png;base64,', '');

      let text;
      try {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 128,
          system: 'Return only a valid JSON object with keys glowIntensity (number 0.3–1.5), rimColor (hex string "#rrggbb"), atmosphereOpacity (number 0.0–0.8). No prose, no explanation, no markdown.',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/png', data: base64Data },
              },
              {
                type: 'text',
                text: `This is a pixel art character from the ${schoolName} school. Suggest shader effect values to make this character's school identity more visually striking. Return only the JSON.`,
              },
            ],
          }],
        });
        text = msg.content[0]?.text ?? '';
      } catch (err) {
        fastify.log.error('[character-enhance] Anthropic API error:', err.message);
        return reply.status(502).send({ error: 'AI service unavailable' });
      }

      try {
        const enhancements = parseEnhancements(text);
        return reply.send(enhancements);
      } catch (err) {
        fastify.log.error('[character-enhance] parse error:', err.message);
        return reply.status(502).send({ error: 'Could not parse AI response' });
      }
    },
  });
}
