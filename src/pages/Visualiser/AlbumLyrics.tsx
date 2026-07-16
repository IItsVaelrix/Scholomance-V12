import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLyricAlignment } from '../../kits/scholomance-visualizer-kit/hooks/useLyricAlignment';
import { lineAtTime, wordAtTime } from '../../kits/scholomance-visualizer-kit/utils/lyricAlignment';
import { wordTruesight } from './truesightColor';
import type { ResolvedAlbumTrack } from './hooks/useAlbumResolver';
import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';
import type { TrackPacing } from './tracks/types';

interface AlbumLyricsProps {
  track: ResolvedAlbumTrack;
  currentTime: number;
  status: PlaybackStatus;
  reducedMotion?: boolean;
}

function syllableCountHeuristic(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  let count = (w.match(/[aeiouy]+/g) ?? []).length;
  if (count > 1 && w.endsWith('e') && !w.endsWith('le')) count -= 1;
  return Math.max(1, count);
}

function melismaBonus(word: string): number {
  const runs = word.toLowerCase().match(/([aeiou])\1{2,}/g);
  return runs ? runs.length * 3 : 0;
}

function beatsFromSyllables(syl: number, lineIndex: number, pacing: TrackPacing): number {
  const chorus = pacing.chorusStartLine !== undefined && lineIndex >= pacing.chorusStartLine;
  const spb = chorus ? pacing.chorusSylPerBeat : pacing.verseSylPerBeat;
  return Math.max(2, Math.round((syl / spb) * 2) / 2);
}

const DEFAULT_PACING: TrackPacing = {
  bpm: 120, verseSylPerBeat: 1.2, chorusSylPerBeat: 1.2,
  leadInS: 0, tailS: 0, coupletCostMax: 0.75,
};

function computeLineBeats(track: ResolvedAlbumTrack): number[] {
  const pacing = track.pacing ?? DEFAULT_PACING;
  return track.lyrics.map((line, i) =>
    beatsFromSyllables(
      line.split(/\s+/).reduce((a, w) => a + syllableCountHeuristic(w) + melismaBonus(w), 0),
      i,
      pacing,
    )
  );
}

function lyricLineAt(progress: number, duration: number, lineBeats: number[], pacing: TrackPacing): number {
  const totalBeats = lineBeats.reduce((a, b) => a + b, 0);
  const windowS = Math.max(1, duration - pacing.leadInS - pacing.tailS);
  const nominalBeatS = 60 / pacing.bpm;
  const scale = windowS / (totalBeats * nominalBeatS);
  const beatS = nominalBeatS * scale;
  const t = progress - pacing.leadInS;
  if (t < 0) return -1;
  let acc = 0;
  for (let i = 0; i < lineBeats.length; i++) {
    acc += lineBeats[i] * beatS;
    if (t < acc) return i;
  }
  return lineBeats.length - 1;
}

export function AlbumLyrics({ track, currentTime, status, reducedMotion }: AlbumLyricsProps) {
  const alignment = useLyricAlignment(track.grimoireTrack?.id ?? '');
  const lineBeats = useMemo(() => computeLineBeats(track), [track]);
  const pacing = track.pacing ?? DEFAULT_PACING;
  const [userScrolled, setUserScrolled] = useState(false);
  const lyricsRef = useRef<HTMLOListElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const coloredLyrics = useMemo(() =>
    track.lyrics.map(line =>
      line.split(/(\s+)/).map(tok => {
        if (!/\S/.test(tok)) return { word: tok, color: null, school: null };
        const ts = wordTruesight(tok);
        return { word: tok, color: ts?.color ?? null, school: ts?.school ?? null };
      })
    ),
    [track]
  );

  const alignedPos = alignment ? lineAtTime(alignment.lines, currentTime) : -1;
  const activeLine = alignment
    ? (alignedPos < 0 ? -1 : alignment.lines[alignedPos].index)
    : lyricLineAt(currentTime, track.duration, lineBeats, pacing);

  const sungIdx = alignment ? wordAtTime(alignment.words, currentTime) : -1;
  const sungWord = alignment && sungIdx >= 0 ? alignment.words[sungIdx] : null;

  useEffect(() => {
    if (status !== 'playing' || activeLine < 0 || userScrolled) return;
    const el = lyricsRef.current?.children[activeLine] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeLine, status, userScrolled, reducedMotion]);

  useEffect(() => {
    if (status === 'playing') setUserScrolled(false);
  }, [status]);

  const handleScroll = () => {
    if (status !== 'playing') return;
    setUserScrolled(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setUserScrolled(false), 5000);
  };

  if (track.lyrics.length === 0) {
    return (
      <div className="alb-lyrics alb-lyrics--instrumental">
        <p className="alb-lyrics__empty">Instrumental</p>
      </div>
    );
  }

  return (
    <ol
      ref={lyricsRef}
      className="alb-lyrics"
      onScroll={handleScroll}
      aria-label="Lyrics"
    >
      {track.lyrics.map((line, i) => (
        <li
          key={i}
          className={i === activeLine ? 'alb-lyrics__line is-active' : 'alb-lyrics__line'}
          aria-current={i === activeLine ? 'true' : undefined}
        >
          <span className="alb-lyrics__num">{String(i + 1).padStart(2, '0')}</span>
          <span className="alb-lyrics__text">
            {coloredLyrics[i].map((tok, j) => {
              const isWord = /[A-Za-z]/.test(tok.word);
              const sung = isWord && sungWord !== null && sungWord.line === i && sungWord.text === tok.word;
              return (
                <span
                  key={j}
                  className={tok.color ? 'alb-lyrics__word' : undefined}
                  style={tok.color ? ({ '--w': tok.color } as CSSProperties) : undefined}
                  data-sung={sung ? 'true' : undefined}
                >
                  {tok.word}
                </span>
              );
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}
