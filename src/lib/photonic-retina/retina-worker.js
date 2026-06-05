import { encodeToPhotonicRetina } from './retina-adapter.js';

export const RETINA_WORKER_MESSAGE_TYPES = Object.freeze({
  ENCODE: 'photonic-retina:encode',
  PACKET: 'photonic-retina:packet',
  ERROR: 'photonic-retina:error',
});

function normalizeRequest(message) {
  const envelope = message?.data && typeof message.data === 'object' ? message.data : message;
  return envelope && typeof envelope === 'object' ? envelope : {};
}

export function createRetinaWorkerEncodeMessage(requestId, input, options = {}) {
  return Object.freeze({
    type: RETINA_WORKER_MESSAGE_TYPES.ENCODE,
    requestId: String(requestId || 'retina-request'),
    input,
    options,
  });
}

export function handleRetinaWorkerMessage(message, encoder = encodeToPhotonicRetina) {
  const request = normalizeRequest(message);
  const requestId = String(request.requestId || 'retina-request');

  if (request.type !== RETINA_WORKER_MESSAGE_TYPES.ENCODE) {
    return Object.freeze({
      type: RETINA_WORKER_MESSAGE_TYPES.ERROR,
      requestId,
      error: 'Unsupported Photonic Retina worker message type',
    });
  }

  try {
    return Object.freeze({
      type: RETINA_WORKER_MESSAGE_TYPES.PACKET,
      requestId,
      packet: encoder(request.input, request.options || {}),
    });
  } catch (error) {
    return Object.freeze({
      type: RETINA_WORKER_MESSAGE_TYPES.ERROR,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function installRetinaWorkerScope(workerScope, encoder = encodeToPhotonicRetina) {
  if (!workerScope || typeof workerScope.addEventListener !== 'function' || typeof workerScope.postMessage !== 'function') {
    throw new Error('Photonic Retina worker scope must expose addEventListener and postMessage');
  }

  const listener = (event) => {
    workerScope.postMessage(handleRetinaWorkerMessage(event, encoder));
  };

  workerScope.addEventListener('message', listener);

  return Object.freeze({
    dispose() {
      if (typeof workerScope.removeEventListener === 'function') {
        workerScope.removeEventListener('message', listener);
      }
    },
  });
}
