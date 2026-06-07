/**
 * SHADER SANDBOX Component
 *
 * A specialized HTML5 WebGL2 Canvas runner.
 * Compiles user shaders asynchronously with a 200ms debounce, binds to the spelling
 * engine clock, recovers from webglcontextlost, and disposes of resources safely.
 */

import { useEffect, useRef } from 'react';
import {
  compileShaderProgram,
  createFullscreenQuad,
  disposeFullscreenQuad,
  disposeShaderProgram,
  renderShaderFrame,
  resolveShaderUniforms,
  createShaderPacket,
} from '../../../lib/pixelbrain.adapter.js';

export function ShaderSandbox({
  shaderCode,
  runtimeState = {},
  _isPlaying = true,
  onCompileError,
  canvasSize = { width: 160, height: 144 },
}) {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const quadRef = useRef(null);
  const compileTimeoutRef = useRef(null);
  const runtimeStateRef = useRef(runtimeState);

  // Keep runtimeState reference fresh to avoid breaking loops
  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  // Debounced GLSL Shader Compilation
  useEffect(() => {
    if (compileTimeoutRef.current) {
      clearTimeout(compileTimeoutRef.current);
    }

    compileTimeoutRef.current = setTimeout(() => {
      const gl = glRef.current;
      if (!gl || gl.isContextLost()) return;

      try {
        const newProgram = compileShaderProgram(gl, shaderCode);

        // Swap program and dispose old
        if (programRef.current) {
          disposeShaderProgram(gl, programRef.current);
        }
        programRef.current = newProgram;

        if (onCompileError) {
          onCompileError(null);
        }
      } catch (err) {
        if (onCompileError) {
          onCompileError(err);
        }
      }
    }, 200); // 200ms debounce threshold

    return () => {
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }
    };
  }, [shaderCode, onCompileError]);

  // WebGL Context Initialization and Event Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.error('[ShaderSandbox] WebGL2 is not supported in this browser.');
      return undefined;
    }

    glRef.current = gl;
    quadRef.current = createFullscreenQuad(gl);

    // Initial compile attempt
    try {
      programRef.current = compileShaderProgram(gl, shaderCode);
      if (onCompileError) onCompileError(null);
    } catch (err) {
      if (onCompileError) onCompileError(err);
    }

    // Context Recovery Helpers
    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn('[ShaderSandbox] WebGL context lost.');
      if (programRef.current) {
        programRef.current = null;
      }
      if (quadRef.current) {
        quadRef.current = null;
      }
    };

    const handleContextRestored = () => {
      console.log('[ShaderSandbox] WebGL context restored.');
      const glInstance = glRef.current;
      if (glInstance) {
        quadRef.current = createFullscreenQuad(glInstance);
        try {
          programRef.current = compileShaderProgram(glInstance, shaderCode);
          if (onCompileError) onCompileError(null);
        } catch (err) {
          if (onCompileError) onCompileError(err);
        }
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Authoritative clock rendering tick loop
    let rafId = null;
    const tick = () => {
      const glCtx = glRef.current;
      const prog = programRef.current;
      const quad = quadRef.current;

      if (glCtx && prog && quad && !glCtx.isContextLost()) {
        const packet = createShaderPacket({ fragmentSource: shaderCode, canvas: canvasSize });
        
        // u_time is absolute time mapping
        const activeState = { ...runtimeStateRef.current };
        const resolved = resolveShaderUniforms(packet, activeState);
        
        renderShaderFrame(glCtx, prog, quad, resolved);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      const glInstance = glRef.current;
      if (glInstance) {
        if (programRef.current) {
          disposeShaderProgram(glInstance, programRef.current);
          programRef.current = null;
        }
        if (quadRef.current) {
          disposeFullscreenQuad(glInstance, quadRef.current);
          quadRef.current = null;
        }
      }
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height]);

  return (
    <div className="shader-sandbox-wrapper" style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          background: '#040408',
          border: '1px solid var(--border-color, #333)',
        }}
      />
    </div>
  );
}
