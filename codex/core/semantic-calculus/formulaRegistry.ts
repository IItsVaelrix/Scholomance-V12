/**
 * SEMANTIC CALCULUS — formation/modulation formula registry (F2, F15)
 *
 * Formulas define what meanings can exist. Adding one is equivalent to extending
 * the executable language, so each carries an owner, a version, and a declared
 * risk class. Unknown formula id -> compile error or Theory; no anonymous bends.
 *
 * Phase 1 scope: exact UI lexicon binds only. No ballistics, no embeddings.
 */

import type { RiskProfile } from './types.ts';

export interface FormationFormula {
  id: string;
  version: string;
  owner: string;
  /**
   * F20 / SEMANTIC_KIND_PROBE_READONLY: Probe is emitted iff the FORMULA declares
   * a read-only effect. Rev 6 shipped a gene citing this field before the field
   * existed, which made Probe unreachable — read the formula, never the sentence.
   */
  effect: 'read' | 'mutate';
  /** Thresholds are per risk class. A destructive act may not borrow a UI threshold. */
  riskProfile: RiskProfile;
}

/**
 * F15 — risk profiles. The Visualiser guinea pig is reversible_ui by design:
 * finite, observable, reversible, cheap to label. Nothing else ships on this flag.
 */
const UI_NAVIGATE_RISK: RiskProfile = Object.freeze({
  consequence: 'reversible_ui',
  minMargin: 0.15,
  requiredCites: [],
  allowedFallback: 'Clarify',
  confirmationPolicy: 'none',
});

const UI_MUTATE_RISK: RiskProfile = Object.freeze({
  consequence: 'reversible_ui',
  minMargin: 0.35,
  requiredCites: ['lexicon.session'],
  allowedFallback: 'Clarify',
  confirmationPolicy: 'single',
});

/** Reading app state commits nothing, so the margin bar is low and it never confirms. */
const UI_INSPECT_RISK: RiskProfile = Object.freeze({
  consequence: 'reversible_ui',
  minMargin: 0.1,
  requiredCites: [],
  allowedFallback: 'Clarify',
  confirmationPolicy: 'none',
});

/**
 * The fallback profile for anything that does not bind. Deliberately strict.
 *
 * `allowedFallback` is an ACT TYPE, not a verdict — rev 5 set it to 'Escalate',
 * which was the kind/permission conflation leaking into the risk profile
 * (SEMANTIC_ACT_KIND_IS_NOT_PERMISSION). A thin margin falls back to asking
 * (Clarify) or looking (Probe). Escalating to a human is LAW's decision, and
 * adjudicateLaw already returns 'escalate' for anything non-reversible.
 */
export const UNBOUND_RISK: RiskProfile = Object.freeze({
  consequence: 'security',
  minMargin: 1.0,
  requiredCites: [],
  allowedFallback: 'Clarify',
  confirmationPolicy: 'two_phase',
});

export const FORMATION_FORMULAS: Readonly<Record<string, FormationFormula>> = Object.freeze({
  'ui.navigate.v1': {
    id: 'ui.navigate.v1',
    version: '1.1.0',
    owner: 'codex',
    effect: 'mutate', // changes what the user is looking at
    riskProfile: UI_NAVIGATE_RISK,
  },
  'ui.select.v1': {
    id: 'ui.select.v1',
    version: '1.1.0',
    owner: 'codex',
    effect: 'mutate',
    riskProfile: UI_NAVIGATE_RISK,
  },
  'ui.collapse.v1': {
    id: 'ui.collapse.v1',
    version: '1.1.0',
    owner: 'codex',
    effect: 'mutate',
    riskProfile: UI_MUTATE_RISK,
  },
  /** Read-only inspection. This is what makes Probe reachable. */
  'ui.inspect.v1': {
    id: 'ui.inspect.v1',
    version: '1.0.0',
    owner: 'codex',
    effect: 'read',
    riskProfile: UI_INSPECT_RISK,
  },
});

/** Phase 1 ships no modulators. F16 governs them when Phase 2 adds them. */
export const MODULATION_FORMULAS: Readonly<Record<string, { id: string; version: string }>> = Object.freeze({});

export function getFormation(id: string): FormationFormula | undefined {
  return FORMATION_FORMULAS[id];
}

/** Version identity for the determinism input list (§3.2). */
export function registryVersions(): { formation: string[]; modulation: string[] } {
  return {
    formation: Object.values(FORMATION_FORMULAS)
      .map((f) => `${f.id}@${f.version}`)
      .sort(),
    modulation: Object.values(MODULATION_FORMULAS)
      .map((f) => `${f.id}@${f.version}`)
      .sort(),
  };
}
