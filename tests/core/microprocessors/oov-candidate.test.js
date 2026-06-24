import { describe, expect, it } from 'vitest';
import { selectOOVCandidate } from '../../../codex/core/microprocessors/nlu/entity-extractor.js';
import { ENTITY_TYPES, tokenize } from '../../../codex/core/microprocessors/nlu/constants.js';

const emptyEntities = () => ({ [ENTITY_TYPES.SUBJECT]: [] });

describe('selectOOVCandidate', () => {
  it('returns the leftmost out-of-vocabulary content word when no subject matched', () => {
    const tokens = tokenize('a fierce reggaeton warrior');
    // closed-vocab extraction matched no SUBJECT here (warrior IS a subject keyword,
    // so simulate the real case where the caller only calls us with empty subject)
    const candidate = selectOOVCandidate(['fierce', 'reggaeton', 'banger'], emptyEntities());
    expect(candidate).toBe('reggaeton');
  });

  it('returns null when a subject was already extracted', () => {
    const tokens = tokenize('a reggaeton dragon');
    const entities = { [ENTITY_TYPES.SUBJECT]: ['dragon'] };
    expect(selectOOVCandidate(tokens, entities)).toBeNull();
  });

  it('skips known vocabulary words (keyword lists + LEXICAL_VISUAL_DB)', () => {
    // 'metallic' is a material keyword, 'knight' is a subject/DB word -> both skipped,
    // 'zydeco' is the only OOV content word
    const candidate = selectOOVCandidate(['metallic', 'zydeco', 'knight'], emptyEntities());
    expect(candidate).toBe('zydeco');
  });

  it('skips stopwords and short tokens', () => {
    const candidate = selectOOVCandidate(['the', 'a', 'and', 'with', 'glitchcore'], emptyEntities());
    expect(candidate).toBe('glitchcore');
  });

  it('returns null when there is no qualifying OOV word', () => {
    const candidate = selectOOVCandidate(['the', 'a', 'with', 'fire'], emptyEntities());
    expect(candidate).toBeNull();
  });
});
