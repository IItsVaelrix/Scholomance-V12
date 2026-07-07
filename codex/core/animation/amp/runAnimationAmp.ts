import {
  AnimationIntent,
  ResolvedMotionOutput,
  AnimationAmpConfig,
  DEFAULT_AMP_CONFIG,
  setActiveAmpConfig,
} from '../contracts/animation.types.ts';
import AmpWorker from './amp.worker.ts?worker';

export { processorRegistry } from './registry.ts';

// ─── AMP State ──────────────────────────────────────────────────────────────

interface AmpState {
  config: AnimationAmpConfig;
  isRunning: boolean;
  activeAnimations: Map<string, ResolvedMotionOutput>;
}

const ampState: AmpState = {
  config: { ...DEFAULT_AMP_CONFIG },
  isRunning: false,
  activeAnimations: new Map(),
};

// ─── Worker Communication ───────────────────────────────────────────────────

let workerInstance: Worker | null = null;
let msgIdCounter = 0;
const callbacks = new Map<number, { resolve: (res: ResolvedMotionOutput) => void, reject: (err: any) => void }>();
const isWorkerAvailable = typeof Worker !== 'undefined' && typeof window !== 'undefined';

function getWorker(): Worker | null {
  if (!isWorkerAvailable) return null;
  if (!workerInstance) {
    workerInstance = new AmpWorker();
    workerInstance.onmessage = (e) => {
      const { id, type, output, error, trace } = e.data;
      if (type === 'SUCCESS') {
        if (ampState.config.debug && trace) {
          console.log('[AnimationAMP] Motion trace:', trace);
        }
        const cb = callbacks.get(id);
        if (cb) {
          callbacks.delete(id);
          cb.resolve(output);
        }
      } else if (type === 'ERROR') {
        const cb = callbacks.get(id);
        if (cb) {
          callbacks.delete(id);
          cb.reject(new Error(error));
        }
      }
    };
  }
  return workerInstance;
}

// ─── Core AMP Functions ─────────────────────────────────────────────────────

export function initAnimationAmp(config: Partial<AnimationAmpConfig> = {}): void {
  ampState.config = { ...DEFAULT_AMP_CONFIG, ...config };
  setActiveAmpConfig(ampState.config);
  
  const worker = getWorker();
  if (worker) {
    worker.postMessage({ id: msgIdCounter++, type: 'INIT', payload: ampState.config });
    console.log('[AnimationAMP] Initialized with config via WebWorker:', ampState.config);
  } else {
    console.log('[AnimationAMP] Initialized with config via Local Pipeline:', ampState.config);
  }
  
  ampState.isRunning = true;
}

export async function runAnimationAmp(intent: AnimationIntent): Promise<ResolvedMotionOutput> {
  if (!ampState.isRunning) {
    console.warn('[AnimationAMP] AMP not initialized, using defaults');
    initAnimationAmp();
  }
  
  const worker = getWorker();
  
  if (worker) {
    return new Promise((resolve, reject) => {
      const id = msgIdCounter++;
      callbacks.set(id, { resolve: (output) => {
        ampState.activeAnimations.set(intent.targetId, output);
        resolve(output);
      }, reject });
      
      worker.postMessage({ id, type: 'RUN_INTENT', payload: intent });
    });
  } else {
    // Fallback to local synchronous processing for tests
    const { processIntentCore } = await import('./pipeline.ts');
    try {
      const { output, trace } = await processIntentCore(intent, ampState.config);
      if (ampState.config.debug && trace) {
        console.log('[AnimationAMP] Motion trace:', trace);
      }
      ampState.activeAnimations.set(intent.targetId, output);
      return output;
    } catch (e: any) {
      throw new Error(e.message || 'Unknown AMP error');
    }
  }
}

export function getActiveAnimation(targetId: string): ResolvedMotionOutput | undefined {
  return ampState.activeAnimations.get(targetId);
}

export function clearActiveAnimation(targetId: string): void {
  ampState.activeAnimations.delete(targetId);
}

export function getAllActiveAnimations(): Map<string, ResolvedMotionOutput> {
  return new Map(ampState.activeAnimations);
}

export function shutdownAnimationAmp(): void {
  ampState.isRunning = false;
  ampState.activeAnimations.clear();
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  console.log('[AnimationAMP] Shutdown complete');
}

export function getAmpStatus(): {
  isRunning: boolean;
  activeCount: number;
  config: AnimationAmpConfig;
} {
  return {
    isRunning: ampState.isRunning,
    activeCount: ampState.activeAnimations.size,
    config: { ...ampState.config },
  };
}

// Auto-init in dev mode for convenience
if (import.meta.env?.DEV) {
  initAnimationAmp({ 
    debug: true, 
    bytecodeEnabled: true, 
    maxProcessors: 16, 
    processorTimeoutMs: 50, 
    performanceMonitoring: true,
    frameBudgetMs: 8,
    symmetryIntegration: true
  });
}
