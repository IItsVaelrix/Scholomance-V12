import fs from 'fs';
import path from 'path';

const rootDir = '/home/deck/Desktop/Scholomance-V12-main';

const filesToInclude = [
  { path: 'docs/scholomance-encyclopedia/Scholomance LAW/SHARED_PREAMBLE.md', title: 'Shared Project Preamble & Sovereign Editor Principle' },
  { path: 'docs/scholomance-encyclopedia/Scholomance LAW/VAELRIX_LAW.md', title: 'Vaelrix Law: The Rules of the World' },
  { path: 'docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md', title: 'Schema Contract: Deterministic Data Shapes' },
  { path: 'docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md', title: 'UI Agent Contract & Stacking Sovereignties' },
  { path: 'docs/scholomance-encyclopedia/Scholomance LAW/GEMINI.md', title: 'Backend and Inquisitorial Jurisdiction' },
  { path: 'docs/scholomance-encyclopedia/Scholomance White Papers/IMMUNE-SYSTEM-WHITE-PAPER.md', title: 'The Immune System: Biological Syntactic Audit' },
  { path: 'docs/scholomance-encyclopedia/Scholomance White Papers/CLERICAL_RAID_WHITE_PAPER.md', title: 'Clerical RAID: Sparse Mesh Topological Inference' },
  { path: 'docs/scholomance-encyclopedia/Scholomance White Papers/BYTECODE_HEALTH_WHITE_PAPER.md', title: 'BytecodeHealth: The Green-Path Signal' },
  { path: 'docs/scholomance-encyclopedia/Scholomance White Papers/BYTECODE_DIAGNOSTIC_SYNTHESIS_WHITE_PAPER.md', title: 'Bytecode Diagnostic Synthesis' },
  { path: 'docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md', title: 'Bytecode Error System Overview' },
  { path: 'docs/ByteCode Error System/02_Error_Code_Reference.md', title: 'Error Code Reference' },
  { path: 'docs/ByteCode Error System/03_AI_Parsing_Guide.md', title: 'AI Parsing Specifications' },
  { path: 'docs/ByteCode Error System/04_QA_Integration_Guide.md', title: 'QA Integration & Bytecode Assertions' },
  { path: 'docs/ByteCode Error System/05_Integration_Summary.md', title: 'Bytecode Error System Integration Summary' },
  { path: 'docs/ai/ONBOARDING_JUNIOR.md', title: 'Junior Onboarding Curriculum' },
  { path: 'docs/ai/AI_README_ARCHITECTURE.md', title: 'AI Developer Runtime Architecture' },
  { path: 'docs/architecture/BACKEND_INFRASTRUCTURE_EXPLAINED.md', title: 'Backend Infrastructure & Authority Server' },
  { path: 'docs/architecture/PHONOSEMANTIC_GRAPH_ARCHITECTURE.md', title: 'Phonosemantic Graph & Token Graph' },
  { path: 'docs/architecture/PLS_DICTIONARY_INTEGRATION.md', title: 'PLS Dictionary Integration & Caching' },
  { path: 'docs/architecture/UNLOCKABLE_SCHOOLS_ARCHITECTURE.md', title: 'Unlockable Schools & Dynamic Theming' },
  { path: 'docs/scholomance-bible/SCHOLOMANCE_BIBLE.md', title: 'System-Wide Current State Synthesis Map' }
];

function countWords(str) {
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Generate beginner-friendly deep explanations for each chapter to weave between the source texts
const beginnerExplanations = {
  intro: `# THE SCHOLOMANCE CODEX: AN ARCHITECTURAL WHITE PAPER AND JUNIOR ENGINEER GUIDE TO SYNTACTIC SOVEREIGNTY

## Bytecode Search Code
\`SCHOL-ENC-BYKE-SEARCH-WP-BEGINNER-GUIDE\`

Welcome, Initiate. This is the canonical beginner guide and comprehensive architectural white paper for the Scholomance project. This document explains exactly how the codebase works, starting from the physical constants of our MUD universe down to the structural code constraints, multi-agent frameworks, immune system layers, and bytecode diagnostics.

If you are a beginner, a junior developer, or an AI agent joining the team, this paper serves as your grimoire. It is designed to be simple enough to follow without prior systems experience, yet robust enough to cover every database table, schema interface, mathematical formula, and architectural treaty.

### How to Read This Book

This white paper is structured into thematic volumes. In each volume, you will find:
1. **The Beginner\'s Grounding**: A simple, conceptual overview of the subsystem, using real-world analogies (e.g., cell walls, biological immunity, stoichiometry).
2. **The Architectural Blueprint**: The raw, active documentation and source contracts retrieved from the live repository.
3. **The Annotations**: A line-by-line guide to key code structures, data interfaces, and algorithms.
4. **Verification Scenarios**: Walkthroughs of how to test and verify these systems locally.

Let us begin by establishing the fundamental rule of our world: the editor is the arena, words are weapons, and user data is sovereign.
`,
  philosophy: `
## VOLUME I: THE CORE PHILOSOPHY & SOVEREIGN EDITOR PRINCIPLE

### 1.1 The Metaphorical Bedrock: Text Combat & Living Syntax
In a typical computer game, when your character attacks an opponent, the game calculates damage by pulling a static number from a database, adding a random roll, and applying it. In Scholomance, combat is a linguistic event. Words have mass, rhyme keys are resonance frequencies, alliteration generates kinetic force, and meter consistency determines structural stability.

When a player types a sentence into the editor, the system parses the text not just for correctness, but for its poetic density. It translates characters into phonemes (the sounds that make up words), groups them into syllable windows, maps them to magic schools, and scores them using deterministic heuristics. A sentence like *"Fire fights the frozen frost"* does not just hit; it delivers kinetic alliterative force due to the consonant cluster repetition (F, R, S, T) and resonates with the SONIC or VOID school of magic based on its vowel structure.

### 1.2 The Sovereign Editor: Privacy by Architecture
A common trap in modern web development is "convenience over control." Most editors auto-save your drafts to a cloud database every few seconds, scan your text to train machine learning models, or stream your keystrokes to a telemetry server.

Scholomance rejects this. The editor belongs to the user.
- **Client-Side Isolation**: Unsaved work lives only in the browser\'s memory. It cannot leave without an explicit action (clicking "Save Scroll").
- **No Background Sync**: No cloud auto-saves, no silent sync, no admin backdoors to view unsaved drafts.
- **Ephemeral Scratchpad**: If the user closes the tab without saving, the work is gone. This is a feature, not a bug. It prevents data leaks by ensuring that what was never sent cannot be breached.

Below is the active shared project preamble that formalizes these physical constants and privacy treaties.
`,
  codex: `
## VOLUME II: THE CODEx ENGINE ARCHITECTURE

### 2.1 The Four-Layer Separation
The brain of Scholomance is called **CODEx**. To prevent "spaghetti code"—where database queries are written inside UI components or styling code is mixed with combat algorithms—CODEx enforces a strict four-layer pipeline. No layer may skip its neighbor.

1. **Core (Domain)**:
   - *What it is*: The pure logic layer.
   - *Law*: No side effects, no DOM manipulation, no network calls, no databases, no external frameworks. It takes input, does math, and returns output.
   - *Examples*: Vowel family detection, FNV-1a checksumming, syllable-window calculations, combat score calculators.
   
2. **Services (Adapters)**:
   - *What it is*: The data adapter layer.
   - *Law*: Normalizes external data sources into canonical shapes.
   - *Examples*: SQLite dictionary database lookup, external Datamuse API translation, Redis cache interfaces.

3. **Runtime (Orchestrator)**:
   - *What it is*: The controller and coordinator.
   - *Law*: Manages event emissions, cache durations, and sequence execution.
   - *Examples*: Word lookup pipeline, event bus listener, rate limiters.

4. **Server (Authority)**:
   - *What it is*: The sovereign judge.
   - *Law*: Enforces authentication, database persistence, and final combat scoring. The client (browser) only shows previews; the server decides what actually happened.
   - *Examples*: Fastify server routing, user authentication sessions, SQLite game database.

Let\'s examine the active contracts and inventory maps detailing how these layers are laid out in code.
`,
  immunity: `
## VOLUME III: THE IMMUNE SYSTEM AND SUBSTRATE DEFENSE

### 3.1 Why an Immune System?
In web engineering, a developer writes code, saves it, and relies on a compiler or a code linter (like ESLint) to check for syntax errors. But syntax check is too shallow. A script can be syntactically perfect JavaScript yet violate the project\'s architecture, introduce random performance degradation, or cause z-index layering drift.

The Scholomance Immune System is a biological metaphor built into our continuous integration (CI) and commit pipelines. It is trigger-gated, meaning it executes scan tasks during commits or runs verification profiles dynamically. It is divided into three distinct defensive membranes:

- **Layer 1: Innate Immunity (The Skin Barrier)**:
  Uses deterministic pattern matching to block obvious violations. For example, it calculates relative import paths (\`../../../../codex/\`) and prevents the UI layer (\`src/\`) from directly importing sovereign database files from the server.
  
- **Layer 2: Adaptive Immunity (The Leukocytes)**:
  Powered by the **TurboQuant Vector Engine**, it remembers past bugs by vectorizing their intent. If a developer introduces a new module whose logical intent is semantically similar to a legacy bug (e.g., creating a parallel unseeded random number generator), the adaptive layer identifies it and raises a block.
  
- **Layer 3: Protocol/Marrow Immunity**:
  Checks for temporal contracts, such as synchronous functions attempting to call asynchronous APIs, which would block the browser\'s thread and cause visual lag.

### 3.2 The Stasis Field and Limits
To protect the system\'s runtime stability, the immune system enforces strict boundary limits (Stasis Thresholds):
1. **Recursion Depth**: Clamped at 8 levels. Any deeper recursion triggers an immediate \`PB-ERR-v1-STATE-RECURSE\` failure.
2. **Math Clamping**: Division by zero or operations yielding NaN (Not a Number) are clamped to fallback values.
3. **Z-Index Layering**: Hardcoded z-index values greater than 1 are strictly forbidden. All stacking contexts must derive from semantic constants (\`Z_BASE\`, \`Z_ABOVE\`, \`Z_OVERLAY\`, \`Z_SYSTEM\`).

Here are the canonical white papers and laws detailing the immune system and Clerical RAID (Rapid Antigen Detection) mesh.
`,
  diagnostics: `
## VOLUME IV: THE BYTECODE DIAGNOSTIC SYSTEM

### 4.1 Red Path (Errors) vs. Green Path (Health)
Traditional software testing prints text logs. When a test fails, you get a traceback. When it passes, you get a green checkmark. But tracebacks are noisy, and checkmarks provide no evidence of what was tested.

Scholomance replaces text logs with a binary signal channel:
- **Red Path (Bytecode Error - \`PB-ERR-v1\`\)**: Every failure is encoded into a structured, machine-readable string containing the category (TYPE, VALUE, RANGE, STATE, etc.), severity (FATAL, CRIT, WARN), module origin, error code, base64-encoded context, and a deterministic FNV-1a checksum.
- **Green Path (Bytecode Health - \`PB-OK-v1\`\)**: Every passing test and clean compile generates a similar structured health bytecode string containing evidence of what passed.

### 4.2 Stoichiometric Diagnostic Synthesis
In chemistry, a molecule or complex requires components in precise ratios (stoichiometry). If one component is missing, the reaction stops. If there is too much of another, it becomes waste or noise.

Scholomance applies this to diagnostics:
- **Diagnostic Signals as Subunits**: Each scan cell (Immunity, Test Coverage, Layer Boundary) produces a normalized health score.
- **Diagnostic Domains as Complexes**: Subsystem health is grouped into complexes (e.g., \`AUTH_HANDSHAKE_COMPLEX\`\).
- **Ratio Assessment**: The system calculates the ratio of observed signals vs. expected ratios. A missing required signal collapses the complex\'s health, even if other signals are normal.
- **CleriRaidMind**: The controller that evaluates all complexes and outputs a global state: \`coherent\` (healthy), \`overstimulated\` (noisy), \`agitated\` (unstable), or \`fractured\` (failing).

Let\'s dive into the technical details and guides for error codes, AI parsing, and stoichiometric synthesis.
`,
  linguistics: `
## VOLUME V: PHONETICS, DICTIONARY, AND COMBAT HEURISTICS

### 5.1 Phoneme Mapping and Poetic Scoring
The combat engine of Scholomance relies on phonetic transcription. Since English spelling does not match English pronunciation (e.g., *tough*, *though*, *through* all have different sounds), the system translates words into their phonetic representation using the ARPAbet format.

ARPAbet divides words into:
- **Onset**: The consonant sound starting a syllable (e.g., /str/ in *strike*).
- **Nucleus**: The vowel sound core (e.g., /ay/ in *strike*).
- **Coda**: The consonant sound ending the syllable (e.g., /k/ in *strike*).

The scoring engine evaluates:
1. **Phoneme Density**: The ratio of sound units to character lengths.
2. **Rhyme Keys**: Syllable vowel + coda signatures.
3. **Alliteration**: Consonant overlaps at onsets.
4. **Meter**: The stress contour pattern across words.

### 5.2 The Dictionary Adapter Pipeline
To perform phonetic lookup, the system queries dictionaries in a fallback loop:
1. **Local SQLite Database**: A compiled WordNet database of 150,000+ words.
2. **Datamuse API**: An external query service used if the word is missing locally.
3. **Datamuse Slant Rhyme Fallback**: Generates semantic associations.

Let\'s explore the architectural papers describing the phonosemantic graph, unlockable magic schools, and PLS dictionary adapters.
`,
  collaboration: `
## VOLUME VI: MULTI-AGENT COLLABORATION AND MCP BRIDGE

### 6.1 The Sovereign Multi-Agent Workspace
Scholomance is developed by a team of specialized AI agents:
- **Claude**: Owns user interface, visuals, typography, and frontend routing.
- **Gemini**: Owns backend routing, scoring engine implementation, test coverage, and stasis validation.
- **Codex**: Owns database schemas, layer boundaries, and architectural contracts.
- **Arbiter**: Reviews code changes and outputs advisories.
- **Unity**: Synthesizes sessions and ensures cross-agent understanding.

### 6.2 The MCP (Model Context Protocol) Bridge
To communicate with each other and coordinate file modifications, the agents connect to a local stdio bridge server (\`codex/server/collab/mcp-bridge.js\`\). The bridge exposes resources (tasks, locks, activity streams) and tools (acquiring lock, updating task notes, triggering scans).

Before modifying a shared file, an agent MUST:
1. Register on the bridge.
2. Search tasks.
3. Acquire a file lock (preventing race conditions where Claude and Gemini edit the same file simultaneously).
4. Update the task status with a detailed activity note.
5. Release the file lock.

Let\'s read the active guidelines, MCP integration specs, and collab contracts.
`,
  onboarding: `
## VOLUME VII: JUNIOR ONBOARDING & ENGINEERING WORKFLOWS

### 7.1 Curriculum and Quality Gates
As an engineer or agent on Scholomance, you must follow the strict validation pipeline before any change is merged into the master ledger:
1. **TypeScript Check**: Run \`npm run typecheck\` to verify static types.
2. **ESLint Audit**: Run \`npm run lint\` to check coding style and prevent forbidden globals.
3. **QA Battery**: Run \`npm run test:qa\` to execute unit tests and check accessibility (jest-axe).
4. **Visual Regression**: Run \`npm run test:visual\` to ensure no layout drift occurred.

Below is the junior engineer onboarding guide and AI runtime manual.
`,
  glossary: `
## VOLUME VIII: COMPREHENSIVE GLOSSARY OF SCHOLOMANCE TERMINOLOGY

To ensure that beginners and incoming developers have a single, unified reference, this glossary defines the core terms and concepts used across the Scholomance V12 codebase:

- **ARPAbet**: A phonetic transcription code developed by the Advanced Research Projects Agency (ARPA) that maps English phonemes (vowels and consonants) to ASCII characters. Used in CODEx to evaluate rhymes and syllable structures.
- **Alliteration Heuristic**: A scoring mechanism in CODEx Core that measures the kinetic force of a verse by analyzing consonant cluster repetition at the onset of words.
- **Antigen**: In Clerical RAID, a vectorized representation of a historical bug signature or structural vulnerability.
- **Asynchronous Treaty**: The architectural law prohibiting synchronous blocks from calling asynchronous APIs to prevent visual lag (Temporal Stutters) in the IDE surface.
- **Bytecode Error (PB-ERR-v1)**: A structured, machine-parsable error message format that contains category, severity, module origin, unique code, base64 context, and an FNV-1a checksum.
- **Bytecode Health (PB-OK-v1)**: A structured health signal format that represents clean execution paths, scan completions, and validation passes.
- **Clerical RAID**: Retrieval-Augmented Immune Diagnostics. The adaptive immune layer of Scholomance that performs topological nearest-neighbor searches to detect logic fractures.
- **CleriRaidMind**: The central diagnostic synthesizer that aggregates complex results and determines the global mind state (coherent, overstimulated, agitated, fractured).
- **CODEx**: The central engine of Scholomance, structured into four isolation layers (Core, Services, Runtime, Server).
- **Coda**: The consonant sounds that follow the vowel nucleus in a syllable.
- **Diagnostic Cell**: An isolated, stateless scanning runner (e.g., \`IMMUNITY_SCAN\`, \`LAYER_BOUNDARY\`) that outputs raw diagnostic data.
- **FNV-1a Checksum**: Fowler-Noll-Vo hash function. A non-cryptographic hash algorithm used in Scholomance to generate short, deterministic checksums for bytecode verification.
- **Lattice Grid**: A pixel coordinate representation system for sprites and canvas art, separating geometry logic from render states.
- **Memory Cell Infusion**: The process by which a developer\'s documented bug fix (scar) in private memory is compiled and vectorized into the public Clerical RAID substrate.
- **Model Context Protocol (MCP)**: An open standard transport protocol used by Scholomance to connect AI agents to a local collaboration bridge.
- **Nucleus**: The core vowel sound in a syllable.
- **Onset**: The consonant sound that precedes the vowel nucleus in a syllable.
- **Phoneme Density**: The ratio of sound units to character lengths in a word, used in combat damage calculation.
- **Phonosemantic Graph**: A sparse graph mapping phonetic similarity, semantic association, and school resonance between word tokens.
- **PixelBrain**: The coordinate-based rendering engine and formula system used to draw sprites and glyphs.
- **PLS**: Phoneme Lookup Service. The adapter pipeline that queries local SQLite or external Datamuse APIs for phonetic transcriptions.
- **PDR**: Product Design Requirements. Documents describing the intent and requirements of a feature before implementation.
- **PIR**: Post-Implementation Report. A comprehensive report written after a feature or fix is implemented, tracking blast radius, validation, and gaps.
- **Resonant Manifold**: The conceptual representation of the codebase as a living, vibrating system where logical patterns create frequencies.
- **Sovereign Editor**: The architectural law enforcing that user text never leaves the browser without explicit consent (Save Scroll action).
- **Stacking Tier**: Semantic z-index limits defined in the Schema Contract to prevent layout occlusion.
- **Stasis Field**: A set of runtime constraints (e.g., maximum recursion depth of 8, finite math validation) that prevents engine collapse.
- **Stoichiometry**: The calculation of relative quantities of reactants and products in chemical reactions. In Scholomance, it is the mathematical model used to assess diagnostic signal proportions.
- **Syllable Window**: A sliding window that groups syllables and checks stress contours.
- **Truesight**: An in-game editor view mode that visualizes vowel families, phonetic structures, and magic schools using colored overlays.
- **TurboQuant**: The high-performance backend vector math engine used for fast topological searches in Clerical RAID.
- **VerseIR**: Verse Intermediate Representation. The structured, parsed representation of a scroll\'s text, phonetic span offsets, and token weights.
- **Vowel Family**: A classification of vowel sounds (e.g., front, back, diphthong) that maps phonemes to specific magic schools.
- **Weave**: The runtime system of execution threads, event paths, and state bindings.
- **Zombie Bug**: A regression or legacy issue that is re-introduced into the codebase by an AI agent due to a lack of shared memory.
`
};

function readSourceFile(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  try {
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: File does not exist at ${fullPath}`);
      return `\n*Source file missing: ${relativePath}*\n`;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    // Basic sanitization: strip first H1 title to avoid nested markdown rendering conflicts
    return content.replace(/^#[^#\n]*\n/, '');
  } catch (err) {
    console.error(`Error reading ${fullPath}:`, err);
    return `\n*Error reading source file: ${relativePath}*\n`;
  }
}

function compileWhitePaper() {
  console.log('Compiling Scholomance Beginner White Paper...');
  
  let md = '';
  
  // 1. Introduction
  md += beginnerExplanations.intro + '\n\n';
  
  // 2. Volume I: Preamble & Philosophy
  md += beginnerExplanations.philosophy + '\n\n';
  md += '### Canonical Shared Project Preamble Contract\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[0].path) + '\n```\n\n';
  md += '### Canonical Vaelrix Law (Substrate Constraints)\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[1].path) + '\n```\n\n';
  
  // 3. Volume II: CODEx Architecture
  md += beginnerExplanations.codex + '\n\n';
  md += '### Canonical Schema Contract\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[2].path) + '\n```\n\n';
  md += '### Canonical System-Wide Current State Synthesis Map (The Bible)\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[20].path) + '\n```\n\n';
  
  // 4. Volume III: Immune System
  md += beginnerExplanations.immunity + '\n\n';
  md += '### Canonical Immune System White Paper\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[5].path) + '\n```\n\n';
  md += '### Canonical Clerical RAID White Paper\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[6].path) + '\n```\n\n';
  md += '### Canonical Backend & Server Infrastructure Details\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[16].path) + '\n```\n\n';
  
  // 5. Volume IV: Bytecode Diagnostics
  md += beginnerExplanations.diagnostics + '\n\n';
  md += '### Canonical Bytecode Health White Paper\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[7].path) + '\n```\n\n';
  md += '### Canonical Bytecode Diagnostic Synthesis White Paper\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[8].path) + '\n```\n\n';
  md += '### Canonical Bytecode Error System Overview\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[9].path) + '\n```\n\n';
  md += '### Canonical Error Code Reference Index\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[10].path) + '\n```\n\n';
  md += '### Canonical AI Parsing Guide\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[11].path) + '\n```\n\n';
  md += '### Canonical QA Integration and Bytecode Assertion Guide\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[12].path) + '\n```\n\n';
  md += '### Canonical Bytecode Error System Integration Summary\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[13].path) + '\n```\n\n';
  
  // 6. Volume V: Phonetics & Dictionary
  md += beginnerExplanations.linguistics + '\n\n';
  md += '### Canonical Phonosemantic Graph Architecture\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[17].path) + '\n```\n\n';
  md += '### Canonical PLS Dictionary Integration & Caching Contracts\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[18].path) + '\n```\n\n';
  md += '### Canonical Unlockable Schools & Thematic Styles Architecture\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[19].path) + '\n```\n\n';
  
  // 7. Volume VI: Collaboration & MCP
  md += beginnerExplanations.collaboration + '\n\n';
  md += '### Canonical UI Agent Contract\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[3].path) + '\n```\n\n';
  md += '### Canonical Backend Coder & Debug Inquisitor Contract\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[4].path) + '\n```\n\n';
  
  // 8. Volume VII: Onboarding & Workflows
  md += beginnerExplanations.onboarding + '\n\n';
  md += '### Canonical Onboarding Curriculum\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[14].path) + '\n```\n\n';
  md += '### Canonical AI Developer Runtime Architecture\n\n';
  md += '```markdown\n' + readSourceFile(filesToInclude[15].path) + '\n```\n\n';
  
  // 9. Volume VIII: Glossary
  md += beginnerExplanations.glossary + '\n\n';
  
  // Final word count check
  const words = countWords(md);
  console.log(`Compilation complete. Total words: ${words}`);
  
  const targetFile = path.join(rootDir, 'docs/scholomance-encyclopedia/Scholomance White Papers/BEGINNER_GUIDE_TO_SCHOLOMANCE_ENGINE.md');
  
  fs.writeFileSync(targetFile, md, 'utf8');
  console.log(`Successfully wrote compiled white paper to ${targetFile}`);
  
  return words;
}

compileWhitePaper();
