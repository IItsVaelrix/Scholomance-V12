PDR: SCD64 Predictive IntelliSense & Architectural Immune Language Server
Status

Proposal Draft v0.2

Change Classification

Developer Experience + Static Analysis + Language Server + Diagnostic Safety Layer

This PDR extends the SCD64 ecosystem from post-runtime observability into pre-runtime architectural detection.

It introduces a local IDE-facing system that can:

Detect known dangerous architectural patterns before execution.
Predict which SCD64 family or mutation the code resembles.
Surface warnings directly in the editor.
Attach remediation hints from the MCP/SCD64 glossary.
Preserve the core SCD64 rule: prediction is not confirmation.

This does not change the SCD64 runtime diagnostic contract.

1. Summary

Standard IntelliSense, TypeScript, and ESLint can detect syntax errors, type mismatches, unused variables, and local code smells. They cannot understand domain-specific architectural invariants like:

Do not modify TrueSight color gates without validating coordinate authority.

The current SCD64 system captures those failures after they occur. It emits a deterministic 64-character diagnostic fingerprint, stores it in BytecodeHealth, and allows MCP/TurboQuant retrieval.

This PDR proposes upgrading scd64-vscode into an Architectural Immune Language Server.

Instead of waiting for a runtime diagnostic, the extension analyzes code as the developer types. When it detects code that structurally resembles a known SCD64 fossil, it emits an IDE warning:

⚠️ Predicted SCD64 Mutation
Family: COLOR_DRAGON
Similarity: 6/8 blocks
Risk: frontend coordinate recomputation may desync from backend charStart authority

The goal is not to auto-fix code.

The goal is to make architectural memory visible at authoring time.

2. Core Principle
Predicted SCD64 is not confirmed SCD64

A runtime SCD64 is evidence-backed.

A predicted SCD64 is a static-analysis hypothesis.

Therefore, the system must never store predicted signatures as confirmed diagnostics unless runtime evidence later validates them.

{
  "runtimeSCD64": {
    "meaning": "Confirmed diagnostic fingerprint generated from runtime evidence",
    "mayEnterBytecodeHealth": true,
    "mayTriggerCircuitBreaker": true
  },
  "predictedSCD64": {
    "meaning": "Static-analysis hypothesis based on code shape",
    "mayEnterBytecodeHealth": false,
    "mayTriggerCircuitBreaker": false,
    "mayRenderIDESquiggle": true
  }
}

This avoids namespace corruption.

Raw query hashes, prediction hashes, and exploratory similarity IDs must not masquerade as canonical SCD64 v1 diagnostics.

3. Why
Current problem

The existing workflow is too late:

write risky code
→ run app
→ trigger bug
→ inspect logs
→ decode SCD64
→ query MCP glossary
→ infer remediation

This is useful, but reactive.

Target state

The desired workflow is:

type risky architectural pattern
→ IDE detects known fossil shape
→ squiggle appears
→ hover shows predicted SCD64 family
→ remediation hints explain where to inspect
→ developer avoids known failure path
Risk reduced
Risk	Reduced by
Known regressions reappearing	Static fossil matching
New contributors breaking hidden invariants	Domain-aware IDE warnings
Over-reliance on runtime tests	Shift-left architectural checks
AI agents patching the wrong layer	Inline remediation warnings
SCD64 namespace pollution	Predicted/confirmed separation
4. Goals
Primary goals
{
  "goals": [
    "Detect known architectural anti-patterns from source code structure",
    "Predict likely SCD64 family or mutation without claiming confirmation",
    "Render VS Code diagnostics with actionable hover text",
    "Use MCP/SCD64 glossary remediation hints when available",
    "Compare predicted slot anatomy against known fossils using block-level similarity",
    "Preserve diagnose-only behavior"
  ]
}
Non-goals
{
  "nonGoals": [
    "Auto-fixing code",
    "Replacing TypeScript, ESLint, or unit tests",
    "Running the Scholomance backend inside VS Code",
    "Triggering runtime circuit breakers from static predictions",
    "Writing predicted SCD64 values into BytecodeHealth",
    "Treating vector similarity as runtime proof",
    "Creating new canonical SCD64 entries without review"
  ]
}
5. Terminology
Confirmed SCD64

A confirmed SCD64 is generated from runtime diagnostic evidence.

Example:

01861DF4C31AC92C24D4754DD1043D244908E4B3317B90735048A13A0AB2B33C
Predicted SCD64

A predicted SCD64 is a static-analysis approximation of the eight-slot anatomy.

It should be represented as an object, not only as a raw string.

type PredictedSCD64 = {
  kind: "PREDICTED_SCD64";
  predictedChecksum64: string;
  predictedFamily: string;
  confidence: number;
  evidenceLevel: "STATIC_PATTERN" | "AST_MATCH" | "DATAFLOW_MATCH";
  matchedKnownChecksum64?: string;
  blockSimilarity?: SCD64BlockSimilarity;
  runtimeConfirmed: false;
};
SCD64 Block Similarity

The similarity engine compares the eight 8-character blocks, not raw character-level Hamming distance.

{
  "formula": "SBS(A, B) = matchingSlotBlocks(A, B) / 8",
  "unit": "8 semantic blocks",
  "not": "raw 64-character hash distance"
}
6. Dependency Check
System	Dependency	Risk	Mitigation
scd64-vscode	Must upgrade from hover-only to diagnostics	High	Build as staged LSP
SCD64 glossary	Needs local/offline manifest	Medium	Versioned JSON snapshot
MCP substrate	Optional live lookup	Medium	Cache locally, fail gracefully
compareSCD64ByBlocks	Needed for similarity	Low	Move into shared package
AST parser	Must understand TS/JS/JSX	High	Use TypeScript compiler API
TrueSight invariants	Need rule registry	Medium	Start with narrow COLOR_DRAGON rules
VS Code diagnostics	Must avoid noisy warnings	High	Confidence thresholds + suppressions
Runtime SCD64	Must remain separate	High	Namespace policy enforced in types
7. Architecture
Recommended architecture
VS Code Extension
  └─ SCD64 Language Client
      └─ SCD64 Language Server
          ├─ DocumentStore
          ├─ ASTParser
          ├─ RuleRegistry
          ├─ EvidenceExtractor
          ├─ PredictionEngine
          ├─ SimilarityEngine
          ├─ GlossaryProvider
          └─ DiagnosticRenderer
Why Language Server instead of extension-only

A Language Server gives:

{
  "benefits": [
    "clean separation from VS Code UI code",
    "testable analysis core",
    "future editor portability",
    "better incremental diagnostics",
    "lower coupling to extension lifecycle"
  ]
}

The VS Code extension should mostly render results.

The language server should own analysis.

8. Data Flow
text document changed
→ debounce
→ parse AST
→ run domain rule matchers
→ extract evidence
→ synthesize predicted slot anatomy
→ compare against known SCD64 fossils
→ classify risk
→ request glossary/remediation hints
→ publish VS Code diagnostic
Data flow object
type SCD64StaticAnalysisResult = {
  documentUri: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  ruleId: string;
  predicted: PredictedSCD64;
  evidence: StaticEvidence[];
  remediationHints: SCD64RemediationHint[];
  severity: "hint" | "warning" | "error";
};
9. Feature 1: Predictive AST Watcher
Problem

The extension needs to detect architectural intent without executing the app.

Regex alone is too brittle.

Proposal

Use TypeScript compiler API or ts-morph to parse active documents into ASTs.

Initial supported files:

{
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx"
  ],
  "priorityTargets": [
    "TruesightPlugin.jsx",
    "LexicalScrollEditor.jsx",
    "compileVerseToIR.js",
    "ReadPage.jsx"
  ]
}
Initial patterns to watch
COLOR_DRAGON coordinate authority risk

Detect code that:

{
  "riskPattern": "frontend coordinate recomputation used for color gate",
  "signals": [
    "function or call named getGlobalCharStart",
    "Lexical node traversal",
    "sibling accumulation",
    "membership check against resonantCharStarts",
    "fallback analysisMap lookup by lowercase token text",
    "color class mutation inside frontend plugin"
  ]
}
Rogue painter risk

Detect code that:

{
  "riskPattern": "frontend recomputes color family instead of consuming authoritative IR",
  "signals": [
    "wordTruesight(word)",
    "PhonemeEngine.analyzeDeep",
    "frontend vowelFamily assignment",
    "school/color class derived inside plugin",
    "backend vowelFamily ignored"
  ]
}
Gate patch risk

Detect code that:

{
  "riskPattern": "shouldColor patched without coordinate authority validation",
  "signals": [
    "shouldColor",
    "resonance gate",
    "resonantCharStarts.includes",
    "no comparison against backend globalCharStart",
    "no authoritative IR lookup"
  ]
}
10. Feature 2: Evidence-Gated Prediction
Problem

A single symbol name should not trigger a scary warning.

For example, the presence of getGlobalCharStart alone is not enough.

Proposal

Each rule must require multiple evidence anchors.

type StaticEvidence = {
  kind:
    | "CALL_EXPRESSION"
    | "IDENTIFIER"
    | "MEMBERSHIP_CHECK"
    | "FALLBACK_LOOKUP"
    | "LEXICAL_TRAVERSAL"
    | "COLOR_CLASS_MUTATION"
    | "MISSING_AUTHORITY_CHECK";
  symbol: string;
  file: string;
  range: SourceRange;
  weight: number;
};
Confidence scoring
{
  "formula": "confidence = sum(evidenceWeights) / requiredWeight",
  "thresholds": {
    "below0.45": "no diagnostic",
    "0.45to0.65": "hint",
    "0.65to0.85": "warning",
    "above0.85": "errorCandidate"
  }
}
Example COLOR_DRAGON rule
const COLOR_DRAGON_COORDINATE_RULE = {
  id: "SCD64.COLOR_DRAGON.COORDINATE_AUTHORITY",
  family: "COLOR_DRAGON",
  requiredEvidence: [
    "LEXICAL_TRAVERSAL",
    "MEMBERSHIP_CHECK",
    "MISSING_AUTHORITY_CHECK"
  ],
  optionalEvidence: [
    "FALLBACK_LOOKUP",
    "COLOR_CLASS_MUTATION",
    "FRONTEND_VOWEL_RECOMPUTE"
  ],
  predictedSlots: {
    BUGCLASS: "COLOR_DRAGON:coordinate-drift+fallback-masking",
    COORDSYS: "source-charstart+lexical-sibling-walk+frontend-token-boundary",
    INVARIANT: "globalCharStart-mismatch+vowelFamily-source-divergence",
    MAGNITUDE: "static-risk:unknown-runtime-magnitude",
    MASKING: "text-keyed-fallback-risk",
    GATE: "resonanceGate-membership-risk",
    PROPAGATE: "backend-IR-to-ReadPage-to-Lexical-TruesightPlugin-risk",
    VERDICT: "predicted-risk:not-runtime-confirmed"
  }
};
11. Feature 3: Pre-runtime Signature Prediction
Problem

Static analysis cannot know runtime magnitude or confirmed propagation.

But it can synthesize a predicted slot anatomy.

Proposal

Generate a predicted checksum only from static-safe canonical strings.

For unknown runtime-only slots, use dedicated predicted/null categories rather than pretending runtime evidence exists.

Example:

{
  "MAGNITUDE": "STATIC_UNKNOWN_MAGNITUDE",
  "VERDICT": "PREDICTED_NOT_CONFIRMED"
}
Prediction object
type SCD64Prediction = {
  kind: "PREDICTED_SCD64";
  predictedChecksum64: string;
  knownRuntimeMatch?: string;
  predictedSlots: Array<{
    index: number;
    name: SCD64SlotName;
    hex: string;
    source: "STATIC_RULE" | "UNKNOWN_STATIC" | "KNOWN_FOSSIL_MATCH";
    confidence: number;
  }>;
  similarityToKnown: {
    checksum64: string;
    family: string;
    matchingBlocks: number;
    changedBlocks: SCD64SlotName[];
    relationship: "IDENTICAL_STATIC_SHAPE" | "MUTATION" | "RELATED_FAMILY" | "WEAK_NEIGHBOR";
  };
  runtimeConfirmed: false;
};
Important rule

A predicted checksum MUST start with the reserved prefix `E1` (Estimate/Expected v1) to unmistakably distinguish it from confirmed `01` runtime checksums at the string level.

Raw query hashes are not SCD64.

{
  "namespacePolicy": {
    "canonicalRuntimeSCD64": "64 uppercase hex, version byte 01, 02, or 03, glossary-backed, runtime evidence",
    "predictedSCD64": "64 uppercase hex, version byte E1, glossary-backed, static evidence, runtimeConfirmed false",
    "queryHash64": "64 uppercase hex allowed, not glossary-backed, not SCD64"
  }
}
12. Feature 4: IntelliSense Diagnostics
Problem

The prediction must be visible where the dangerous edit occurs.

Proposal

Use vscode.DiagnosticCollection.

Diagnostics should underline the most relevant source range, not the whole file.

Diagnostic severity
{
  "severityPolicy": {
    "hint": "weak static pattern",
    "warning": "strong fossil similarity",
    "error": "reserved for known banned pattern or confirmed generated file"
  }
}

Default to Warning, not Error.

The IDE should feel like a scout tapping your shoulder, not a prison warden.

Hover text
⚠️ ARCHITECTURAL MUTATION PREDICTED

Family:
  COLOR_DRAGON

Similarity:
  6/8 blocks against known fossil
  Changed slots: MAGNITUDE, VERDICT

Evidence:
  ✓ Lexical sibling traversal
  ✓ resonantCharStarts membership check
  ✓ frontend color class mutation
  ✗ authoritative backend charStart validation not found

Risk:
  Frontend coordinate recomputation may desync from backend source-relative charStart.

Remediation:
  > Compare backend source-relative charStart with frontend Lexical sibling accumulation.
  > Do not patch shouldColor() directly until coordinate authority is verified.

Mode:
  Prediction only. Runtime not confirmed.
13. Feature 5: Glossary and Remediation Hints
Problem

The language server needs local access to known fossils and hints.

Proposal

Bundle a versioned glossary manifest with the extension.

scd64-vscode/
  data/
    scd64-glossary.v1.json
    scd64-fossils.v1.json
Manifest schema
type SCD64FossilManifest = {
  schema: "SCD64_FOSSIL_MANIFEST";
  schemaVersion: 1;
  generatedAt: string;
  glossaryVersion: string;
  entries: SCD64FossilEntry[];
};

type SCD64FossilEntry = {
  checksum64: string;
  family: string;
  canonicalSlots: Record<SCD64SlotName, string>;
  searchableDescription: string;
  remediationHints: SCD64RemediationHint[];
  severityProfile: {
    defaultSeverity: "hint" | "warning" | "error";
    knownFatalRuntimeOnly: boolean;
  };
};
Staleness protection

On activation, the extension should show a low-priority status warning if the glossary manifest is stale:

SCD64 glossary snapshot is older than 30 days. Live MCP lookup recommended.
14. Feature 6: Suppression and False Positive Control
Problem

Domain-aware diagnostics can become noisy if developers cannot suppress intentional deviations.

Proposal

Support narrow suppressions.

Inline suppression
// scd64-disable-next-line SCD64.COLOR_DRAGON.COORDINATE_AUTHORITY -- test fixture intentionally reproduces fossil
const start = getGlobalCharStart(node);
File-level suppression
/* scd64-disable SCD64.COLOR_DRAGON.COORDINATE_AUTHORITY -- generated test fixture */
Suppression rules
{
  "suppressionPolicy": [
    "must include rule id",
    "must include reason after --",
    "should be reported in diagnostic summary",
    "must not suppress runtime SCD64 diagnostics"
  ]
}

This prevents “sweep it under the rug” comments from becoming a crypt.

15. Feature 7: CLI Companion
Problem

The IDE should not be the only surface.

Proposal

Add a CLI so CI and local terminal workflows can run the same static analysis.

npm run scd64:intellisense -- "src/**/*.tsx"

Output:

SCD64 Predictive IntelliSense

src/components/TruesightPlugin.jsx:142
  WARNING SCD64.COLOR_DRAGON.COORDINATE_AUTHORITY
  Predicted family: COLOR_DRAGON
  Similarity: 6/8
  Evidence: Lexical traversal, membership check, missing authority validation
Why

This allows:

{
  "uses": [
    "CI warnings",
    "pre-commit advisory checks",
    "AI agent dry-runs",
    "non-VS Code workflows"
  ]
}
16. Implementation Plan
Phase 0: Refactor shared core

Create shared SCD64 utilities:

src/core/scd64/
  constants.ts
  parseSCD64.ts
  compareSCD64ByBlocks.ts
  generateSCD64FromSlots.ts
  types.ts

Acceptance:

{
  "must": [
    "validate 64 uppercase hex",
    "split 8 slots",
    "read version byte",
    "compare by block",
    "reject queryHash64 as SCD64 unless glossary-backed"
  ]
}
Phase 1: Language Server skeleton

Create:

packages/scd64-language-server/
  src/server.ts
  src/documentStore.ts
  src/diagnostics.ts

Acceptance:

{
  "must": [
    "starts from VS Code extension",
    "receives document open/change events",
    "publishes empty diagnostics without crashing"
  ]
}
Phase 2: AST parsing

Use TypeScript compiler API or ts-morph.

Create:

packages/scd64-language-server/src/ast/
  parseDocument.ts
  findCallExpressions.ts
  findIdentifiers.ts

Acceptance:

{
  "must": [
    "parse TS, TSX, JS, JSX",
    "recover gracefully from partial/incomplete code",
    "complete per-document parse under target budget"
  ]
}
Phase 3: COLOR_DRAGON matcher

Create:

packages/scd64-language-server/src/rules/
  colorDragonCoordinateAuthority.ts
  roguePainterFallback.ts

Acceptance:

{
  "must": [
    "detect Lexical traversal + membership check + missing backend authority",
    "extract evidence anchors",
    "avoid warning on isolated symbol names",
    "support suppression comments"
  ]
}
Phase 4: Prediction and similarity

Create:

packages/scd64-language-server/src/prediction/
  predictSCD64FromEvidence.ts
  matchKnownFossils.ts

Acceptance:

{
  "must": [
    "generate predicted slot anatomy",
    "compare against known fossils",
    "return matching block count",
    "mark runtimeConfirmed false"
  ]
}
Phase 5: VS Code rendering

Create diagnostics and hover provider.

Acceptance:

{
  "must": [
    "underline exact source range",
    "show predicted family",
    "show evidence checklist",
    "show remediation hints",
    "show Prediction only notice"
  ]
}
Phase 6: CLI companion

Create:

scripts/scd64-intellisense.mjs

Acceptance:

{
  "must": [
    "run same rules as language server",
    "emit machine-readable JSON",
    "emit human-readable terminal summary",
    "exit 0 by default for warnings",
    "support --fail-on error"
  ]
}
17. Performance Budget
Targets
{
  "performance": {
    "typingLatencyTarget": "<100ms perceived",
    "analysisDebounce": "150-250ms",
    "singleFileAnalysisBudget": "<50ms for normal files",
    "maxDiagnosticsPerFile": 20,
    "maxRulesPerPassMVP": 5
  }
}
Strategies
{
  "strategies": [
    "debounce document changes",
    "cache parsed AST by document version",
    "only analyze supported file types",
    "only run domain rules on relevant files unless configured otherwise",
    "avoid live MCP calls on every keystroke",
    "use local glossary snapshot for hot path"
  ]
}
18. Security and Privacy
Local-first rule

Static analysis must run locally.

No source code should be sent to MCP, TurboQuant, or any external service during normal typing.

Live lookup may request glossary metadata by hash, but should not upload source code.

{
  "privacyPolicy": {
    "sourceCodeLeavesMachine": false,
    "liveMcpLookupAllowed": "hash/glossary only",
    "offlineModeSupported": true
  }
}
19. Acceptance Criteria
Core
{
  "must": [
    "start VS Code extension successfully",
    "run local language server",
    "analyze TS/JS/TSX/JSX documents",
    "emit diagnostics for known COLOR_DRAGON static pattern",
    "display hover with predicted family, evidence, similarity, and hints",
    "mark all predictions as runtimeConfirmed false"
  ]
}
Namespace safety
{
  "must": [
    "never write predictedSCD64 into BytecodeHealth",
    "never treat queryHash64 as SCD64",
    "require glossary-backed slots for predicted SCD64",
    "distinguish predictedChecksum64 from confirmed checksum64"
  ]
}
False positive control
{
  "must": [
    "require multiple evidence anchors",
    "support inline suppression with reason",
    "avoid warning on isolated mentions of charStart or shouldColor",
    "cap diagnostics per file"
  ]
}
Performance
{
  "must": [
    "avoid blocking typing",
    "debounce analysis",
    "cache glossary locally",
    "avoid network calls in hot path"
  ]
}
20. QA Checklist
Static matcher tests
[
  {
    "name": "detect-color-dragon-coordinate-risk",
    "fixture": "Lexical traversal + resonantCharStarts membership + missing backend authority",
    "expected": "warning with COLOR_DRAGON prediction"
  },
  {
    "name": "ignore-isolated-charstart",
    "fixture": "charStart variable exists but no gate or color mutation",
    "expected": "no diagnostic"
  },
  {
    "name": "detect-rogue-painter-risk",
    "fixture": "frontend calls PhonemeEngine.analyzeDeep to determine color family",
    "expected": "warning with rogue painter evidence"
  },
  {
    "name": "suppression-requires-reason",
    "fixture": "scd64-disable-next-line without -- reason",
    "expected": "suppression ignored or warning emitted"
  }
]
Namespace tests
[
  {
    "name": "query-hash-not-scd64",
    "fixture": "64 uppercase hex not starting with version byte 01",
    "expected": "classified as queryHash64 or rejected"
  },
  {
    "name": "predicted-not-runtime-confirmed",
    "fixture": "static COLOR_DRAGON match",
    "expected": "runtimeConfirmed false"
  },
  {
    "name": "bytecodehealth-not-written",
    "fixture": "static prediction generated",
    "expected": "no BytecodeHealth record created"
  }
]
Performance tests
[
  {
    "name": "large-file-analysis-budget",
    "fixture": "large TSX file",
    "expected": "analysis completes without editor freeze"
  },
  {
    "name": "rapid-typing-debounce",
    "fixture": "20 document changes in quick succession",
    "expected": "analysis coalesced"
  }
]
21. Next Risks
1. Static prediction may overclaim

Mitigation:

{
  "rule": "Every IDE diagnostic must say Prediction only. Runtime not confirmed."
}
2. False positives may train developers to ignore it

Mitigation:

{
  "rule": "Require multiple evidence anchors and confidence thresholds."
}
3. Glossary drift may make hints stale

Mitigation:

{
  "rule": "Bundle manifest version and display stale snapshot warnings."
}
4. Query hashes may pollute SCD64 namespace

Mitigation:

{
  "rule": "Only glossary-backed, version-byte-compliant slot strings are SCD64."
}
5. Extension may become too coupled to TrueSight

Mitigation:

{
  "rule": "Implement RuleRegistry so COLOR_DRAGON is the first plugin, not hardcoded architecture."
}
22. Final Recommendation

Implement this as a staged prototype.

Recommended build order
{
  "phaseOrder": [
    "shared SCD64 parse/compare/generate utilities",
    "local fossil glossary manifest",
    "language server skeleton",
    "COLOR_DRAGON coordinate authority matcher",
    "VS Code diagnostic rendering",
    "hover remediation hints",
    "suppression comments",
    "CLI companion",
    "additional bug-family matchers"
  ]
}
Final verdict
{
  "pdrVerdict": "APPROVE_FOR_PROTOTYPE",
  "highestValue": "COLOR_DRAGON pre-runtime warning",
  "highestRisk": "static predictions being mistaken for confirmed runtime SCD64",
  "mainGuardrail": "prediction namespace must remain separate from confirmed SCD64",
  "mvpScope": "one robust COLOR_DRAGON matcher, local glossary manifest, VS Code diagnostics, no auto-fix",
  "definitionOfDone": "developer types a known risky TrueSight coordinate pattern and receives a warning with evidence, similarity, and remediation hints without running the app"
}
