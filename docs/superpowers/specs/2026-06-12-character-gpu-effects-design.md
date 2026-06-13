# Character GPU Effects Design

**Date:** 2026-06-12
**Branch:** fix/wand-divwand-audit-hardening

## Summary

Replace the static SVG/wand-texture character sprites in combat with runtime-baked pixel art enhanced by GPU effects. PixelBrain's `forgeCharacter()` renders the base pixel art; a GLSL fragment shader adds school-coloured eye glow, rim light, and foot aura on top. An optional one-time AI enhancement pass (Claude Haiku via vision) tunes the three effect uniforms to best complement each character's specific palette.

## Motivation

The existing `buildScholarTexture` / `buildWraithTexture` functions in `combatAssets.js` produce flat SVG-derived textures with no per-character identity. The PixelBrain character foundry (`forgeCharacter`) already produces correct, deterministic pixel art — it just isn't wired into combat. The GPU effects layer adds the visual depth (glow, rim, aura) that makes characters readable on the isometric arena backdrop.

---

## Architecture

### Pipeline

```
CHARACTER-SPEC-v1
    │
    ▼  forgeCharacter(spec)
dirRgbas[south]  ← raw Uint8Array RGBA, 128×192
    │
    ▼  CharacterShaderRenderer.bake(spec, scene)
    ①  rasterizeCells → Uint8Array RGBA
    ②  scene.textures.addDynamicTexture(key, 128, 192)
    ③  stamp RGBA pixels onto base DynamicTexture
    ④  compileEffectsBytecode(spec) → 5 effects uniforms
    ⑤  merge shaderEnhancements if present
    ⑥  scene.add.shader('char-effects', { u_texture: baseDT, uniforms })
    ⑦  finalDT.snapshot() → bake to SpriteGPULayer texture
    │
    ▼  SpriteGPULayer  (single draw call)
```

### New files (5)

| File | Purpose |
|---|---|
| `codex/core/pixelbrain/character-bytecode-compiler.js` | `compileEffectsBytecode(spec)` — pure fn, CHARACTER-SPEC-v1 → 5 effects uniforms |
| `src/pages/Combat/shaders/character-effects.frag.glsl` | GLSL ES 1.0 — samples base texture, adds eye glow + rim light + foot aura |
| `src/pages/Combat/scenes/CharacterShaderRenderer.js` | `bake(spec, scene)` and `bakeAll(actors, scene)` |
| `src/lib/character-enhancement.js` | `enhanceCharacter(imageDataUrl, spec)` — calls backend, returns parsed JSON |
| `server/routes/character-enhance.js` | Backend proxy: POST /api/character/enhance → Anthropic SDK → Haiku |

### Modified files (2)

| File | Change |
|---|---|
| `src/pages/Combat/assets/combatAssets.js` | Replace `buildScholarTexture` / `buildWraithTexture` with `buildCharacterTextures(actors, scene)` |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | Add `enhancementState` machine + before/after preview panels + "Forge & Enhance" button |

---

## Effects Bytecode Compiler

**File:** `codex/core/pixelbrain/character-bytecode-compiler.js`

Pure function, no side effects, no randomness.

```js
compileEffectsBytecode(spec) → {
  u_schoolGlow:        vec3   // SCHOOL_PALETTE[school].glow → hexToVec3
  u_rimColor:          vec3   // SCHOOL_PALETTE[school].primary → hexToVec3
  u_eyeColor:          vec3   // material-registry anchors.body[spec.materials.eyes] → hexToVec3
  u_glowIntensity:     float  // VOID=0.9, PSYCHIC=0.8, SONIC=0.6, default=0.5
  u_atmosphereOpacity: float  // VOID=0.5, PSYCHIC=0.4, default=0.25
}
```

Same CHARACTER-SPEC-v1 + same school → identical output every run.

---

## Effects Shader

**File:** `src/pages/Combat/shaders/character-effects.frag.glsl`

GLSL ES 1.0 (Phaser 4 WebGL compatibility). Input: `uniform sampler2D u_texture` (the foundry-painted DynamicTexture). UV input: `varying vec2 outTexCoord`. Output: `gl_FragColor`.

### Three techniques

**Eye glow:** Sample pixels near `u_eyeColor` (± 0.15 threshold per channel). For matching pixels, additively blend `u_schoolGlow * u_glowIntensity` into the output. Also bloom into the 8 surrounding pixels at reduced opacity to create the halo.

**Rim light:** Silhouette detection — an opaque pixel (alpha > 0.5) whose left or top neighbour is transparent (alpha < 0.1). Tint those pixels with `u_rimColor` at `u_glowIntensity` strength.

**Foot aura:** Radial gradient centred at `(0.5, 1.0)` (bottom-centre of texture). School colour blended into transparent pixels only, at radius `< 0.4` UV units, opacity scaled by `u_atmosphereOpacity`.

---

## CharacterShaderRenderer

**File:** `src/pages/Combat/scenes/CharacterShaderRenderer.js`

### `bake(spec, scene, shaderEnhancements = null) → string`

Returns a Phaser texture key for the baked final sprite.

1. Call `forgeCharacter(spec, {})` to get `dirRgbas`
2. Stamp south-facing RGBA onto a new `DynamicTexture` (`charBase_${id}`)
3. Call `compileEffectsBytecode(spec)` for base uniforms
4. Merge `shaderEnhancements` if non-null (overrides `glowIntensity`, `rimColor`, `atmosphereOpacity`)
5. Create `scene.add.shader('char-effects', x, y, 128, 192)` with merged uniforms + `u_texture`
6. Snapshot shader output to `charFinal_${id}` DynamicTexture
7. Destroy the intermediate shader game object
8. Return `charFinal_${id}`

### `bakeAll(actors, scene) → Map<actorId, textureKey>`

Iterates actors. For the player actor (`actor.isPlayer === true`), reads `pixelLotusActor.shaderEnhancements` from localStorage. For NPC actors, calls `npcSpec(actor.school)` to generate a minimal spec. Returns a map of actor ID to texture key.

### `npcSpec(school) → CHARACTER-SPEC-v1`

Minimal deterministic spec: average body, medium hair, school-matched material colors. No `shaderEnhancements`.

---

## AI Enhancement

### Backend route

**File:** `server/routes/character-enhance.js`

```
POST /api/character/enhance
Body: { imageDataUrl: string, schoolName: string, characterName: string }
Response: { glowIntensity: number, rimColor: string, atmosphereOpacity: number }
```

- Uses `@anthropic-ai/sdk`
- Model: `claude-haiku-4-5-20251001`
- `max_tokens: 128`
- System: `"Return only a valid JSON object. No prose, no explanation."`
- Message: `[{ type: 'image', source: { type: 'base64', ... } }, { type: 'text', text: 'Enhance effects for this ${schoolName} school character. Return { glowIntensity, rimColor, atmosphereOpacity }.' }]`
- Validates and clamps response before returning: `glowIntensity` → [0.3, 1.5], `atmosphereOpacity` → [0.0, 0.8], `rimColor` → valid hex or fallback to school primary

### Frontend lib

**File:** `src/lib/character-enhancement.js`

`enhanceCharacter(imageDataUrl, spec) → Promise<ShaderEnhancements>`

Calls `POST /api/character/enhance`, validates response shape, returns parsed object or throws `EnhancementError`.

### ShaderEnhancements schema

```js
{
  glowIntensity:     number  // 0.3 – 1.5
  rimColor:          string  // "#rrggbb"
  atmosphereOpacity: number  // 0.0 – 0.8
}
```

Stored at `pixelLotusActor.shaderEnhancements` in localStorage. `null` until "Forge & Enhance" is triggered. Re-runnable — new result overwrites.

---

## Combat Integration

### `combatAssets.js` changes

Remove `buildScholarTexture` and `buildWraithTexture`. Add:

```js
export async function buildCharacterTextures(actors, scene) {
  return CharacterShaderRenderer.bakeAll(actors, scene);
}
```

### `ResonanceScene.js` changes

In `create()`:

```js
const textureMap = await buildCharacterTextures(this.combatActors, this);
const layer = this.add.spriteGPULayer();
for (const actor of this.combatActors) {
  layer.add(actor.x, actor.y, textureMap.get(actor.id));
}
```

### 4-direction sprites

Out of scope for this spec. First pass bakes south-facing only. Full directional support (baking all 4 RGBAs, keyed as `actorId_south` etc., swapped on movement) is a follow-on.

---

## Actor Forge Lab Changes

**File:** `src/pages/internal/pixel-lotus/ActorForgeLab.tsx`

### New state

| State | Type | Purpose |
|---|---|---|
| `enhancementState` | `'idle' \| 'forging' \| 'enhancing' \| 'enhanced' \| 'error'` | Drives button label and preview layout |
| `enhancedPreviewUrl` | `string \| null` | Data URL of AI-enhanced bake for right preview panel |

### Button states

- **idle:** `"✦ Forge & Enhance"`
- **forging:** `"Forging…"` (disabled)
- **enhancing:** `"Enhancing…"` (disabled)
- **enhanced:** `"✦ Re-Enhance"` (re-enterable)
- **error:** `"✦ Forge & Enhance"` + toast `"Enhancement failed, using defaults"`

### `handleForgeAndEnhance()`

`ActorForgeLab` is a React component with no Phaser scene. The AI enhancement flow therefore runs entirely CPU-side:

1. Set state → `'forging'`
2. `forgeCharacter(spec)` → south-facing `dirRgbas[0]` (already available from the existing `useMemo`)
3. `encodePng(dirRgbas[0], 128, 192)` → PNG bytes → `pngToDataUrl()` — this is the **base preview** already on screen
4. Set state → `'enhancing'`
5. `enhanceCharacter(baseDataUrl, spec)` → `shaderEnhancements` (POST /api/character/enhance)
6. Store in `pixelLotusActor.shaderEnhancements` (localStorage)
7. Set `enhancedPreviewUrl = baseDataUrl` (same pixel art image — the effect difference is visible in combat where the GPU shader runs; the lab shows the base sprite with an "Enhanced ✦" badge overlay)
8. Set state → `'enhanced'`

The enhanced preview panel shows the same pixel art sprite with a purple badge overlay. The actual glow/rim/aura effects are only visible in the combat scene where the GPU shader runs. This is correct behaviour — the AI is tuning shader uniforms, not the pixel art.

On error: set state → `'error'`, show toast `"Enhancement failed, using defaults"`, no stored enhancements.

### Preview layout

Two panels side-by-side: **BASE** (school defaults) and **ENHANCED ✦** (AI-tuned). The existing direction preview and spritesheet remain above both panels.

---

## New Dependencies

| Package | Used by | Notes |
|---|---|---|
| `@anthropic-ai/sdk` | `server/routes/character-enhance.js` | Server-side only — API key never reaches browser |

Add `ANTHROPIC_API_KEY` to `.env.example`.

---

## Tests

**File:** `tests/core/pixelbrain/character-bytecode-compiler.test.js`

- Determinism: same spec → identical uniform object across 100 calls
- Schema contract: output always contains all 5 required uniform keys with correct types
- School coverage: each school produces a valid `u_schoolGlow` vec3 (no nulls, all values in [0,1])
- Eye color mapping: every material-registry eye material resolves to a valid vec3
