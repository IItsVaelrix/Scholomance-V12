import crypto from 'node:crypto';
import type { SCD64RemediationHint } from './types';
import { SCD64_SLOT_NAMES } from './constants';

export { SCD64_SLOT_NAMES };

export const BUG_FAMILIES = Object.freeze({
  COLOR_DRAGON: Object.freeze({
    versionByte: '01',
    predictedVersionByte: 'E1',
    domain: 'COLOR',
    description: 'Color bug caused by coordinate drift concealed by a fallback color path.',
    canonicals: Object.freeze([
      { slot: 'BUGCLASS',  canonical: 'BUGCLASS:COLOR_DRAGON:coordinate-drift+fallback-masking' },
      { slot: 'COORDSYS',  canonical: 'COORDSYS:source-charstart+lexical-sibling-walk+frontend-token-boundary' },
      { slot: 'INVARIANT', canonical: 'INVARIANT:globalCharStart-mismatch+vowelFamily-source-divergence' },
      { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:mismatchRate>=0.94+perLineDrift+tokenCoverageDelta' },
      { slot: 'MASKING',   canonical: 'MASKING:resonantCharStarts-true+frontend-fallback-painter-overrides-family' },
      { slot: 'GATE',      canonical: 'GATE:resonanceGate>=0.95+backend-authoritative+frontend-recomputes-color' },
      { slot: 'PROPAGATE', canonical: 'PROPAGATE:backend-IR-to-ReadPage-to-Lexical-TruesightPlugin-divergence' },
      { slot: 'VERDICT',   canonical: 'VERDICT:diagnose-only+authoritative-backend-family+rogue-painter' },
    ]),
  }),
  RESONANCE_GHOST: Object.freeze({
    versionByte: '02',
    predictedVersionByte: 'E2',
    domain: 'COLOR',
    description: 'Resonance gate Set construction failure: gate Set is empty when it should be populated, so the resonance-coloring never fires.',
    canonicals: Object.freeze([
      { slot: 'BUGCLASS',  canonical: 'BUGCLASS:RESONANCE_GHOST:gate-Set-construction-failure' },
      { slot: 'COORDSYS',  canonical: 'COORDSYS:gate-Set-from-allConnections+frontend-receives-empty-Set' },
      { slot: 'INVARIANT', canonical: 'INVARIANT:resonantCharStarts-Set-size-mismatch-with-IR-connections' },
      { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:emptySetRate>=0.80+zeroColoredWords+gateSetSize=0' },
      { slot: 'MASKING',   canonical: 'MASKING:gate-Set-quiet-empty+frontend-defaults-to-everything-or-nothing' },
      { slot: 'GATE',      canonical: 'GATE:resonanceGate>=0.95+Set-construction-bug+frontend-shows-grey' },
      { slot: 'PROPAGATE', canonical: 'PROPAGATE:deepRhymeEngine-to-syntaxLayer-Set-construction-divergence' },
      { slot: 'VERDICT',   canonical: 'VERDICT:diagnose-only+gate-Set-construction-broken+frontend-shows-nothing' },
    ]),
  }),
  GATE_DATA_ABSENT: Object.freeze({
    versionByte: '03',
    predictedVersionByte: 'E3',
    domain: 'COLOR',
    description: 'Resonance gate starved of input: rhyme connections exist only on the server synthesis path; the fallback path omits allConnections, so the gate reads a server-only key and the Set is empty.',
    canonicals: Object.freeze([
      { slot: 'BUGCLASS',  canonical: 'BUGCLASS:GATE_DATA_ABSENT:fallback-synthesis-omits-connections+gate-reads-server-only-key' },
      { slot: 'COORDSYS',  canonical: 'COORDSYS:server-only-syntaxLayer.allConnections+fallback-buildSyntaxLayer-emits-no-connections' },
      { slot: 'INVARIANT', canonical: 'INVARIANT:gate-connection-source-must-exist-on-every-synthesis-path' },
      { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:fallbackPathSelected=1.0+gateSetSize=0+zeroColoredWords-when-server-unreachable' },
      { slot: 'MASKING',   canonical: 'MASKING:isEnabled-false-silent-backoff-fallthrough+activeConnections-has-verseIR-fallback-resonanceGate-does-not' },
      { slot: 'GATE',      canonical: 'GATE:resonanceGate-always-consulted+input-allConnections-undefined-on-fallback-path' },
      { slot: 'PROPAGATE', canonical: 'PROPAGATE:server-unreachable-to-isEnabled-false-to-synthesizeVerse-to-empty-syntaxLayer-to-empty-gate-Set' },
      { slot: 'VERDICT',   canonical: 'VERDICT:diagnose-only+wire-connections-into-fallback-synthesis-or-add-gate-degraded-mode' },
    ]),
  }),
  GATE_DRIFT_FALSE_ALARM: Object.freeze({
    versionByte: '04',
    predictedVersionByte: 'E4',
    domain: 'COLOR',
    description: 'Drift detector false-positive: warning logic checked if the current word was present in the subset of actively resonating words rather than the full document analysis.',
    canonicals: Object.freeze([
      { slot: 'BUGCLASS',  canonical: 'BUGCLASS:GATE_DRIFT_FALSE_ALARM:probe-checked-subset-instead-of-full-analysis' },
      { slot: 'COORDSYS',  canonical: 'COORDSYS:truesight-plugin-maybeWarnIfGateConventionDrifted' },
      { slot: 'INVARIANT', canonical: 'INVARIANT:analyzedWordsByCharStart-must-be-used-to-check-drift-not-resonantCharStarts' },
      { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:warning-on-first-non-rhyming-word' },
      { slot: 'MASKING',   canonical: 'MASKING:no-masking-pure-diagnostic-error' },
      { slot: 'GATE',      canonical: 'GATE:probe-always-warns-when-globalCharStart-missing-from-resonantCharStarts' },
      { slot: 'PROPAGATE', canonical: 'PROPAGATE:LexicalScrollEditor-to-TruesightPlugin-to-console-warn' },
      { slot: 'VERDICT',   canonical: 'VERDICT:diagnose-only+change-probe-to-check-full-analysis-map' },
    ]),
  }),
  SCORE_DRIFT: Object.freeze({
    versionByte: '05',
    predictedVersionByte: 'E5',
    domain: 'SCORING',
    description: 'Ranker score diverges from the transparent reference token weight: a provider miscalibrates a token (over- or under-weighted) and the error stays hidden until the final ranked list.',
    canonicals: Object.freeze([
      { slot: 'BUGCLASS',  canonical: 'BUGCLASS:SCORE_DRIFT:ranker-score-diverges-from-reference-token-weight' },
      { slot: 'COORDSYS',  canonical: 'COORDSYS:reference-weight-tfidf-syllable-position-vs-ranker-aggregate-of-8-providers' },
      { slot: 'INVARIANT', canonical: 'INVARIANT:abs-rankerScore-minus-referenceWeight-within-deviationThreshold-for-auditable-tokens' },
      { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:abs-deviation>0.25+meanAbsoluteDeviation+worstTokenDelta' },
      { slot: 'MASKING',   canonical: 'MASKING:provider-level-weights-conceal-per-token-miscalibration-until-final-list' },
      { slot: 'GATE',      canonical: 'GATE:referenceWeight>=MIN_AUDITABLE_WEIGHT-0.05+token-was-ranked' },
      { slot: 'PROPAGATE', canonical: 'PROPAGATE:provider-scoring-to-ranker-DEFAULT_WEIGHTS-to-ranked-list-to-output' },
      { slot: 'VERDICT',   canonical: 'VERDICT:diagnose-only+over-or-under-weighted+inspect-provider-vs-DEFAULT_WEIGHTS' },
    ]),
  }),
});

const SLOT_HUMAN_MEANINGS: Record<string, Record<string, string>> = Object.freeze({
  COLOR_DRAGON: Object.freeze({
    BUGCLASS:  'Color bug caused by coordinate drift concealed by a fallback color path.',
    COORDSYS:  'Backend source charStart vs Lexical sibling walk + frontend token boundary.',
    INVARIANT: 'Global charStart matched but vowel/family source for color diverged.',
    MAGNITUDE: 'High mismatch rate (>=0.94) with per-line drift and token coverage loss.',
    MASKING:   'Resonant set present but frontend fallback painter overrode authoritative family.',
    GATE:      'Resonance gate passed (>=0.95) in backend; frontend recomputed color family anyway.',
    PROPAGATE: 'Divergence propagated: deepRhymeEngine → IR → ReadPage → TruesightPlugin.',
    VERDICT:   'Diagnose-only. Authoritative backend family identified. Rogue frontend painter.',
  }),
  RESONANCE_GHOST: Object.freeze({
    BUGCLASS:  'Resonance-gate Set construction failure: the gate Set is empty when it should be populated.',
    COORDSYS:  'Backend allConnections vs frontend gate Set; coordinate of failure is the Set-construction loop.',
    INVARIANT: '|resonantCharStarts| must equal |allConnections with score >= threshold|; mismatch means gate is silent.',
    MAGNITUDE: 'Empty gate Set rate >= 0.80; zero colored words across the document.',
    MASKING:   'Gate Set quietly empty; frontend silently falls through to either color-everything or color-nothing.',
    GATE:      'Resonance gate score >= 0.95 in backend, but gate Set is empty so no word is selected.',
    PROPAGATE: 'Divergence: deepRhymeEngine → syntaxLayer → ReadPage → gate Set construction skipped.',
    VERDICT:   'Diagnose-only. Gate Set construction broken. Frontend shows nothing.',
  }),
  GATE_DATA_ABSENT: Object.freeze({
    BUGCLASS:  'Gate starved of input: the fallback synthesis path omits rhyme connections and the gate reads a server-only key.',
    COORDSYS:  'allConnections exists only on the server path (syntaxLayer = analysis); buildSyntaxLayer emits no connections; compileVerseToIR emits no .connections.',
    INVARIANT: 'The gate’s connection source must exist on EVERY synthesis path (server and local fallback), not just the server path.',
    MAGNITUDE: 'When the server is unreachable the fallback path is always selected; gate Set size is 0 and zero words color.',
    MASKING:   'isEnabled() returns false during backoff and the fallthrough is silent; activeConnections survives via a verseIR fallback, but the resonance gate has no such fallback.',
    GATE:      'The resonance gate is always consulted, but its input (allConnections) is undefined on the fallback path, so it selects nothing.',
    PROPAGATE: 'server-unreachable → isEnabled()=false → synthesizeVerse → empty syntaxLayer → empty gate Set → no color.',
    VERDICT:   'Diagnose-only. Fix: wire connections into the fallback synthesis OR give the gate a defined degraded mode when no source exists.',
  }),
  GATE_DRIFT_FALSE_ALARM: Object.freeze({
    BUGCLASS:  'False-positive drift warning caused by checking a filtered subset of words instead of the full document.',
    COORDSYS:  'TruesightPlugin drift detector probe (maybeWarnIfGateConventionDrifted).',
    INVARIANT: 'The drift detector must check analyzedWordsByCharStart, not resonantCharStarts, to see if the word was analyzed.',
    MAGNITUDE: 'Spams console with warning on the first non-rhyming word transformed.',
    MASKING:   'No masking. The bug is purely in the diagnostic probe itself.',
    GATE:      'The probe warned if globalCharStart wasn\'t in resonantCharStarts, which is usually true for most words.',
    PROPAGATE: 'Lexical transform → TruesightPlugin drift probe → console.warn spam.',
    VERDICT:   'Diagnose-only. Fixed by updating the probe to check the full analysis map.',
  }),
  SCORE_DRIFT: Object.freeze({
    BUGCLASS:  'Ranker score diverges from the reference token weight (over- or under-weighted).',
    COORDSYS:  'Reference weight (TF-IDF × syllable salience × position) vs the ranker aggregate of 8 providers.',
    INVARIANT: '|rankerScore − referenceWeight| must stay within the deviation threshold for auditable tokens.',
    MAGNITUDE: '|deviation| exceeds the threshold (default 0.25); mean absolute deviation and worst-token delta quantify it.',
    MASKING:   'Provider-level weights conceal per-token miscalibration until the final ranked list.',
    GATE:      'Token is auditable (referenceWeight ≥ MIN_AUDITABLE_WEIGHT 0.05) and was actually ranked.',
    PROPAGATE: 'Divergence propagates: provider scoring → ranker DEFAULT_WEIGHTS → ranked list → output.',
    VERDICT:   'Diagnose-only. Over- or under-weighted; inspect the provider vs ranker DEFAULT_WEIGHTS.',
  }),
});

function _humanMeaningForSlot(familyName: string, slotName: string): string {
  const familyMeanings = SLOT_HUMAN_MEANINGS[familyName];
  if (familyMeanings && familyMeanings[slotName]) return familyMeanings[slotName];
  // @ts-ignore
  return BUG_FAMILIES[familyName]?.description || 'See glossary.';
}

export function buildSCD64Glossary() {
  const out = [];
  for (const [familyName, family] of Object.entries(BUG_FAMILIES)) {
    const deriveHex = (canonical: string, isBugClass: boolean, usePredictedPrefix = false) => {
      const hash = crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase();
      if (isBugClass) {
        return (usePredictedPrefix ? family.predictedVersionByte : family.versionByte) + hash.slice(0, 6);
      }
      return hash.slice(0, 8);
    };

    // We store the confirmed variants in the glossary. For predicted matches, we can swap the prefix later.
    for (let i = 0; i < family.canonicals.length; i += 1) {
      const entry = family.canonicals[i];
      const isBug = entry.slot === 'BUGCLASS';
      const hex = deriveHex(entry.canonical, isBug);
      
      const glossaryEntry = {
        schema: 'SCD64_GLOSSARY_ENTRY',
        schemaVersion: 1,
        family: familyName,
        slotIndex: isBug ? 0 : i,
        slotName: entry.slot,
        hexCode: hex,
        versionByte: isBug ? family.versionByte : undefined,
        predictedVersionByte: isBug ? family.predictedVersionByte : undefined,
        category: familyName,
        canonicalMeaning: entry.canonical.split(':').slice(1).join(':'),
        canonicalDerivationString: entry.canonical,
        humanMeaning: _humanMeaningForSlot(familyName, entry.slot),
        jsonFormulaTemplate: { name: entry.slot.toLowerCase() },
        fixedForever: true,
        categoryChecksum: ""
      };
      glossaryEntry.categoryChecksum = crypto.createHash('sha256')
        .update(JSON.stringify({
          family: familyName,
          slotName: entry.slot,
          hexCode: hex,
          canonical: entry.canonical,
        }))
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();
      out.push(Object.freeze(glossaryEntry));
    }
  }
  return Object.freeze(out);
}

export const SCD64_GLOSSARY = buildSCD64Glossary();
