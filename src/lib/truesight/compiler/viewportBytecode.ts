export interface ViewportState {
  width: number;
  height: number;
  deviceClass: 'desktop' | 'tablet' | 'mobile-ios' | 'mobile-android';
  orientation: 'portrait' | 'landscape' | 'square';
  pixelRatio: number;
}

export const DEFAULT_VIEWPORT_STATE: ViewportState = {
  width: 1200,
  height: 900,
  deviceClass: 'desktop',
  orientation: 'landscape',
  pixelRatio: 1,
};

export interface ViewportBytecode {
  timestamp: number;
  state: ViewportState;
  bindings: Map<string, (viewport: ViewportState) => number>;
}

/**
 * Detect device class from viewport width
 */
export function detectDeviceClass(width: number): ViewportState['deviceClass'] {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  if (width >= 375) return 'mobile-ios';
  return 'mobile-android';
}

/**
 * Detect orientation from dimensions
 */
export function detectOrientation(width: number, height: number): ViewportState['orientation'] {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Encode viewport state as bytecode
 */
export function encodeViewportBytecode(viewport: ViewportState): string {
  return [
    'VIEWPORT',
    `WIDTH ${viewport.width}`,
    `HEIGHT ${viewport.height}`,
    `DEVICE ${viewport.deviceClass}`,
    `ORIENTATION ${viewport.orientation}`,
    `PIXEL_RATIO ${viewport.pixelRatio}`,
    `TIMESTAMP ${Date.now()}`,
  ].join('\n');
}

/**
 * Create viewport bytecode channel with reactive bindings
 */
export function createViewportChannel(initialState: ViewportState = DEFAULT_VIEWPORT_STATE): {
  getState: () => ViewportState;
  getBytecode: () => string;
  update: (width: number, height: number, pixelRatio?: number) => void;
  subscribe: (callback: (viewport: ViewportState) => void) => () => void;
  bind: (id: string, callback: (viewport: ViewportState) => void) => () => void;
  observe: (element: HTMLElement) => () => void;
} {
  let state = initialState;
  
  const subscribers = new Set<(viewport: ViewportState) => void>();
  const bindings = new Map<string, (viewport: ViewportState) => void>();
  
  const update = (width: number, height: number, pixelRatio?: number) => {
    // Round dimensions to prevent sub-pixel noise loops
    const w = Math.round(width);
    const h = Math.round(height);
    
    // Core logic should not pull from window; it should be passed in or guarded
    const pr = pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);

    // Redundancy check: STOP if state hasn't actually changed
    if (Object.is(state.width, w) && 
        Object.is(state.height, h) && 
        Object.is(state.pixelRatio, pr)) {
      return;
    }

    state = {
      width: w,
      height: h,
      deviceClass: detectDeviceClass(w),
      orientation: detectOrientation(w, h),
      pixelRatio: pr,
    };
    
    // Notify all subscribers
    subscribers.forEach(callback => callback(state));
    // Notify all named bindings
    bindings.forEach(callback => callback(state));
  };
  
  return {
    getState: () => state,
    
    getBytecode: () => encodeViewportBytecode(state),

    update,

    subscribe: (callback: (viewport: ViewportState) => void) => {
      subscribers.add(callback);
      callback(state);
      return () => subscribers.delete(callback);
    },
    
    bind: (id: string, callback: (viewport: ViewportState) => void) => {
      bindings.set(id, callback);
      // Immediately call with current state
      callback(state);
      
      // Return unsubscribe
      return () => bindings.delete(id);
    },
    
    observe: (element: HTMLElement) => {
      // Multiple observers are now supported by returning independent cleanup functions.
      // This allows parallel observation of different UI surfaces if needed.

      if (typeof ResizeObserver === 'undefined') {
        // Fallback to window resize
        const onResize = () => {
          if (typeof window !== 'undefined') {
            update(window.innerWidth, window.innerHeight, window.devicePixelRatio);
          }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }
      
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // Capture current pixelRatio at time of resize
          const pr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
          update(width, height, pr);
        }
      });
      
      observer.observe(element);
      
      return () => {
        observer.disconnect();
      };
    },
  };
}

/**
 * Viewport-aware dimension compiler integration singleton
 */
export const ViewportChannel = createViewportChannel(
  typeof window !== 'undefined' ? {
    width: window.innerWidth,
    height: window.innerHeight,
    deviceClass: detectDeviceClass(window.innerWidth),
    orientation: detectOrientation(window.innerWidth, window.innerHeight),
    pixelRatio: window.devicePixelRatio,
  } : DEFAULT_VIEWPORT_STATE
);
