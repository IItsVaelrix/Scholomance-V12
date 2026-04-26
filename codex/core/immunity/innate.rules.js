/**
 * LAYER 1 — INNATE IMMUNITY (The Skin Barrier)
 * 
 * Lightweight pattern checks to reject obvious entropy.
 * Cheap, fast, deterministic.
 */

export const INNATE_RULES = [
  {
    id: 'QUANT-0101',
    name: 'Math.random() outside seeded contexts',
    bytecode: 'PB-ERR-v1-VALUE-CRIT-QUANT-0101',
    detector: (content, filePath) => {
      // Allow list: visual jitter / atmosphere
      if (filePath.includes('/effects/') || filePath.includes('/atmosphere/')) return false;
      // Skip if content contains the explicit allow annotation
      if (content.includes('// IMMUNE_ALLOW: math-random')) return false;
      
      const regex = /Math\.random\(\)/g;
      return regex.test(content);
    },
    repair: "Replace with `seedrandom(seed)`. Combat/Visual seeds must be derived from session context."
  },
  {
    id: 'QUANT-0102',
    name: 'Unseeded Time in hot paths',
    bytecode: 'PB-ERR-v1-VALUE-CRIT-QUANT-0102',
    detector: (content, filePath) => {
      if (filePath.includes('/tests/') || filePath.includes('.test.')) return false;
      const regex = /Date\.now\(\)|performance\.now\(\)/g;
      // Only flag in scoring or rendering logic
      const isHotPath = /scoring|rendering|resolve|compute/i.test(filePath);
      return isHotPath && regex.test(content);
    },
    repair: "Use the authoritative 'clock' provided by the pipeline context to ensure cross-browser parity."
  },
  {
    id: 'LING-0F03',
    name: 'Forbidden UI -> Codex Import',
    bytecode: 'PB-ERR-v1-LINGUISTIC-CRIT-LING-0F03',
    detector: (content, filePath) => {
      // Only check source files, excluding the official src/lib/ bridge
      if (!filePath.startsWith('src/') || filePath.startsWith('src/lib/')) return false;
      // Match any import targeting the codex directory
      const regex = /import.*from.*['"].*\/codex\//g;
      return regex.test(content);
    },
    repair: "Move logic to `codex/runtime/` and expose via bridge in `src/lib/`. Respect architectural layering."
  },
  {
    id: 'LING-0F05',
    name: 'Known-Violation Literal',
    bytecode: 'PB-ERR-v1-LINGUISTIC-CRIT-LING-0F05',
    detector: (content) => {
      // Forbidden symbol names (purged in cleansing)
      const forbidden = ['legacyRhymeTree', 'combatScoringOld', 'toolbarBytecode'];
      return forbidden.some(sym => content.includes(sym));
    },
    repair: "Symbol was removed in the Corruption Cleansing of 2026-04-26. See ARCH-2026-04-26-IMMUNE-SYSTEM.md."
  }
];
