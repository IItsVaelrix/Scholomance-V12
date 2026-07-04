import { useEffect, useRef, useState } from 'react';
import {
  COMBAT_MATRIX_INTRO_DURATION_MS,
  COMBAT_MATRIX_INTRO_EXIT_MS,
  COMBAT_MATRIX_INTRO_REDUCED_MS,
} from '../../game/combat/combatBattleIntro.js';
import styles from './CombatMatrixIntro.module.css';

const STATUS_LINES = [
  'SENTINEL LOCK DETECTED...',
  'BATTLE MATRIX FLOOD...',
  'LEYLINE GRID ENGAGING...',
  'COMBAT LATTICE LIVE...',
];

/**
 * Full-screen matrix binary flood shown when combat boots.
 */
export default function CombatMatrixIntro({
  reducedMotion = false,
  onComplete,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [phase, setPhase] = useState(reducedMotion ? 'visible' : 'enter');
  const [statusIndex, setStatusIndex] = useState(0);

  const durationMs = reducedMotion
    ? COMBAT_MATRIX_INTRO_REDUCED_MS
    : COMBAT_MATRIX_INTRO_DURATION_MS;
  const exitMs = reducedMotion ? 220 : COMBAT_MATRIX_INTRO_EXIT_MS;

  useEffect(() => {
    const statusTimer = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_LINES.length);
    }, 780);
    return () => window.clearInterval(statusTimer);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const glyphs = '01';
    const fontSize = 15;
    let columns = 0;
    let drops = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      columns = Math.max(1, Math.floor(width / fontSize));
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * height / fontSize));
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(2, 5, 8, 0.14)';
      ctx.fillRect(0, 0, width, height);

      for (let column = 0; column < columns; column += 1) {
        const x = column * fontSize;
        const y = drops[column] * fontSize;
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];

        ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(103, 247, 255, 0.92)';
        ctx.fillText(glyph, x, y);

        if (Math.random() > 0.985) {
          ctx.fillStyle = 'rgba(170, 255, 204, 0.95)';
          ctx.fillText(glyph === '0' ? '1' : '0', x, y - fontSize * 0.65);
        }

        if (y > height && Math.random() > 0.965) {
          drops[column] = 0;
        }
        drops[column] += 1;
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      if (!reducedMotion) setPhase('exit');
    }, durationMs - exitMs);

    const doneTimer = window.setTimeout(() => onComplete?.(), durationMs);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs, exitMs, onComplete, reducedMotion]);

  return (
    <div
      className={`${styles.root} ${styles[phase]}`}
      style={{
        '--matrix-duration': `${durationMs}ms`,
        '--matrix-exit': `${exitMs}ms`,
      }}
      role="status"
      aria-live="polite"
      aria-label="Combat lattice initializing"
    >
      {!reducedMotion && <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.hud}>
        <p className={styles.eyebrow}>scholo://combat/engage</p>
        <h2 className={styles.title}>Battle Engaged</h2>
        <p className={styles.status}>{STATUS_LINES[statusIndex]}</p>
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}