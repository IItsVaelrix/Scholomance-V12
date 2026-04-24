/**
 * Background document analysis worker.
 *
 * Keeps the client-side fallback path usable when server analysis is disabled
 * or unavailable.
 */

let enginePromise = null;

async function getAnalysisEngine() {
  if (!enginePromise) {
    enginePromise = Promise.all([
      import("../deepRhyme.engine.js"),
      import("../phonology/phoneme.engine.js"),
    ]).then(([{ DeepRhymeEngine }, { PhonemeEngine }]) => new DeepRhymeEngine(PhonemeEngine));
  }
  return enginePromise;
}

function postResult(id, result) {
  self.postMessage({ id, result });
}

function postError(id, error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown analysis worker error");
  self.postMessage({ id, error: message });
}

self.onmessage = async function onmessage(event) {
  const { id = null, type, text = "", options = {} } = event.data || {};

  try {
    if (type === "warmup") {
      await getAnalysisEngine();
      postResult(id, true);
      return;
    }

    if (type === "analyze") {
      const engine = await getAnalysisEngine();
      const result = await engine.analyzeDocument(text, options);
      postResult(id, result);
      return;
    }

    throw new Error(`Unknown message type: ${type}`);
  } catch (error) {
    postError(id, error);
  }
};
