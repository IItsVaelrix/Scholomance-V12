import { describe, it, expect } from 'vitest';
import {
  PROVENANCE_ORIGINS,
  stableStringify,
  normalizeProvenance,
  canonicalizeProvenance,
  signProvenance,
  verifyProvenance,
} from '../../codex/server/catalog/provenance.sign.js';
import { buildSeedPlan, trackLabelFromUrl } from '../../codex/server/catalog/catalog.seed.js';
import {
  deriveVisualGenome,
  formatBytecodeSeed,
  VISUAL_ARCHETYPES,
  GLYPHCORE_ENGINE,
} from '../../codex/server/catalog/visual.genome.js';

const SECRET = 'unit-test-secret';

function sampleDeclaration(overrides = {}) {
  return {
    trackId: 42,
    origin: 'ai_assisted',
    model: 'suno-v4',
    promptLineage: { prompt: 'glacial dark techno', seed: 1337, iterations: 3 },
    humanEditRatio: 0.35,
    stemsAvailable: true,
    license: 'cc-by',
    declaredBy: 7,
    ...overrides,
  };
}

describe('[Server] provenance signing (the wedge)', () => {
  it('canonical encoding is stable regardless of key order', () => {
    const a = stableStringify({ b: 1, a: 2, c: { y: 1, x: 2 } });
    const b = stableStringify({ c: { x: 2, y: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('signs and verifies a normalized declaration', () => {
    const record = normalizeProvenance(sampleDeclaration());
    const sig = signProvenance(record, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyProvenance(record, sig, SECRET)).toBe(true);
  });

  it('detects tampering — any signed field change invalidates the signature', () => {
    const record = normalizeProvenance(sampleDeclaration());
    const sig = signProvenance(record, SECRET);

    const tampered = { ...record, humanEditRatio: 0.95 };
    expect(verifyProvenance(tampered, sig, SECRET)).toBe(false);

    const relabelled = { ...record, origin: 'human' };
    expect(verifyProvenance(relabelled, sig, SECRET)).toBe(false);
  });

  it('a different secret cannot verify the signature', () => {
    const record = normalizeProvenance(sampleDeclaration());
    const sig = signProvenance(record, SECRET);
    expect(verifyProvenance(record, sig, 'other-secret')).toBe(false);
  });

  it('rejects an invalid origin enum', () => {
    expect(() => normalizeProvenance(sampleDeclaration({ origin: 'definitely_human_promise' })))
      .toThrow(/Invalid provenance origin/);
  });

  it('clamps humanEditRatio to [0,1] and coerces stemsAvailable to 0/1', () => {
    const over = normalizeProvenance(sampleDeclaration({ humanEditRatio: 5, stemsAvailable: 0 }));
    expect(over.humanEditRatio).toBe(1);
    expect(over.stemsAvailable).toBe(0);

    const under = normalizeProvenance(sampleDeclaration({ humanEditRatio: -3, stemsAvailable: 'yes' }));
    expect(under.humanEditRatio).toBe(0);
    expect(under.stemsAvailable).toBe(1);
  });

  it('parses a JSON-string promptLineage so canonical bytes are whitespace-stable', () => {
    const a = normalizeProvenance(sampleDeclaration({ promptLineage: '{"seed":1,"prompt":"x"}' }));
    const b = normalizeProvenance(sampleDeclaration({ promptLineage: { prompt: 'x', seed: 1 } }));
    expect(canonicalizeProvenance(a)).toBe(canonicalizeProvenance(b));
  });

  it('every declared origin is a recognized enum value', () => {
    for (const origin of PROVENANCE_ORIGINS) {
      expect(() => normalizeProvenance(sampleDeclaration({ origin }))).not.toThrow();
    }
  });
});

describe('[Server] catalog seed plan (buckets → catalog)', () => {
  const buckets = {
    SONIC: ['https://cdn1.suno.ai/aaaa-bbbb.mp3', 'https://cdn1.suno.ai/cccc-dddd.mp3'],
    VOID: ['https://cdn1.suno.ai/eeee.mp3'],
  };

  it('builds one release per school with positioned tracks', () => {
    const plan = buildSeedPlan(buckets);
    expect(plan.artist.handle).toBe('scholomance-station');
    expect(plan.releases).toHaveLength(2);

    const sonic = plan.releases.find((r) => r.slug === 'sonic');
    expect(sonic.kind).toBe('album');
    expect(sonic.tracks.map((t) => t.position)).toEqual([1, 2]);
    expect(sonic.tracks[0].streamUrl).toBe(buckets.SONIC[0]);

    const voidRel = plan.releases.find((r) => r.slug === 'void');
    expect(voidRel.kind).toBe('single');
    expect(voidRel.tracks).toHaveLength(1);
  });

  it('derives a readable title from the track URL', () => {
    expect(trackLabelFromUrl('https://cdn1.suno.ai/dark-techno-loop.mp3', 0)).toBe('dark techno loop');
    expect(trackLabelFromUrl('not a url', 4)).toBe('Resonance Path 05');
  });
});

describe('[Server] visual genome (deterministic right page)', () => {
  const base = {
    fingerprintId: '7F3A9C1D2B6EE7A9',
    school: 'VOID',
    tags: ['darkwave', 'occult'],
    semanticTokens: ['veil', 'threshold', 'memory', 'echo', 'forgotten', 'return', 'sigil', 'silence'],
    lyricsText: 'we drift where the old stars bleed',
    bpm: 136,
    durationMs: 277000,
    title: 'Echoes of the Veil',
    musicalKey: 'Dm',
  };

  it('is fully deterministic: same inputs → byte-identical genome', () => {
    const a = deriveVisualGenome(base);
    const b = deriveVisualGenome({ ...base });
    expect(a).toEqual(b);
    expect(a.checksum).toBe(b.checksum);
  });

  it('a different fingerprint yields a different genome (audio identity dominates)', () => {
    const a = deriveVisualGenome(base);
    const b = deriveVisualGenome({ ...base, fingerprintId: 'DEADBEEFCAFE0001' });
    expect(b.seed).not.toBe(a.seed);
    expect(b.checksum).not.toBe(a.checksum);
  });

  it('anchors the base hue to the school when known', () => {
    const voidG = deriveVisualGenome(base);
    expect(voidG.baseHue).toBe(270); // VOID
    const sonic = deriveVisualGenome({ ...base, school: 'SONIC' });
    expect(sonic.baseHue).toBe(175); // SONIC
  });

  it('emits the concept right-page readouts', () => {
    const g = deriveVisualGenome(base);
    expect(VISUAL_ARCHETYPES).toContain(g.archetype);
    expect(g.symmetry).toBeGreaterThanOrEqual(3);
    expect(g.readouts.engine).toEqual(GLYPHCORE_ENGINE);
    expect(g.readouts.bytecodeSeed).toBe('0xVEIL-136-Dm');
    expect(g.readouts.semanticMap).toContain('Veil');
    expect(g.readouts.semanticMap.length).toBeLessThanOrEqual(8);
    expect(g.readouts.ritualSync.cycle).toMatch(/^[1-7]\/7$/);
    expect(typeof g.readouts.coordinates.x).toBe('number');
  });

  it('bytecode seed falls back to hex without title/key', () => {
    expect(formatBytecodeSeed({ seed: 0xabcd1234 })).toBe('0xABCD1234');
  });
});
