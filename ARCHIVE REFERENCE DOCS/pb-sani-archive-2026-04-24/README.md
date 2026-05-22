## PB-SANI Archive Batch — 2026-04-24

This folder contains files moved out of the active codebase after a manual PB-SANI review.

Archive criteria:
- Manifest status was `ARCHIVE`
- Every exported symbol in the file was archive-only
- No inbound imports, calls, value references, runtime registrations, config references, or test references were detected by the stricter symbol graph
- The file was not currently modified or untracked in the working tree

Archived files in this batch:
- `codex/core/pixelbrain/image-texturing.js`
- `codex/server/services/narrativeAMP.service.js`
- `codex/services/token-graph/phonetic.repo.js`
- `src/hooks/useScoring.js`
- `src/pages/Read/KeystrokeSparksCanvas.jsx`
- `src/pages/Read/Minimap.jsx`
- `src/pages/Read/scenes/KeystrokeSparksScene.js`
- `src/types/core/scroll.ts`
- `src/types/runtime/runtime.ts`
- `src/ui/animation/adapters/motionToCssVars.ts`
- `src/ui/animation/adapters/motionToPhaserTween.ts`

Files restored after verification uncovered active path-based imports:
- `codex/core/microprocessors/nlu/entity-extractor.js`
- `codex/core/microprocessors/nlu/intent-classifier.js`
- `codex/core/microprocessors/nlu/semantic-mapper.js`
- `codex/core/microprocessors/nlu/verse-generator.js`
- `codex/core/microprocessors/pixel/ChromaQuantizer.js`
- `codex/core/microprocessors/pixel/LatticeTracer.js`
- `codex/core/microprocessors/pixel/Transmuter.js`
- `src/lib/css/schoolStyles.js`
- `src/lib/microprocessor.worker-client.js`
- `src/pages/Read/scenes/IDEAmbientScene.js`

Files intentionally not moved:
- `src/pages/Combat/BattleScrollInput.jsx`
- `src/pages/Combat/PlayerDisplay.jsx`

Those two files were left in place because they are untracked draft files in the current branch.
