import React, { useEffect, useRef } from 'react';
import {
  compileShaderProgram,
  createFullscreenQuad,
  renderShaderFrame,
  disposeShaderProgram,
  disposeFullscreenQuad,
} from '../../../lib/pixelbrain/shader-webgl-preview.js';
import { resolveShaderUniforms } from '../../../lib/pixelbrain/uniforms.bridge.js';
import { useDeterministicClock } from './useDeterministicClock';
import type { RuntimeStateInput } from './buildRuntimeState';
import { buildRuntimeState } from './buildRuntimeState';

export interface PBShaderPacket {
  contract?: string;
  id?: string;
  fragmentSource: string;
  uniforms?: Record<string, unknown>;
  canvas?: { width: number; height: number };
}

export interface PBShaderStageProps {
  packet: PBShaderPacket;
  getRuntimeInput: (elapsedMs: number) => RuntimeStateInput;
  reducedMotion?: boolean;
  /** Host-driven pause (e.g. another view owns the GPU). Combined with IO/tab visibility. */
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Tier-A compositor stage: one PB-SHADER packet rendered as a single fullscreen
 * fragment pass, driven by a deterministic clock. No per-frame React.
 *
 * NOTE on compileShaderProgram's real contract (verified against
 * src/lib/pixelbrain/shader-webgl-preview.js, which re-exports the codex/core
 * implementation): it does NOT return a `{ program, error }` result object. On
 * success it returns the linked WebGLProgram directly; on failure it THROWS a
 * structured BytecodeError (via createShaderCompileError/createShaderLinkError).
 * The brief's assumed `{ program }`/`{ error }` shape does not match — this
 * component wraps the call in try/catch instead.
 */
export function PBShaderStage({
  packet,
  getRuntimeInput,
  reducedMotion = false,
  paused = false,
  className,
  style,
  children,
}: PBShaderStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Host pause + viewport/tab visibility — any true means skip draw.
  const hostPausedRef = useRef(paused);
  const offscreenRef = useRef(false);
  const tabHiddenRef = useRef(typeof document !== 'undefined' ? document.hidden : false);
  hostPausedRef.current = paused;

  const clock = useDeterministicClock({ reducedMotion, frozenAt: 0 });
  const inputRef = useRef(getRuntimeInput);
  inputRef.current = getRuntimeInput;

  const isPaused = () => hostPausedRef.current || offscreenRef.current || tabHiddenRef.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true }) as WebGL2RenderingContext | null;
    if (!gl) return;

    let program: unknown;
    try {
      program = compileShaderProgram(gl, packet.fragmentSource);
    } catch {
      // Compile/link failure: structured error already surfaced by the throw
      // site's BytecodeError; this stage simply renders nothing rather than
      // crashing the host React tree.
      return;
    }
    if (!program) return;
    const quad = createFullscreenQuad(gl);

    // DPR-aware resize
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Pause when the element leaves the viewport (no wasted GPU behind other views)
    const io = new IntersectionObserver(
      ([entry]) => {
        offscreenRef.current = !entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    const onVis = () => {
      tabHiddenRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    const frame = () => {
      if (!isPaused()) {
        const elapsed = clock.getElapsedMs();
        const runtimeState = buildRuntimeState({
          ...inputRef.current(elapsed),
          canvasSize: [canvas.width, canvas.height],
        });
        const resolved = resolveShaderUniforms(packet, runtimeState);
        renderShaderFrame(gl, program, quad, resolved);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Context-loss handling: stop drawing until restored.
    const onLost = (ev: Event) => {
      ev.preventDefault();
      cancelAnimationFrame(raf);
    };
    const onRestored = () => {
      raf = requestAnimationFrame(frame);
    };
    canvas.addEventListener('webglcontextlost', onLost as EventListener);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      disposeFullscreenQuad(gl, quad);
      disposeShaderProgram(gl, program);
    };
    // Re-init only when the shader source identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packet.fragmentSource]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', visibility: paused ? 'hidden' : 'visible', ...style }}
    >
      {children}
    </canvas>
  );
}
