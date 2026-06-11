import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRIMOIRE_TRACKS } from '../../src/pages/Visualiser/tracks';
import { parseAlignment } from '../../src/kits/scholomance-visualizer-kit/utils/lyricAlignment';

// The karaoke highlight identifies words by (line, word) indices counted over
// the REGISTRY lyrics, but the artifact's indices were counted over the
// .lyrics.txt the aligner consumed. Nothing at runtime re-aligns them — this
// test is the enforcement: edit a registry lyric without re-running
// scripts/align_lyrics.py and it fails here, not as a silently wrong
// highlight in production.

const ALIGNMENT_DIR = join(__dirname, '../../public/data/alignment');

// Mirror of tokenize_lines in scripts/align_lyrics.py: a token is a word iff
// it contains a letter (the renderer's /[A-Za-z]/ counter), indexed per line.
function tokenize(lines) {
  const out = [];
  lines.forEach((line, li) => {
    let wi = 0;
    for (const tok of line.split(/\s+/)) {
      if (!/[A-Za-z]/.test(tok)) continue;
      out.push({ line: li, word: wi, text: tok });
      wi += 1;
    }
  });
  return out;
}

const aligned = GRIMOIRE_TRACKS.map((t) => [t, join(ALIGNMENT_DIR, `${t.id}.alignment-v1.json`)])
  .filter(([, p]) => existsSync(p));

describe('alignment artifact ↔ track registry contract', () => {
  it('covers at least one shipped artifact (guard against silent skips)', () => {
    expect(aligned.length).toBeGreaterThan(0);
  });

  it.each(aligned.map(([t, p]) => [t.title, t, p]))(
    '%s: artifact words match the registry lyrics token-for-token',
    (_title, track, path) => {
      const artifact = JSON.parse(readFileSync(path, 'utf8'));

      // The artifact must survive the same gate the hook applies at runtime.
      expect(parseAlignment(artifact), 'parseAlignment rejected a committed artifact').not.toBeNull();
      expect(artifact.trackId).toBe(track.id);

      const expected = tokenize(track.lyrics);
      expect(artifact.words.length).toBe(expected.length);
      artifact.words.forEach((w, i) => {
        expect(
          { line: w.line, word: w.word, text: w.text },
          `word ${i} diverged — registry lyrics were edited after alignment`,
        ).toEqual(expected[i]);
      });

      expect(artifact.lines.length).toBe(track.lyrics.length);
    },
  );
});
