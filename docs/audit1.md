 Codebase Bytecode Analysis Report                                                                                                                                                                  
                                                                                                                                                                                                     
  1. Executive Summary                                                                                                                                                                               
                                                                                                                                                                                                     
  Scope analyzed: src/pages/Read/TruesightControls.jsx (1 file, 118 lines) plus src/lib/truesight/ recursively (3 color modules, 11 compiler modules; 3,134 lines of TS+JS).                         
                                                                                                                                                                                                     
  Highest-risk finding (HIGH): Three independent definitions of analysis-mode enums diverge across consumers — TruesightControls.ANALYSIS_MODES, toolbarBytecode.ANALYSIS_MODE, and                  
  analysisModes.TRUESIGHT_ANALYSIS_MODES. The keys overlap partially (e.g. pixelbrain_transverse) but are not coherent sets. A user-selected mode in the UI may have no corresponding compiler       
  config, or vice versa.                                                                                                                                                                             
                                                                                                                                                                                                     
  Strongest architectural pattern: The VerseIR is a storage-engine-style normalized record store. A primary tokens[] array (indexed by integer id) feeds 9 secondary Map-based indexes plus          
  precomputed featureTables, surfaceSpans, and a windowed slide table. Cleanly separated serialization (verseIRSerialization) round-trips this structure. Everything is Object.freezed — write-once,
  read-many.                                                                                                                                                                                         
                                                            
  Strongest visualization opportunity: The IR pipeline is intrinsically matrix-shaped — phonemes → tokens → windows form a layered grid where each layer is keyed by stable integer ids and crossed  
  by vowel family, rhyme tail, stress contour, and consonant skeleton axes. Plus the PCA basis in pcaChroma.js already produces a 2D coordinate per vowel family, ready for plotting.
                                                                                                                                                                                                     
  Confidence: High for files I read in full. Medium for cross-module behavior (some imports go to files outside the audit scope — flagged below).                                                    
   
  ---                                                                                                                                                                                                
  2. File Inventory                                         
                   
  File: TruesightControls.jsx                                                                                                                    
  Role: UI toggle/mode selector                                                                                                                                                                      
  Runtime: React (browser)                                                                                                                       
  Main Imports: prop-types                                                                                                                                                                           
  Main Exports: default, ANALYSIS_MODES                                                                                                          
  Side-Effect Level: pure                                                                                                                                                                            
  Confidence: high                                                                                                                                                                                   
  ────────────────────────────────────────                                                                                                                                                           
  File: color/pcaChroma.js                                                                                                                                                                           
  Role: PCA-driven HSL color projection from vowel formants 
  Runtime: browser (no DOM)
  Main Imports: schools.js, vowelFamily.js, visemeMapping.js, vowelWheel.js, codex/core/phonology/chroma.resolver.js
  Main Exports: resolveSonicColor, hslToHex, resolveVerseIrColor, buildVerseIrPalette, getVerseIrColorProjection, computeBlendedHsl, VERSE_IR_PCA_CHROMA_BASIS, VERSE_IR_PALETTE_FAMILIES
  Side-Effect Level: mostly pure (module-load PCA build)
  Confidence: high
  ────────────────────────────────────────
  File: color/rhymeColorRegistry.js                                                                                                                                                                  
  Role: Rhyme-tail → hex registry, golden-angle fallback
  Runtime: browser                                                                                                                                                                                   
  Main Imports: pcaChroma.js, vowelFamily.js                
  Main Exports: buildRhymeColorRegistry, resolveTokenColor, REGISTRY_*, GOLDEN_ANGLE_DEG
  Side-Effect Level: pure
  Confidence: high
  ────────────────────────────────────────
  File: color/visemeMapping.js                                                                                                                                                                       
  Role: Formant → CSS-var viseme styles
  Runtime: browser                                                                                                                                                                                   
  Main Imports: none                                        
  Main Exports: mapFormantsToMetrics, getVisemeStyles
  Side-Effect Level: pure
  Confidence: high
  ────────────────────────────────────────
  File: compiler/analysisModes.js                                                                                                                                                                    
  Role: Mode constants + lookup
  Runtime: any                                                                                                                                                                                       
  Main Imports: none                                        
  Main Exports: TRUESIGHT_ANALYSIS_MODES, resolveTruesightAnalysisMode, getTruesightAnalysisModeConfig
  Side-Effect Level: pure
  Confidence: high
  ────────────────────────────────────────
  File: compiler/compileVerseToIR.js                                                                                                                                                                 
  Role: Authoritative IR builder (text → frozen IR)
  Runtime: any                                                                                                                                                                                       
  Main Imports: phoneme.engine.js, vowelFamily.js, wordTokenization.js, analysisModes.js
  Main Exports: compileVerseToIR, splitVerseLines, createEmptyVerseIR, VERSE_IR_VERSION
  Side-Effect Level: mostly pure (calls phoneme engine)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/verseIRSerialization.js                                                                                                                                                             
  Role: Serialize/hydrate IR
  Runtime: any                                                                                                                                                                                       
  Main Imports: compileVerseToIR.js                         
  Main Exports: serializeVerseIR, deserializeVerseIR
  Side-Effect Level: pure
  Confidence: high
  ────────────────────────────────────────
  File: compiler/verseIRQueries.js                                                                                                                                                                   
  Role: IR lookup helpers
  Runtime: any                                                                                                                                                                                       
  Main Imports: vowelFamily.js                              
  Main Exports: getTokensByIds, getTokensByVowelFamily, getTokensByRhymeTail, getWindowsByIds, getWindowsBySignature, getLineTokens, neighborsOf
  Side-Effect Level: pure
  Confidence: high
  ────────────────────────────────────────
  File: compiler/VerseSynthesis.js                                                                                                                                                                   
  Role: Top-level synthesizer (UI consumer entry)
  Runtime: any                                                                                                                                                                                       
  Main Imports: codex/core/analysis.pipeline.js, syntax.layer.js, harkov.model.js, compileVerseToIR.js, rhymeScheme.detector.js, vowelFamily.js, literaryDevices.detector.js
  Main Exports: synthesizeVerse
  Side-Effect Level: pure (deterministic given inputs)
  Confidence: medium (cross-package deps unread)
  ────────────────────────────────────────
  File: compiler/adaptiveWhitespaceGrid.ts                                                                                                                                                           
  Role: Canvas-measured token width / topology
  Runtime: browser (canvas + getComputedStyle)                                                                                                                                                       
  Main Imports: wordTokenization                            
  Main Exports: measureTextWidth, buildTruesightOverlayLines, getAdaptiveTokenWidth, compileAdaptiveGrid, computeAdaptiveGridTopology
  Side-Effect Level: mixed (DOM read + module-level cache)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/corpusWhitespaceGrid.ts                                                                                                                                                             
  Role: Corpus-frequency-weighted spacing
  Runtime: browser (fetch)                                                                                                                                                                           
  Main Imports: wordTokenization, adaptiveWhitespaceGrid    
  Main Exports: loadCorpusFrequencies, getCachedCorpusFrequencies, getSpacingConfidence, measureWithCorpusInference, buildCorpusAdaptiveGrid, mirrorCorpusCol, mirrorCorpusRectX,
    getCorpusSymmetryAxisX, getCorpusAdjustedWidth, compileCorpusGrid
  Side-Effect Level: mixed (network + cache singleton)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/truesightGrid.ts                                                                                                                                                                    
  Role: Legacy grid topology + monospace column math
  Runtime: browser                                                                                                                                                                                   
  Main Imports: none                                        
  Main Exports: computeGridTopology, calculateVisualColumn, compileTokensToGrid, gridToPixels
  Side-Effect Level: mixed (DOM read)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/pixelbrainTruesightAMP.ts                                                                                                                                                           
  Role: Bridge orchestrator
  Runtime: browser                                                                                                                                                                                   
  Main Imports: adaptiveWhitespaceGrid, compileVerseToIR, analysisModes
  Main Exports: runTruesightTransverse, resolvePhonemeAtPoint
  Side-Effect Level: pure (orchestration)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/toolbarBytecode.ts                                                                                                                                                                  
  Role: Toolbar state encoded as bytecode + reactive channel
  Runtime: browser                                                                                                                                                                                   
  Main Imports: none                                        
  Main Exports: TOOLBAR_TOOL, ANALYSIS_MODE, SAVE_STATE, encodeToolbarBytecode, decodeToolbarBytecode, createToolbarChannel, ToolbarChannel
  Side-Effect Level: side-effect-heavy (module singleton, Date.now)
  Confidence: high
  ────────────────────────────────────────
  File: compiler/viewportBytecode.ts                                                                                                                                                                 
  Role: Viewport state channel + ResizeObserver bridge
  Runtime: browser                                                                                                                                                                                   
  Main Imports: none                                        
  Main Exports: DEFAULT_VIEWPORT_STATE, detectDeviceClass, detectOrientation, encodeViewportBytecode, createViewportChannel, ViewportChannel
  Side-Effect Level: side-effect-heavy (singleton, ResizeObserver, window)
  Confidence: high

  ---
  3. Dependency Map
                   
  Internal graph (within audit scope):
                                                                                                                                                                                                     
  TruesightControls.jsx ─── (no internal lib imports — defines its own ANALYSIS_MODES)
                                                                                                                                                                                                     
  VerseSynthesis.js                                         
    └─→ compileVerseToIR.js                                                                                                                                                                          
          └─→ analysisModes.js                              
                                                                                                                                                                                                     
  verseIRSerialization.js
    └─→ compileVerseToIR.js (cycle-free — only imports `createEmptyVerseIR`)                                                                                                                         
                                                                                                                                                                                                     
  verseIRQueries.js — leaf (only imports phonology helper outside scope)                                                                                                                             
                                                                                                                                                                                                     
  pixelbrainTruesightAMP.ts                                                                                                                                                                          
    ├─→ adaptiveWhitespaceGrid.ts                           
    ├─→ compileVerseToIR.js                                                                                                                                                                          
    └─→ analysisModes.js
                                                                                                                                                                                                     
  corpusWhitespaceGrid.ts                                   
    └─→ adaptiveWhitespaceGrid.ts (uses `measureTextWidth`)
                                                                                                                                                                                                     
  rhymeColorRegistry.js                                                                                                                                                                              
    └─→ pcaChroma.js (uses `hslToHex`, `resolveVerseIrColor`)                                                                                                                                        
                                                                                                                                                                                                     
  pcaChroma.js                                              
    └─→ codex/core/phonology/chroma.resolver.js   ← cross-package boundary                                                                                                                           
    └─→ src/lib/phonology/vowelWheel.js          ← outside audit scope                                                                                                                               
    └─→ src/data/schools.js                      ← outside audit scope
                                                                                                                                                                                                     
  truesightGrid.ts — leaf                                   
  toolbarBytecode.ts — leaf                                                                                                                                                                          
  viewportBytecode.ts — leaf                                                                                                                                                                         
  analysisModes.js — leaf
  visemeMapping.js — leaf                                                                                                                                                                            
                                                            
  Central modules: compileVerseToIR.js (consumed by Synthesis, AMP, Serialization). adaptiveWhitespaceGrid.ts (consumed by AMP and Corpus).                                                          
   
  Isolated modules: truesightGrid.ts, toolbarBytecode.ts, viewportBytecode.ts, visemeMapping.js (no consumers within src/lib/truesight/). They are imported by UI surfaces (e.g., ScrollEditor.jsx   
  imports truesightGrid and viewportBytecode).              
                                                                                                                                                                                                     
  No circular dependencies detected. The verseIRSerialization ↔ compileVerseToIR pair is one-directional (serialization imports the empty-builder factory only).                                     
   
  External libraries (within scope): none beyond react and prop-types. Pure Node/browser std.                                                                                                        
                                                            
  Cross-package leak: pcaChroma.js imports ../../../../codex/core/phonology/chroma.resolver.js — src/lib/ reaches into codex/. Per CLAUDE.md's ownership table this is allowed (Codex owns both), but
   the relative path traversal (../../../../) is brittle.   
                                                                                                                                                                                                     
  ---                                                       
  4. Bytecode-Oriented IR Overview
                                                                                                                                                                                                     
  Selected high-leverage functions. Full per-function trace would run >150 entries; I'm highlighting the structurally important ones.
                                                                                                                                                                                                     
  compileVerseToIR(rawText, options) — compileVerseToIR.js:771                                                                                                                                       
                                                                                                                                                                                                     
  Function:   compileVerseToIR                                                                                                                                                                       
  Purpose:    Authoritative source-text → frozen IR transducer. The "kernel" of the system.                                                                                                          
  Inputs:     rawText: string, options: { mode, normalization, phonemeEngine }                                                                                                                       
  Outputs:    Frozen IR { version, rawText, normalizedText, lines[], tokens[], surfaceSpans[],                                                                                                       
              syllableWindows[], indexes{...9 maps...}, featureTables{...3...}, metadata{...} }                                                                                                      
  Reads:      PhonemeEngine (singleton import), GRAPHEME_SEGMENTER (module), STOP_WORD_LIKE                                                                                                          
  Writes:     none (returns new frozen graph)                                                                                                                                                        
  Calls:      resolveTruesightAnalysisMode, resolveNormalizationOptions, createOffsetTranslator,                                                                                                     
              splitVerseLines, buildTokenIR (per token), buildSurfaceSpans,                                                                                                                          
              buildSyllableWindows, buildVerseIndexes, buildFeatureTables, inferLineBreakStyle,                                                                                                      
              normalizeSurfaceText                                                                                                                                                                   
  Side effects: none — pure pipeline (relies on engine purity)                                                                                                                                       
                                                                                                                                                                                                     
  Bytecode-Oriented Trace:                                                                                                                                                                           
    1. LOAD_VAR rawText, options                                                                                                                                                                     
    2. CALL_FN String(rawText) → source                                                                                                                                                              
    3. CALL_FN resolveTruesightAnalysisMode(options.mode) → mode                                                                                                                                     
    4. CALL_FN resolveNormalizationOptions(options.normalization) → normalizationOptions
    5. JUMP_IF_FALSE !source → goto 6 else goto 26                                                                                                                                                   
    6. CALL_FN createEmptyVerseIR({mode, normalization}) → empty                                                                                                                                     
    7. RETURN empty                                                                                                                                                                                  
   26. CALL_FN PhonemeEngine.bind / options.phonemeEngine → engine                                                                                                                                   
   27. CALL_FN getTruesightAnalysisModeConfig(mode) → modeConfig                                                                                                                                     
   28. CALL_FN createOffsetTranslator(source) → offsetTranslator                                                                                                                                     
   29. CALL_FN splitVerseLines(source, {normalization, offsetTranslator}) → lines[]                                                                                                                  
   30. ALLOC_ARRAY tokens                                                                                                                                                                            
   31. LOOP_START for line of lines                                                                                                                                                                  
   32.    LOOP_START for match of line.text.matchAll(WORD_REGEX)                                                                                                                                     
   33.       CALL_FN buildTokenIR(...) → token                                                                                                                                                       
   34.       PUSH_ARRAY tokens, token                                                                                                                                                                
   35.       MUTATE_STATE line.tokenIds.push(token.id)   ← MUTATION POINT                                                                                                                            
   36.    LOOP_END                                                                                                                                                                                   
   37.    WRITE_PROP line.tokenIds = Object.freeze([...])                                                                                                                                            
   38.    CALL_FN Object.freeze(line)                    ← freeze each line                                                                                                                          
   39. LOOP_END                                                                                                                                                                                      
   40. CALL_FN Object.freeze(tokens) → frozenTokens                                                                                                                                                  
   41. CALL_FN buildSurfaceSpans(...) → surfaceSpans                                                                                                                                                 
   42. CALL_FN buildSyllableWindows(lines, frozenTokens, modeConfig.maxWindowSyllables, modeConfig.maxWindowTokenSpan, offsetTranslator)
   43. CALL_FN buildVerseIndexes(...) → indexes                                                                                                                                                      
   44. CALL_FN buildFeatureTables(...) → featureTables      
   45. RETURN Object.freeze({ version, rawText: source, normalizedText, lines, tokens, ...indexes, ...featureTables, metadata })                                                                     
                                                                                                                                                                                                     
  Branches:   1 early-empty                                                                                                                                                                          
  Loops:      2 nested (lines × tokens) + 3 derived passes                                                                                                                                           
  Async:      none                                                                                                                                                                                   
  Mutation points: line.tokenIds.push (then frozen) — write-once-then-freeze idiom
  Hidden assumptions: PhonemeEngine is reentrant and pure; WORD_REGEX_GLOBAL is reset per call via createWordRegex                                                                                   
                                                                                                                                                                                                     
  buildSyllableWindows(lines, tokens, maxWindowSyllables, maxWindowTokenSpan, offsetTranslator) — compileVerseToIR.js:587                                                                            
                                                                                                                                                                                                     
  Purpose:    Generate every contiguous syllable window of length 1..N up to mode caps.                                                                                                              
              This is a sliding-window enumerator with token-span guard.                                                                                                                             
  Inputs:     lines, tokens, maxWindowSyllables, maxWindowTokenSpan, offsetTranslator                                                                                                                
  Outputs:    Frozen array of frozen window objects with signature key                                                                                                                               
  Reads:      tokens                                                                                                                                                                                 
  Writes:     none (allocates new arrays)                                                                                                                                                            
  Side effects: none                                                                                                                                                                                 
                                                            
  Bytecode-Oriented Trace (compressed):                                                                                                                                                              
    1. ALLOC_ARRAY windows                                  
    2. CREATE_OBJECT syllablesByLine = new Map                                                                                                                                                       
    3. LOOP_START for token of tokens                                                                                                                                                                
    4.    CALL_FN buildTokenSyllableUnits(token) → units                                                                                                                                             
    5.    MUTATE_STATE syllablesByLine.get(lineIndex).push(...units)                                                                                                                                 
    6. LOOP_END                                                                                                                                                                                      
    7. LOOP_START for line of lines                                                                                                                                                                  
    8.    LOAD_VAR syllables = syllablesByLine.get(line.lineIndex) || []                                                                                                                             
    9.    JUMP_IF_FALSE syllables.length === 0 → continue                                                                                                                                            
   10.    LOOP_START for startIndex 0..syllables.length-1                                                                                                                                            
   11.       LOOP_START for length 1..maxWindowSyllables                                                                                                                                             
   12.          LOAD_CONST endExclusive = startIndex + length                                                                                                                                        
   13.          JUMP_IF_FALSE endExclusive > syllables.length → break                                                                                                                                
   14.          LOAD_VAR windowSyllables = syllables.slice(start, end)                                                                                                                               
   15.          MAP_COLLECTION tokenIds = unique(windowSyllables.tokenId)                                                                                                                            
   16.          JUMP_IF_FALSE tokenIds.length > maxWindowTokenSpan → continue                                                                                                                        
   17.          MAP_COLLECTION vowelSequence = windowSyllables.map(normalizeVowelFamily)                                                                                                             
   18.          MAP_COLLECTION stressContour, codaContour                                                                                                                                            
   19.          PUSH_ARRAY windows, frozen window {id, span, signature, ...}                                                                                                                         
   20.       LOOP_END                                                                                                                                                                                
   21.    LOOP_END                                                                                                                                                                                   
   22. LOOP_END                                                                                                                                                                                      
   23. RETURN Object.freeze(windows)                        
                                                                                                                                                                                                     
  Complexity: O(L × S × W) where S = syllables-per-line, W = maxWindowSyllables                                                                                                                      
  For VOID_ECHO (W=10), a 10-line stanza × 60 syllables/line ≈ 6,000 windows.                                                                                                                        
  This is a write-amplification hot zone (see SSD section).                                                                                                                                          
                                                                                                                                                                                                     
  computeAdaptiveGridTopology(element, _sampleTokens) — adaptiveWhitespaceGrid.ts:230                                                                                                                
                                                                                                                                                                                                     
  Purpose:    Read computed CSS, derive font/padding-aware grid topology                                                                                                                             
  Inputs:     element: HTMLElement | null                                                                                                                                                            
  Outputs:    Frozen-ish topology { originX, originY, baseCellWidth, baseCellHeight,                                                                                                                 
              adaptiveScale, totalCols, totalWidth, fontFamily, fontSize, fontStyle,                                                                                                                 
              fontWeight, letterSpacing, wordSpacing, tabSize, corpusEnabled }                                                                                                                       
  Reads:      element.clientWidth, getComputedStyle(element).*                                                                                                                                       
  Writes:     none                                                                                                                                                                                   
  Side effects: DOM_READ (one getComputedStyle, one clientWidth)                                                                                                                                     
  Determinism: depends on rendered CSS — non-deterministic across environments                                                                                                                       
                                                                                                                                                                                                     
  Bytecode-Oriented Trace:                                                                                                                                                                           
    1. JUMP_IF_FALSE element → RETURN null                                                                                                                                                           
    2. DOM_READ window.getComputedStyle(element) → styles   
    3. CALL_FN parseFloat(styles.fontSize) || 16 → fontSize                                                                                                                                          
    4. CALL_FN parseFloat(styles.lineHeight) || fontSize * 1.9 → lineHeight    ← Vaelrix Law 1.9                                                                                                     
    5. CALL_FN parseFloat(styles.paddingLeft) || 0 → paddingLeft                                                                                                                                     
    6. CALL_FN parseFloat(styles.paddingTop) || 0 → paddingTop                                                                                                                                       
    7. CALL_FN parseFloat(styles.paddingRight) || 0 → paddingRight             ← from earlier fix                                                                                                    
    8. CALL_FN Number.isFinite(element.clientWidth) ? clientWidth : 0                                                                                                                                
    9. RETURN { originX, originY, baseCellWidth: fontSize, baseCellHeight: lineHeight,                                                                                                               
              adaptiveScale: 1.0, totalCols: 80, totalWidth: max(0, clientWidth-pl-pr), ... }                                                                                                        
                                                                                                                                                                                                     
  Hidden assumption: lineHeight 1.9 is the world-law default. totalCols hardcoded 80 (magic).                                                                                                        
                                                                                                                                                                                                     
  buildTruesightOverlayLines(content, containerWidth, topology) — adaptiveWhitespaceGrid.ts:119                                                                                                      
                                                            
  Purpose:    Word-wrap simulation: produce visual lines + per-token x-offsets                                                                                                                       
  Inputs:     content: string, containerWidth: number, topology                                                                                                                                      
  Outputs:    { lines: VisualLine[], allTokens: Token[] }
  Calls:      measureTextWidth (per token)                                                                                                                                                           
  Side effects: WRITE_STORAGE measurementCache (Map, module-level singleton)                                                                                                                         
                                                                                                                                                                                                     
  Bytecode trace (compressed):                                                                                                                                                                       
    1. LOAD_VAR rawLines = content.split('\n')                                                                                                                                                       
    2. ALLOC_ARRAY visualLines                                                                                                                                                                       
    3. STORE_VAR globalVisualLineIndex = 0
    4. LOOP_START rawLineIndex 0..rawLines.length-1                                                                                                                                                  
    5.    LOAD_VAR lineText = rawLines[rawLineIndex]                                                                                                                                                 
    6.    ALLOC_ARRAY currentLineTokens                                                                                                                                                              
    7.    STORE_VAR currentLineWidth = 0                                                                                                                                                             
    8.    BRANCH lineText.startsWith('#') → lineType = "heading"                                                                                                                                     
          BRANCH lineText.startsWith('- '|'* ') → lineType = "list-item"                                                                                                                             
          DEFAULT → "normal"                                                                                                                                                                         
    9.    LOAD_VAR matches = [...lineText.matchAll(LINE_TOKEN_REGEX)]                                                                                                                                
   10.    JUMP_IF_FALSE matches.length === 0 → push empty line, continue                                                                                                                             
   11.    LOOP_START match of matches                                                                                                                                                                
   12.       CALL_FN measureTextWidth(token, ...) → tokenWidth                                                                                                                                       
   13.       BRANCH currentLineWidth + tokenWidth > containerWidth && currentLineTokens.length > 0                                                                                                   
   14.          → push currentLineTokens as visualLine, reset                                                                                                                                        
   15.       PUSH_ARRAY currentLineTokens with x: currentLineWidth, width: tokenWidth                                                                                                                
   16.       MUTATE_STATE currentLineWidth += tokenWidth                                                                                                                                             
   17.    LOOP_END                                                                                                                                                                                   
   18.    JUMP_IF_FALSE currentLineTokens.length > 0 → push final visualLine                                                                                                                         
   19. LOOP_END                                                                                                                                                                                      
   20. RETURN { lines: visualLines, allTokens: visualLines.flatMap(l => l.tokens) }
                                                                                                                                                                                                     
  Complexity: O(L × T) per call. allTokens flatMap is recomputed every call (no memo).                                                                                                               
                                                                                                                                                                                                     
  createViewportChannel(initialState) — viewportBytecode.ts:59                                                                                                                                       
                                                            
  Purpose:    Reactive pub/sub channel mirroring window viewport state                                                                                                                               
  Inputs:     initialState: ViewportState                                                                                                                                                            
  Outputs:    { getState, getBytecode, update, subscribe, bind, observe }
  Side effects: state mutation, subscriber notification, ResizeObserver lifecycle, window listener                                                                                                   
  Determinism: stateful, time-dependent (Date.now in encodeViewportBytecode)                                                                                                                         
                                                                                                                                                                                                     
  Critical invariant (line 81-85):                                                                                                                                                                   
    if (Object.is(state.width, w) && Object.is(state.height, h) && Object.is(state.pixelRatio, pr)) RETURN                                                                                           
    → this dedupes redundant updates and prevents notify storms.                                                                                                                                     
                                                                                                                                                                                                     
  Cleanup correctness:                                                                                                                                                                               
    - subscribe returns () => subscribers.delete(callback) ✓                                                                                                                                         
    - bind returns () => bindings.delete(id) ✓                                                                                                                                                       
    - observe with ResizeObserver: returns () => observer.disconnect() ✓                                                                                                                             
    - observe fallback: returns () => window.removeEventListener('resize', onResize) ✓                                                                                                               
    All resources are reclaimable.                                                                                                                                                                   
                                                                                                                                                                                                     
  Module singleton (line 159):                                                                                                                                                                       
    ViewportChannel = createViewportChannel(window-driven init or DEFAULT)                                                                                                                           
    Initialized at module load. SSR-safe (typeof window check).                                                                                                                                      
                                                                                                                                                                                                     
  createToolbarChannel() — toolbarBytecode.ts:111                                                                                                                                                    
                                                                                                                                                                                                     
  Purpose:    Reactive toolbar state with bytecode-encoded current state + history log                                                                                                               
  State:      Closure-scoped `state`, `subscribers: Set`, `history: Array`                                                                                                                           
  Side effects: state mutation, Date.now timestamps, append-only history                                                                                                                             
                                                                                                                                                                                                     
  Mutation pattern (CONCERN — see Inconsistencies §5):                                                                                                                                               
    setTool branches on tool kind, then MUTATES state.<key> = value (line 142, etc.)                                                                                                                 
    THEN calls notify(), which spreads state to a new object with fresh timestamp.                                                                                                                   
                                                                                                                                                                                                     
    Risk: subscribers receive { ...state, timestamp: Date.now() } — a NEW object — but                                                                                                               
    any closure that captured `state` directly via getState() between mutation and notify                                                                                                            
    would observe partial state.                                                                                                                                                                     
                                                            
  Bytecode encoding (encodeToolbarBytecode):                                                                                                                                                         
    Produces a string like:                                 
      TOOLBAR_STATE                                                                                                                                                                                  
      TRUESIGHT ON                                                                                                                                                                                   
      PREDICTIVE OFF
      ANALYSIS_MODE RHYME                                                                                                                                                                            
      SAVE_STATE CLEAN                                      
      SCHEME_DETECTION OFF                                                                                                                                                                           
      TIMESTAMP 1745603928000                                                                                                                                                                        
    This is a hand-rolled ASCII bytecode. Decoder is lossy: only known keys round-trip;                                                                                                              
    unknown keys are silently dropped.                                                                                                                                                               
                                                                                                                                                                                                     
  resolveVerseIrColor(family, schoolId, options) — pcaChroma.js:318                                                                                                                                  
                                                            
  Purpose:    Project a vowel family onto the PCA basis, then derive HSL from school + phase                                                                                                         
  Inputs:     family: string, schoolId: string|null, options: { phase, baseHsl }                                                                                                                     
  Outputs:    Frozen { family, school, hex, hsl, projection, viseme }                                                                                                                                
  Side effects: none                                                                                                                                                                                 
  Determinism: pure given (family, schoolId, options.phase, options.baseHsl)                                                                                                                         
              and the module-load-time PCA_BASIS computation.                                                                                                                                        
  Math: blends explicit baseHsl with PC1/PC2 deltas, modulates with sine(phase).                                                                                                                     
                                                                                                                                                                                                     
  Bytecode trace (compressed):                                                                                                                                                                       
    1. CALL_FN resolveProjectionFamily(family) → resolvedFamily                                                                                                                                      
    2. JUMP_IF_FALSE !resolvedFamily → RETURN frozen gray fallback {hex: '#888888', ...}                                                                                                             
    3. CALL_FN getVerseIrColorProjection(resolvedFamily) → projection                                                                                                                                
    4. CALL_FN resolveSchoolKey(schoolId, resolvedFamily) → schoolKey                                                                                                                                
    5. CALL_FN resolveBaseHsl(schoolKey, options) → baseHsl                                                                                                                                          
    6. CALL_FN hasExplicitBaseHsl(options) → usesThemeHue                                                                                                                                            
    7. CALL_FN getVerseIrColorProjection(SCHOOL_COLOR_ANCHORS[schoolKey] || resolvedFamily) → anchorProjection                                                                                       
    8. LOAD_CONST themeConfig = THEME_SCALARS                                                                                                                                                        
    9. STORE_VAR deltaPc1 = projection.pc1 - anchorProjection.pc1                                                                                                                                    
   10. STORE_VAR deltaPc2 = projection.pc2 - anchorProjection.pc2                                                                                                                                    
   11. STORE_VAR deltaRadius = clamp(hypot(deltaPc1, deltaPc2)/1.6, 0, 1)                                                                                                                            
   12. STORE_VAR phase = options.phase ?? 0                                                                                                                                                          
   13. STORE_VAR rad = phase * 2π                                                                                                                                                                    
   14. STORE_VAR hMod = sin(rad) * resonanceHue                                                                                                                                                      
   15. STORE_VAR sMod = cos(rad) * resonanceSat                                                                                                                                                      
   16. STORE_VAR lMod = sin(rad * 1.5) * resonanceLit  ← phase shift on lightness                                                                                                                    
   17. BRANCH usesThemeHue → hue = wrapHue(baseHsl.h + Δpc1*22 - Δpc2*14 + hMod)                                                                                                                     
              ELSE          → hue = wrapHue(canonicalHue + Δpc1*6 - Δpc2*6 + hMod)                                                                                                                   
   18. STORE_VAR saturation = clamp(baseHsl.s + Δradius*20 + Δpc1*8 - |Δpc2|*2 + sMod, 40, 95)                                                                                                       
   19. STORE_VAR lightness  = clamp(baseHsl.l + 2 + Δpc1*10 - Δpc2*20 + lMod, 35, 88)                                                                                                                
   20. RETURN frozen { family, school, hex: hslToHex(...), hsl, projection, viseme }                                                                                                                 
                                                                                                                                                                                                     
  ---                                                                                                                                                                                                
  5. Logical Inconsistencies                                                                                                                                                                         
                                                                                                                                                                                                     
  Severity: HIGH                                                                                                                                                                                 
  Issue: Three divergent ANALYSIS_MODE enums                                                                                                                                                         
  Evidence: TruesightControls L6-13; toolbarBytecode L22-27; analysisModes L1-7                                                                                                                  
  Risk: UI surfaces a mode that no compiler config exists for, or vice versa                                                                                                                         
  Suggested Fix: Single canonical ANALYSIS_MODES in analysisModes.js; both UI and toolbar import from there                                                                                      
  Retest: Visual + integration test on every mode click                                                                                                                                              
  ────────────────────────────────────────                                                                                                                                                       
  Severity: HIGH                                                                                                                                                                                     
  Issue: TruesightControls.ANALYSIS_MODES includes ASTROLOGY and PIXELBRAIN and VOIDECHO, but analysisModes.TRUESIGHT_ANALYSIS_MODES has no astrology and uses live_fast/balanced/deep_truesight keys
  
    the UI never references                                                                                                                                                                          
  Evidence: files cited above                               
  Risk: Mode mismatch silently falls back to BALANCED via resolveTruesightAnalysisMode
  Suggested Fix: Add explicit assertion logging when an unknown mode is requested
  Retest: Same as above
  ────────────────────────────────────────
  Severity: MEDIUM                                                                                                                                                                                   
  Issue: toolbarBytecode.ts ANALYSIS_MODE enum is missing pixelbrain_transverse and void_echo; the cast value.toLowerCase() as AnalysisMode (L91) lies about the type
  Evidence: toolbarBytecode L91                                                                                                                                                                      
  Risk: Bytecode round-trip drops or corrupts these modes   
  Suggested Fix: Widen AnalysisMode union or build a runtime parse-and-validate
  Retest: Round-trip test: encode → decode → assertEquals
  ────────────────────────────────────────
  Severity: MEDIUM                                                                                                                                                                                   
  Issue: truesightGrid.ts looks superseded by adaptiveWhitespaceGrid.ts. calculateVisualColumn is a no-op (return charStartInLine); compileTokensToGrid returns coordinates but I see no in-tree
    consumer except a single import computeGridTopology in ScrollEditor.jsx (which I read earlier) that is never called                                                                              
  Evidence: truesightGrid.ts:63-67, ScrollEditor.jsx:6      
  Risk: Dead code or zombie API surface; readers waste time wondering which grid is canonical
  Suggested Fix: Remove the unused import in ScrollEditor.jsx; if module truly unused, delete or fold into adaptiveWhitespaceGrid.ts
  Retest: npm run lint, npm run test, visual baselines
  ────────────────────────────────────────
  Severity: MEDIUM                                                                                                                                                                                   
  Issue: toolbarBytecode.createToolbarChannel mutates state then rebuilds it in notify
  Evidence: toolbarBytecode L139-163, L129-132                                                                                                                                                       
  Risk: Subscribers calling getState() between mutation and notify see torn state; the mutation pattern leaks stale references
  Suggested Fix: Replace direct mutation with immutable update: state = { ...state, [key]: value }; notify()
  Retest: Add a unit test that reads getState during a setTool callback
  ────────────────────────────────────────
  Severity: MEDIUM                                                                                                                                                                                   
  Issue: pcaChroma.js:353 uses ?? 180 (cyan) as the canonical-hue fallback when VOWEL_HUE_MAP[family] is missing. Same magic number as the historical 180° collision in chroma.resolver.js
  Evidence: pcaChroma L353                                                                                                                                                                           
  Risk: A vowel family with no hue silently colors as cyan; ambiguous with legitimate cyan vowels
  Suggested Fix: Throw or return null when the family is unknown; let callers decide the fallback
  Retest: Test resolveVerseIrColor('XYZ') and assert error or known fallback path
  ────────────────────────────────────────
  Severity: MEDIUM                                                                                                                                                                                   
  Issue: corpusWhitespaceGrid.getCorpusAdjustedWidth hardcodes 'Georgia'/'16px' as fallback measurement
  Evidence: corpusWhitespaceGrid L252                                                                                                                                                                
  Risk: If user's font is not Georgia, the fallback measurement is wrong; layout drifts
  Suggested Fix: Pass topology fonts in or require a measurement context
  Retest: Cross-browser snapshot test with a non-Georgia font
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: pcaChroma.js:41 defines A: [730, 1090] — same formant pair as AA, treated as an alias but never declared in the alias map (PCA_FAMILY_ALIASES)
  Evidence: pcaChroma L41, L48-52                                                                                                                                                                    
  Risk: Confusing — A is a "phantom" entry that works only because of PCA_VOWEL_FORMANTS direct lookup
  Suggested Fix: Move to PCA_FAMILY_ALIASES so A → AA is explicit
  Retest: Lookup test for resolveProjectionFamily('A')
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: compileVerseToIR.STOP_WORD_LIKE (L8-11) omits common stop words (we, you, they, have, has, this, that, not, no)
  Evidence: compileVerseToIR L8-11                                                                                                                                                                   
  Risk: Stop-word filtering is partial; downstream rhyme detection treats these as content words
  Suggested Fix: Use a canonical stop-word list (or accept that this is intentional minimum)
  Retest: Rhyme detection corpus regression
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: widthCache in adaptiveWhitespaceGrid clears the entire map at 1000 entries — not LRU
  Evidence: adaptiveWhitespaceGrid L88                                                                                                                                                               
  Risk: Sudden cache miss spike → measurement burst on long sessions
  Suggested Fix: Replace with LRU (Map insertion order trick: delete oldest, set new)
  Retest: Performance trace with >1000 unique tokens
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: measureTextWidth includes dpr in cache key but never applies it to the actual measurement
  Evidence: adaptiveWhitespaceGrid L61, L68                                                                                                                                                          
  Risk: Cache invalidates pointlessly when monitor changes; no measurement difference
  Suggested Fix: Drop dpr from cache key, or apply it to width if intended
  Retest: Monitor-swap test
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: TruesightControls.onTogglePredictive defaults to () => {}
  Evidence: TruesightControls L27                                                                                                                                                                    
  Risk: Click silently no-ops if parent forgets the prop; obscures wiring bugs
  Suggested Fix: Make onTogglePredictive required (PropTypes.func.isRequired) or warn in dev
  Retest: PropTypes warning test
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: rhymeColorRegistry.normalizeExplicitColor rejects exactly #888888, #888, rgb(136, 136, 136) as sentinel "missing color" markers
  Evidence: rhymeColorRegistry L135                                                                                                                                                                  
  Risk: A user-chosen literal grey would be discarded as missing
  Suggested Fix: Use a typed sentinel (e.g. null, Symbol) instead of magic hex strings throughout
  Retest: Color picker integration test using #888
  ────────────────────────────────────────
  Severity: LOW                                                                                                                                                                                      
  Issue: viewportBytecode ResizeObserver fallback (L128-136) attaches a window-resize listener for an element-specific observer
  Evidence: viewportBytecode L128-136                                                                                                                                                                
  Risk: In legacy browsers, observing element A also fires on window resize regardless of A's actual size
  Suggested Fix: Document the limitation; or fall back to a polyfill
  Retest: Manually test on a browser without ResizeObserver
  ────────────────────────────────────────
  Severity: INFO                                                                                                                                                                                     
  Issue: VerseSynthesis.js reaches across into codex/core/analysis.pipeline.js (L10)
  Evidence: VerseSynthesis L10                                                                                                                                                                       
  Risk: Tight coupling, brittle relative path, mixes layer ownership
  Suggested Fix: Add a thin adapter or central index file
  Retest: Static path-import audit
  ────────────────────────────────────────
  Severity: INFO                                                                                                                                                                                     
  Issue: buildSyllableWindows is O(L × S × W) with W up to 10 in VOID_ECHO. For a 60-syllable line this is 600 windows per line
  Evidence: compileVerseToIR L587-651                                                                                                                                                                
  Risk: Latency spike on long verses in the highest mode    
  Suggested Fix: Add a per-call cap or chunked yielding
  Retest: Bench: compileVerseToIR on 200-line poem in VOID_ECHO mode
  ────────────────────────────────────────
  Severity: INFO                                                                                                                                                                                     
  Issue: buildPcaBasis (pcaChroma) runs on module load — small but unconditional cost
  Evidence: pcaChroma L249                                                                                                                                                                           
  Risk: Tree-shaking can't eliminate it; bundle parsing pays it
  Suggested Fix: Lazy-init via getter
  Retest: Module init benchmark

  ---
  6. SSD / Data Orientation Findings
                                                                                                                                                                                                     
  ┌─────────────────────┬──────────────────────────────────────────────────────────────────────────────┬────────────────────────┬──────────────────────────────┬────────────────────────────────┐
  │       Concept       │                                Code Evidence                                 │    Storage Analogy     │      Visualization Use       │          Optimization          │    
  ├─────────────────────┼──────────────────────────────────────────────────────────────────────────────┼────────────────────────┼──────────────────────────────┼────────────────────────────────┤
  │ Primary record      │                                                                            │ Heap file with row id │ Layer 2 grid: token ids as   │                                   │    
  │ array,              │ verseIR.tokens[], ids = array index (globalTokenIndex === id)              │  = offset             │ Y-axis                       │ Already optimal — O(1) lookup     │
  │ integer-indexed     │                                                                            │                       │                              │                                   │    
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────────────────┼───────────────────────────────────┤
  │                     │ tokenIdsByRhymeTail, tokenIdsByVowelFamily, tokenIdsByTerminalVowelFamily, │ B-tree style          │ Layer 4: each index is a     │                                   │    
  │ Secondary indexes   │  tokenIdsByStressedVowelFamily, tokenIdsByConsonantSkeleton,               │ secondary index over  │ column-perpendicular flow    │ Could share index keys via a      │
  │ (Map)               │ tokenIdsByStressContour, windowIdsBySyllableLength, windowIdsBySignature,  │ heap rows             │ plane                        │ single inverted index struct      │    
  │                     │ tokenIdsByLineIndex (compileVerseToIR.js L656-697)                         │                       │                              │                                   │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────────────────┼───────────────────────────────────┤
  │ Append-only history │ toolbarBytecode.history[] (L127, L143, L147, ...)                          │ Write-ahead log /     │ Animation: history rows      │ Bound the array (currently        │
  │  log                │                                                                            │ journal               │ scroll past as a tape        │ unbounded — leak)                 │    
  Code Evidence: toolbarBytecode.history[] (L127, L143, L147, ...)                                                                                                                               
  Storage Analogy: Write-ahead log / journal                                                                                                                                                         
  Visualization Use: Animation: history rows scroll past as a tape                                                                                                                               
  Optimization: Bound the array (currently unbounded — leak)                                                                                                                                         
  ────────────────────────────────────────                                                                                                                                                       
  Concept: Pub/sub channel                                                                                                                                                                           
  Code Evidence: subscribers: Set in viewportBytecode/toolbarBytecode                                                                                                                            
  Storage Analogy: Trigger / event log subscriber                                                                                                                                                    
  Visualization Use: Animation: each subscriber as a fan-out tendril                                                                                                                             
  Optimization: Already correct — subscribers are reclaimable                                                                                                                                        
  ────────────────────────────────────────                                                                                                                                                           
  Concept: Hash-keyed measurement cache                                                                                                                                                          
  Code Evidence: widthCache: Map<string, number> (adaptiveWhitespaceGrid L33)                                                                                                                        
  Storage Analogy: Memory-mapped cache for hot paths                                                                                                                                                 
  Visualization Use: Layer 4: cache hit = teal pulse, miss = orange flare                                                                                                                        
  Optimization: Wear-leveling concern: clear-all at 1000 entries instead of LRU. See §5.                                                                                                             
  ────────────────────────────────────────                                                                                                                                                       
  Concept: Singleton canvas measurement device                                                                                                                                                   
  Code Evidence: measurementCanvas, measurementContext (adaptiveWhitespaceGrid L31-32)                                                                                                               
  Storage Analogy: Single-spindle disk read-head                                                                                                                                                 
  Visualization Use: Color: emerald (storage device)                                                                                                                                                 
  Optimization: Lock-free OK for single-thread JS                                                                                                                                                
  ────────────────────────────────────────                                                                                                                                                           
  Concept: Module-load PCA basis                                                                                                                                                                 
  Code Evidence: PCA_BASIS = buildPcaBasis() (pcaChroma L249)                                                                                                                                        
  Storage Analogy: Pre-baked index page (read-only, computed once)                                                                                                                                   
  Visualization Use: Layer 5: PC1/PC2 as the 2D scatter — already a visualization!                                                                                                               
  Optimization: Lazy via getter to defer cost                                                                                                                                                        
  ────────────────────────────────────────                                                                                                                                                       
  Concept: Frozen IR (write-once)                                                                                                                                                                    
  Code Evidence: Object.freeze on every node in compileVerseToIR                                                                                                                                 
  Storage Analogy: TRIM-like immutability — once written, never overwritten                                                                                                                          
  Visualization Use: Color: blue-white (pure) — entire IR pulses as a single block                                                                                                               
  Optimization: None — this is the design strength                                                                                                                                                   
  ────────────────────────────────────────                                                                                                                                                       
  Concept: Serialization round-trip                                                                                                                                                                  
  Code Evidence: serializeVerseIR / deserializeVerseIR (verseIRSerialization.js)                                                                                                                     
  Storage Analogy: Bytes-to-disk format with explicit hydration
  Visualization Use: Animation: serialize-flare from RAM to "disk" lane                                                                                                                              
  Optimization: Validate version field; current code uses payload.version but doesn't reject unknown versions
  ────────────────────────────────────────
  Concept: Sliding-window precomputation
  Code Evidence: buildSyllableWindows enumerates O(N×W) windows up-front
  Storage Analogy: Bloom-filter / coverage index
  Visualization Use: Layer 4: each window as a bracketed tile spanning syllable cells
  Optimization: Write-amplification: windows × W modes; consider lazy enumeration
  ────────────────────────────────────────
  Concept: Coordinate indexing
  Code Evidence: tokenByCharStart, tokenByIdentity, tokenByNormalizedWord (VerseSynthesis L54-56)
  Storage Analogy: Multiple address spaces over the same record
  Visualization Use: Layer 4: parallel address bus tracks
  Optimization: Acceptable — 3× memory for 3 lookup paths
  ────────────────────────────────────────
  Concept: Async cached fetch
  Code Evidence: cachedCorpusFreq, corpusLoadPromise (corpusWhitespaceGrid L51-52)
  Storage Analogy: Read-through cache on slow store
  Visualization Use: Animation: violet (async) → emerald (cached)
  Optimization: Promise dedupe is correct; cache never invalidates (intentional?)
  ────────────────────────────────────────
  Concept: Visual byte sequence (toolbar)
  Code Evidence: encodeToolbarBytecode produces ASCII bytecode lines (toolbarBytecode L61)
  Storage Analogy: Serial protocol over a wire
  Visualization Use: Animation: bytecode-tick — character-by-character reveal
  Optimization: Add version prefix for forward compatibility
  ────────────────────────────────────────
  Concept: Grid topology / cell addressing                                                                                                                                                           
  Code Evidence: originX, originY, baseCellWidth, baseCellHeight, totalCols, totalWidth in topology types
  Storage Analogy: Page table for the visual grid                                                                                                                                                    
  Visualization Use: Layer 4: literal grid backplane        
  Optimization: Hardcoded totalCols: 80 is a magic number

  ---
  7. Mathematical Purity Scores
                                                                                                                                                                                                     
  ┌──────────────────────────────────────────────────────────┬────────────────┬─────────────────────────────────────────┬─────────────────────┬─────────────────────────────────────────────────┐
  │                         Function                         │  Purity Score  │               Determinism               │    Side Effects     │                   Improvement                   │    
  ├──────────────────────────────────────────────────────────┼────────────────┼─────────────────────────────────────────┼─────────────────────┼─────────────────────────────────────────────────┤
  │ compileVerseToIR                                         │ 5              │ high (modulo PhonemeEngine purity)      │ none (returns       │ Inject phonemeEngine explicitly to remove       │    
  │                                                          │                │                                         │ frozen graph)       │ module-singleton dependency                     │
  ├───────────────────────────────────────────────────────┼────────────────┼────────────────────────────────────────┼─────────────────────────────┼─────────────────────────────────────────────┤    
  │ splitVerseLines                                       │ 5              │ full                                   │ none                        │ —                                           │    
  ├───────────────────────────────────────────────────────┼────────────────┼────────────────────────────────────────┼─────────────────────────────┼─────────────────────────────────────────────┤    
  │ buildTokenIR                                           │ 4              │ depends on PhonemeEngine purity       │ none directly               │ Same — pull engine out of singleton         │    
  ├────────────────────────────────────────────────────────┼────────────────┼───────────────────────────────────────┼─────────────────────────────┼─────────────────────────────────────────────┤
  │ buildSurfaceSpans / buildSyllableWindows /             │ 5              │ full                                  │ none                        │ —                                           │    
  │ buildVerseIndexes / buildFeatureTables                 │                │                                       │                             │                                             │
  ├────────────────────────────────────────────────────────┼────────────────┼───────────────────────────────────────┼─────────────────────────────┼─────────────────────────────────────────────┤    
  │ serializeVerseIR / deserializeVerseIR                │ 5             │ full                                 │ none                             │ —                                         │ 
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤ 
  │ getTokensByIds, getTokensByVowelFamily, etc.         │ 5             │ full                                 │ none                             │ —                                         │ 
  │ (verseIRQueries)                                     │               │                                      │                                  │                                           │     
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤ 
  │ synthesizeVerse                                      │ 3             │ reads Date.now() for timestamp;      │ timestamp baked into output      │ Pass clock in or omit timestamp from      │     
  │                                                      │               │ calls multiple sub-engines           │                                  │ frozen artifact                           │ 
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤     
  │ mapFormantsToMetrics                                 │ 5             │ full                                 │ none                             │ —                                         │ 
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤     
  │ getVisemeStyles                                      │ 5             │ full                                 │ none                             │ —                                         │     
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤ 
  │ hslToHex                                             │ 5             │ full                                 │ none                             │ Floating point precision risk on the      │     
  │                                                      │               │                                      │                                  │ boundary q/p calc — minor                 │ 
  ├──────────────────────────────────────────────────────┼───────────────┼──────────────────────────────────────┼──────────────────────────────────┼───────────────────────────────────────────┤     
  │ wrapHue, clamp, round (helpers in pcaChroma)         │ 5             │ full                                   │ none                            │ —                                        │ 
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ buildPcaBasis                                        │ 5 but         │ full given input formant table         │ runs at import time             │ Lazy via memoized getter                 │     
  │                                                      │ module-load   │                                        │                                 │                                          │ 
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ resolveVerseIrColor                                  │ 5             │ full                                   │ none                            │ Replace 180° magic fallback (see §5)     │ 
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ buildRhymeColorRegistry                              │ 4             │ depends on input order (golden-angle   │ none                            │ Sort tokens deterministically before     │ 
  │                                                      │               │ slot index)                            │                                 │ iterating                                │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤ 
  │ resolveTokenColor                                    │ 5             │ full                                   │ none                            │ —                                        │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤ 
  │ measureTextWidth                                     │ 2             │ non-deterministic (depends on canvas   │ DOM_READ + WRITE_STORAGE (cache │ Already has fallback; document           │ 
  │                                                      │               │ font rendering)                        │  mutation)                      │ non-determinism                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤ 
  │ buildTruesightOverlayLines                           │ 3             │ depends on measureTextWidth            │ downstream cache writes         │ —                                        │     
  │                                                      │               │ non-determinism                        │                                 │                                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤ 
  │ computeAdaptiveGridTopology                          │ 2             │ depends on getComputedStyle            │ DOM_READ                        │ —                                        │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ loadCorpusFrequencies                                │ 1             │ depends on network + cache + JSON      │ NETWORK_REQUEST, console        │ Inject fetcher; remove console           │
  │                                                      │               │ shape                                  │ writes, singleton mutation      │                                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
  │ getSpacingConfidence                                 │ 5             │ full                                   │ none                            │ —                                        │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ computeBlendedHsl                                    │ 5             │ full                                   │ none                            │ —                                        │
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ createToolbarChannel.setTool                         │ 0             │ mutates closure state, calls           │ direct mutation, history        │ Switch to immutable update               │
  │                                                      │               │ Date.now()                             │ append, pub/sub fire            │                                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
  │ createToolbarChannel.notify                          │ 1             │ calls Date.now()                       │ mutates state                   │ —                                        │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ encodeToolbarBytecode / decodeToolbarBytecode        │ 5 / 3         │ encode is full; decode silently drops  │ none / none                     │ Decode should report unknown keys        │
  │                                                      │               │ unknown keys                           │                                 │                                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
  │ createViewportChannel.update                         │ 0             │ mutates state, calls                   │ mutation, pub/sub               │ Inject pixelRatio when possible          │     
  │                                                      │               │ window.devicePixelRatio                │                                 │                                          │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
  │ detectDeviceClass, detectOrientation                 │ 5             │ full                                   │ none                            │ —                                        │     
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ runTruesightTransverse                               │ 4             │ composes pure callees                  │ none                            │ —                                        │
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ resolvePhonemeAtPoint                                │ 5             │ full                                   │ none                            │ —                                        │
  ├──────────────────────────────────────────────────────┼───────────────┼────────────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤     
  │ TruesightControls (component render)                 │ 3             │ given props, deterministic JSX         │ event handlers; no useEffect    │ —                                        │
  └──────────────────────────────────────────────────────┴───────────────┴────────────────────────────────────────┴─────────────────────────────────┴──────────────────────────────────────────┘     
                                                            
  Aggregate purity: the IR core (compileVerseToIR, queries, serialization, synthesis kernel) scores 5. The color math (pcaChroma) scores 5 with one 180° fallback caveat. The DOM-touching grid layer
   (adaptiveWhitespaceGrid, truesightGrid, corpusWhitespaceGrid) scores 2-3, isolated to the I/O boundary as designed. The reactive channels (toolbarBytecode, viewportBytecode) score 0-1 — by
  design, they are state machines.                                                                                                                                                                   
                                                            
  Side-effect containment is excellent: I/O lives at exactly two layers — DOM-measurement (grid files) and pub/sub channels (bytecode files). The pure data graph is sealed by Object.freeze.        
  
  ---                                                                                                                                                                                                
  8. Visualization Dataset                                  
                                                                                                                                                                                                     
  {
    "nodes": [                                                                                                                                                                                       
      { "id": "f.compileVerseToIR", "label": "compileVerseToIR", "type": "function", "file": "compiler/compileVerseToIR.js", "role": "kernel-pipeline", "purityScore": 5, "sideEffectLevel": "pure",
  "complexityScore": 9, "confidence": "high", "tags": ["entry","ir","frozen-output"] },                                                                                                              
      { "id": "f.buildSyllableWindows", "label": "buildSyllableWindows", "type": "function", "file": "compiler/compileVerseToIR.js", "role": "windowed-enumerator", "purityScore": 5,
  "sideEffectLevel": "pure", "complexityScore": 8, "confidence": "high", "tags": ["O(N*W)","write-amplification"] },                                                                                 
      { "id": "f.resolveVerseIrColor", "label": "resolveVerseIrColor", "type": "function", "file": "color/pcaChroma.js", "role": "color-projector", "purityScore": 5, "sideEffectLevel": "pure",
  "complexityScore": 6, "confidence": "high", "tags": ["pca","hsl","phase-modulated"] },                                                                                                             
      { "id": "f.measureTextWidth", "label": "measureTextWidth", "type": "function", "file": "compiler/adaptiveWhitespaceGrid.ts", "role": "boundary-measurement", "purityScore": 2,
  "sideEffectLevel": "mixed", "complexityScore": 5, "confidence": "high", "tags": ["dom-read","cache","fallback"] },                                                                                 
      { "id": "f.buildTruesightOverlayLines", "label": "buildTruesightOverlayLines", "type": "function", "file": "compiler/adaptiveWhitespaceGrid.ts", "role": "wrap-simulator", "purityScore": 3,
  "sideEffectLevel": "mixed", "complexityScore": 7, "confidence": "high", "tags": ["wrap","line-wrap","x-offsets"] },                                                                                
      { "id": "s.ToolbarChannel", "label": "ToolbarChannel", "type": "state-store", "file": "compiler/toolbarBytecode.ts", "role": "ui-pubsub", "purityScore": 0, "sideEffectLevel":
  "side-effect-heavy", "complexityScore": 4, "confidence": "high", "tags": ["singleton","mutate","history"] },                                                                                       
      { "id": "s.ViewportChannel", "label": "ViewportChannel", "type": "state-store", "file": "compiler/viewportBytecode.ts", "role": "viewport-pubsub", "purityScore": 0, "sideEffectLevel":
  "side-effect-heavy", "complexityScore": 4, "confidence": "high", "tags": ["singleton","resize-observer","window"] },                                                                               
      { "id": "d.PCA_BASIS", "label": "PCA_BASIS", "type": "data-object", "file": "color/pcaChroma.js", "role": "precomputed-basis", "purityScore": 5, "sideEffectLevel": "pure", "complexityScore":
  3, "confidence": "high", "tags": ["module-load","frozen","2d-projection"] },                                                                                                                       
      { "id": "d.widthCache", "label": "widthCache", "type": "state-store", "file": "compiler/adaptiveWhitespaceGrid.ts", "role": "measurement-cache", "purityScore": 1, "sideEffectLevel": "mixed",
  "complexityScore": 2, "confidence": "high", "tags": ["map","singleton","clear-all-at-1000"] },                                                                                                     
      { "id": "f.synthesizeVerse", "label": "synthesizeVerse", "type": "function", "file": "compiler/VerseSynthesis.js", "role": "top-level-synth", "purityScore": 3, "sideEffectLevel": "mixed",
  "complexityScore": 7, "confidence": "medium", "tags": ["clock-dep","cross-package"] },                                                                                                             
      { "id": "c.TruesightControls", "label": "TruesightControls", "type": "component", "file": "src/pages/Read/TruesightControls.jsx", "role": "ui-toggle", "purityScore": 3, "sideEffectLevel":
  "pure", "complexityScore": 3, "confidence": "high", "tags": ["react","aria-pressed","pure-render"] },                                                                                              
      { "id": "x.PhonemeEngine", "label": "PhonemeEngine", "type": "external-dependency", "file": "src/lib/phonology/phoneme.engine.js", "role": "phonemic-oracle", "purityScore": "?",
  "sideEffectLevel": "?", "complexityScore": "?", "confidence": "low", "tags": ["unread","pluggable-via-options"] },                                                                                 
      { "id": "x.chromaResolver", "label": "resolveSonicChroma", "type": "external-dependency", "file": "codex/core/phonology/chroma.resolver.js", "role": "bytecode-color", "purityScore": 5,
  "sideEffectLevel": "pure", "complexityScore": 4, "confidence": "high", "tags": ["bytecode","fixed-width","19char"] }                                                                               
    ],                                                      
                                                                                                                                                                                                     
    "edges": [                                              
      { "from": "c.TruesightControls", "to": "s.ToolbarChannel", "relationship": "logical-mirror", "evidence": "ANALYSIS_MODES enum overlap (DIVERGENT)", "weight": 0.9, "riskLevel": "high",
  "animationHint": "error-spike" },                                                                                                                                                                  
      { "from": "f.compileVerseToIR", "to": "x.PhonemeEngine", "relationship": "calls", "evidence": "compileVerseToIR.js L782", "weight": 1.0, "riskLevel": "low", "animationHint": "flow-trace" },
      { "from": "f.compileVerseToIR", "to": "f.buildSyllableWindows", "relationship": "calls", "evidence": "compileVerseToIR.js L815", "weight": 0.9, "riskLevel": "low", "animationHint":           
  "branching-split" },                                                                                                                                                                               
      { "from": "f.resolveVerseIrColor", "to": "d.PCA_BASIS", "relationship": "reads", "evidence": "pcaChroma.js L406", "weight": 1.0, "riskLevel": "low", "animationHint": "purity-glow" },         
      { "from": "f.resolveVerseIrColor", "to": "x.chromaResolver", "relationship": "imports", "evidence": "pcaChroma.js L6", "weight": 0.6, "riskLevel": "low", "animationHint": "dependency-thread" 
  },                                                                                                                                                                                                 
      { "from": "f.measureTextWidth", "to": "d.widthCache", "relationship": "reads-and-writes", "evidence": "adaptiveWhitespaceGrid.ts L71-111", "weight": 1.0, "riskLevel": "medium",               
  "animationHint": "cache-ripple" },                                                                                                                                                                 
      { "from": "f.buildTruesightOverlayLines", "to": "f.measureTextWidth", "relationship": "calls (per-token)", "evidence": "adaptiveWhitespaceGrid.ts L162", "weight": 1.0, "riskLevel": "medium",
  "animationHint": "scanline" },                                                                                                                                                                     
      { "from": "s.ViewportChannel", "to": "s.ToolbarChannel", "relationship": "no-coupling (independent)", "evidence": "no shared imports", "weight": 0.0, "riskLevel": "informational",
  "animationHint": "coordinate-lock" },                                                                                                                                                              
      { "from": "f.synthesizeVerse", "to": "f.compileVerseToIR", "relationship": "calls", "evidence": "VerseSynthesis.js L37", "weight": 1.0, "riskLevel": "low", "animationHint": "flow-trace" }
    ],                                                                                                                                                                                               
                                                            
    "matrixCoordinates": [                                                                                                                                                                           
      { "nodeId": "c.TruesightControls",         "x": 0,  "y": 0,  "z": 0, "layer": 0, "cluster": "ui",      "animationRole": "user-input" },
      { "nodeId": "s.ToolbarChannel",            "x": 1,  "y": 0,  "z": 0, "layer": 3, "cluster": "ui-state","animationRole": "pulse-source" },                                                      
      { "nodeId": "s.ViewportChannel",           "x": 2,  "y": 0,  "z": 0, "layer": 3, "cluster": "env-state","animationRole": "pulse-source" },                                                     
      { "nodeId": "f.measureTextWidth",          "x": 3,  "y": 1,  "z": 1, "layer": 4, "cluster": "boundary","animationRole": "cache-pulse" },                                                       
      { "nodeId": "d.widthCache",                "x": 3,  "y": 1,  "z": 0, "layer": 4, "cluster": "boundary","animationRole": "cache-block" },                                                       
      { "nodeId": "f.buildTruesightOverlayLines","x": 4,  "y": 1,  "z": 1, "layer": 1, "cluster": "wrap",    "animationRole": "scanner" },                                                           
      { "nodeId": "f.synthesizeVerse",           "x": 5,  "y": 2,  "z": 1, "layer": 1, "cluster": "synthesis","animationRole": "orchestrator" },                                                     
      { "nodeId": "f.compileVerseToIR",          "x": 6,  "y": 3,  "z": 1, "layer": 1, "cluster": "ir-kernel","animationRole": "kernel" },                                                           
      { "nodeId": "f.buildSyllableWindows",      "x": 7,  "y": 4,  "z": 1, "layer": 2, "cluster": "ir-kernel","animationRole": "enumerator" },                                                       
      { "nodeId": "f.resolveVerseIrColor",       "x": 8,  "y": 5,  "z": 1, "layer": 5, "cluster": "color",   "animationRole": "transformer" },                                                       
      { "nodeId": "d.PCA_BASIS",                 "x": 8,  "y": 5,  "z": 0, "layer": 5, "cluster": "color",   "animationRole": "static-map" },                                                        
      { "nodeId": "x.PhonemeEngine",             "x": 9,  "y": 3,  "z": 2, "layer": 0, "cluster": "external","animationRole": "oracle" },                                                            
      { "nodeId": "x.chromaResolver",            "x": 9,  "y": 5,  "z": 2, "layer": 0, "cluster": "external","animationRole": "oracle" }                                                             
    ],                                                                                                                                                                                               
                                                                                                                                                                                                     
    "animationHints": [                                                                                                                                                                              
      { "targetId": "f.compileVerseToIR",          "animationType": "purity-glow",       "intensity": 0.95, "speed": "calm",  "colorLogic": "blue-white",      "trigger": "on-input-change",
  "meaning": "kernel pulse on text update" },                                                                                                                                                        
      { "targetId": "f.buildSyllableWindows",      "animationType": "matrix-rain",       "intensity": 0.7,  "speed": "fast",  "colorLogic": "indigo",          "trigger": "on-mode-change",
  "meaning": "window enumeration cascade" },                                                                                                                                                         
      { "targetId": "d.widthCache",                "animationType": "cache-ripple",      "intensity": 0.6,  "speed": "fast",  "colorLogic": "teal",            "trigger": "on-cache-write",
  "meaning": "memoization fill" },                                                                                                                                                                   
      { "targetId": "d.widthCache",                "animationType": "storage-block-shift","intensity": 1.0, "speed": "slow",  "colorLogic": "crimson",         "trigger": "on-cache-clear
  (size>1000)","meaning": "block-erase event" },                                                                                                                                                     
      { "targetId": "s.ToolbarChannel",            "animationType": "bytecode-tick",     "intensity": 0.5,  "speed": "fast",  "colorLogic": "silver",          "trigger": "on-setTool",
  "meaning": "ascii-bytecode emit" },                                                                                                                                                                
      { "targetId": "s.ViewportChannel",           "animationType": "async-delay-wave",  "intensity": 0.4,  "speed": "calm",  "colorLogic": "violet",          "trigger": "on-resize",
  "meaning": "viewport state propagation" },                                                                                                                                                         
      { "targetId": "f.measureTextWidth",          "animationType": "scanline",          "intensity": 0.5,  "speed": "fast",  "colorLogic": "orange",          "trigger": "on-cache-miss",
  "meaning": "DOM measurement boundary" },                                                                                                                                                           
      { "targetId": "f.resolveVerseIrColor",       "animationType": "purity-glow",       "intensity": 0.9,  "speed": "calm",  "colorLogic": "indigo",          "trigger": "on-token-render",
  "meaning": "color projection" },                                                                                                                                                                   
      { "targetId": "x.PhonemeEngine",             "animationType": "dependency-thread", "intensity": 0.7,  "speed": "calm",  "colorLogic": "silver",          "trigger": "on-token-build",
  "meaning": "external phoneme oracle" },                                                                                                                                                            
      { "targetId": "EDGE:c.TruesightControls→s.ToolbarChannel","animationType": "impurity-flicker","intensity": 0.85,"speed": "fast","colorLogic": "red pulse","trigger": "always",
  "meaning": "ANALYSIS_MODES divergence (HIGH risk)" },                                                                                                                                              
      { "targetId": "f.synthesizeVerse",           "animationType": "circular-loop-orbit","intensity": 0.6,"speed": "calm",  "colorLogic": "gold",            "trigger": "on-input-change",
  "meaning": "multi-engine fan-out" }                                                                                                                                                                
    ],                                                      
                                                                                                                                                                                                     
    "colorSemantics": {                                                                                                                                                                              
      "purity-5": "blue-white glow",
      "purity-4": "pale cyan",                                                                                                                                                                       
      "purity-3": "gold",                                                                                                                                                                            
      "purity-2": "orange",
      "purity-1": "deeper orange",                                                                                                                                                                   
      "purity-0": "crimson",                                
      "async": "violet",                                                                                                                                                                             
      "storage": "emerald",                                                                                                                                                                          
      "cache": "teal",
      "external-dep": "silver",                                                                                                                                                                      
      "ssd-block": "green-grid",                                                                                                                                                                     
      "user-input": "pink",                                                                                                                                                                          
      "math-transform": "indigo",                                                                                                                                                                    
      "inconsistency-edge": "red pulse",                                                                                                                                                             
      "dead-code": "gray fade"                                                                                                                                                                       
    }                                                                                                                                                                                                
  }                                                                                                                                                                                                  
                                                                                                                                                                                                     
  ---                                                       
  9. Refactor Recommendations
                                                                                                                                                                                                     
  A. Unify ANALYSIS_MODES (HIGH)
                                                                                                                                                                                                     
  Summary: Single source of truth for analysis modes        
  Why: Three independent enums diverge. Users select modes that have no compiler config; bytecode encoder drops modes silently.                                                                      
  Risk Reduced: Mode dispatch failures, silent fallback to BALANCED, debug confusion.                                                                                                                
  Change Classification: structural                                                                                                                                                                  
  Affected Dependencies: TruesightControls.jsx, toolbarBytecode.ts, analysisModes.js                                                                                                                 
  Code Area: New canonical export in analysisModes.js; UI and toolbar import from there.                                                                                                             
  Suggested Patch (sketch):                                                                                                                                                                          
    // analysisModes.js — extend with UI-facing aliases                                                                                                                                              
    export const ANALYSIS_MODES = Object.freeze({                                                                                                                                                    
      NONE: 'none', RHYME: 'rhyme', ANALYZE: 'analyze',                                                                                                                                              
      ASTROLOGY: 'astrology',                                                                                                                                                                        
      PIXELBRAIN: 'pixelbrain_transverse', VOID_ECHO: 'void_echo',                                                                                                                                   
      LIVE_FAST: 'live_fast', BALANCED: 'balanced', DEEP: 'deep_truesight',                                                                                                                          
    });                                                                                                                                                                                              
    // TruesightControls.jsx, toolbarBytecode.ts: replace local enums with the import.                                                                                                               
  Regression Risk: LOW — TruesightControls already exports a const that consumers may import. Sweep that.                                                                                            
  Retest Steps: Click every mode; assert downstream verseIR.metadata.mode matches; round-trip toolbar bytecode for each.                                                                             
                                                                                                                                                                                                     
  B. Replace direct mutation in createToolbarChannel.setTool (MEDIUM)                                                                                                                                
                                                                                                                                                                                                     
  Summary: Use immutable state updates instead of direct property mutation                                                                                                                           
  Why: Current code mutates `state.X = value` then rebuilds in notify. Subscribers calling getState() between mutation and notify see torn state.                                                    
  Risk Reduced: Reactive race, subtle logic bugs in derived state.                                                                                                                                   
  Change Classification: behavioral                                                                                                                                                                  
  Code Area: toolbarBytecode.ts L139-163                                                                                                                                                             
  OLD:                                                                                                                                                                                               
    case TOOLBAR_TOOL.TRUESIGHT:                            
      state.truesight = value;                                                                                                                                                                       
      history.push({...});                                  
      break;                                                                                                                                                                                         
    ...                                                     
    notify();
  NEW:                                                                                                                                                                                               
    case TOOLBAR_TOOL.TRUESIGHT:
      state = { ...state, truesight: value, timestamp: Date.now() };                                                                                                                                 
      history.push({tool, action: value ? 'ENABLED' : 'DISABLED', timestamp: state.timestamp });                                                                                                     
      break;                                                                                                                                                                                         
    ...                                                                                                                                                                                              
    subscribers.forEach(cb => cb(state));   // notify reduced to fan-out                                                                                                                             
  Regression Risk: LOW. Subscribers receive the same shape; just stable reference per update.                                                                                                        
  Retest Steps: Unit-test that getState() inside a setTool listener observes the post-update state.                                                                                                  
                                                                                                                                                                                                     
  C. Drop the legacy truesightGrid.ts import in ScrollEditor (MEDIUM)                                                                                                                                
                                                                                                                                                                                                     
  Summary: Remove the `computeGridTopology` import (and the file if unused project-wide)                                                                                                             
  Why: ScrollEditor imports `computeGridTopology` but never calls it (verified in audit context). `calculateVisualColumn` is a no-op.                                                                
  Risk Reduced: Reader confusion about which grid is canonical, dead-code drift.                                                                                                                     
  Change Classification: cosmetic / structural                                                                                                                                                       
  Code Area: src/pages/Read/ScrollEditor.jsx L6 (import) and src/lib/truesight/compiler/truesightGrid.ts                                                                                             
  OLD: import { computeGridTopology } from "../../lib/truesight/compiler/truesightGrid";                                                                                                             
  NEW: (delete the import line)                                                                                                                                                                      
  After: grep `truesightGrid` repo-wide. If no consumers remain, mark file for deletion (Codex-owned — do not delete from UI side).                                                                  
  Regression Risk: NONE — unused import.                                                                                                                                                             
  Retest Steps: lint, unit, visual baselines.                                                                                                                                                        
                                                                                                                                                                                                     
  D. Make widthCache LRU instead of clear-all (LOW)                                                                                                                                                  
                                                                                                                                                                                                     
  Summary: Replace size-1000 wipe with LRU eviction                                                                                                                                                  
  Why: Sudden cache clears cause measurement spikes during long editing sessions.                                                                                                                    
  Risk Reduced: Frame-time tail latency.                                                                                                                                                             
  Change Classification: behavioral                                                                                                                                                                  
  Code Area: adaptiveWhitespaceGrid.ts L88                                                                                                                                                           
  OLD: if (widthCache.size > 1000) widthCache.clear();                                                                                                                                               
  NEW (LRU via Map insertion order):                        
    if (widthCache.size > 1000) {                                                                                                                                                                    
      const oldest = widthCache.keys().next().value;        
      widthCache.delete(oldest);                                                                                                                                                                     
    }                                                       
    widthCache.delete(cacheKey);  // before .set, to push to back                                                                                                                                    
    widthCache.set(cacheKey, width);                                                                                                                                                                 
  Regression Risk: LOW. Minor memory invariant change.
  Retest Steps: Bench 5,000-token doc edit; compare frame-time histogram.                                                                                                                            
                                                                                                                                                                                                     
  E. Lazy-init PCA_BASIS (LOW)                                                                                                                                                                       
                                                                                                                                                                                                     
  Summary: Defer module-load PCA computation                                                                                                                                                         
  Why: Bundle parse pays the cost even if pcaChroma is never used.                                                                                                                                   
  Risk Reduced: Cold-start latency.                                                                                                                                                                  
  Change Classification: cosmetic                                                                                                                                                                    
  Code Area: pcaChroma.js L249                                                                                                                                                                       
  OLD: const PCA_BASIS = buildPcaBasis();                                                                                                                                                            
  NEW: let _pcaBasis = null; function getPcaBasis() { return _pcaBasis ||= buildPcaBasis(); }
       // update internal callers to use getPcaBasis()                                                                                                                                               
  Regression Risk: LOW. Pure refactor.                      
  Retest Steps: Module-init benchmark; existing PCA color tests.                                                                                                                                     
                                                                                                                                                                                                     
  ---                                                                                                                                                                                                
  10. QA Checklist                                                                                                                                                                                   
                                                            
  - Static — npm run lint clean (already passing)
  - Unit — compileVerseToIR snapshot for canonical 3-line input across all modes                                                                                                                     
  - Unit — serializeVerseIR(deserializeVerseIR(s)) === s (round-trip identity)                                                                                                                       
  - Unit — resolveVerseIrColor('AA') returns stable hex for fixed schoolId/phase                                                                                                                     
  - Unit — buildRhymeColorRegistry([]) returns empty Map; idempotent on repeated tokens     
