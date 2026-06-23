import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GenomeSigil } from './GenomeSigil';
import { activeLyricIndex, type VisualGenome } from './genomeGeometry';
import { useTrackPlayer } from './useTrackPlayer';
import { fetchGrimoire } from '../../lib/catalog.api.js';
import './GrimoireSpread.css';

interface LyricLine { id: number; lineIndex: number; startMs: number | null; endMs: number | null; text: string }
interface Annotation { id: number; startLine: number; endLine: number; title: string | null; body: string }
interface Provenance {
  version: number; origin: string; model: string | null;
  promptLineage: unknown; humanEditRatio: number | null; stemsAvailable: boolean;
  license: string; verified: boolean;
}
export interface GrimoireView {
  artist: { handle: string; displayName: string; primarySchool: string | null } | null;
  release: { id: number; title: string; coverUrl: string | null; publishedAt: string | null } | null;
  track: {
    id: number; title: string; durationMs: number | null; bpm: number | null;
    musicalKey: string | null; genre: string | null; streamUrl: string | null;
    fingerprintId: string | null;
  };
  leftPage: { lyrics: LyricLine[]; annotations: Annotation[]; provenance: Provenance | null; tags: string[] };
  rightPage: VisualGenome;
}

const NAV = ['Library', 'Grimoire', 'Rituals', 'Codex', 'Artifacts', 'History'];

function fmtTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '--:--';
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ORIGIN_LABEL: Record<string, string> = {
  human: 'Human-made',
  ai_assisted: 'Crafted with human intention and AI assistance',
  ai_generated: 'AI-generated, human-curated',
  hybrid: 'Hybrid human + AI',
};

export const GrimoireSpread: React.FC<{ view?: GrimoireView }> = ({ view: viewProp }) => {
  const params = useParams();
  const [view, setView] = useState<GrimoireView | null>(viewProp ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (viewProp) { setView(viewProp); return; }
    const id = params.trackId;
    if (!id) return;
    let cancelled = false;
    fetchGrimoire(id)
      .then((data) => { if (!cancelled) setView(data); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load'); });
    return () => { cancelled = true; };
  }, [params.trackId, viewProp]);

  const {
    isPlaying, positionMs, durationMs, pulse, toggle, seekTo,
  } = useTrackPlayer({
    streamUrl: view?.track.streamUrl,
    fingerprintId: view?.track.fingerprintId,
    fallbackDurationMs: view?.track.durationMs ?? 0,
  });

  const activeLine = useMemo(
    () => (view ? activeLyricIndex(view.leftPage.lyrics, positionMs) : -1),
    [view, positionMs],
  );

  if (error) return <div className="grimoire-shell grimoire-error">⚠ {error}</div>;
  if (!view) return <div className="grimoire-shell grimoire-loading">Opening the tome...</div>;

  const { artist, release, track, leftPage, rightPage } = view;
  const prov = leftPage.provenance;
  const duration = durationMs || track.durationMs || 0;

  return (
    <div className="grimoire-shell">
      <nav className="grimoire-rail" aria-label="Grimoire navigation">
        <button className="rail-orb" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={toggle}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        {NAV.map((item) => (
          <button key={item} className={`rail-item${item === 'Grimoire' ? ' is-active' : ''}`}>
            <span className="rail-dot" aria-hidden />
            <span className="rail-label">{item}</span>
          </button>
        ))}
      </nav>

      <div className="grimoire-book">
        {/* ── LEFT PAGE - VERSES & VERITAS ─────────────────────────────── */}
        <section className="page page--left" aria-label="Song details and lyrics">
          <header className="page-cartouche">✦ Verses &amp; Veritas ✦</header>
          <h1 className="song-title">{track.title}</h1>
          <div className="song-artist">{artist?.displayName ?? 'Unknown'}</div>
          {release && <div className="song-album">from the album <em>{release.title}</em></div>}

          {release?.coverUrl && (
            <div className="cover-plate"><img src={release.coverUrl} alt={`${release.title} cover`} /></div>
          )}

          <div className="meta-grid">
            <div className="meta-col">
              <Meta label="Duration" value={fmtTime(track.durationMs)} />
              <Meta label="BPM" value={track.bpm != null ? String(Math.round(track.bpm)) : ' - '} />
              <Meta label="Key" value={track.musicalKey ?? ' - '} />
              <Meta label="Genre" value={track.genre ?? ' - '} />
            </div>
            {prov && (
              <div className="meta-col provenance">
                <div className="meta-head">
                  Provenance {prov.verified
                    ? <span className="prov-seal" title="Signature verified">✓ sealed</span>
                    : <span className="prov-seal prov-seal--warn" title="Signature mismatch">⚠ unsealed</span>}
                </div>
                <p className="prov-credo">{ORIGIN_LABEL[prov.origin] || prov.origin}.</p>
                {prov.model && <div className="prov-row"><span>Model</span><b>{prov.model}</b></div>}
                {prov.humanEditRatio != null && (
                  <div className="prov-row"><span>Human edit</span><b>{Math.round(prov.humanEditRatio * 100)}%</b></div>
                )}
                <div className="prov-row"><span>Stems</span><b>{prov.stemsAvailable ? 'available' : ' - '}</b></div>
              </div>
            )}
          </div>

          <ol className="lyrics">
            {leftPage.lyrics.map((line, i) => (
              <li key={line.id} className={`lyric-line${i === activeLine ? ' is-active' : ''}`}>
                <span className="lyric-num">{String(line.lineIndex + 1).padStart(2, '0')}</span>
                <span className="lyric-text">{line.text}</span>
              </li>
            ))}
          </ol>

          {leftPage.annotations.length > 0 && (
            <div className="annotations">
              {leftPage.annotations.map((a) => <AnnotationCard key={a.id} annotation={a} />)}
            </div>
          )}

          <div className="transport">
            <button className="t-play" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className="t-time">{fmtTime(positionMs)}</span>
            <input
              className="t-scrub"
              type="range"
              min={0}
              max={duration || 1}
              value={Math.min(positionMs, duration || 1)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek"
            />
            <span className="t-time">{fmtTime(duration)}</span>
          </div>
        </section>

        {/* ── RIGHT PAGE - BYTECODE VISUALISER ─────────────────────────── */}
        <section className="page page--right" aria-label="Deterministic visual experience">
          <header className="page-cartouche page-cartouche--arc">✦ Bytecode Visualiser ✦</header>
          <div className="arc-subtitle">Deterministic Visual Experience</div>

          <div className="arc-body">
            <aside className="arc-readouts arc-readouts--left">
              <Readout label="Song Fingerprint" value={track.fingerprintId ?? ' - '} mono />
              <Readout label="Bytecode Seed" value={rightPage.readouts?.bytecodeSeed ?? `0x${rightPage.seed.toString(16)}`} mono />
              <Readout label="Engine" value={`${rightPage.readouts?.engine?.name ?? 'GlyphCore'} v${rightPage.readouts?.engine?.version ?? '1'}`} />
              <Readout label="Archetype" value={rightPage.archetype} />
            </aside>

            <div className="arc-stage">
              <GenomeSigil genome={rightPage} size={520} pulse={pulse} className="genome-sigil" />
            </div>

            <aside className="arc-readouts arc-readouts--right">
              <div className="readout">
                <div className="readout-label">Semantic Map</div>
                <ul className="semantic-map">
                  {(rightPage.readouts?.semanticMap ?? []).map((t) => (
                    <li key={t}><span className="sm-dot" aria-hidden /> {t}</li>
                  ))}
                </ul>
              </div>
              {rightPage.readouts?.coordinates && (
                <div className="readout">
                  <div className="readout-label">Coordinates</div>
                  <div className="coords">
                    <span>X {rightPage.readouts.coordinates.x}</span>
                    <span>Y {rightPage.readouts.coordinates.y}</span>
                    <span>Z {rightPage.readouts.coordinates.z}</span>
                  </div>
                </div>
              )}
              {rightPage.readouts?.ritualSync && (
                <Readout label="Ritual Sync" value={`φ ${rightPage.readouts.ritualSync.phase} · ${rightPage.readouts.ritualSync.cycle}`} />
              )}
            </aside>
          </div>

          <footer className="arc-credo">The Pattern is Law · The Sound is Code</footer>
        </section>
      </div>
    </div>
  );
};

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="meta-row"><span className="meta-label">{label}</span><span className="meta-val">{value}</span></div>
);

const Readout: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="readout">
    <div className="readout-label">{label}</div>
    <div className={`readout-val${mono ? ' is-mono' : ''}`}>{value}</div>
  </div>
);

const AnnotationCard: React.FC<{ annotation: Annotation }> = ({ annotation }) => {
  const [open, setOpen] = useState(false);
  const lineLabel = annotation.startLine === annotation.endLine
    ? String(annotation.startLine + 1).padStart(2, '0')
    : `${String(annotation.startLine + 1).padStart(2, '0')}-${String(annotation.endLine + 1).padStart(2, '0')}`;
  return (
    <div className="annotation">
      <div className="anno-head">
        <span className="anno-line">{lineLabel}</span>
        <span className="anno-title">{annotation.title ?? 'Annotation'}</span>
      </div>
      <p className={`anno-body${open ? ' is-open' : ''}`}>{annotation.body}</p>
      <button className="anno-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▴ View less' : '▾ View more'}
      </button>
    </div>
  );
};

export default GrimoireSpread;
