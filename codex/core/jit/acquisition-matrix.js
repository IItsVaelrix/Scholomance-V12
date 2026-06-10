export function createAcquisitionMatrix(signal = {}) {
  return {
    build(acquisitionDecision) {
      const contracts = Array.isArray(signal.contracts) ? signal.contracts : [];
      const laboratory = signal.laboratory || null;
      const verifier = signal.verifier || null;
      const transformer = signal.transformer || null;
      const predictionEngine = signal.predictionEngine || null;
      const g2p = signal.g2p || null;

      const matrix = {
        decision: acquisitionDecision || {},
        contracts,
        routeContract: { contracts, target: 'lab' },
        score: 'pending',
        verdict: 'undecided',
        notes: [],
        safety: {
          blocked: false,
          reason: null,
          capabilities: [],
        },
        annotations: {
          phonemeWarnings: [],
          compatibility: null,
          g2pCompatibility: null,
        },
      };

      if (g2p) {
        matrix.annotations.g2pCompatibility = {
          available: typeof g2p.checkG2PIntegration === 'function',
          checklist: {
            adapterRunG2PJury: 'configured',
            featureFlag: 'configured',
            verdictShape: 'configured',
          },
        };
      }

      return matrix;
    },
  };
}
