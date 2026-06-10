export function createG2PCompatibilityChecker(compatibilityContext = {}) {
  const g2p = compatibilityContext.g2p || {};

  return {
    async check() {
      const checks = [];

      if (typeof g2p.checkG2PIntegration === 'function') {
        const integrationCheck = await g2p.checkG2PIntegration();
        checks.push(integrationCheck);
      }

      if (typeof g2p.isCandidateGenerationStable === 'function') {
        const stabilityCheck = await g2p.isCandidateGenerationStable();
        checks.push(stabilityCheck);
      }

      const allPassed = checks.every((check) => check.passed !== false);
      const failures = checks.filter((check) => check.passed === false);

      return {
        passed: allPassed,
        checkCount: checks.length,
        passCount: checks.length - failures.length,
        failureCount: failures.length,
        checks,
        failures,
      };
    },
  };
}
