# The Scholomance Bible — v1.0.0

> Generated: 2026-06-04
> Generator: BIBLE-v1 (Scholomance Bible Synthesis Skill)
> Bytecode Health Anchor: `SCHOL-BIBLE-v1-9ad73d8a`
> Companion: `docs/scholomance-encyclopedia/` (history)

---

## Volume I — Canonical Architecture

### I.1 System Topology

```
Browser (React SPA) ──→ CODEx Engine (4-layer)
       │                        │
       │                   ┌────┴────┐
       ▼                   ▼         ▼
  Fastify Server ──→ SQLite/Redis ──→ External APIs
       │
       ▼
  MCP Bridge ──→ Collab Plane ──→ AI Agents
```

### I.2 Module Inventory

| Module | Path | Layer | Error Codes | Health Codes |
|--------|------|-------|-------------|--------------|
| .antigravitycli | .antigravitycli | Unknown | 0 codes | 0 codes |
| commands | .claude/commands | Unknown | 0 codes | 0 codes |
| .claude | .claude | Unknown | 0 codes | 0 codes |
| grimdesign | .claude/skills/grimdesign | Unknown | 0 codes | 0 codes |
| agents | .claude/skills/grimdesign/agents | Unknown | 0 codes | 0 codes |
| scripts | .claude/skills/grimdesign/scripts | Unknown | 0 codes | 0 codes |
| .cursor | .cursor | Unknown | 0 codes | 0 codes |
| .dockerignore | .dockerignore | Unknown | 0 codes | 0 codes |
| .env | .env | Unknown | 0 codes | 0 codes |
| .env.example | .env.example | Unknown | 0 codes | 0 codes |
| .eslintrc.json | .eslintrc.json | Unknown | 0 codes | 0 codes |
| .mcp.json | .mcp.json | Unknown | 0 codes | 0 codes |
| .qwen | .qwen | Unknown | 0 codes | 0 codes |
| .vscode | .vscode | Unknown | 0 codes | 0 codes |
| AGENTS.md | AGENTS.md | Unknown | 0 codes | 0 codes |
| ARCH_CONTRACT_OVERLAY_INTEGRITY.md | ARCH_CONTRACT_OVERLAY_INTEGRITY.md | Unknown | 0 codes | 0 codes |
| CLAUDE.md | CLAUDE.md | Unknown | 0 codes | 0 codes |
| CODEX.md | CODEX.md | Unknown | 0 codes | 0 codes |
| CURSOR.md | CURSOR.md | Unknown | 0 codes | 0 codes |
| Dockerfile | Dockerfile | Unknown | 0 codes | 0 codes |
| ENGINEERING_RULEBOOK.md | ENGINEERING_RULEBOOK.md | Unknown | 0 codes | 0 codes |
| GEMINI.md | GEMINI.md | Unknown | 0 codes | 0 codes |
| Instruction Manuals | Instruction Manuals | Unknown | 0 codes | 0 codes |
| README.md | README.md | Unknown | 0 codes | 0 codes |
| SCHEMA_CONTRACT.md | SCHEMA_CONTRACT.md | Unknown | 0 codes | 0 codes |
| SHARED_PREAMBLE.md | SHARED_PREAMBLE.md | Unknown | 0 codes | 0 codes |
| UNITY.md | UNITY.md | Unknown | 0 codes | 0 codes |
| VAELRIX_LAW.md | VAELRIX_LAW.md | Unknown | 0 codes | 0 codes |
| abyss.sqlite-shm | abyss.sqlite-shm | Unknown | 0 codes | 0 codes |
| abyss.sqlite-wal | abyss.sqlite-wal | Unknown | 0 codes | 0 codes |
| scholomance_godot_bridge | addons/scholomance_godot_bridge | Unknown | 0 codes | 0 codes |
| editor | addons/scholomance_godot_bridge/editor | Unknown | 0 codes | 0 codes |
| importers | addons/scholomance_godot_bridge/importers | Unknown | 0 codes | 0 codes |
| runtime | addons/scholomance_godot_bridge/runtime | Unknown | 0 codes | 0 codes |
| codex | codex | Unknown | 0 codes | 0 codes |
| core | codex/core | Core | 0 codes | 0 codes |
| animation | codex/core/animation | Core | 0 codes | 0 codes |
| amp | codex/core/animation/amp | Core | 1 codes | 0 codes |
| arbiter | codex/core/animation/arbiter | Core | 0 codes | 0 codes |
| bytecode | codex/core/animation/bytecode | Core | 0 codes | 0 codes |
| contracts | codex/core/animation/contracts | Core | 0 codes | 0 codes |
| diagnostics | codex/core/animation/diagnostics | Core | 0 codes | 0 codes |
| presets | codex/core/animation/presets | Core | 0 codes | 0 codes |
| constraints | codex/core/animation/processors/constraints | Core | 0 codes | 0 codes |
| processors | codex/core/animation/processors | Core | 0 codes | 0 codes |
| finalize | codex/core/animation/processors/finalize | Core | 0 codes | 0 codes |
| input | codex/core/animation/processors/input | Core | 0 codes | 0 codes |
| reactive | codex/core/animation/processors/reactive | Core | 0 codes | 0 codes |
| symmetry | codex/core/animation/processors/symmetry | Core | 0 codes | 0 codes |
| time | codex/core/animation/processors/time | Core | 0 codes | 0 codes |
| transform | codex/core/animation/processors/transform | Core | 0 codes | 0 codes |
| vector | codex/core/animation/processors/vector | Core | 1 codes | 0 codes |
| color | codex/core/archive/truesight/color | Core | 0 codes | 0 codes |
| commentary | codex/core/commentary | Core | 0 codes | 0 codes |
| data | codex/core/constants/data | Core | 0 codes | 0 codes |
| constants | codex/core/constants | Core | 0 codes | 0 codes |
| diagnostic | codex/core/diagnostic | Core | 0 codes | 10 codes |
| cells | codex/core/diagnostic/cells | Core | 0 codes | 4 codes |
| grimdesign | codex/core/grimdesign | Core | 0 codes | 0 codes |
| heuristics | codex/core/heuristics | Core | 0 codes | 0 codes |
| immunity | codex/core/immunity | Core | 2 codes | 0 codes |
| arbiter | codex/core/microprocessors/arbiter | Core | 0 codes | 0 codes |
| microprocessors | codex/core/microprocessors | Core | 0 codes | 0 codes |
| nlu | codex/core/microprocessors/nlu | Core | 0 codes | 0 codes |
| pixel | codex/core/microprocessors/pixel | Core | 0 codes | 0 codes |
| planner | codex/core/modulation/planner | Core | 0 codes | 0 codes |
| processors | codex/core/modulation/processors | Core | 0 codes | 0 codes |
| phonology | codex/core/phonology | Core | 0 codes | 0 codes |
| pixelbrain | codex/core/pixelbrain | Core | 0 codes | 0 codes |
| extensions | codex/core/pixelbrain/extensions | Core | 0 codes | 0 codes |
| quantization | codex/core/quantization | Core | 0 codes | 0 codes |
| rhyme-astrology | codex/core/rhyme-astrology | Core | 0 codes | 0 codes |
| ritual-prediction | codex/core/ritual-prediction | Core | 0 codes | 0 codes |
| amp | codex/core/semantic/amp | Core | 0 codes | 0 codes |
| semantic | codex/core/semantic | Core | 0 codes | 0 codes |
| ambient | codex/core/shared/ambient | Core | 0 codes | 0 codes |
| shared | codex/core/shared | Core | 0 codes | 0 codes |
| atmosphere | codex/core/shared/atmosphere | Core | 0 codes | 0 codes |
| math | codex/core/shared/math | Core | 0 codes | 0 codes |
| models | codex/core/shared/models | Core | 0 codes | 0 codes |
| syntax | codex/core/shared/syntax | Core | 0 codes | 0 codes |
| truesight | codex/core/shared/truesight | Core | 0 codes | 0 codes |
| color | codex/core/shared/truesight/color | Core | 0 codes | 0 codes |
| compiler | codex/core/shared/truesight/compiler | Core | 0 codes | 0 codes |
| workers | codex/core/shared/workers | Core | 0 codes | 0 codes |
| speaking | codex/core/speaking | Core | 0 codes | 0 codes |
| token-graph | codex/core/token-graph | Core | 0 codes | 0 codes |
| verseir-amplifier | codex/core/verseir-amplifier | Core | 0 codes | 0 codes |
| plugins | codex/core/verseir-amplifier/plugins | Core | 0 codes | 0 codes |
| runtime | codex/runtime | Runtime | 0 codes | 0 codes |
| rhyme-astrology | codex/runtime/rhyme-astrology | Runtime | 0 codes | 0 codes |
| adapters | codex/server/adapters | Server | 0 codes | 0 codes |
| server | codex/server | Server | 0 codes | 0 codes |
| collab | codex/server/collab | Server | 0 codes | 0 codes |
| db | codex/server/db | Server | 0 codes | 0 codes |
| oauth | codex/server/oauth | Server | 0 codes | 0 codes |
| routes | codex/server/routes | Server | 0 codes | 0 codes |
| services | codex/server/services | Server | 0 codes | 0 codes |
| rhyme-astrology | codex/server/services/rhyme-astrology | Server | 0 codes | 0 codes |
| utils | codex/server/utils | Server | 0 codes | 0 codes |
| adapters | codex/services/adapters | Services | 0 codes | 0 codes |
| rhyme-astrology | codex/services/rhyme-astrology | Services | 0 codes | 0 codes |
| token-graph | codex/services/token-graph | Services | 0 codes | 0 codes |
| rhyme-astrology | data/rhyme-astrology | Unknown | 0 codes | 0 codes |
| dead-code.md | dead-code.md | Unknown | 0 codes | 0 codes |
| debug-dom.html | debug-dom.html | Unknown | 0 codes | 0 codes |
| debug_truesight.test.js | debug_truesight.test.js | Unknown | 0 codes | 0 codes |
| dict_data | dict_data | Unknown | 0 codes | 0 codes |
| rhyme-astrology | dict_data/rhyme-astrology | Unknown | 0 codes | 0 codes |
| dist | dist | Unknown | 0 codes | 0 codes |
| assets | dist/assets | Unknown | 2 codes | 1 codes |
| data | dist/data | Unknown | 0 codes | 0 codes |
| docs | docs | Doc | 0 codes | 0 codes |
| ByteCode Error System | docs/ByteCode Error System | Doc | 32 codes | 0 codes |
| ai | docs/ai | Doc | 0 codes | 0 codes |
| architecture | docs/architecture | Doc | 0 codes | 0 codes |
| audit | docs/audit | Doc | 0 codes | 0 codes |
| bytecode-blueprints | docs/bytecode-blueprints | Doc | 0 codes | 0 codes |
| handoffs | docs/handoffs | Doc | 0 codes | 0 codes |
| operations | docs/operations | Doc | 0 codes | 0 codes |
| pixelbrain | docs/pixelbrain | Doc | 0 codes | 0 codes |
| project | docs/project | Doc | 0 codes | 0 codes |
| proofs | docs/proofs | Doc | 0 codes | 0 codes |
| qa | docs/qa | Doc | 0 codes | 0 codes |
| references | docs/references | Doc | 0 codes | 0 codes |
| reports | docs/reports | Doc | 0 codes | 0 codes |
| rhyme-astrology | docs/rhyme-astrology | Doc | 0 codes | 0 codes |
| scholomance-bible | docs/scholomance-bible | Doc | 78 codes | 17 codes |
| .claude | docs/scholomance-encyclopedia/.claude | Doc | 0 codes | 0 codes |
| ARCH Scholomance Docs | docs/scholomance-encyclopedia/ARCH Scholomance Docs | Doc | 7 codes | 0 codes |
| scholomance-encyclopedia | docs/scholomance-encyclopedia | Doc | 1 codes | 0 codes |
| PDR-archive | docs/scholomance-encyclopedia/PDR-archive | Doc | 3 codes | 10 codes |
| Scholomance Bug Reports | docs/scholomance-encyclopedia/Scholomance Bug Reports | Doc | 0 codes | 0 codes |
| Scholomance Changes | docs/scholomance-encyclopedia/Scholomance Changes | Doc | 0 codes | 0 codes |
| Scholomance Hand Offs | docs/scholomance-encyclopedia/Scholomance Hand Offs | Doc | 1 codes | 0 codes |
| Scholomance LAW | docs/scholomance-encyclopedia/Scholomance LAW | Doc | 0 codes | 0 codes |
| comb-initialize | docs/scholomance-encyclopedia/Scholomance LAW/comb-initialize | Doc | 0 codes | 0 codes |
| references | docs/scholomance-encyclopedia/Scholomance LAW/comb-initialize/references | Doc | 0 codes | 0 codes |
| scholomance-feedback | docs/scholomance-encyclopedia/Scholomance LAW/scholomance-feedback | Doc | 0 codes | 0 codes |
| references | docs/scholomance-encyclopedia/Scholomance LAW/scholomance-feedback/references | Doc | 0 codes | 0 codes |
| Scholomance White Papers | docs/scholomance-encyclopedia/Scholomance White Papers | Doc | 2 codes | 7 codes |
| Scholomance-Verdicts | docs/scholomance-encyclopedia/Scholomance-Verdicts | Doc | 24 codes | 1 codes |
| UX Report | docs/scholomance-encyclopedia/UX Report | Doc | 0 codes | 0 codes |
| post-implementation-reports | docs/scholomance-encyclopedia/post-implementation-reports | Doc | 1 codes | 0 codes |
| reports | docs/scholomance-encyclopedia/reports | Doc | 0 codes | 0 codes |
| tools | docs/scholomance-encyclopedia/tools | Doc | 0 codes | 0 codes |
| skills | docs/skills | Doc | 3 codes | 2 codes |
| daily-wrapups | docs/team/daily-wrapups | Doc | 1 codes | 0 codes |
| end-of-day-results | end-of-day-results | Unknown | 0 codes | 0 codes |
| fix-drift.mjs | fix-drift.mjs | Unknown | 0 codes | 0 codes |
| fly.toml | fly.toml | Unknown | 0 codes | 0 codes |
| forensic-search | forensic-search | Unknown | 0 codes | 0 codes |
| references | forensic-search/references | Unknown | 0 codes | 0 codes |
| scholomance_godot_bridge | godot_project/addons/scholomance_godot_bridge | Unknown | 0 codes | 0 codes |
| editor | godot_project/addons/scholomance_godot_bridge/editor | Unknown | 0 codes | 0 codes |
| importers | godot_project/addons/scholomance_godot_bridge/importers | Unknown | 0 codes | 0 codes |
| runtime | godot_project/addons/scholomance_godot_bridge/runtime | Unknown | 0 codes | 0 codes |
| assets | godot_project/assets | Unknown | 0 codes | 0 codes |
| godot_project | godot_project | Unknown | 0 codes | 0 codes |
| scenes | godot_project/scenes | Unknown | 0 codes | 0 codes |
| scripts | godot_project/scripts | Unknown | 0 codes | 0 codes |
| index.html | index.html | Unknown | 0 codes | 0 codes |
| install.ps1 | install.ps1 | Unknown | 0 codes | 0 codes |
| knip.json | knip.json | Unknown | 0 codes | 0 codes |
| linguistic.iq.test.js | linguistic.iq.test.js | Unknown | 0 codes | 0 codes |
| mailer.adapter.js | mailer.adapter.js | Unknown | 0 codes | 0 codes |
| mcp.json | mcp.json | Unknown | 0 codes | 0 codes |
| output | output | Unknown | 0 codes | 0 codes |
| combat-doctrine | output/web-game/combat-doctrine | Unknown | 0 codes | 0 codes |
| combat-doctrine-long | output/web-game/combat-doctrine-long | Unknown | 0 codes | 0 codes |
| package-lock.json | package-lock.json | Unknown | 0 codes | 0 codes |
| package.json | package.json | Unknown | 0 codes | 0 codes |
| phoneme.accuracy.test.js | phoneme.accuracy.test.js | Unknown | 0 codes | 0 codes |
| playwright.config.js | playwright.config.js | Unknown | 0 codes | 0 codes |
| pnpm-lock.yaml | pnpm-lock.yaml | Unknown | 0 codes | 0 codes |
| schemas | presets/schemas | Unknown | 0 codes | 0 codes |
| public | public | Unknown | 0 codes | 0 codes |
| data | public/data | Unknown | 0 codes | 0 codes |
| pw_text_tmp.mjs | pw_text_tmp.mjs | Unknown | 0 codes | 0 codes |
| qa_tests.py | qa_tests.py | Unknown | 0 codes | 0 codes |
| render.yaml | render.yaml | Unknown | 0 codes | 0 codes |
| scholomance_collab.sqlite-shm | scholomance_collab.sqlite-shm | Unknown | 0 codes | 0 codes |
| scholomance_collab.sqlite-wal | scholomance_collab.sqlite-wal | Unknown | 1 codes | 0 codes |
| scholomance_corpus.sqlite-shm | scholomance_corpus.sqlite-shm | Unknown | 0 codes | 0 codes |
| scholomance_corpus.sqlite-wal | scholomance_corpus.sqlite-wal | Unknown | 0 codes | 0 codes |
| scholomance_dict.sqlite-shm | scholomance_dict.sqlite-shm | Unknown | 0 codes | 0 codes |
| scholomance_dict.sqlite-wal | scholomance_dict.sqlite-wal | Unknown | 0 codes | 0 codes |
| scholomance_user.sqlite-shm | scholomance_user.sqlite-shm | Unknown | 0 codes | 0 codes |
| scholomance_user.sqlite-wal | scholomance_user.sqlite-wal | Unknown | 0 codes | 0 codes |
| __pycache__ | scripts/__pycache__ | Script | 0 codes | 0 codes |
| scripts | scripts | Script | 2 codes | 1 codes |
| immunity | scripts/immunity | Script | 0 codes | 0 codes |
| pb-sani | scripts/pb-sani | Script | 0 codes | 0 codes |
| security | scripts/security | Script | 0 codes | 0 codes |
| security | security | Unknown | 0 codes | 0 codes |
| setup-linux.sh | setup-linux.sh | Unknown | 0 codes | 0 codes |
| src | src | UI | 0 codes | 0 codes |
| components | src/components | UI | 0 codes | 0 codes |
| GodotExportButton | src/components/GodotExportButton | UI | 0 codes | 0 codes |
| Navigation | src/components/Navigation | UI | 0 codes | 0 codes |
| Nexus | src/components/Nexus | UI | 0 codes | 0 codes |
| ParaEQ | src/components/ParaEQ | UI | 0 codes | 0 codes |
| TruesightDebugColorPanel | src/components/TruesightDebugColorPanel | UI | 0 codes | 0 codes |
| grimoire | src/components/grimoire | UI | 0 codes | 0 codes |
| shared | src/components/shared | UI | 0 codes | 0 codes |
| data | src/data | UI | 0 codes | 0 codes |
| hooks | src/hooks | UI | 0 codes | 0 codes |
| lib | src/lib | UI | 0 codes | 1 codes |
| ambient | src/lib/ambient | UI | 0 codes | 0 codes |
| animation | src/lib/animation | UI | 0 codes | 0 codes |
| atmosphere | src/lib/atmosphere | UI | 0 codes | 0 codes |
| cache | src/lib/cache | UI | 0 codes | 0 codes |
| career | src/lib/career | UI | 0 codes | 0 codes |
| config | src/lib/config | UI | 0 codes | 0 codes |
| generated | src/lib/css/generated | UI | 0 codes | 0 codes |
| css | src/lib/css | UI | 0 codes | 0 codes |
| docs | src/lib/docs | UI | 0 codes | 0 codes |
| adapters | src/lib/godot/frame-printer/adapters | UI | 0 codes | 0 codes |
| frame-printer | src/lib/godot/frame-printer | UI | 0 codes | 0 codes |
| godot-export | src/lib/godot-export | UI | 0 codes | 0 codes |
| quantization | src/lib/math/quantization | UI | 0 codes | 0 codes |
| rust-kernel | src/lib/math/quantization/rust-kernel | UI | 0 codes | 0 codes |
| pkg | src/lib/math/quantization/rust-kernel/pkg | UI | 0 codes | 0 codes |
| src | src/lib/math/quantization/rust-kernel/src | UI | 0 codes | 0 codes |
| target | src/lib/math/quantization/rust-kernel/target | UI | 0 codes | 0 codes |
| release | src/lib/math/quantization/rust-kernel/target/release | UI | 0 codes | 0 codes |
| bumpalo-150cbcdfc4c5aa40 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/bumpalo-150cbcdfc4c5aa40 | UI | 0 codes | 0 codes |
| proc-macro2-dcec2f0d46033c44 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/proc-macro2-dcec2f0d46033c44 | UI | 0 codes | 0 codes |
| quote-4713bae0eaebc640 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/quote-4713bae0eaebc640 | UI | 0 codes | 0 codes |
| rustversion-788cdd3f281dbb53 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/rustversion-788cdd3f281dbb53 | UI | 0 codes | 0 codes |
| serde_core-9d82d25de81f5fa2 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/serde_core-9d82d25de81f5fa2 | UI | 0 codes | 0 codes |
| unicode-ident-562c861f27a89551 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/unicode-ident-562c861f27a89551 | UI | 0 codes | 0 codes |
| wasm-bindgen-shared-8c251ce313242a91 | src/lib/math/quantization/rust-kernel/target/release/.fingerprint/wasm-bindgen-shared-8c251ce313242a91 | UI | 0 codes | 0 codes |
| proc-macro2-dcec2f0d46033c44 | src/lib/math/quantization/rust-kernel/target/release/build/proc-macro2-dcec2f0d46033c44 | UI | 0 codes | 0 codes |
| quote-4713bae0eaebc640 | src/lib/math/quantization/rust-kernel/target/release/build/quote-4713bae0eaebc640 | UI | 0 codes | 0 codes |
| rustversion-788cdd3f281dbb53 | src/lib/math/quantization/rust-kernel/target/release/build/rustversion-788cdd3f281dbb53 | UI | 0 codes | 0 codes |
| serde_core-9d82d25de81f5fa2 | src/lib/math/quantization/rust-kernel/target/release/build/serde_core-9d82d25de81f5fa2 | UI | 0 codes | 0 codes |
| wasm-bindgen-shared-8c251ce313242a91 | src/lib/math/quantization/rust-kernel/target/release/build/wasm-bindgen-shared-8c251ce313242a91 | UI | 0 codes | 0 codes |
| deps | src/lib/math/quantization/rust-kernel/target/release/deps | UI | 0 codes | 0 codes |
| wasm32-unknown-unknown | src/lib/math/quantization/rust-kernel/target/wasm32-unknown-unknown | UI | 0 codes | 0 codes |
| release | src/lib/math/quantization/rust-kernel/target/wasm32-unknown-unknown/release | UI | 0 codes | 0 codes |
| cfg-if-266c59daaf23efb0 | src/lib/math/quantization/rust-kernel/target/wasm32-unknown-unknown/release/.fingerprint/cfg-if-266c59daaf23efb0 | UI | 0 codes | 0 codes |
| unicode-ident-e6add0fc3f1f9831 | src/lib/math/quantization/rust-kernel/target/wasm32-unknown-unknown/release/.fingerprint/unicode-ident-e6add0fc3f1f9831 | UI | 0 codes | 0 codes |
| deps | src/lib/math/quantization/rust-kernel/target/wasm32-unknown-unknown/release/deps | UI | 0 codes | 0 codes |
| math | src/lib/math | UI | 0 codes | 0 codes |
| models | src/lib/models | UI | 0 codes | 0 codes |
| phonology | src/lib/phonology | UI | 0 codes | 0 codes |
| photonic-quantization | src/lib/photonic-quantization | UI | 0 codes | 0 codes |
| photonic-retina | src/lib/photonic-retina | UI | 0 codes | 0 codes |
| platform | src/lib/platform | UI | 0 codes | 0 codes |
| providers | src/lib/pls/providers | UI | 0 codes | 0 codes |
| pls | src/lib/pls | UI | 0 codes | 0 codes |
| truesight | src/lib/truesight | UI | 0 codes | 0 codes |
| color | src/lib/truesight/color | UI | 0 codes | 0 codes |
| compiler | src/lib/truesight/compiler | UI | 0 codes | 0 codes |
| Auth | src/pages/Auth | UI | 0 codes | 0 codes |
| Career | src/pages/Career | UI | 0 codes | 0 codes |
| Collab | src/pages/Collab | UI | 0 codes | 0 codes |
| Cabinet | src/pages/Collab/components/Cabinet | UI | 0 codes | 0 codes |
| Common | src/pages/Collab/components/Common | UI | 0 codes | 0 codes |
| Terminal | src/pages/Collab/components/Terminal | UI | 0 codes | 0 codes |
| Wings | src/pages/Collab/components/Wings | UI | 0 codes | 0 codes |
| Combat | src/pages/Combat | UI | 0 codes | 0 codes |
| components | src/pages/Combat/components | UI | 0 codes | 0 codes |
| hooks | src/pages/Combat/hooks | UI | 0 codes | 0 codes |
| render | src/pages/Combat/render | UI | 0 codes | 0 codes |
| scenes | src/pages/Combat/scenes | UI | 0 codes | 0 codes |
| state | src/pages/Combat/state | UI | 0 codes | 0 codes |
| DivWand | src/pages/DivWand | UI | 0 codes | 0 codes |
| Landing | src/pages/Landing | UI | 0 codes | 0 codes |
| storm | src/pages/Landing/storm | UI | 0 codes | 0 codes |
| Listen | src/pages/Listen | UI | 0 codes | 0 codes |
| scenes | src/pages/Listen/scenes | UI | 0 codes | 0 codes |
| Nexus | src/pages/Nexus | UI | 0 codes | 0 codes |
| PixelBrain | src/pages/PixelBrain | UI | 0 codes | 0 codes |
| components | src/pages/PixelBrain/components | UI | 0 codes | 0 codes |
| utils | src/pages/PixelBrain/utils | UI | 0 codes | 0 codes |
| Profile | src/pages/Profile | UI | 0 codes | 0 codes |
| Read | src/pages/Read | UI | 0 codes | 0 codes |
| scenes | src/pages/Read/scenes | UI | 0 codes | 0 codes |
| Wand | src/pages/Wand | UI | 1 codes | 0 codes |
| Watch | src/pages/Watch | UI | 0 codes | 0 codes |
| photonic-bridge | src/pages/internal/photonic-bridge | UI | 0 codes | 0 codes |
| types | src/types | UI | 0 codes | 0 codes |
| core | src/types/core | UI | 0 codes | 0 codes |
| lib | src/types/lib | UI | 0 codes | 0 codes |
| runtime | src/types/runtime | UI | 0 codes | 0 codes |
| components | src/ui/animation/components | UI | 0 codes | 0 codes |
| hooks | src/ui/animation/hooks | UI | 0 codes | 0 codes |
| hero | src/ui/features/mysticHolistics/hero | UI | 0 codes | 0 codes |
| test-results | test-results | Unknown | 0 codes | 0 codes |
| test_hmm_analysis.js | test_hmm_analysis.js | Unknown | 0 codes | 0 codes |
| tests | tests | Test | 0 codes | 0 codes |
| truesight | tests/codex/core/shared/truesight | Test | 0 codes | 0 codes |
| color | tests/codex/core/shared/truesight/color | Test | 0 codes | 0 codes |
| compiler | tests/codex/core/shared/truesight/compiler | Test | 0 codes | 0 codes |
| collab | tests/collab | Test | 0 codes | 0 codes |
| GodotExportButton | tests/components/GodotExportButton | Test | 0 codes | 0 codes |
| components | tests/components | Test | 0 codes | 0 codes |
| core | tests/core | Test | 0 codes | 0 codes |
| diagnostic | tests/diagnostic | Test | 0 codes | 1 codes |
| bytecodeDiagnosticSynthesis | tests/fixtures/bytecodeDiagnosticSynthesis | Test | 0 codes | 0 codes |
| godot-export | tests/fixtures/godot-export | Test | 0 codes | 0 codes |
| godot | tests/godot | Test | 0 codes | 0 codes |
| godot-export | tests/godot-export | Test | 0 codes | 0 codes |
| hooks | tests/hooks | Test | 0 codes | 0 codes |
| __snapshots__ | tests/lib/__snapshots__ | Test | 0 codes | 0 codes |
| adapters | tests/lib/adapters | Test | 0 codes | 0 codes |
| lib | tests/lib | Test | 0 codes | 0 codes |
| providers | tests/lib/pls/providers | Test | 0 codes | 0 codes |
| pls | tests/lib/pls | Test | 0 codes | 0 codes |
| truesight | tests/lib/truesight | Test | 0 codes | 0 codes |
| pages | tests/pages | Test | 0 codes | 0 codes |
| pb-sani | tests/pb-sani | Test | 1 codes | 0 codes |
| photonic-quantization | tests/photonic-quantization | Test | 0 codes | 0 codes |
| photonic-retina | tests/photonic-retina | Test | 0 codes | 0 codes |
| qa | tests/qa | Test | 15 codes | 1 codes |
| animation | tests/qa/animation | Test | 1 codes | 0 codes |
| __snapshots__ | tests/qa/backend/__snapshots__ | Test | 0 codes | 0 codes |
| backend | tests/qa/backend | Test | 0 codes | 0 codes |
| e2e | tests/qa/e2e | Test | 0 codes | 0 codes |
| support | tests/qa/e2e/support | Test | 0 codes | 0 codes |
| features | tests/qa/features | Test | 0 codes | 0 codes |
| fixtures | tests/qa/fixtures | Test | 0 codes | 0 codes |
| generation | tests/qa/generation | Test | 0 codes | 0 codes |
| modulation | tests/qa/modulation | Test | 1 codes | 0 codes |
| pixelbrain | tests/qa/pixelbrain | Test | 4 codes | 0 codes |
| stasis | tests/qa/stasis | Test | 0 codes | 0 codes |
| static | tests/qa/static | Test | 0 codes | 0 codes |
| tools | tests/qa/tools | Test | 0 codes | 0 codes |
| runtime | tests/runtime | Test | 0 codes | 0 codes |
| security | tests/security | Test | 0 codes | 0 codes |
| server | tests/server | Test | 0 codes | 0 codes |
| truesight | tests/src/lib/truesight | Test | 0 codes | 0 codes |
| color | tests/src/lib/truesight/color | Test | 0 codes | 0 codes |
| compiler | tests/src/lib/truesight/compiler | Test | 0 codes | 0 codes |
| unit | tests/unit | Test | 0 codes | 0 codes |
| microprocessors | tests/unit/microprocessors | Test | 1 codes | 0 codes |
| visual | tests/visual | Test | 0 codes | 0 codes |
| tmp | tmp | Unknown | 0 codes | 0 codes |
| tsconfig.checkjs.json | tsconfig.checkjs.json | Unknown | 0 codes | 0 codes |
| tsconfig.ide-targets.json | tsconfig.ide-targets.json | Unknown | 0 codes | 0 codes |
| tsconfig.json | tsconfig.json | Unknown | 0 codes | 0 codes |
| verseir_20vowel_matrix.txt | verseir_20vowel_matrix.txt | Unknown | 0 codes | 0 codes |
| verseir_chroma_engine.py | verseir_chroma_engine.py | Unknown | 0 codes | 0 codes |
| verseir_palette_payload.json | verseir_palette_payload.json | Unknown | 0 codes | 0 codes |
| verseir_perfect_chroma.txt | verseir_perfect_chroma.txt | Unknown | 0 codes | 0 codes |
| vite.config.js | vite.config.js | Unknown | 0 codes | 0 codes |
| wrangler.toml | wrangler.toml | Unknown | 0 codes | 0 codes |

---

## Volume II — Bytecode Diagnostic System

### II.1 BytecodeError System (Red Path — `PB-ERR-v1`)

#### Error Code Table

| Code Hex | Category | Severity | Module | Source File |
|----------|----------|----------|--------|-------------|
| 0701 | COLOR | WARN | COLBYT | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0D01 | COMBAT | CRIT | COMBAT | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0D02 | COMBAT | CRIT | COMBAT | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0D03 | COMBAT | CRIT | COMBAT | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0D04 | COMBAT | WARN | COMBAT | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0602 | COORD | CRIT | COORD | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0501 | EXT | CRIT | EXTREG | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0502 | EXT | WARN | EXTREG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0B01 | FORMULA | CRIT | IMGFOR | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0B03 | FORMULA | CRIT | IMGFOR | dist/assets/WandPage-BUrY7iud.js |
| 0401 | HOOK | CRIT | EXTREG | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0403 | HOOK | CRIT | EXTREG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0403 | HOOK | WARN | EXTREG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0301 | LINGUISTIC | CRIT | CONSTELL | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F03 | LINGUISTIC | CRIT | IMMUNE | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F08 | LINGUISTIC | CRIT | IMMUNE | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F03 | LINGUISTIC | CRIT | LING | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F04 | LINGUISTIC | CRIT | LING | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F05 | LINGUISTIC | CRIT | LING | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0C01 | LINGUISTIC | CRIT | LINGUA | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0C02 | LINGUISTIC | CRIT | LINGUA | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0C03 | LINGUISTIC | CRIT | LINGUA | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0C06 | LINGUISTIC | CRIT | LINGUA | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F0A | LINGUISTIC | INFO | DIAG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F05 | LINGUISTIC | WARN | LING | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0C04 | LINGUISTIC | WARN | LINGUA | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0C05 | LINGUISTIC | WARN | LINGUA | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0801 | NOISE | CRIT | NOISE | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0201 | RANGE | CRIT | ANY | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0201 | RANGE | CRIT | COORD | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0303 | RANGE | CRIT | COORD | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0201 | RANGE | CRIT | IMGPIX | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0202 | RANGE | CRIT | IMGPIX | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0201 | RANGE | CRIT | SHARED | docs/ByteCode Error System/04_QA_Integration_Guide.md |
| 0202 | RANGE | CRIT | UISTAS | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0201 | RANGE | WARN | COORD | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0203 | RANGE | WARN | NOISE | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0902 | RENDER | CRIT | IMGPIX | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0902 | RENDER | WARN | IMGPIX | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0303 | STATE | CRIT | COORD | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0301 | STATE | CRIT | GEARGL | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0301 | STATE | CRIT | SHARED | docs/ByteCode Error System/04_QA_Integration_Guide.md |
| 0303 | STATE | CRIT | UISTAS | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0303 | STATE | INFO | COORD | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F09 | STATE | INFO | DIAG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F0B | STATE | INFO | DIAG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0F06 | STATE | WARN | IMMUNE | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0301 | STATE | WARN | SHARED | docs/ByteCode Error System/04_QA_Integration_Guide.md |
| 0204 | STATE | WARN | VECTOR | codex/core/animation/amp/fuseMotionOutput.ts |
| 0001 | TYPE | CRIT | ANY | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0001 | TYPE | CRIT | IMGPIX | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0001 | TYPE | CRIT | SHARED | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0000 | TYPE | WARN | TEST | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0E01 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E02 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E03 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E05 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E06 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E07 | UI_STASIS | CRIT | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E04 | UI_STASIS | WARN | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0E08 | UI_STASIS | WARN | UISTAS | docs/ByteCode Error System/02_Error_Code_Reference.md |
| 0101 | VALUE | CRIT | ANY | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0302 | VALUE | CRIT | CONSTELL | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0105 | VALUE | CRIT | COORD | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0101 | VALUE | CRIT | EXTREG | docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md |
| 0501 | VALUE | CRIT | EXTREG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0101 | VALUE | CRIT | IMGPIX | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0102 | VALUE | CRIT | IMGPIX | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0105 | VALUE | CRIT | IMMUNE | codex/core/immunity/README.md |
| 0F01 | VALUE | CRIT | IMMUNE | codex/core/immunity/inflammatoryResponse.js |
| 0F03 | VALUE | CRIT | LING | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0101 | VALUE | CRIT | QUANT | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0102 | VALUE | CRIT | QUANT | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0105 | VALUE | CRIT | QUANT | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0101 | VALUE | CRIT | SHARED | docs/ByteCode Error System/04_QA_Integration_Guide.md |
| 0104 | VALUE | CRIT | SHARED | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0703 | VALUE | WARN | COLBYT | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| 0501 | VALUE | WARN | EXTREG | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |

### II.2 BytecodeHealth System (Green Path — `PB-OK-v1`)

| Code | Purpose | Source File |
|------|---------|-------------|
| PB-OK-v1-ANTIGEN-REGEN | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-BIBLE-GENERATED- | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-CELL-SCAN-CLEAN | Health Signal | codex/core/diagnostic/diagnostic-constants.js |
| PB-OK-v1-DEPRECATED-STASIS | Health Signal | codex/core/diagnostic/BytecodeHealth.js |
| PB-OK-v1-FIXTURE-SHAPE-OK | Health Signal | codex/core/diagnostic/cells/fixture-shape.cell.js |
| PB-OK-v1-IMMUNE-PASS-COORD | Health Signal | codex/core/diagnostic/BytecodeHealth.js |
| PB-OK-v1-IMMUNE-PASS-COORD- | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-IMMUNE-PASS-COORD-IMMUNITY_SCAN- | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-LAYER-BOUNDARY-OK | Health Signal | codex/core/diagnostic/diagnostic-constants.js |
| PB-OK-v1-LOGIC-INCOMPLETE | Health Signal | codex/core/diagnostic/BytecodeHealth.js |
| PB-OK-v1-LOGIC-INCOMPLETE-IMMUNITY_SCAN- | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-PROCESSOR-BRIDGE-CLEAN | Health Signal | codex/core/diagnostic/cells/processor-bridge.cell.js |
| PB-OK-v1-QUANT-FIDELITY-PASS | Health Signal | codex/core/diagnostic/diagnostic-constants.js |
| PB-OK-v1-TEST-COVERAGE-PASS | Health Signal | codex/core/diagnostic/cells/test-coverage.cell.js |
| PB-OK-v1-TEST-FIXTURE-SHAPE-OK | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-THEORETICAL-PROBE | Health Signal | docs/scholomance-bible/BIBLE_BYTECODE_INDEX.md |
| PB-OK-v1-WIP-STUB | Health Signal | codex/core/diagnostic/BytecodeHealth.js |

---

## Volume VIII — System Health Metrics

### VIII.1 Bytecode Health Snapshot

| Area | Status | Last Verified |
|------|--------|---------------|
| Immunity | ACTIVE | 2026-06-04 |
| Layer Boundary | ACTIVE | 2026-06-04 |
| Bridge Integrity | ACTIVE | 2026-06-04 |

---

## Appendix D: Bytecode Index
Flat, machine-parseable index of every bytecode string prefix in the system.
