import { useEffect, useRef } from 'react';
import type { AnalysisAvailability } from './hooks/useAlbumAudioEngine';

interface WmpSpectrumProps {
  analyser: AnalyserNode | null;
  analysisAvailability: AnalysisAvailability;
  bpm?: number;
  reducedMotion?: boolean;
  binCount?: number;
}

export function WmpSpectrum({
  analyser,
  analysisAvailability,
  bpm = 120,
  reducedMotion = false,
  binCount = 64,
}: WmpSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fftData = new Uint8Array(binCount);
    const peaks = new Float32Array(binCount);
    const peakDecay = new Float32Array(binCount);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let lastFrameTime = 0;
    const lowCadenceInterval = 1000 / 3;

    const getSyntheticData = (t: number) => {
      const pulse = 0.6 + 0.4 * Math.sin(t * (bpm / 60) * Math.PI);
      for (let i = 0; i < binCount; i++) {
        const env = Math.max(0, 1 - i / binCount);
        fftData[i] = Math.round(
          Math.max(0, (0.5 + 0.5 * Math.sin(t * 2.1 + i * 0.21)) * 210 * env * pulse)
        );
      }
    };

    const draw = (tMs: number) => {
      if (reducedMotion && tMs - lastFrameTime < lowCadenceInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = tMs;
      const t = tMs / 1000;
      const W = canvas.width;
      const H = canvas.height;

      if (analyser && analysisAvailability === 'available') {
        analyser.getByteFrequencyData(fftData);
      } else {
        getSyntheticData(t);
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      const barWidth = (W / binCount) * 0.8;
      const gap = (W / binCount) * 0.2;
      const baselineY = H * 0.65;

      for (let i = 0; i < binCount; i++) {
        const mag = fftData[i] / 255;
        const barHeight = mag * baselineY * 0.9;
        const x = i * (barWidth + gap) + gap / 2;

        const grad = ctx.createLinearGradient(x, baselineY, x, baselineY - barHeight);
        grad.addColorStop(0, 'hsl(312, 90%, 40%)');
        grad.addColorStop(0.5, 'hsl(280, 85%, 55%)');
        grad.addColorStop(1, 'hsl(196, 90%, 80%)');

        ctx.fillStyle = grad;
        ctx.fillRect(x, baselineY - barHeight, barWidth, barHeight);

        if (!reducedMotion) {
          if (mag > peaks[i]) {
            peaks[i] = mag;
            peakDecay[i] = 0;
          } else {
            peakDecay[i] += 0.003;
            peaks[i] = Math.max(0, peaks[i] - peakDecay[i]);
          }
          const peakY = baselineY - peaks[i] * baselineY * 0.9;
          ctx.fillStyle = 'hsl(196, 90%, 90%)';
          ctx.fillRect(x, peakY - 2 * dpr, barWidth, 2 * dpr);
        }

        const reflGrad = ctx.createLinearGradient(x, baselineY, x, baselineY + barHeight * 0.3);
        reflGrad.addColorStop(0, 'hsla(280, 85%, 55%, 0.3)');
        reflGrad.addColorStop(1, 'hsla(280, 85%, 55%, 0)');
        ctx.fillStyle = reflGrad;
        ctx.fillRect(x, baselineY, barWidth, barHeight * 0.3);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser, analysisAvailability, bpm, reducedMotion, binCount]);

  return <canvas ref={canvasRef} className="alb-spectrum" aria-hidden="true" />;
}
