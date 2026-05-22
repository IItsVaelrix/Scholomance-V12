/**
 * Animation AMP — Type Definitions
 * 
 * Global TypeScript declarations for Animation AMP.
 * This file provides type definitions for UI components that need
 * to reference Animation AMP types without direct Codex imports.
 * 
 * @see ARCH_CONTRACT_OVERLAY_INTEGRITY.md - Layer separation requirements
 */

/**
 * Animation intent input contract
 */
export interface AnimationIntent {
  version: string;
  targetId: string;
  targetType?: 'framer' | 'css' | 'phaser' | 'canvas' | 'overlay';
  preset?: string;
  trigger: 'mount' | 'unmount' | 'hover' | 'focus' | 'click' | 'scroll' | 'route-change' | 'audio' | 'state-change' | 'idle' | 'symmetry' | 'bytecode';
  state?: Record<string, unknown>;
  constraints?: {
    reducedMotion?: boolean;
    deviceClass?: 'mobile' | 'desktop' | 'tablet';
    maxDurationMs?: number;
    disableLoop?: boolean;
    maxFps?: number;
    gpuAccelerate?: boolean;
    layoutConstraint?: unknown;
  };
  requestedProcessors?: string[];
  metadata?: {
    source?: string;
    feature?: string;
    scene?: string;
    correlationId?: string;
  };
  symmetry?: {
    type?: 'horizontal' | 'vertical' | 'radial' | 'none';
    confidence?: number;
    axis?: number;
    mirror?: boolean;
  };
  bytecode?: string;
}

/**
 * Resolved motion output final contract for renderers
 */
export interface ResolvedMotionOutput {
  version: string;
  targetId: string;
  success: boolean;
  renderer: 'framer' | 'css' | 'phaser' | 'canvas' | 'overlay';
  values: {
    width?: number;
    height?: number;
    durationMs: number;
    delayMs: number;
    easing: string;
    translateX: number;
    translateY: number;
    scale: number;
    scaleX: number;
    scaleY: number;
    rotateDeg: number;
    opacity: number;
    glow?: number;
    blur?: number;
    loop: boolean;
    phaseOffset?: number;
    originX: number;
    originY: number;
  };
  cssVariables?: Record<string, string>;
  framerTransition?: {
    duration: number;
    delay?: number;
    ease?: string | number[];
    repeat?: number;
    repeatType?: 'loop' | 'reverse' | 'mirror';
  };
  phaserPayload?: {
    targetType: 'tween' | 'timeline';
    config: Record<string, unknown>;
  };
  pixelBrainPayload?: {
    formula: string;
    coordinates: Array<{ x: number; y: number; space: 'pixel' | 'cell' | 'lattice' }>;
  };
  bytecode?: string[];
  diagnostics: string[];
  trace: Array<{
    processorId: string;
    stage: string;
    changed: string[];
    timestamp: number;
  }>;
  performance?: {
    processingTimeMs: number;
    processorCount: number;
    reducedMotion: boolean;
    gpuAccelerated: boolean;
  };
}

/**
 * AnimationRenderer type union
 */
export type AnimationRenderer = 'framer' | 'css' | 'phaser' | 'canvas' | 'overlay';

/**
 * AnimationTrigger type union
 */
export type AnimationTrigger = 'mount' | 'unmount' | 'hover' | 'focus' | 'click' | 'scroll' | 'route-change' | 'audio' | 'state-change' | 'idle' | 'symmetry' | 'bytecode';

/**
 * ProcessorStage type union
 */
export type ProcessorStage = 'normalize' | 'timing' | 'transform' | 'visual' | 'sequence' | 'reactive' | 'constraint' | 'symmetry' | 'finalize';

/**
 * AMP Status interface
 */
export interface AmpStatus {
  isRunning: boolean;
  activeCount: number;
  config: {
    debug: boolean;
    bytecodeEnabled?: boolean;
    maxProcessors?: number;
    processorTimeoutMs?: number;
    performanceMonitoring?: boolean;
    frameBudgetMs?: number;
    symmetryIntegration?: boolean;
  };
}
