import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { BytecodeVisualiser } from './BytecodeVisualiser';
import { computeFingerprint, semanticTokens } from './bytecodeFingerprint';
import './BytecodeVisualiser.css';

const SAMPLE = {
  title: 'Echoes of the Veil',
  artist: 'Lumen Arcanum',
  album: 'Umbrae Prophetica',
  bpm: 136,
  key: 'D minor',
  hue: 286,
  duration: 277, // 4:37
  meta: [
    ['Duration', '4:37'],
    ['BPM', '136'],
    ['Key', 'D minor'],
    ['Genre', 'Darkwave · Occult Electronica'],
    ['File Type', 'FLAC · 24bit · 48kHz'],
    ['Released', 'May 3, 2025'],
  ],
  provenance: {
    statement: 'Crafted with human intention and AI assistance.',
    tools: ['Suno v3.5', 'Custom Lyric Model', 'Runescribe™'],
    assistance: 'Harmonic generation · texture layering · mastering polish',
  },
  lyrics: [
    'We drift where the old stars bleed',
    'Through whispers the sleepers heed',
    'I carve sigils in the static',
    'To bind what the silence freed',
    'Through the veil, the echoes call',
    'Fractured light behind it all',
    'Names forgotten, temples fall',
    'Still the echoes call',
    'I dream in code, the rune, the key',
    'To open doors that should not be',
    'The ouroboros sings to me',
    'In shadows woven from decree',
  ],
  highlight: 4, // 0-based: "Through the veil, the echoes call"
  annotations: [
    { n: 5, title: 'Echoes Call', body: 'The veil is the threshold between the known and the forgotten — sound becomes the bridge.' },
    { n: 7, title: 'Temples Fall', body: 'Collapsed systems, external and internal. The fall makes space for remembrance.' },
    { n: 11, title: 'Ouroboros', body: 'The eternal return — code that writes and rewrites itself. A loop of becoming.' },
  ],
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
  const fp = computeFingerprint(SAMPLE);
  const tokens = semanticTokens(`${SAMPLE.title} ${SAMPLE.lyrics.join(' ')}`, 8);

  // Real (audio-less) transport state — UI is state-driven, no dead buttons.
  const [progress, setProgress] = useState(138); // 2:18
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const n = p + 1;
        if (n >= SAMPLE.duration) return repeat ? 0 : (setPlaying(false), SAMPLE.duration);
        return n;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, repeat]);

  return (
    <main className="bcv-page bcv-reader" aria-label="Grimoire reader">
      <div className="bcv-spread">
        {/* ── LEFT PAGE: the track ───────────────────────────────────────── */}
        <section className="bcv-leftpage" aria-label="Track">
          <p className="bcv-eyebrow">✦ Verses &amp; Veritas ✦</p>
          <h1 className="bcv-tracktitle">{SAMPLE.title}</h1>
          <p className="bcv-artist">{SAMPLE.artist}</p>
          <p className="bcv-album">from the album · {SAMPLE.album}</p>

          <div className="bcv-trackhead">
            <div className="bcv-cover" aria-hidden="true"><span>◈</span></div>
            <dl className="bcv-meta">
              {SAMPLE.meta.map(([k, v]) => (
                <div className="bcv-meta__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>

          <section className="bcv-provenance" aria-label="Provenance">
            <h2>Provenance</h2>
            <p className="bcv-prov-statement">{SAMPLE.provenance.statement}</p>
            <p className="bcv-prov-label">Tools &amp; Model</p>
            <p className="bcv-prov-tools">{SAMPLE.provenance.tools.join(' · ')}</p>
            <p className="bcv-prov-label">Assistance</p>
            <p className="bcv-prov-tools">{SAMPLE.provenance.assistance}</p>
          </section>

          <ol className="bcv-lyrics">
            {SAMPLE.lyrics.map((line, i) => (
              <li key={i} className={i === SAMPLE.highlight ? 'is-highlight' : undefined}>
                <span className="bcv-lyric-n">{String(i + 1).padStart(2, '0')}</span>{line}
              </li>
            ))}
          </ol>

          <div className="bcv-annotations">
            {SAMPLE.annotations.map((a) => (
              <div className="bcv-annotation" key={a.n}>
                <p className="bcv-annotation__head">{String(a.n).padStart(2, '0')} · {a.title}</p>
                <p className="bcv-annotation__body">{a.body}</p>
              </div>
            ))}
          </div>

          {/* Player transport — every control state-driven (architect law). */}
          <div className="bcv-player">
            <span className="bcv-time">{fmt(progress)}</span>
            <div className="bcv-progress" role="presentation">
              <div className="bcv-progress__fill" style={{ width: `${(progress / SAMPLE.duration) * 100}%` }} />
            </div>
            <span className="bcv-time">{fmt(SAMPLE.duration)}</span>
          </div>
          <div className="bcv-transport">
            <button type="button" aria-label="Shuffle" aria-pressed={shuffle} className={shuffle ? 'is-on' : ''} onClick={() => setShuffle((s) => !s)}>🔀</button>
            <button type="button" aria-label="Previous" onClick={() => setProgress(0)}>⏮</button>
            <button type="button" aria-label={playing ? 'Pause' : 'Play'} className="bcv-transport__play" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸' : '▶'}</button>
            <button type="button" aria-label="Next" onClick={() => setProgress(SAMPLE.duration)}>⏭</button>
            <button type="button" aria-label="Repeat" aria-pressed={repeat} className={repeat ? 'is-on' : ''} onClick={() => setRepeat((r) => !r)}>🔁</button>
          </div>
        </section>

        {/* ── RIGHT PAGE: the bytecode visualiser ────────────────────────── */}
        <section className="bcv-rightpage" aria-label="Bytecode visualiser">
          <header className="bcv-head">
            <h1>Bytecode Visualiser</h1>
            <p>Deterministic Visual Experience</p>
          </header>

          <div className="bcv-grid">
            <section className="bcv-panel" aria-label="Song fingerprint">
              <h2>Song Fingerprint</h2>
              <p className="bcv-fp">{fp.fingerprint}</p>
              <p className="bcv-dim">// 256-bit checksum</p>
              {fp.checksumLines.map((line) => (<p className="bcv-hex" key={line}>{line}</p>))}
              <p className="bcv-seed">Bytecode Seed</p>
              <p className="bcv-fp bcv-fp--sm">{fp.seed}</p>
              <p className="bcv-dim">GlyphCore v2.7.1</p>
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
              <BytecodeVisualiser bpm={SAMPLE.bpm} hue={SAMPLE.hue} reducedMotion={reducedMotion} />
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
                    return <circle key={`${r}-${c}`} cx={x} cy={y} r={on ? 3.2 : 1.6} fill={on ? 'hsl(196 90% 62%)' : 'hsl(286 40% 40%)'} />;
                  })
                )}
              </svg>
            </section>

            <section className="bcv-panel bcv-panel--right" aria-label="Ritual sync">
              <h2>Ritual Sync</h2>
              <p className="bcv-coord"><span>PHASE</span> {fp.ritualSync.phase.toFixed(3)} φ</p>
              <p className="bcv-coord"><span>CYCLE</span> {fp.ritualSync.cycle}</p>
              <p className="bcv-coord"><span>BPM</span> {SAMPLE.bpm} · {SAMPLE.key}</p>
            </section>
          </div>

          <footer className="bcv-foot">The Pattern Is Law · The Sound Is Code</footer>
        </section>
      </div>
    </main>
  );
}
