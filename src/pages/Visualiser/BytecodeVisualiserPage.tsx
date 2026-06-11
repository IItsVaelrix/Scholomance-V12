import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { BytecodeVisualiser } from './BytecodeVisualiser';
import { DiscographyNav } from './DiscographyNav';
import { computeFingerprint, semanticTokens } from './bytecodeFingerprint';
import { PhonemeEngine, generateSchoolColor } from '../../lib/engine.adapter.js';
import { alignPhonemes } from '../../lib/phonology/phonemeAlignment.js';
import { useLyricAlignment } from '../../kits/scholomance-visualizer-kit/hooks/useLyricAlignment';
import { lineAtTime, wordAtTime } from '../../kits/scholomance-visualizer-kit/utils/lyricAlignment';
import { GRIMOIRE_TRACKS, DEFAULT_PACING, type GrimoireTrack, type TrackPacing } from './tracks';
import { wordTruesight } from './truesightColor';
import './BytecodeVisualiser.css';

interface PhonemeEngineAPI {
  init?: () => Promise<unknown>;
  analyzeDeep?: (w: string) => { phonemes?: string[]; syllableCount?: number } | null;
}

/** Fallback syllable estimate (pre-engine): vowel groups + silent-e. */
function syllableCountHeuristic(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  let count = (w.match(/[aeiouy]+/g) ?? []).length;
  if (count > 1 && w.endsWith('e') && !w.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

/** Elongated written vowel runs ("Oooooohhhhh") are held across extra beats. */
function melismaBonus(word: string): number {
  const runs = word.toLowerCase().match(/([aeiou])\1{2,}/g);
  return runs ? runs.length * 3 : 0;
}

// ── Lyric pacing — tempo × phoneme-engine syllables ───────────────────────
// Each track publishes no per-line timestamps, so each line's duration is
// estimated mathematically: syllables per word from the phoneme engine's
// syllabifier (graphemic vowel-group heuristic only as the pre-init fallback,
// melisma-aware) ÷ syllables-per-beat for its delivery style, quantized to a
// half-beat grid at the detected tempo. Adjacent lines that alignPhonemes
// scores as phonemically parallel (rhymed/anaphoric couplets) are snapped to
// the same bar length — couplets share bars in rap flow. Cumulative beat-times
// are scaled onto the vocal window, which absorbs breaths and fills.

function beatsFromSyllables(syl: number, lineIndex: number, pacing: TrackPacing): number {
  const chorus = pacing.chorusStartLine !== undefined && lineIndex >= pacing.chorusStartLine;
  const spb = chorus ? pacing.chorusSylPerBeat : pacing.verseSylPerBeat;
  return Math.max(2, Math.round((syl / spb) * 2) / 2); // half-beat grid, >=2 beats
}

/** Pre-init line beats from the graphemic heuristic; replaced by the engine. */
function heuristicLineBeats(track: GrimoireTrack, pacing: TrackPacing): number[] {
  return track.lyrics.map((line, i) =>
    beatsFromSyllables(
      line.split(/\s+/).reduce((a, w) => a + syllableCountHeuristic(w) + melismaBonus(w), 0),
      i,
      pacing,
    ));
}

/** Playhead seconds -> active lyric line (-1 outside the vocal window). */
function lyricLineAt(progress: number, duration: number, lineBeats: number[], pacing: TrackPacing): number {
  const totalBeats = lineBeats.reduce((a, b) => a + b, 0);
  const windowS = Math.max(1, duration - pacing.leadInS - pacing.tailS);
  const nominalBeatS = 60 / pacing.bpm;
  const scale = windowS / (totalBeats * nominalBeatS);
  const beatS = nominalBeatS * scale;
  const t = progress - pacing.leadInS;
  if (t < 0) return -1;
  let acc = 0;
  for (let i = 0; i < lineBeats.length; i += 1) {
    acc += lineBeats[i] * beatS;
    if (t < acc) return i;
  }
  return lineBeats.length - 1;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Extract an HSL hue (0..360) from a hex/hsl colour string. */
function colorToHue(color: string | undefined, fallback = 286): number {
  if (!color) return fallback;
  const m = color.match(/hsl\(\s*([\d.]+)/i);
  if (m) return parseFloat(m[1]);
  const hex = color.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return fallback;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return Math.round(h);
}

/** Monoline transport glyph — crisp currentColor strokes, no emoji glyphs. */
function TransportGlyph({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const GLYPHS = {
  suno: 'M15 3h6v6M21 3l-9 9M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  prev: 'M19 20 9 12l10-8v16ZM5 19V5',
  play: 'M7 4.5 19.5 12 7 19.5v-15Z',
  pause: 'M7 4h3.4v16H7zM13.6 4H17v16h-3.4z',
  next: 'm5 4 10 8-10 8V4ZM19 5v14',
  repeat: 'm17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
};

/** A small animated synthetic waveform line (one spectral band). */
function MiniWave({ hue, phase, reducedMotion }: { hue: number; phase: number; reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { const r = c.getBoundingClientRect(); c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); };
    resize();
    let raf = 0;
    const draw = (tMs: number) => {
      const t = tMs / 1000;
      const W = c.width, H = c.height;
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const n = x / W;
        const y = H / 2 + Math.sin(n * 22 + t * 3 + phase) * Math.sin(n * 6 - t * 1.5) * (H * 0.34);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${hue}, 90%, 64%, 0.85)`;
      ctx.lineWidth = 1.4 * dpr;
      ctx.shadowBlur = 8; ctx.shadowColor = `hsla(${hue}, 90%, 64%, 0.6)`;
      ctx.stroke();
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    if (reducedMotion) draw(0); else raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hue, phase, reducedMotion]);
  return <canvas ref={ref} className="bcv-miniwave" aria-hidden="true" />;
}

export default function BytecodeVisualiserPage() {
  const reducedMotion = usePrefersReducedMotion();

  // Active grimoire track — deep-linkable: ?track=<id>.
  const [activeTrack, setActiveTrack] = useState<GrimoireTrack>(() => {
    const id = new URLSearchParams(window.location.search).get('track');
    return GRIMOIRE_TRACKS.find((t) => t.id === id) ?? GRIMOIRE_TRACKS[0];
  });
  const pacing = activeTrack.pacing ?? DEFAULT_PACING;

  // ── Real transport: an <audio> element streams the published Suno track. ──
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [fftReady, setFftReady] = useState(false);
  const [audioOk, setAudioOk] = useState(true);
  const [duration, setDuration] = useState(activeTrack.duration);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [coverOk, setCoverOk] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const selectTrack = (track: GrimoireTrack) => {
    if (track.id === activeTrack.id) return;
    setActiveTrack(track);
    setProgress(0);
    setPlaying(false);
    setAudioOk(true);
    setAudioBlocked(false);
    setCoverOk(true);
    // New <audio> element (key change) -> the Web Audio graph must rebuild.
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setFftReady(false);
    const url = new URL(window.location.href);
    url.searchParams.set('track', track.id);
    window.history.replaceState(null, '', url);
  };

  // Sync duration when track changes.
  useEffect(() => { setDuration(activeTrack.duration); }, [activeTrack]);

  // Fingerprint seeded only from real track facts: id, title, duration, model version.
  const fp = useMemo(() => computeFingerprint({
    title: activeTrack.title,
    bpm: activeTrack.duration,
    key: activeTrack.modelVersion,
    trackId: activeTrack.id,
  }), [activeTrack]);
  const tokens = useMemo(() => semanticTokens(`${activeTrack.title} ${activeTrack.lyrics.join(' ')}`, 8), [activeTrack]);

  /** Web Audio graph built on first user gesture (autoplay policy). */
  const ensureAnalyser = () => {
    const el = audioRef.current;
    if (!el || analyserRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; // 256 bins >= visualiser's 192-slot read
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setFftReady(true);
    } catch {
      /* graceful: mandala keeps its deterministic synthetic spectrum */
    }
  };

  useEffect(() => () => { audioCtxRef.current?.close().catch(() => {}); }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !audioOk) { setPlaying((p) => !p); return; }
    if (el.paused) {
      ensureAnalyser();
      audioCtxRef.current?.resume().catch(() => {});
      el.play().catch(() => {
        setAudioOk(false);
        setAudioBlocked(true);
      });
    } else {
      el.pause();
    }
  };

  const seekTo = (t: number) => {
    const el = audioRef.current;
    if (el && audioOk) el.currentTime = t;
    setProgress(t);
  };

  // Fallback simulator: only if the stream is unreachable, the transport keeps
  // its 1s tick so the surface stays state-driven (no dead buttons).
  useEffect(() => {
    if (!playing || audioOk) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const n = p + 1;
        if (n >= duration) return repeat ? 0 : (setPlaying(false), duration);
        return n;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, repeat, audioOk, duration]);

  // Ground-truth karaoke sync: static forced-alignment artifact, when one
  // exists for this track. Null -> every consumer below keeps the heuristic.
  const alignment = useLyricAlignment(activeTrack.id);

  // timeupdate fires ~4 Hz — too coarse for word-level highlight (words run
  // ~0.2-0.5 s). While playing with alignment data, refine at ~8 Hz; the
  // mandala survives this re-render rate by design (stable readFFT identity).
  useEffect(() => {
    if (!playing || !audioOk || !alignment) return;
    const id = window.setInterval(() => {
      const el = audioRef.current;
      if (el) setProgress(el.currentTime);
    }, 120);
    return () => window.clearInterval(id);
  }, [playing, audioOk, alignment]);

  // Truesight: phoneme-coloured lyrics, computed once after the engine inits.
  // Deterministic (same word -> same vowel family -> same school colour); if the
  // engine fails to init, lyrics stay plain (graceful).
  const [coloredLyrics, setColoredLyrics] = useState<{ word: string; color: string | null; school: string | null; analysis: any }[][] | null>(null);
  const [hoveredWord, setHoveredWord] = useState<{ word: string; color: string; school: string; line: number; analysis: any } | null>(null);
  const [dominantSchool, setDominantSchool] = useState<string>('SONIC');
  const [lineBeats, setLineBeats] = useState<number[]>(() => heuristicLineBeats(activeTrack, pacing));
  useEffect(() => {
    // Reset colours/beats immediately when track changes so the old track never
    // paints the new track's display.
    setColoredLyrics(null);
    setLineBeats(heuristicLineBeats(activeTrack, pacing));
    let cancelled = false;
    (async () => {
      try {
        const initEngine = PhonemeEngine as PhonemeEngineAPI;
        await initEngine.init?.();
      } catch {
        /* graceful: lyrics render plain, pacing keeps the heuristic beats */
      }
      if (cancelled) return;
      const counts: Record<string, number> = {};
      const computed = activeTrack.lyrics.map((line) =>
        line.split(/(\s+)/).map((tok) => {
          const ts = /\S/.test(tok) ? wordTruesight(tok) : null;
          if (ts) counts[ts.school] = (counts[ts.school] || 0) + 1;
          return { word: tok, color: ts?.color ?? null, school: ts?.school ?? null, analysis: ts?.analysis ?? null };
        }),
      );
      const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SONIC';

      // Engine-backed pacing: syllabifier counts (every word, function words
      // included) + concatenated ARPAbet sequence per line for couplet checks.
      const engine = PhonemeEngine as PhonemeEngineAPI;
      const lines = activeTrack.lyrics.map((line, i) => {
        let syl = 0;
        const phonemes: string[] = [];
        for (const tok of line.split(/\s+/)) {
          const clean = tok.replace(/[^A-Za-z]/g, '');
          if (!clean) continue;
          const a = engine.analyzeDeep?.(clean) ?? null;
          syl += (a?.syllableCount || syllableCountHeuristic(clean)) + melismaBonus(tok);
          if (a?.phonemes?.length) phonemes.push(...a.phonemes);
        }
        return { beats: beatsFromSyllables(syl, i, pacing), phonemes };
      });

      // Couplet symmetry: adjacent lines whose feature-aware alignment cost is
      // low (rhymed / anaphoric pairs) share the longer bar length.
      for (let i = 0; i + 1 < lines.length; i += 1) {
        if (pacing.chorusStartLine !== undefined && i + 1 === pacing.chorusStartLine) continue; // never pair across sections
        const a = lines[i].phonemes;
        const b = lines[i + 1].phonemes;
        if (a.length < 4 || b.length < 4) continue;
        const { cost } = alignPhonemes(a, b);
        if (cost / Math.max(a.length, b.length) <= pacing.coupletCostMax) {
          const bar = Math.max(lines[i].beats, lines[i + 1].beats);
          lines[i].beats = bar;
          lines[i + 1].beats = bar;
        }
      }

      if (!cancelled) {
        setColoredLyrics(computed);
        setDominantSchool(dom);
        setLineBeats(lines.map((l) => l.beats));
      }
    })();
    return () => { cancelled = true; };
  }, [activeTrack, pacing]);

  // The track's "world" — themed to its dominant phonemic school.
  const worldColor = generateSchoolColor(dominantSchool);
  const worldHue = colorToHue(worldColor);

  // Beat-sync: forced-aligned line spans when the artifact exists; the
  // syllable-rate estimate is the unchanged fallback path.
  const alignedPos = alignment ? lineAtTime(alignment.lines, progress) : -1;
  const activeLine = alignment
    ? (alignedPos < 0 ? -1 : alignment.lines[alignedPos].index)
    : lyricLineAt(progress, duration, lineBeats, pacing);
  const sungIdx = alignment ? wordAtTime(alignment.words, progress) : -1;
  const sungWord = alignment && sungIdx >= 0 ? alignment.words[sungIdx] : null;

  // Follow the words: keep the active line in view while playing.
  const lyricsRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!playing || activeLine < 0) return;
    const el = lyricsRef.current?.children[activeLine] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeLine, playing, reducedMotion]);

  // Live FFT once the Web Audio graph exists; deterministic synthetic before
  // that. Stable identity (useCallback) is load-bearing: a fresh function per
  // render would restart the mandala's canvas effect on every timeupdate
  // re-render (~4 Hz) and make the orb flicker.
  const readFFT = useCallback((a: Uint8Array) => {
    analyserRef.current?.getByteFrequencyData(a as Uint8Array<ArrayBuffer>);
  }, []);
  const getFFT = fftReady ? readFFT : undefined;
  const visibleColoredLyrics = coloredLyrics?.length === activeTrack.lyrics.length ? coloredLyrics : null;

  return (
    <main
      className="bcv-page bcv-reader"
      aria-label="Grimoire reader"
      data-school={dominantSchool}
      style={{ '--bcv-world': worldColor } as CSSProperties}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- no VTT exists for
          this track; the left page renders the full lyrics with aria-current
          playhead tracking, which is the captioning surface. */}
      <audio
        key={activeTrack.id}
        ref={audioRef}
        src={activeTrack.audioUrl}
        crossOrigin="anonymous"
        preload="metadata"
        loop={repeat}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || activeTrack.duration)}
        onError={() => setAudioOk(false)}
      />

      <div className="bcv-spread">
        {/* ── LEFT PAGE: the track ───────────────────────────────────────── */}
        <section className="bcv-leftpage" aria-label="Track">
          <p className="bcv-eyebrow">✦ Verses &amp; Veritas ✦</p>
          <h1 className="bcv-tracktitle">{activeTrack.title}</h1>
          <p className="bcv-artist">{activeTrack.artist}</p>
          <p className="bcv-album">a suno incantation · {activeTrack.model} {activeTrack.modelVersion}</p>

          <div className="bcv-trackhead">
            <div className="bcv-cover">
              {coverOk
                ? <img src={activeTrack.coverUrl} alt={`${activeTrack.title} cover art`} onError={() => setCoverOk(false)} />
                : <span aria-hidden="true">◈</span>}
            </div>
            <dl className="bcv-meta">
              {activeTrack.meta.map(([k, v]) => (
                <div className="bcv-meta__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
              {/* Provenance comes from the artifact itself, never hardcoded —
                  a non-aligned artifact must not be presented as aligned. */}
              <div className="bcv-meta__row"><dt>Sync</dt><dd>{alignment ? `aligned · ${alignment.source.aligner}` : 'estimated'}</dd></div>
            </dl>
          </div>

          <section className="bcv-provenance" aria-label="Provenance">
            <h2>Provenance</h2>
            <p className="bcv-prov-statement">{activeTrack.provenance.statement}</p>
            <p className="bcv-prov-label">Tools &amp; Model</p>
            <p className="bcv-prov-tools">{activeTrack.provenance.tools.join(' · ')}</p>
            <p className="bcv-prov-label">Assistance</p>
            <p className="bcv-prov-tools">{activeTrack.provenance.assistance}</p>
          </section>

          <ol ref={lyricsRef} className={`bcv-lyrics ${visibleColoredLyrics ? 'is-truesight' : ''}`}>
            {activeTrack.lyrics.map((line, i) => (
              <li
                key={i}
                className={i === activeLine ? 'is-highlight' : undefined}
                aria-current={i === activeLine ? 'true' : undefined}
              >
                <span className="bcv-lyric-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="bcv-lyric-text">
                  {visibleColoredLyrics
                    ? (() => {
                        let w = -1;
                        return visibleColoredLyrics[i].map((tok, j) => {
                          const isWord = /[A-Za-z]/.test(tok.word);
                          if (isWord) w += 1;
                          // Text equality guards against registry lyrics drifting from
                          // the lyrics the artifact was aligned against — a stale
                          // artifact must not highlight the wrong word.
                          const sung = isWord && sungWord !== null && sungWord.line === i
                            && sungWord.word === w && sungWord.text === tok.word;
                          return (
                            <span
                              key={j}
                              className={tok.color ? 'bcv-tsword' : undefined}
                              style={tok.color ? ({ '--w': tok.color } as CSSProperties) : undefined}
                              data-sung={sung ? (sungWord?.backing ? 'backing' : 'true') : undefined}
                              onMouseEnter={tok.color ? () => setHoveredWord({ word: tok.word, color: tok.color!, school: tok.school!, line: i, analysis: tok.analysis }) : undefined}
                              onMouseLeave={tok.color ? () => setHoveredWord(null) : undefined}
                            >{tok.word}</span>
                          );
                        });
                      })()
                    : line}
                </span>
              </li>
            ))}
          </ol>

          <section className="bcv-annotations-layer" aria-labelledby="annotations-heading">
            <h2 id="annotations-heading" className="sr-only">Truesight Annotations</h2>
            <div className="bcv-annotations-grid">
              <AnimatePresence mode="wait">
                {hoveredWord && (
                  <motion.div
                    key={`word-${hoveredWord.word}-${hoveredWord.line}`}
                    className="bcv-panel bcv-panel--annotation"
                    initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    role="article"
                    style={{ borderLeftColor: hoveredWord.color }}
                  >
                    <header className="bcv-annotation__header">
                      <span className="bcv-annotation__id" style={{ color: hoveredWord.color, textShadow: `0 0 10px ${hoveredWord.color}66` }}>
                        {hoveredWord.school}
                      </span>
                      <h3 className="bcv-annotation__title" style={{ color: hoveredWord.color }}>{hoveredWord.word}</h3>
                      {hoveredWord.analysis?.syllableCount && (
                         <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--bcv-dim)' }}>
                           DEPTH: {hoveredWord.analysis.syllableCount}
                         </span>
                      )}
                    </header>
                    <div className="bcv-annotation__content">
                      <p className="bcv-annotation__body">
                        {hoveredWord.analysis?.rhymeKey && `Echo Key: ${hoveredWord.analysis.rhymeKey} · `}
                        {hoveredWord.analysis?.vowelFamily && `Vowel Family: ${hoveredWord.analysis.vowelFamily}`}
                        {!hoveredWord.analysis?.rhymeKey && !hoveredWord.analysis?.vowelFamily && `Arcane structural token mapped to the ${hoveredWord.school} school.`}
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {hoveredWord && activeTrack.annotations.filter(a => a.n === hoveredWord.line).map((a, idx) => (
                  <motion.div
                    key={a.n}
                    className="bcv-panel bcv-panel--annotation"
                    initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, delay: reducedMotion ? 0 : 0.05, ease: 'easeOut' }}
                    role="article"
                  >
                    <header className="bcv-annotation__header">
                      <span className="bcv-annotation__id">
                        {String(a.n).padStart(2, '0')}
                      </span>
                      <h3 className="bcv-annotation__title">{a.title}</h3>
                    </header>
                    <div className="bcv-annotation__content">
                      <p className="bcv-annotation__body">{a.body}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {audioBlocked && (
            <div className="bcv-audio-warning" style={{ color: 'hsl(0 90% 70%)', fontSize: '0.85rem', marginBottom: '8px', padding: '8px', background: 'hsl(0 90% 10%)', borderRadius: '4px', border: '1px solid hsl(0 90% 20%)' }}>
              ⚠️ Audio Blocked — Please interact with the page or check your browser settings to allow playback.
            </div>
          )}

          {/* Player transport — every control state-driven (architect law). */}
          <div className="bcv-player">
            <span className="bcv-time">{fmt(progress)}</span>
            <div className="bcv-progress" role="presentation">
              <div className="bcv-progress__fill" style={{ width: `${(progress / duration) * 100}%` }} />
            </div>
            <span className="bcv-time">{fmt(duration)}</span>
          </div>
          <div className="bcv-transport">
            <a
              className="bcv-transport__link"
              href={activeTrack.sunoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${activeTrack.title} on Suno`}
            >
              <TransportGlyph d={GLYPHS.suno} />
            </a>
            <button type="button" aria-label="Restart" onClick={() => seekTo(0)}><TransportGlyph d={GLYPHS.prev} /></button>
            <button type="button" aria-label={playing ? 'Pause' : 'Play'} className="bcv-transport__play" onClick={togglePlay}><TransportGlyph d={playing ? GLYPHS.pause : GLYPHS.play} filled /></button>
            <button type="button" aria-label="Skip to end" onClick={() => seekTo(duration)}><TransportGlyph d={GLYPHS.next} /></button>
            <button type="button" aria-label="Repeat" aria-pressed={repeat} className={repeat ? 'is-on' : ''} onClick={() => setRepeat((r) => !r)}><TransportGlyph d={GLYPHS.repeat} /></button>
          </div>
        </section>

        {/* ── RIGHT PAGE: the bytecode visualiser ────────────────────────── */}
        <section className="bcv-rightpage" aria-label="Bytecode visualiser">
          <header className="bcv-head">
            <h1>
              Bytecode Visualiser
              <span className="bcv-vtag">GlyphCore 2.7.1</span>
            </h1>
            <p>
              <span className={`bcv-beacon${playing ? ' is-live' : ''}`} aria-hidden="true" />
              Deterministic Visual Experience · {dominantSchool} world · {playing ? 'ritual live' : 'standby'}
            </p>
          </header>

          <div className="bcv-grid">
            <section className="bcv-panel" aria-label="Song fingerprint">
              <h2>Song Fingerprint</h2>
              <p className="bcv-fp">{fp.fingerprint}</p>
              <p className="bcv-dim">{'// 256-bit checksum'}</p>
              {fp.checksumLines.map((line) => (<p className="bcv-hex" key={line}>{line}</p>))}
              <p className="bcv-seed">Bytecode Seed</p>
              <p className="bcv-fp bcv-fp--sm">{fp.seed}</p>
            </section>

            <section className="bcv-panel" aria-label="Spectral analysis">
              <h2>Spectral Analysis</h2>
              <MiniWave hue={26} phase={0} reducedMotion={reducedMotion} />
              <MiniWave hue={312} phase={2} reducedMotion={reducedMotion} />
              <MiniWave hue={196} phase={4} reducedMotion={reducedMotion} />
            </section>

            <section className="bcv-panel" aria-label="Coordinates">
              <h2>Coordinates</h2>
              <p className="bcv-coord"><span>X</span> {fp.coordinates.x.toFixed(4)}</p>
              <p className="bcv-coord"><span>Y</span> {fp.coordinates.y.toFixed(4)}</p>
              <p className="bcv-coord"><span>Z</span> {fp.coordinates.z.toFixed(4)}</p>
            </section>

            <div className="bcv-stage">
              <BytecodeVisualiser
                bpm={pacing.bpm}
                hue={worldHue}
                reducedMotion={reducedMotion}
                getByteFrequencyData={getFFT}
              />
              <div className="bcv-stage__scanlines" aria-hidden="true" />
            </div>

            <section className="bcv-panel bcv-panel--right" aria-label="Semantic map">
              <h2>Semantic Map</h2>
              <ul className="bcv-semantic">
                {tokens.map((tok) => (<li key={tok}><span aria-hidden="true">◈</span>{tok}</li>))}
              </ul>
            </section>

            <section className="bcv-panel bcv-panel--right" aria-label="Energy matrix">
              <h2>Energy Matrix</h2>
              <svg className="bcv-matrix" viewBox="0 0 120 90" aria-hidden="true">
                {Array.from({ length: 5 }).flatMap((_, r) =>
                  Array.from({ length: 7 }).map((__, c) => {
                    const x = 12 + c * 16 + (r % 2) * 8;
                    const y = 12 + r * 16;
                    const on = (fp.hash >> (r * 7 + c)) & 1;
                    return <circle key={`${r}-${c}`} cx={x} cy={y} r={on ? 3.2 : 1.6} fill={on ? `hsl(${worldHue} 90% 62%)` : `hsl(${worldHue} 32% 15%)`} />;
                  })
                )}
              </svg>
            </section>

            <section className="bcv-panel bcv-panel--right" aria-label="Ritual sync">
              <h2>Ritual Sync</h2>
              <p className="bcv-coord"><span>PHASE</span> {fp.ritualSync.phase.toFixed(3)} φ</p>
              <p className="bcv-coord"><span>CYCLE</span> {fp.ritualSync.cycle}</p>
              <p className="bcv-coord"><span>MODEL</span> {activeTrack.model} · {activeTrack.modelVersion}</p>
            </section>
          </div>

          <footer className="bcv-foot">The Pattern Is Law · The Sound Is Code</footer>
        </section>
      </div>

      {import.meta.env.VITE_ENABLE_DISCOGRAPHY !== 'false' && (
        <DiscographyNav activeTrackId={activeTrack.id} onSelectTrack={selectTrack} />
      )}
    </main>
  );
}
