// src/server.ts
import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind
} from "vscode-languageserver/node";
import {
  TextDocument
} from "vscode-languageserver-textdocument";
import { Project } from "ts-morph";

// ../../src/core/scd64/generateSCD64FromSlots.ts
import crypto2 from "node:crypto";

// ../../src/core/scd64/glossary.ts
import crypto from "node:crypto";
var BUG_FAMILIES = Object.freeze({
  COLOR_DRAGON: Object.freeze({
    versionByte: "01",
    predictedVersionByte: "E1",
    domain: "COLOR",
    description: "Color bug caused by coordinate drift concealed by a fallback color path.",
    canonicals: Object.freeze([
      { slot: "BUGCLASS", canonical: "BUGCLASS:COLOR_DRAGON:coordinate-drift+fallback-masking" },
      { slot: "COORDSYS", canonical: "COORDSYS:source-charstart+lexical-sibling-walk+frontend-token-boundary" },
      { slot: "INVARIANT", canonical: "INVARIANT:globalCharStart-mismatch+vowelFamily-source-divergence" },
      { slot: "MAGNITUDE", canonical: "MAGNITUDE:mismatchRate>=0.94+perLineDrift+tokenCoverageDelta" },
      { slot: "MASKING", canonical: "MASKING:resonantCharStarts-true+frontend-fallback-painter-overrides-family" },
      { slot: "GATE", canonical: "GATE:resonanceGate>=0.95+backend-authoritative+frontend-recomputes-color" },
      { slot: "PROPAGATE", canonical: "PROPAGATE:backend-IR-to-ReadPage-to-Lexical-TruesightPlugin-divergence" },
      { slot: "VERDICT", canonical: "VERDICT:diagnose-only+authoritative-backend-family+rogue-painter" }
    ])
  }),
  RESONANCE_GHOST: Object.freeze({
    versionByte: "02",
    predictedVersionByte: "E2",
    domain: "COLOR",
    description: "Resonance gate Set construction failure: gate Set is empty when it should be populated, so the resonance-coloring never fires.",
    canonicals: Object.freeze([
      { slot: "BUGCLASS", canonical: "BUGCLASS:RESONANCE_GHOST:gate-Set-construction-failure" },
      { slot: "COORDSYS", canonical: "COORDSYS:gate-Set-from-allConnections+frontend-receives-empty-Set" },
      { slot: "INVARIANT", canonical: "INVARIANT:resonantCharStarts-Set-size-mismatch-with-IR-connections" },
      { slot: "MAGNITUDE", canonical: "MAGNITUDE:emptySetRate>=0.80+zeroColoredWords+gateSetSize=0" },
      { slot: "MASKING", canonical: "MASKING:gate-Set-quiet-empty+frontend-defaults-to-everything-or-nothing" },
      { slot: "GATE", canonical: "GATE:resonanceGate>=0.95+Set-construction-bug+frontend-shows-grey" },
      { slot: "PROPAGATE", canonical: "PROPAGATE:deepRhymeEngine-to-syntaxLayer-Set-construction-divergence" },
      { slot: "VERDICT", canonical: "VERDICT:diagnose-only+gate-Set-construction-broken+frontend-shows-nothing" }
    ])
  }),
  GATE_DATA_ABSENT: Object.freeze({
    versionByte: "03",
    predictedVersionByte: "E3",
    domain: "COLOR",
    description: "Resonance gate starved of input: rhyme connections exist only on the server synthesis path; the fallback path omits allConnections, so the gate reads a server-only key and the Set is empty.",
    canonicals: Object.freeze([
      { slot: "BUGCLASS", canonical: "BUGCLASS:GATE_DATA_ABSENT:fallback-synthesis-omits-connections+gate-reads-server-only-key" },
      { slot: "COORDSYS", canonical: "COORDSYS:server-only-syntaxLayer.allConnections+fallback-buildSyntaxLayer-emits-no-connections" },
      { slot: "INVARIANT", canonical: "INVARIANT:gate-connection-source-must-exist-on-every-synthesis-path" },
      { slot: "MAGNITUDE", canonical: "MAGNITUDE:fallbackPathSelected=1.0+gateSetSize=0+zeroColoredWords-when-server-unreachable" },
      { slot: "MASKING", canonical: "MASKING:isEnabled-false-silent-backoff-fallthrough+activeConnections-has-verseIR-fallback-resonanceGate-does-not" },
      { slot: "GATE", canonical: "GATE:resonanceGate-always-consulted+input-allConnections-undefined-on-fallback-path" },
      { slot: "PROPAGATE", canonical: "PROPAGATE:server-unreachable-to-isEnabled-false-to-synthesizeVerse-to-empty-syntaxLayer-to-empty-gate-Set" },
      { slot: "VERDICT", canonical: "VERDICT:diagnose-only+wire-connections-into-fallback-synthesis-or-add-gate-degraded-mode" }
    ])
  })
});
var SLOT_HUMAN_MEANINGS = Object.freeze({
  COLOR_DRAGON: Object.freeze({
    BUGCLASS: "Color bug caused by coordinate drift concealed by a fallback color path.",
    COORDSYS: "Backend source charStart vs Lexical sibling walk + frontend token boundary.",
    INVARIANT: "Global charStart matched but vowel/family source for color diverged.",
    MAGNITUDE: "High mismatch rate (>=0.94) with per-line drift and token coverage loss.",
    MASKING: "Resonant set present but frontend fallback painter overrode authoritative family.",
    GATE: "Resonance gate passed (>=0.95) in backend; frontend recomputed color family anyway.",
    PROPAGATE: "Divergence propagated: deepRhymeEngine \u2192 IR \u2192 ReadPage \u2192 TruesightPlugin.",
    VERDICT: "Diagnose-only. Authoritative backend family identified. Rogue frontend painter."
  }),
  RESONANCE_GHOST: Object.freeze({
    BUGCLASS: "Resonance-gate Set construction failure: the gate Set is empty when it should be populated.",
    COORDSYS: "Backend allConnections vs frontend gate Set; coordinate of failure is the Set-construction loop.",
    INVARIANT: "|resonantCharStarts| must equal |allConnections with score >= threshold|; mismatch means gate is silent.",
    MAGNITUDE: "Empty gate Set rate >= 0.80; zero colored words across the document.",
    MASKING: "Gate Set quietly empty; frontend silently falls through to either color-everything or color-nothing.",
    GATE: "Resonance gate score >= 0.95 in backend, but gate Set is empty so no word is selected.",
    PROPAGATE: "Divergence: deepRhymeEngine \u2192 syntaxLayer \u2192 ReadPage \u2192 gate Set construction skipped.",
    VERDICT: "Diagnose-only. Gate Set construction broken. Frontend shows nothing."
  }),
  GATE_DATA_ABSENT: Object.freeze({
    BUGCLASS: "Gate starved of input: the fallback synthesis path omits rhyme connections and the gate reads a server-only key.",
    COORDSYS: "allConnections exists only on the server path (syntaxLayer = analysis); buildSyntaxLayer emits no connections; compileVerseToIR emits no .connections.",
    INVARIANT: "The gate\u2019s connection source must exist on EVERY synthesis path (server and local fallback), not just the server path.",
    MAGNITUDE: "When the server is unreachable the fallback path is always selected; gate Set size is 0 and zero words color.",
    MASKING: "isEnabled() returns false during backoff and the fallthrough is silent; activeConnections survives via a verseIR fallback, but the resonance gate has no such fallback.",
    GATE: "The resonance gate is always consulted, but its input (allConnections) is undefined on the fallback path, so it selects nothing.",
    PROPAGATE: "server-unreachable \u2192 isEnabled()=false \u2192 synthesizeVerse \u2192 empty syntaxLayer \u2192 empty gate Set \u2192 no color.",
    VERDICT: "Diagnose-only. Fix: wire connections into the fallback synthesis OR give the gate a defined degraded mode when no source exists."
  })
});
function _humanMeaningForSlot(familyName, slotName) {
  const familyMeanings = SLOT_HUMAN_MEANINGS[familyName];
  if (familyMeanings && familyMeanings[slotName]) return familyMeanings[slotName];
  return BUG_FAMILIES[familyName]?.description || "See glossary.";
}
function buildSCD64Glossary() {
  const out = [];
  for (const [familyName, family] of Object.entries(BUG_FAMILIES)) {
    const deriveHex = (canonical, isBugClass, usePredictedPrefix = false) => {
      const hash = crypto.createHash("sha256").update(canonical).digest("hex").toUpperCase();
      if (isBugClass) {
        return (usePredictedPrefix ? family.predictedVersionByte : family.versionByte) + hash.slice(0, 6);
      }
      return hash.slice(0, 8);
    };
    for (let i = 0; i < family.canonicals.length; i += 1) {
      const entry = family.canonicals[i];
      const isBug = entry.slot === "BUGCLASS";
      const hex = deriveHex(entry.canonical, isBug);
      const glossaryEntry = {
        schema: "SCD64_GLOSSARY_ENTRY",
        schemaVersion: 1,
        family: familyName,
        slotIndex: isBug ? 0 : i,
        slotName: entry.slot,
        hexCode: hex,
        versionByte: isBug ? family.versionByte : void 0,
        predictedVersionByte: isBug ? family.predictedVersionByte : void 0,
        category: familyName,
        canonicalMeaning: entry.canonical.split(":").slice(1).join(":"),
        canonicalDerivationString: entry.canonical,
        humanMeaning: _humanMeaningForSlot(familyName, entry.slot),
        jsonFormulaTemplate: { name: entry.slot.toLowerCase() },
        fixedForever: true,
        categoryChecksum: ""
      };
      glossaryEntry.categoryChecksum = crypto.createHash("sha256").update(JSON.stringify({
        family: familyName,
        slotName: entry.slot,
        hexCode: hex,
        canonical: entry.canonical
      })).digest("hex").slice(0, 16).toUpperCase();
      out.push(Object.freeze(glossaryEntry));
    }
  }
  return Object.freeze(out);
}
var SCD64_GLOSSARY = buildSCD64Glossary();

// ../../src/core/scd64/generateSCD64FromSlots.ts
function generateSCD64(bugFamily, isPredicted = false) {
  const family = BUG_FAMILIES[bugFamily];
  if (!family) {
    throw new Error(`[SCD64] Unknown bug family: ${bugFamily}`);
  }
  const deriveHex = (canonical, isBugClass) => {
    const hash = crypto2.createHash("sha256").update(canonical).digest("hex").toUpperCase();
    if (isBugClass) {
      return (isPredicted ? family.predictedVersionByte : family.versionByte) + hash.slice(0, 6);
    }
    return hash.slice(0, 8);
  };
  const slots = family.canonicals.map((entry) => {
    const isBug = entry.slot === "BUGCLASS";
    return deriveHex(entry.canonical, isBug);
  });
  return slots.join("");
}

// ../../src/core/scd64/RuleRegistry.ts
var Registry = class {
  rules = [];
  register(rule) {
    this.rules.push(rule);
  }
  evaluateAll(sourceFile) {
    const matches = [];
    for (const rule of this.rules) {
      matches.push(...rule.evaluate(sourceFile));
    }
    return matches;
  }
};
var RuleRegistry = new Registry();
var LEGACY_PATTERNS = {
  COLOR_DRAGON: [
    /\bgetGlobalCharStart\s*\(/,
    /\banalysisMap\s*(?:\.|\[|\s*=|;|,|\))/,
    /\.set\([a-zA-Z_$.?\s]+\.toLowerCase\(\)/,
    /\.get\([a-zA-Z_$.?\s]+\.toLowerCase\(\)/
  ],
  GATE_DATA_ABSENT: [
    /deepAnalysis\?\.syntaxLayer\?\.allConnections/
  ],
  RESONANCE_GHOST: [
    /resonantCharStarts\s*=\s*null\b/,
    /resonantCharStarts\s*=\s*\[\s*\]/,
    /qualifies\s*=\s*\(\s*\)\s*=>/
  ]
};
var FIX_PATTERNS = {
  COLOR_DRAGON: [
    /computeCharStartFromLexical/,
    /resolveTokenDataAtPosition/
  ],
  GATE_DATA_ABSENT: [
    /resolveResonanceConnections/
  ],
  RESONANCE_GHOST: [
    /resonantCharStarts\s*=\s*new Set\(/,
    /MIN_RESONANCE_SCORE/
  ]
};
var REMEDIATION_HINTS = {
  COLOR_DRAGON: [
    "[BREAKPOINT] Set a breakpoint where TruesightPlugin computes global charStart to verify coordinate drift.",
    "[INSPECT] Compare backend source-relative charStart against frontend Lexical sibling accumulation in compileVerseToIR.js.",
    "[AVOID] Do not patch shouldColor() directly until coordinate authority is verified \u2014 fix the offset calculation instead."
  ],
  GATE_DATA_ABSENT: [
    "[INSPECT] Check the useVerseSynthesis catch path to ensure local fallback syntaxLayer construction provides connections.",
    "[INSPECT] Verify the 429 rate-limit path correctly falls back without starving the resonance gate.",
    "[FIX] Import and use resolveResonanceConnections() to explicitly merge or bypass missing server connections."
  ],
  RESONANCE_GHOST: [
    "[BREAKPOINT] Check if resonantCharStarts Set construction loop in ReadPage.jsx is skipped entirely.",
    "[INSPECT] Ensure MIN_RESONANCE_SCORE threshold check correctly builds the Set rather than returning null/empty.",
    "[AVOID] Do not explicitly zero out the gate Set on unhandled paths; initialize as an empty Set object."
  ]
};
function evaluateLegacyPatterns(sourceFile, family) {
  const matches = [];
  const text = sourceFile.getFullText();
  let legacyHits = 0;
  for (const pat of LEGACY_PATTERNS[family]) {
    const m = text.match(new RegExp(pat.source, pat.flags + "g"));
    if (m) legacyHits += m.length;
  }
  let fixHits = 0;
  for (const pat of FIX_PATTERNS[family]) {
    const m = text.match(new RegExp(pat.source, pat.flags + "g"));
    if (m) fixHits += m.length;
  }
  if (legacyHits > 0 && fixHits === 0) {
    let targetNode = null;
    const firstMatch = text.match(LEGACY_PATTERNS[family][0]);
    if (firstMatch && firstMatch.index) {
      targetNode = sourceFile.getDescendantAtPos(firstMatch.index) || sourceFile;
    } else {
      targetNode = sourceFile;
    }
    matches.push({
      ruleId: `SCD64.${family}.LEGACY_EVIDENCE`,
      family,
      similarity: "100%",
      // We use 100% since it matched the exact legacy signature
      severity: "warning",
      targetNode,
      evidence: [
        `Detected ${legacyHits} instances of legacy ${family} patterns.`
      ],
      remediation: REMEDIATION_HINTS[family] || ["Update the component to use the canonical fix patterns."],
      predictedSCD64: generateSCD64(family, true)
    });
  }
  return matches;
}
RuleRegistry.register({
  id: "SCD64.COLOR_DRAGON.LEGACY",
  family: "COLOR_DRAGON",
  evaluate(sourceFile) {
    return evaluateLegacyPatterns(sourceFile, "COLOR_DRAGON");
  }
});
RuleRegistry.register({
  id: "SCD64.GATE_DATA_ABSENT.LEGACY",
  family: "GATE_DATA_ABSENT",
  evaluate(sourceFile) {
    return evaluateLegacyPatterns(sourceFile, "GATE_DATA_ABSENT");
  }
});
RuleRegistry.register({
  id: "SCD64.RESONANCE_GHOST.LEGACY",
  family: "RESONANCE_GHOST",
  evaluate(sourceFile) {
    return evaluateLegacyPatterns(sourceFile, "RESONANCE_GHOST");
  }
});

// src/server.ts
var connection = createConnection(ProposedFeatures.all);
var documents = new TextDocuments(TextDocument);
var hasConfigurationCapability = false;
connection.onInitialize((params) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  const result = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental
      // Tell the client that this server supports code hover/diagnostics
    }
  };
  return result;
});
connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, void 0);
  }
});
var project = new Project({ useInMemoryFileSystem: true });
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});
async function validateTextDocument(textDocument) {
  const text = textDocument.getText();
  const uri = textDocument.uri;
  const sourceFile = project.createSourceFile(uri, text, { overwrite: true });
  const diagnostics = [];
  const matches = RuleRegistry.evaluateAll(sourceFile);
  for (const match of matches) {
    const start = sourceFile.getLineAndColumnAtPos(match.targetNode.getStart());
    const end = sourceFile.getLineAndColumnAtPos(match.targetNode.getEnd());
    const versionByte = match.predictedSCD64.slice(0, 2);
    const hoverMessage = `\`\`\`cli
\u26A0\uFE0F ARCHITECTURAL MUTATION PREDICTED
[${versionByte}] ${match.family} (Similarity: ${match.similarity})
=================================================
Predicted Checksum: ${match.predictedSCD64}

--- EVIDENCE ---
${match.evidence.map((e) => `> ${e}`).join("\n")}

--- REMEDIATION HINTS ---
${match.remediation.map((r) => `> ${r}`).join("\n")}
\`\`\``;
    const diagnostic = {
      severity: match.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      range: {
        start: { line: start.line - 1, character: start.column - 1 },
        end: { line: end.line - 1, character: end.column - 1 }
      },
      message: `Predicted SCD64 Mutation: ${match.family} risk detected.
Hover for remediation hints.

${hoverMessage}`,
      source: "SCD64 Immune System",
      code: match.ruleId
    };
    diagnostics.push(diagnostic);
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
documents.listen(connection);
connection.listen();
