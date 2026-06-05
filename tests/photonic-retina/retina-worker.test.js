import { describe, expect, it } from 'vitest';
import {
  RETINA_WORKER_MESSAGE_TYPES,
  createRetinaWorkerEncodeMessage,
  handleRetinaWorkerMessage,
  installRetinaWorkerScope,
} from '../../src/lib/photonic-retina/index.js';

describe('retina-worker', () => {
  it('encodes a packet from a worker-safe message envelope', () => {
    const message = createRetinaWorkerEncodeMessage(
      'request-a',
      { sourceKind: 'colors', payload: ['#ffffff'] },
      { targetDimension: 4 }
    );
    const response = handleRetinaWorkerMessage({ data: message });

    expect(response.type).toBe(RETINA_WORKER_MESSAGE_TYPES.PACKET);
    expect(response.requestId).toBe('request-a');
    expect(response.packet.packetId).toMatch(/^retina_v1_/);
  });

  it('returns a deterministic error envelope for unsupported messages', () => {
    const response = handleRetinaWorkerMessage({ type: 'other', requestId: 'request-b' });

    expect(response.type).toBe(RETINA_WORKER_MESSAGE_TYPES.ERROR);
    expect(response.requestId).toBe('request-b');
    expect(response.error).toBe('Unsupported Photonic Retina worker message type');
  });

  it('installs and disposes a worker-scope message handler', () => {
    const listeners = new Map();
    const posted = [];
    const scope = {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      postMessage(message) {
        posted.push(message);
      },
    };
    const handle = installRetinaWorkerScope(scope);
    const message = createRetinaWorkerEncodeMessage(
      'request-c',
      { sourceKind: 'colors', payload: ['#ffffff'] },
      { targetDimension: 4 }
    );

    listeners.get('message')({ data: message });

    expect(posted[0].type).toBe(RETINA_WORKER_MESSAGE_TYPES.PACKET);
    expect(posted[0].requestId).toBe('request-c');

    handle.dispose();

    expect(listeners.has('message')).toBe(false);
  });
});
