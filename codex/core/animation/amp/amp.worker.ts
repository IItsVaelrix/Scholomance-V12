/// <reference lib="webworker" />
import { AnimationIntent, DEFAULT_AMP_CONFIG } from '../contracts/animation.types.ts';
import { processIntentCore } from './pipeline.ts';

let ampConfig = { ...DEFAULT_AMP_CONFIG };

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  if (type === 'INIT') {
    ampConfig = { ...DEFAULT_AMP_CONFIG, ...payload };
    self.postMessage({ id, type: 'INIT_ACK' });
    return;
  }
  
  if (type === 'RUN_INTENT') {
    try {
      const intent = payload as AnimationIntent;
      const { output, trace } = await processIntentCore(intent, ampConfig);
      
      self.postMessage({ id, type: 'SUCCESS', output, trace });
    } catch (err: any) {
      self.postMessage({ id, type: 'ERROR', error: err.message || 'Unknown worker error' });
    }
  }
};
