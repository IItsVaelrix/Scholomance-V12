/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createCombatOpponent } from "../../codex/core/opponent.engine.js";
import { execSync } from 'child_process';

describe("Determinism", () => {
  it("createCombatOpponent should be deterministic", () => {
    const opponent1 = createCombatOpponent({ seed: 12345 });
    const opponent2 = createCombatOpponent({ seed: 12345 });
    expect(opponent1).toEqual(opponent2);
  });

  it("should not have any un-exempted Math.random calls", () => {
    const output = execSync(
      "grep -r 'Math.random()' -l codex/core codex/runtime codex/server --exclude-dir=node_modules --exclude-dir=immunity 2>/dev/null | grep -v -e 'opponent.engine.js' -e 'sonicStationBuckets.js' -e 'wordLookupPipeline.js' -e 'captcha.service.js' || true"
    ).toString();
    expect(output.trim()).toBe("");
  });

  it("should not have any un-exempted Date.now calls", () => {
    const output = execSync(
      "grep -r 'Date.now' -l codex/core codex/runtime codex/server --exclude-dir=node_modules --exclude-dir=immunity --exclude-dir=pixelbrain --exclude-dir=diagnostic --exclude-dir=microprocessors --exclude-dir=shared --exclude-dir=animation --exclude-dir=collab --exclude-dir=services --exclude-dir=routes 2>/dev/null | grep -v -e 'observability.metrics.js' -e 'server/index.js' -e 'user.persistence.js' -e 'lexicon.abyss.js' -e 'spellchecker.js' -e 'rateLimit.js' -e 'cache.js' || true"
    ).toString();
    expect(output.trim()).toBe("");
  });

  it("should not have any un-exempted performance.now calls", () => {
    const output = execSync(
      "grep -r 'performance.now' -l codex/core codex/runtime codex/server --exclude-dir=node_modules --exclude-dir=immunity --exclude-dir=pixelbrain --exclude-dir=diagnostic --exclude-dir=microprocessors --exclude-dir=shared --exclude-dir=animation --exclude-dir=collab --exclude-dir=services --exclude-dir=routes 2>/dev/null || true"
    ).toString();
    expect(output.trim()).toBe("");
  });
});
