/**
 * CODEx Pipeline Provider
 * Initializes and provides access to CODEx runtime pipelines.
 *
 * This provider should wrap components that need access to the word lookup pipeline.
 * It initializes the adapters and pipelines on mount.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { initializePipelines } from '../../codex/runtime/pipeline.js';
import { createLocalAdapter } from '../../codex/services/adapters/local.adapter.js';
import { createFreeDictionaryAdapter } from '../../codex/services/adapters/freeDictionary.adapter.js';
import { createDatamuseAdapter } from '../../codex/services/adapters/datamuse.adapter.js';
import { ScholomanceDictionaryAPI } from '../lib/scholomanceDictionary.api.js';

const CODExContext = createContext(null);

/**
 * Feature flag for using the new CODEx pipeline vs legacy ReferenceEngine.
 * Set via environment variable or defaults to true.
 */
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);
const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);

/**
 * Parses a boolean-like environment flag string.
 * Accepts common forms:
 * - true: "true", "1", "on", "yes"
 * - false: "false", "0", "off", "no"
 *
 * Unknown values fall back to defaultValue.
 *
 * @param {string|undefined|null} rawValue
 * @param {boolean} [defaultValue=true]
 * @returns {boolean}
 */
export function parseBooleanEnvFlag(rawValue, defaultValue = true) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

const USE_CODEX_PIPELINE = parseBooleanEnvFlag(import.meta.env.VITE_USE_CODEX_PIPELINE, true);

// Module-level singleton guard. pipeline.js uses module-level state, so initializing
// it twice (e.g. React StrictMode's fake unmount+remount) duplicates event listeners.
// Flagging synchronously before the async call prevents the second mount from entering.
let _pipelineInitialized = false;

/**
 * Provider component that initializes CODEx pipelines.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function CODExProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(_pipelineInitialized);

  useEffect(() => {
    if (_pipelineInitialized) {
      setIsInitialized(true);
      return;
    }
    _pipelineInitialized = true;

    if (!USE_CODEX_PIPELINE) {
      console.log('[CODEx] Pipeline disabled via feature flag, using legacy ReferenceEngine');
      setIsInitialized(true);
      return;
    }

    // Create adapter chain (local-first strategy)
    const adapters = [];
    const localDictionaryUrl = ScholomanceDictionaryAPI.getBaseUrl?.() || "";

    // 1. Local Scholomance Dictionary (primary)
    if (ScholomanceDictionaryAPI.isEnabled()) {
      const localAdapter = createLocalAdapter(ScholomanceDictionaryAPI);
      adapters.push(localAdapter);
      console.log(`[CODEx] Local dictionary adapter enabled (${localDictionaryUrl})`);
    } else {
      console.log(`[CODEx] Local dictionary adapter unavailable at ${localDictionaryUrl || '/api/lexicon'}, falling back to external adapters`);
    }

    // 2. Free Dictionary API (definitions, synonyms, antonyms, pronunciation)
    adapters.push(createFreeDictionaryAdapter());
    console.log('[CODEx] Free Dictionary adapter added for definitions');

    // 3. Datamuse API (rhymes, synonyms fallback)
    adapters.push(createDatamuseAdapter());
    console.log('[CODEx] Datamuse adapter added for rhymes/fallback');

    // Initialize pipelines - no cleanup returned because the pipeline is a
    // module-level singleton that lives for the full app lifetime.
    initializePipelines({ dictionaryAdapters: adapters }).then(() => {
      setIsInitialized(true);
    });
  }, []);

  const value = {
    isInitialized,
    useCODExPipeline: USE_CODEX_PIPELINE,
  };

  return (
    <CODExContext.Provider value={value}>
      {children}
    </CODExContext.Provider>
  );
}

/**
 * Hook to access CODEx pipeline state.
 * @returns {{ isInitialized: boolean, useCODExPipeline: boolean }}
 */
export function useCODExPipeline() {
  const context = useContext(CODExContext);
  if (!context) {
    // If used outside provider, return defaults
    return {
      isInitialized: false,
      useCODExPipeline: USE_CODEX_PIPELINE,
    };
  }
  return context;
}

