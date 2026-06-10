import { useEffect, useRef } from 'react';

/**
 * BytecodeVisualiser — a deterministic, audio-reactive sacred-geometry mandala
 * on a 2D canvas. Concentric rings + radial spectral bars (from FFT) + a rotating
 * merkaba + flower-of-life nodes + a glowing core, composited additively for a
 * holographic look. Rotation tracks BPM. Reduced-motion renders one static frame.
 *
 * It is decorative: aria-hidden. The accessible/textual data lives in the
 * surrounding readout panels.
 */

interface BytecodeVisualiserProps {
  /** FFT accessor (fills the array). If absent, a deterministic synthetic spectrum animates. */
  getByteFrequencyData?: (a: Uint8Array) => void;
  bpm?: number;
  hue?: number;          // base hue 0..360
  reducedMotion?: boolean;
  binCount?: number;
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

function strokePolygon(ctx: CanvasRenderingContext2D, radius: number, sides: number, rotation: number, stroke: string, lw = 1.6) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i += 1) {
    const a = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export function BytecodeVisualiser({
  getByteFrequencyData,
  bpm = 120,
  hue = 286,
  reducedMotion = false,
  binCount = 96,
}: BytecodeVisualiserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const data = new Uint8Array(binCount * 2);
    let raf = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (tMs: number) => {
      const t = tMs / 1000;
      const W = canvas.width;
      const H = canvas.height;
      const R = Math.min(W, H) * 0.44;

      if (getByteFrequencyData) {
        getByteFrequencyData(data);
      } else {
        // Deterministic synthetic spectrum: decays with frequency, pulses to "beat".
        const pulse = 0.6 + 0.4 * Math.sin(t * (bpm / 60) * Math.PI);
        for (let i = 0; i < data.length; i += 1) {
          const env = Math.max(0, 1 - i / data.length);
          data[i] = Math.round(Math.max(0, (0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.21)) * 210 * env * pulse));
        }
      }

      let energy = 0;
      for (let i = 0; i < binCount; i += 1) energy += data[i];
      energy /= binCount * 255;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.globalCompositeOperation = 'lighter';

      const beat = t * (bpm / 60);
      const rot = reducedMotion ? 0.3 : beat * 0.12 * Math.PI;
      const pulse = 1 + energy * 0.08 * Math.sin(beat * Math.PI);

      // Concentric rings.
      for (let k = 1; k <= 5; k += 1) {
        const rr = R * (0.2 + k * 0.15) * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.strokeStyle = hsl(hue + k * 10, 85, 64, 0.32 + energy * 0.3);
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 16;
        ctx.shadowColor = hsl(hue, 92, 68, 0.7);
        ctx.stroke();
      }

      // Radial spectral bars — the WMP-style graph, wrapped to the circle.
      ctx.shadowBlur = 10;
      for (let i = 0; i < binCount; i += 1) {
        const mag = data[i] / 255;
        const ang = (i / binCount) * Math.PI * 2 + rot * 0.3;
        const r0 = R * 0.46;
        const r1 = R * (0.46 + 0.46 * mag);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
        ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.strokeStyle = hsl(hue + 56 * mag, 92, 58 + 24 * mag, 0.62 + 0.38 * mag);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // Sacred geometry: hexagram (merkaba) + nested triangles + hexagon + square.
      ctx.shadowBlur = 22;
      const gr = R * 0.42 * pulse;
      strokePolygon(ctx, gr, 3, rot, hsl(hue + 24, 92, 66, 0.85), 2.4);
      strokePolygon(ctx, gr, 3, rot + Math.PI, hsl(hue - 30, 92, 66, 0.85), 2.4);
      strokePolygon(ctx, gr * 0.72, 6, -rot * 0.5, hsl(hue + 8, 88, 66, 0.5), 1.8);
      strokePolygon(ctx, gr * 0.46, 3, rot * 1.4, hsl(310, 92, 70, 0.7), 1.8);
      strokePolygon(ctx, gr * 0.46, 3, rot * 1.4 + Math.PI, hsl(196, 92, 64, 0.7), 1.8);
      strokePolygon(ctx, gr * 0.96, 4, rot * 0.3, hsl(hue, 72, 62, 0.4), 1.4);

      // Flower-of-life node ring.
      const nodeR = R * 0.13;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + rot * 0.5;
        const nx = Math.cos(a) * R * 0.44;
        const ny = Math.sin(a) * R * 0.44;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
        ctx.strokeStyle = hsl(hue, 86, 66, 0.36 + energy * 0.2);
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, nodeR, 0, Math.PI * 2);
      ctx.strokeStyle = hsl(hue, 86, 66, 0.42);
      ctx.stroke();

      // Glowing magenta core (the concept's central beam-source).
      const coreR = R * 0.08 * (1 + energy * 0.6);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 5);
      grad.addColorStop(0, hsl(312, 96, 74, 0.95));
      grad.addColorStop(0.35, hsl(300, 92, 64, 0.45));
      grad.addColorStop(1, hsl(300, 92, 60, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 5, 0, Math.PI * 2);
      ctx.fill();

      // Vertical light beam — the concept's central shaft through the mandala.
      const beamH = R * 1.95;
      const beamW = R * (0.05 + energy * 0.07);
      const bg = ctx.createLinearGradient(0, -beamH, 0, beamH);
      bg.addColorStop(0, hsl(312, 96, 70, 0));
      bg.addColorStop(0.5, hsl(312, 96, 74, 0.45 + energy * 0.35));
      bg.addColorStop(1, hsl(312, 96, 70, 0));
      ctx.fillStyle = bg;
      ctx.fillRect(-beamW / 2, -beamH, beamW, beamH * 2);

      ctx.restore();

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    if (reducedMotion) draw(0);
    else raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [getByteFrequencyData, bpm, hue, reducedMotion, binCount]);

  return <canvas ref={canvasRef} className="bcv-canvas" aria-hidden="true" />;
}
