/**
 * PHONEME PRION ENGINE — The real lab equipment.
 * 
 * A prion is a misfolded protein. In code: a structural pattern whose
 * PHONEME SIGNATURE mimics healthy code but carries a defect.
 * 
 * Pipeline:
 *   Code identifiers → G2P Jury → Phoneme sequence → Feature vector → TurboQuant → Signature
 *   
 * Genetic markers = rare phoneme n-grams that ONLY appear in buggy patterns.
 * Not "async function" but the phoneme sequence of "async function fetch then"
 * which has a distinct vowel/consonant topology.
 * 
 * Uses: PhonemeEngine (G2P Jury) + PHONOLOGICAL_FEATURES_V1 + TurboQuant
 * Deterministic: same code → same phoneme signature → same resonance.
 */

import { PhonemeEngine } from '../phonology/phoneme.engine.js';
import { PHONOLOGICAL_FEATURES_V1, SONORITY_HIERARCHY } from '../phonology/phoneme.constants.js';
import { quantizeVectorJS, estimateInnerProduct } from '../quantization/turboquant.js';

const PHONEME_ENGINE = PhonemeEngine;

/**
 * Extract identifiers from code (camelCase, snake_case, PascalCase)
 */
function extractIdentifiers(code) {
  const identifiers = new Set();
  
  // Match camelCase, PascalCase, snake_case, UPPER_CASE
  const matches = code.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  
  for (const match of matches) {
    // Split camelCase/PascalCase
    const parts = match
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[_\s]+/)
      .filter(p => p.length > 1 && !/^\d+$/.test(p));
    
    for (const part of parts) {
      identifiers.add(part.toLowerCase());
    }
  }
  
  return Array.from(identifiers);
}

/**
 * Convert identifier to phoneme sequence using G2P Jury
 */
async function identifierToPhonemes(identifier) {
  const result = PHONEME_ENGINE.analyzeDeepWithDiagnostics(identifier);
  if (!result || !result.analysis || !result.analysis.phonemes) return null;
  return result.analysis.phonemes;
}

/**
 * Convert phoneme sequence to feature vector using PHONOLOGICAL_FEATURES_V1)
 * Each phoneme → concatenated = variable length
 * We pad/truncate to fixed dimension for TurboQuant.
 */
function phonemesToFeatureVector(phonemes, dim = 256) {
  const vec = new Float32Array(dim);
  const featureKeys = Object.keys(PHONOLOGICAL_FEATURES_V1['AA']); // Get feature names
  
  let idx = 0;
  for (const phoneme of phonemes) {
    const basePhoneme = phoneme.replace(/[0-9]/g, '');
    const features = PHONOLOGICAL_FEATURES_V1[basePhoneme];
    if (!features) continue;
    
    for (const key of featureKeys) {
      if (idx >= dim) break;
      vec[idx++] = features[key] || 0;
    }
    
    // Add sonority as extra dimension
    if (idx < dim) {
      vec[idx++] = (SONORITY_HIERARCHY[basePhoneme] || 0) / 10;
    }
  }
  
  return vec;
}

/**
 * Full pipeline: code → identifiers → phonemes → feature vector → TurboQuant signature
 */
export async function codeToPhonemeSignature(code, dim = 256, seed = 1337) {
  const identifiers = extractIdentifiers(code);
  if (identifiers.length === 0) {
    return { data: new Uint8Array(0), norm: 0, schema: { dimension: dim, seed, lens: 'phoneme-prion' } };
  }
  
  // Aggregate phoneme features across all identifiers
  const aggregateVec = new Float32Array(dim);
  let count = 0;
  
  for (const ident of identifiers) {
    const phonemes = await identifierToPhonemes(ident);
    if (!phonemes || phonemes.length === 0) continue;
    
    const featVec = phonemesToFeatureVector(phonemes, dim);
    for (let i = 0; i < dim; i++) {
      aggregateVec[i] += featVec[i];
    }
    count++;
  }
  
  if (count === 0) {
    return { data: new Uint8Array(0), norm: 0, schema: { dimension: dim, seed, lens: 'phoneme-prion' } };
  }
  
  // Average
  for (let i = 0; i < dim; i++) {
    aggregateVec[i] /= count;
  }
  
  // TurboQuant compress
  const quantized = quantizeVectorJS(aggregateVec, seed);
  return { ...quantized, schema: { dimension: dim, seed, lens: 'phoneme-prion' } };
}

/**
 * PRION LIBRARY — Genetic markers as phoneme signatures.
 * Each prion is a known-buggy code pattern, pre-vectorized to its phoneme signature.
 * The hypothesis is the ACTUAL buggy code snippet, not a text description.
 */
export const PRION_SIGNATURES = Object.freeze({
  'unseeded-rng-deterministic': {
    // Buggy pattern: Math.random() in combat code without seed
    buggyCode: `
      function calculateDamage(attacker, defender) {
        const roll = Math.random();
        return attacker.strength * roll;
      }
      function procgenDungeon(seed) {
        const layout = Math.random();
        return layout;
      }
    `,
    description: 'Unseeded Math.random in deterministic combat/procgen paths'
  },
  'missing-null-guard-external': {
    // Buggy pattern: fetch().then(r => r.json()) without ?. guard
    buggyCode: `
      async function fetchUserData(userId) {
        const response = await fetch('/api/user/' + userId);
        const data = await response.json();
        return data.profile.name;
      }
      async function getConfig() {
        const res = await axios.get('/config');
        return res.data.settings.theme;
      }
    `,
    description: 'External API response accessed without null/undefined guards'
  },
  'assumed-array-length': {
    // Buggy pattern: arr[0] without .length check
    buggyCode: `
      function getFirstItem(items) {
        return items[0];
      }
      function processUser(users, index) {
        const user = users[index];
        return user.name;
      }
      function head(arr) {
        return arr[0].value;
      }
    `,
    description: 'Direct array index access without preceding bounds check'
  },
  'async-without-await': {
    // Buggy pattern: async function with fetch but no await
    buggyCode: `
      async function fetchData() {
        fetch('/api/data');
        return Promise.resolve('done');
      }
      async function saveUser(user) {
        axios.post('/users', user);
        return true;
      }
    `,
    description: 'Async function returns promise without awaiting fetch/axios call'
  },
  'mutation-during-iteration': {
    // Buggy pattern: forEach with push/splice on same array
    buggyCode: `
      function processItems(items) {
        items.forEach(item => {
          if (item.needsSplit) {
            items.push({ ...item, split: true });
          }
        });
      }
      function filterAndMutate(arr) {
        arr.map(x => {
          arr.splice(0, 1);
          return x * 2;
        });
      }
    `,
    description: 'Array mutated (push/splice/delete) during forEach/map iteration'
  },
  'race-condition-shared-state': {
    // Buggy pattern: Promise.all with shared object mutation
    buggyCode: `
      async function parallelUpdate(users) {
        const results = { success: 0, failed: 0 };
        await Promise.all(users.map(async u => {
          const ok = await updateUser(u);
          if (ok) results.success++;
          else results.failed++;
        }));
        return results;
      }
      async function concurrentWrite(keys) {
        const cache = {};
        await Promise.all(keys.map(k => {
          cache[k] = expensiveCompute(k);
        }));
        return cache;
      }
    `,
    description: 'Shared mutable state mutated concurrently in Promise.all'
  },
  'type-assertion-without-check': {
    // Buggy pattern: as unknown as Type without zod validation
    buggyCode: `
      function parseResponse(raw) {
        return raw as unknown as UserProfile;
      }
      function handleEvent(event) {
        const data = event.data as any;
        return data.id;
      }
      function unsafeCast(value) {
        return value as unknown as Config;
      }
    `,
    description: 'TypeScript assertion without runtime validation (zod, etc.)'
  },
  'resource-leak-no-cleanup': {
    // Buggy pattern: addEventListener without removeEventListener in cleanup
    buggyCode: `
      function setupListener() {
        window.addEventListener('resize', handleResize);
      }
      function useSubscription() {
        const sub = eventBus.subscribe('data', handler);
        // missing unsubscribe
      }
      function componentEffect() {
        useEffect(() => {
          socket.on('message', onMessage);
          // missing return () => socket.off('message', onMessage)
        }, []);
      }
    `,
    description: 'Event listener added without cleanup in useEffect/component unmount'
  },
  'silent-failure-swallowed-error': {
    // Buggy pattern: catch with empty body or only console.log
    buggyCode: `
      function riskyOperation() {
        try {
          dangerousCall();
        } catch (e) {
          // empty
        }
      }
      function fetchWithLog() {
        try {
          return await fetch('/api');
        } catch (error) {
          console.log(error);
        }
      }
      function silentFail() {
        try { doThing(); } catch (err) { console.error(err); }
      }
    `,
    description: 'Catch block with empty body or only console logging'
  },
  'hardcoded-secret-config': {
    // Buggy pattern: actual secret strings hardcoded
    buggyCode: `
      const API_KEY = "sk-1234567890abcdef";
      const SECRET_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz";
      process.env.DATABASE_PASSWORD = "supersecret123";
      const config = { apiKey: "sk-live-realkey", token: "Bearer xyz" };
    `,
    description: 'Hardcoded secret values assigned to variables'
  },
  'infinite-loop-risk': {
    // Buggy pattern: while(true) without reachable break
    buggyCode: `
      function waitForSignal() {
        while (true) {
          if (checkSignal()) break;
        }
      }
      function processQueue() {
        for (;;) {
          const item = queue.pop();
          if (!item) continue;
          process(item);
        }
      }
    `,
    description: 'Infinite loop with no reachable break/return condition'
  },
  'floating-point-equality': {
    // Buggy pattern: === comparison on floats without epsilon
    buggyCode: `
      function isZero(value) {
        return value === 0.0;
      }
      function compareFloats(a, b) {
        return a == b;
      }
      function checkRatio(x, y) {
        return x / y === 1.5;
      }
    `,
    description: 'Direct floating-point equality without epsilon comparison'
  },
  'time-dependent-logic': {
    // Buggy pattern: Date.now() in test without fake timers
    buggyCode: `
      function isExpired(timestamp) {
        return Date.now() > timestamp;
      }
      function waitForTimeout(ms) {
        return new Promise(r => setTimeout(r, ms));
      }
      function flakyTest() {
        const start = Date.now();
        await doWork();
        expect(Date.now() - start).toBeLessThan(100);
      }
    `,
    description: 'Time-dependent logic in test or flaky contexts'
  },
  'prototype-pollution': {
    // Buggy pattern: Object.assign/merge with user input
    buggyCode: `
      function mergeConfig(userConfig) {
        return Object.assign({}, defaultConfig, userConfig);
      }
      function deepMerge(target, source) {
        return _.merge(target, source);
      }
      function unsafeClone(obj) {
        return Object.assign({}, obj, { __proto__: null });
      }
    `,
    description: 'Object merge with prototype pollution vectors'
  },
  'cold-boot-daemon-fallback': {
    // Buggy pattern: HTTP daemon unavailable → spawn heavy in-process model
    buggyCode: `
      def ask_vaelrix(query, callback):
          try:
              client = get_cached_daemon_client()
              response = client.ask(query)
              return response
          except Exception:
              from brain_engine import BrainBridge
              bridge = BrainBridge(model="qwen", personality="Vaelrix")
              response = bridge.ask(query)
              return response
      async function queryBrainDaemon(prompt, fallbackFn) {
          try {
              const res = await fetch("http://localhost:9090/ask", { body: JSON.stringify({query: prompt}) });
              return await res.json();
          } catch (err) {
              return fallbackFn(prompt);
          }
      }
    `,
    description: 'Daemon HTTP client falls through to in-process model spawn instead of retry-with-backoff'
  },
});

/**
 * Pre-compute all prion signatures at load time
 */
let PRION_CACHE = null;

export async function initializePrionLibrary() {
  if (PRION_CACHE) return PRION_CACHE;
  
  console.log('[prion] Initializing phoneme prion library...');
  // Director seam: G2P must be loaded before any identifier is vectorized,
  // else analyzeDeepWithDiagnostics resolves to empty and every signature
  // degenerates to a zero vector.
  await PHONEME_ENGINE.init();
  PRION_CACHE = {};
  
  for (const [name, prion] of Object.entries(PRION_SIGNATURES)) {
    console.log(`[prion]   vectorizing: ${name}`);
    PRION_CACHE[name] = await codeToPhonemeSignature(prion.buggyCode);
    PRION_CACHE[name].description = prion.description;
  }
  
  console.log('[prion] Library ready.');
  return PRION_CACHE;
}

/**
 * Scan a file for prion resonance using phoneme signatures
 */
export async function scanFileForPrions(filePath, code, minResonance = 0.7) {
  const library = await initializePrionLibrary();
  const fileSig = await codeToPhonemeSignature(code);
  
  if (!fileSig.data || fileSig.data.length === 0) return [];
  
  const hits = [];
  for (const [prionName, prionSig] of Object.entries(library)) {
    if (!prionSig.data || prionSig.data.length === 0) continue;
    
    const resonance = estimateInnerProduct(fileSig.data, prionSig.data, fileSig.norm, prionSig.norm);
    const normalized = Math.max(0, Math.min(1, (resonance + 1) / 2));
    
    if (normalized >= minResonance) {
      hits.push({
        path: filePath,
        prion: prionName,
        resonance: normalized,
        description: prionSig.description
      });
    }
  }
  
  return hits.sort((a, b) => b.resonance - a.resonance);
}

/**
 * Scan entire substrate
 */
export async function scanSubstrateForPrions(files, minResonance = 0.7) {
  const library = await initializePrionLibrary();
  const allHits = [];
  
  console.log(`[prion] Scanning ${files.length} files...`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.content || file.content.length < 50) continue;
    
    const hits = await scanFileForPrions(file.path, file.content, minResonance);
    allHits.push(...hits);
    
    if (i % 500 === 0 && i > 0) {
      console.log(`[prion]   processed ${i}/${files.length} files, ${allHits.length} hits so far`);
    }
  }
  
  return allHits.sort((a, b) => b.resonance - a.resonance);
}