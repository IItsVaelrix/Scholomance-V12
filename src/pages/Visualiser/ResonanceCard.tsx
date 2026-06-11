import type { CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { BytecodeVisualiser } from './BytecodeVisualiser';
import { computeFingerprint, semanticTokens, type Fingerprint } from './bytecodeFingerprint';
import './BytecodeVisualiser.css';

const CARD = {
  title: 'Echoes of the Veil',
  artist: 'Lumen Arcanum',
  bpm: 136,
  key: 'D minor',
  hue: 286,
  lyrics: 'veil echoes call sigils static silence fractured light temples ouroboros rune shadows decree',
};

interface ResonanceCardProps {
  title: string;
  artist: string;
  fingerprint: Fingerprint;
  tokens: string[];
  hue: number;
  bpm: number;
  reducedMotion?: boolean;
}

/** Deterministic static sigil for the downloadable card (no animation). */
function drawSigil(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, hue: number, hash: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 1; k <= 4; k += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.3 + k * 0.16), 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue + k * 8}, 85%, 62%, 0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // spectral spokes seeded by the hash (deterministic)
  for (let i = 0; i < 64; i += 1) {
    const mag = ((hash >> (i % 31)) & 1 ? 0.6 : 0.25) + 0.4 * Math.abs(Math.sin(i * 1.7 + hash));
    const a = (i / 64) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5);
    ctx.lineTo(Math.cos(a) * R * (0.5 + 0.4 * mag), Math.sin(a) * R * (0.5 + 0.4 * mag));
    ctx.strokeStyle = `hsla(${hue + 50 * mag}, 90%, 58%, ${0.5 + 0.4 * mag})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const tri = (rot: number, col: string) => {
    ctx.beginPath();
    for (let i = 0; i <= 3; i += 1) {
      const a = rot + (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * R * 0.6;
      const y = Math.sin(a) * R * 0.6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  };
  tri(0, `hsla(${hue + 24}, 90%, 66%, 0.9)`);
  tri(Math.PI, `hsla(${hue - 30}, 90%, 66%, 0.9)`);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
  core.addColorStop(0, 'hsla(312, 96%, 74%, 0.95)');
  core.addColorStop(1, 'hsla(312, 92%, 60%, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Compose the card on an offscreen canvas and download as PNG (dependency-free). */
function downloadCard(p: ResonanceCardProps) {
  const W = 800;
  const H = 1100;
  const dpr = 2;
  const c = document.createElement('canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0b16');
  bg.addColorStop(1, '#05060d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const aura = ctx.createRadialGradient(W / 2, 380, 0, W / 2, 380, 380);
  aura.addColorStop(0, `hsla(${p.hue}, 85%, 60%, 0.22)`);
  aura.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  drawSigil(ctx, W / 2, 380, 230, p.hue, p.fingerprint.hash);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2ee6ff';
  ctx.font = '600 16px monospace';
  ctx.fillText('S C H O L O M A N C E   ·   C H A N N E L   Z E R O', W / 2, 64);
  ctx.fillStyle = '#f4f0e6';
  ctx.font = '700 46px Georgia, serif';
  ctx.fillText(p.title, W / 2, 720);
  ctx.fillStyle = '#d8952c';
  ctx.font = '600 20px Georgia, serif';
  ctx.fillText(p.artist.toUpperCase(), W / 2, 762);
  ctx.fillStyle = '#d8952c';
  ctx.font = '700 30px monospace';
  ctx.fillText(p.fingerprint.fingerprint, W / 2, 848);
  ctx.fillStyle = '#a7aec1';
  ctx.font = '500 18px monospace';
  ctx.fillText(p.tokens.slice(0, 5).join('   ·   '), W / 2, 900);
  ctx.fillStyle = '#7d83a6';
  ctx.font = '600 14px monospace';
  ctx.fillText('THE PATTERN IS LAW · THE SOUND IS CODE', W / 2, 1052);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resonance-${p.fingerprint.fingerprint}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function ResonanceCard(props: ResonanceCardProps) {
  const { title, artist, fingerprint, tokens, hue, bpm, reducedMotion } = props;
  return (
    <article className="rcard" style={{ ['--w' as string]: `hsl(${hue} 85% 60%)` } as CSSProperties}>
      <p className="rcard__brand">Scholomance · Channel Zero</p>
      <div className="rcard__mandala">
        <BytecodeVisualiser bpm={bpm} hue={hue} reducedMotion={reducedMotion} minimal />
      </div>
      <h2 className="rcard__title">{title}</h2>
      <p className="rcard__artist">{artist}</p>
      <p className="rcard__fp">{fingerprint.fingerprint}</p>
      <ul className="rcard__tokens">
        {tokens.slice(0, 5).map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="rcard__tag">The Pattern Is Law · The Sound Is Code</p>
      <button type="button" className="rcard__dl" onClick={() => downloadCard(props)}>
        Download card
      </button>
    </article>
  );
}

export default function ResonanceCardPage() {
  const reducedMotion = usePrefersReducedMotion();
  const fp = computeFingerprint(CARD);
  const tokens = semanticTokens(`${CARD.title} ${CARD.lyrics}`, 5);
  return (
    <main className="rcard-page" aria-label="Resonance card">
      <ResonanceCard
        title={CARD.title}
        artist={CARD.artist}
        fingerprint={fp}
        tokens={tokens}
        hue={CARD.hue}
        bpm={CARD.bpm}
        reducedMotion={reducedMotion}
      />
    </main>
  );
}
