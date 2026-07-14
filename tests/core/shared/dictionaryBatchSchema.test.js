/**
 * Regression Guard — the dictionary batch schema must accept what the server sends.
 *
 * zod v4 changed z.record: it now REQUIRES (keySchema, valueSchema). The v3
 * single-argument form, `z.record(z.object({...}))`, is not a syntax error under
 * v4 — it is read as the KEY schema. So the schema demanded that every word
 * ("BOLD", "TOLD") be an object, failed with invalid_key, and lookupBatch's
 * `parsed.success ? parsed.data.families : {}` swallowed a perfectly good 200
 * response into an empty map.
 *
 * Nothing threw. Nothing logged. PhonemeEngine's AUTHORITY_CACHE simply stayed
 * empty in the browser forever, so every word fell back to phonemes GUESSED FROM
 * SPELLING — "bold" as B AA1 L D instead of B OW1 L D — and Truesight coloured,
 * rhymed and scored confidently wrong on top of it.
 *
 * A schema that silently rejects everything is indistinguishable from an empty
 * dictionary, which is why this went unnoticed. Pin it against the real payload.
 */

import { describe, expect, it } from 'vitest';
import { BatchLookupSchema } from '../../../codex/core/shared/scholomanceDictionary.api.js';

// Verbatim response of POST /api/lexicon/lookup-batch for ["I","was","bold","told"].
const SERVER_PAYLOAD = {
  families: {
    I: { family: 'AY', phonemes: ['AY1'] },
    WAS: { family: 'A', phonemes: ['W', 'AA1', 'Z'] },
    BOLD: { family: 'OW', phonemes: ['B', 'OW1', 'L', 'D'] },
    TOLD: { family: 'OW', phonemes: ['T', 'OW1', 'L', 'D'] },
  },
};

describe('[Core] dictionary lookupBatch schema', () => {
  it('accepts the real server payload', () => {
    const parsed = BatchLookupSchema.safeParse(SERVER_PAYLOAD);

    // The entire bug in one assertion: this was false, so lookupBatch returned {}.
    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.data.families)).toHaveLength(4);
    expect(parsed.data.families.BOLD).toEqual({
      family: 'OW',
      phonemes: ['B', 'OW1', 'L', 'D'],
    });
  });

  it('keys are word strings, not objects', () => {
    // The v3 single-arg form read the value schema as the KEY schema, so it
    // asserted that the string "BOLD" ought to be an object. Pin the direction.
    const parsed = BatchLookupSchema.safeParse(SERVER_PAYLOAD);
    expect(parsed.success).toBe(true);
    for (const key of Object.keys(parsed.data.families)) {
      expect(typeof key).toBe('string');
    }
  });

  it('still rejects a genuinely malformed payload', () => {
    // The fix must not be "accept anything" — a bad VALUE must still fail.
    expect(BatchLookupSchema.safeParse({
      families: { BOLD: { family: 'OW', phonemes: 'B OW1 L D' } }, // phonemes must be string[]
    }).success).toBe(false);

    expect(BatchLookupSchema.safeParse({ families: null }).success).toBe(false);
    expect(BatchLookupSchema.safeParse({}).success).toBe(false);
  });

  it('permits a null family or null phonemes, which the server does send', () => {
    expect(BatchLookupSchema.safeParse({
      families: { XYZZY: { family: null, phonemes: null } },
    }).success).toBe(true);
  });
});
