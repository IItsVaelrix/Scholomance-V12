# Character GPU Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire PixelBrain's character foundry into combat, replacing the flat SVG wand-textures with pixel art sprites enhanced by school-coloured glow effects via Phaser 4's GPU filter pipeline.

**Architecture:** `forgeCharacter(spec)` produces PNG bytes that are loaded as Phaser textures at scene create time. `CharacterShaderRenderer.bakeAll()` handles this for every combatant and returns a texture-key map. In `_buildUnit()`, each sprite gets school-coloured effects applied via Phaser 4's `sprite.postFX.addGlow()` (GPU filter — runs on the graphics card). A backend route + frontend lib support an optional one-time Claude Haiku enhancement that stores tuned uniform values in localStorage.

**Tech Stack:** Phaser 4.1 (postFX Filters), PixelBrain `forgeCharacter`, Fastify, `@anthropic-ai/sdk`, Vitest

---

## File Map

| File | Create / Modify | Responsibility |
|---|---|---|
| `codex/core/pixelbrain/character-bytecode-compiler.js` | **Create** | Pure fn: CHARACTER-SPEC-v1 → 5 effects uniforms |
| `src/pages/Combat/scenes/CharacterShaderRenderer.js` | **Create** | `bake()`, `bakeAll()`, `applyEffects()`, `npcSpec()` |
| `codex/server/routes/character-enhance.routes.js` | **Create** | POST /api/character/enhance → Claude Haiku |
| `src/lib/character-enhancement.js` | **Create** | Frontend: calls backend, returns ShaderEnhancements |
| `tests/core/pixelbrain/character-bytecode-compiler.test.js` | **Create** | Determinism + schema + school + eye coverage |
| `codex/core/pixelbrain/character-foundry.js` | **Modify** | Add `export { rasterizeCells }` (1 line) |
| `src/pages/Combat/assets/combatAssets.js` | **Modify** | Add `buildCharacterTextures(actors, scene)` |
| `src/pages/Combat/scenes/ResonanceScene.js` | **Modify** | Use `buildCharacterTextures` + `applyEffects` in `_buildUnit` |
| `src/pages/internal/pixel-lotus/ActorForgeLab.tsx` | **Modify** | Add `enhancementState` + "Forge & Enhance" button + before/after panels |
| `src/pages/internal/pixel-lotus/ActorForgeLab.css` | **Modify** | Styles for enhancement panels + button states |
| `codex/server/index.js` | **Modify** | Register character-enhance route |
| `.env.example` | **Modify** | Add `ANTHROPIC_API_KEY` |

---

## Task 1: Export `rasterizeCells` from character-foundry and write compiler tests first

**Files:**
- Modify: `codex/core/pixelbrain/character-foundry.js`
- Create: `tests/core/pixelbrain/character-bytecode-compiler.test.js`
- Create: `codex/core/pixelbrain/character-bytecode-compiler.js`

- [ ] **Step 1.1: Add export to character-foundry.js**

Open `codex/core/pixelbrain/character-foundry.js`. Find the line:
```js
function rasterizeCells(coordinates, width, height, scale = 4) {
```
Change it to:
```js
export function rasterizeCells(coordinates, width, height, scale = 4) {
```

- [ ] **Step 1.2: Write the failing tests**

Create `tests/core/pixelbrain/character-bytecode-compiler.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { compileEffectsBytecode } from '../../../codex/core/pixelbrain/character-bytecode-compiler.js';

const MINIMAL_SPEC = {
  contract: 'CHARACTER-SPEC-v1',
  id: 'test.char.v1',
  materials: { skin: 'skin_light', hair: 'hair_brown', eyes: 'eye_brown' },
  combatProfile: { school: 'PSYCHIC' },
};

const SCHOOLS = ['SONIC', 'VOID', 'PSYCHIC', 'ALCHEMY', 'WILL'];
const EYE_MATERIALS = ['eye_brown', 'eye_blue', 'eye_green', 'eye_void_glow'];

describe('compileEffectsBytecode', () => {
  it('returns all 5 required uniform keys', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    expect(uniforms).toHaveProperty('u_schoolGlow');
    expect(uniforms).toHaveProperty('u_rimColor');
    expect(uniforms).toHaveProperty('u_eyeColor');
    expect(uniforms).toHaveProperty('u_glowIntensity');
    expect(uniforms).toHaveProperty('u_atmosphereOpacity');
  });

  it('vec3 uniforms are float arrays of length 3 with values in [0,1]', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    for (const key of ['u_schoolGlow', 'u_rimColor', 'u_eyeColor']) {
      const v = uniforms[key];
      expect(Array.isArray(v)).toBe(true);
      expect(v).toHaveLength(3);
      v.forEach(c => {
        expect(typeof c).toBe('number');
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      });
    }
  });

  it('float uniforms are numbers in valid ranges', () => {
    const uniforms = compileEffectsBytecode(MINIMAL_SPEC);
    expect(typeof uniforms.u_glowIntensity).toBe('number');
    expect(uniforms.u_glowIntensity).toBeGreaterThanOrEqual(0.3);
    expect(uniforms.u_glowIntensity).toBeLessThanOrEqual(1.5);
    expect(typeof uniforms.u_atmosphereOpacity).toBe('number');
    expect(uniforms.u_atmosphereOpacity).toBeGreaterThanOrEqual(0);
    expect(uniforms.u_atmosphereOpacity).toBeLessThanOrEqual(0.8);
  });

  it('is deterministic — same spec produces identical output 50 times', () => {
    const first = compileEffectsBytecode(MINIMAL_SPEC);
    for (let i = 0; i < 49; i++) {
      expect(compileEffectsBytecode(MINIMAL_SPEC)).toEqual(first);
    }
  });

  it.each(SCHOOLS)('each school produces valid u_schoolGlow: %s', (school) => {
    const spec = { ...MINIMAL_SPEC, combatProfile: { school } };
    const { u_schoolGlow } = compileEffectsBytecode(spec);
    expect(Array.isArray(u_schoolGlow)).toBe(true);
    expect(u_schoolGlow).toHaveLength(3);
    u_schoolGlow.forEach(c => expect(c).toBeGreaterThan(0));
  });

  it.each(EYE_MATERIALS)('each eye material produces valid u_eyeColor: %s', (eyes) => {
    const spec = { ...MINIMAL_SPEC, materials: { ...MINIMAL_SPEC.materials, eyes } };
    const { u_eyeColor } = compileEffectsBytecode(spec);
    expect(Array.isArray(u_eyeColor)).toBe(true);
    expect(u_eyeColor).toHaveLength(3);
  });

  it('unknown school falls back to SONIC defaults without throwing', () => {
    const spec = { ...MINIMAL_SPEC, combatProfile: { school: 'UNKNOWN_SCHOOL' } };
    expect(() => compileEffectsBytecode(spec)).not.toThrow();
    const { u_glowIntensity } = compileEffectsBytecode(spec);
    expect(u_glowIntensity).toBe(0.5);
  });
});
```

- [ ] **Step 1.3: Run tests to confirm they fail**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx vitest run tests/core/pixelbrain/character-bytecode-compiler.test.js 2>&1 | tail -20
```

Expected: `Error: Cannot find module '.../character-bytecode-compiler.js'`

- [ ] **Step 1.4: Implement the bytecode compiler**

Create `codex/core/pixelbrain/character-bytecode-compiler.js`:

```js
import { MATERIAL_PALETTES } from './material-registry.js';
import { SCHOOL_PALETTE } from '../../../src/pages/Combat/assets/combatAssets.js';

function hexToVec3(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const GLOW_INTENSITY = { VOID: 0.9, PSYCHIC: 0.8, SONIC: 0.6 };
const ATMOSPHERE_OPACITY = { VOID: 0.5, PSYCHIC: 0.4 };

export function compileEffectsBytecode(spec) {
  const school = spec.combatProfile?.school ?? 'SONIC';
  const palette = SCHOOL_PALETTE[school] ?? SCHOOL_PALETTE.SONIC;

  const eyeMaterial = spec.materials?.eyes ?? 'eye_brown';
  const eyeEntry = MATERIAL_PALETTES[eyeMaterial];
  const eyeHex = eyeEntry?.anchors?.body ?? '#6A3828';

  return {
    u_schoolGlow:        hexToVec3(palette.glow),
    u_rimColor:          hexToVec3(palette.primary),
    u_eyeColor:          hexToVec3(eyeHex),
    u_glowIntensity:     GLOW_INTENSITY[school] ?? 0.5,
    u_atmosphereOpacity: ATMOSPHERE_OPACITY[school] ?? 0.25,
  };
}
```

- [ ] **Step 1.5: Run tests — all must pass**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx vitest run tests/core/pixelbrain/character-bytecode-compiler.test.js 2>&1 | tail -20
```

Expected: `Test Files  1 passed`, all tests green.

- [ ] **Step 1.6: Commit**

```bash
git add codex/core/pixelbrain/character-foundry.js \
        codex/core/pixelbrain/character-bytecode-compiler.js \
        tests/core/pixelbrain/character-bytecode-compiler.test.js
git commit -m "$(cat <<'EOF'
feat(pixelbrain): character effects bytecode compiler + rasterizeCells export

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: CharacterShaderRenderer

**Files:**
- Create: `src/pages/Combat/scenes/CharacterShaderRenderer.js`

Uses Phaser 4's `sprite.postFX.addGlow()` (GPU filter) for the school-coloured glow and a small `Graphics` radial for the foot aura. No custom GLSL — the postFX pipeline is Phaser 4's GPU filter system.

- [ ] **Step 2.1: Understand `textureKeyForUnit` before modifying**

Read the current implementation:

```bash
grep -n "textureKeyForUnit\|combat-scholar\|combat-wraith" \
  /home/deck/Desktop/Scholomance-V12-main/src/pages/Combat/assets/combatAssets.js
```

Expected to see it returns `'combat-scholar'` or `'combat-wraith'` based on `unit.side`.

- [ ] **Step 2.2: Create CharacterShaderRenderer.js**

Create `src/pages/Combat/scenes/CharacterShaderRenderer.js`:

```js
import { forgeCharacter } from '../../../lib/pixelbrain.adapter.js';
import { compileEffectsBytecode } from '../../../../codex/core/pixelbrain/character-bytecode-compiler.js';
import { SCHOOL_PALETTE } from '../assets/combatAssets.js';

// Convert [r, g, b] float vec3 to Phaser integer colour (0xRRGGBB).
function vec3ToInt([r, g, b]) {
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

// Convert PNG Uint8Array → data URL for Phaser texture loading.
function pngBytesToDataUrl(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return 'data:image/png;base64,' + btoa(bin);
}

// Minimal CHARACTER-SPEC-v1 for NPC enemies — deterministic from school name.
export function npcSpec(school) {
  const SCHOOL_SKIN = {
    VOID: 'skin_voidborne', PSYCHIC: 'skin_light',
    SONIC: 'skin_medium', ALCHEMY: 'skin_dark', WILL: 'skin_light',
  };
  const SCHOOL_HAIR = {
    VOID: 'hair_void', PSYCHIC: 'hair_black',
    SONIC: 'hair_brown', ALCHEMY: 'hair_red', WILL: 'hair_blonde',
  };
  const SCHOOL_EYE = {
    VOID: 'eye_void_glow', PSYCHIC: 'eye_blue',
    SONIC: 'eye_green', ALCHEMY: 'eye_brown', WILL: 'eye_brown',
  };
  const sk = SCHOOL_SKIN[school] ?? 'skin_medium';
  const hr = SCHOOL_HAIR[school] ?? 'hair_black';
  const ey = SCHOOL_EYE[school] ?? 'eye_brown';
  return {
    contract: 'CHARACTER-SPEC-v1',
    id: `npc.${school.toLowerCase()}.v1`,
    class: 'character',
    archetype: 'human',
    canvas: { width: 32, height: 48, gridSize: 1 },
    seed: school.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
    bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
    presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
    directions: ['south'],
    materials: { skin: sk, hair: hr, eyes: ey },
    body: { profile: 'character.body.human.androgynous' },
    face: [
      { id: 'leftEye',  profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.round', attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose',     profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth',    profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
    ],
    hair: { profile: 'character.hair.short', params: { color: hr }, attach: { parent: 'body', at: 'headTop' } },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.beginnerPants' },
      { id: 'top',    profile: 'character.clothing.top.beginnerRobe' },
      { id: 'shoes',  profile: 'character.clothing.shoes.beginnerBoots' },
    ],
    combatProfile: { school },
  };
}

/**
 * Load the south-facing forged sprite into Phaser as a texture.
 * Returns the texture key once the addBase64 promise resolves.
 *
 * @param {string} key         — Unique texture key for this character
 * @param {object} spec        — CHARACTER-SPEC-v1
 * @param {object} scene       — Phaser scene
 * @returns {Promise<string>}  — Resolves to `key` once loaded
 */
export async function bake(key, spec, scene) {
  if (scene.textures.exists(key)) return key;

  const character = forgeCharacter(spec, {});
  const pngBytes = character.sprites?.south;
  if (!pngBytes) throw new Error(`[CharacterShaderRenderer] no south sprite for ${key}`);

  const dataUrl = pngBytesToDataUrl(pngBytes);

  await new Promise((resolve, reject) => {
    scene.textures.addBase64(key, dataUrl);
    // addBase64 fires 'addtexture' on the TextureManager when done.
    scene.textures.once('addtexture-' + key, resolve);
    scene.textures.once('onerror',           reject);
  });

  return key;
}

/**
 * Apply Phaser 4 GPU postFX effects to a sprite.
 * Call this right after creating the sprite in _buildUnit.
 *
 * @param {Phaser.GameObjects.Image} sprite
 * @param {object} uniforms   — output of compileEffectsBytecode(spec)
 * @param {object|null} enhancements — ShaderEnhancements from localStorage (or null)
 * @param {Phaser.Scene} scene
 */
export function applyEffects(sprite, uniforms, enhancements, scene) {
  const glowIntensity = enhancements?.glowIntensity ?? uniforms.u_glowIntensity;
  const rimColorHex   = enhancements?.rimColor      ?? null;
  const atmoOpacity   = enhancements?.atmosphereOpacity ?? uniforms.u_atmosphereOpacity;

  // School-coloured outer glow (GPU filter).
  const glowColor = vec3ToInt(uniforms.u_schoolGlow);
  const outerStrength = Math.round(glowIntensity * 6);
  sprite.postFX.addGlow(glowColor, outerStrength, 0, false, 0.1, 8);

  // Foot aura — a radial gradient graphics object placed behind the sprite.
  if (atmoOpacity > 0.05 && scene) {
    const aura = scene.add.graphics();
    const auraColor = vec3ToInt(uniforms.u_schoolGlow);
    aura.fillStyle(auraColor, atmoOpacity * 0.6);
    aura.fillEllipse(sprite.x, sprite.y + sprite.displayHeight * 0.45,
                     sprite.displayWidth * 1.4, sprite.displayHeight * 0.25);
    // Depth: just below the sprite.
    aura.setDepth(sprite.depth - 0.1);
  }
}

/**
 * Bake textures for all combat actors.
 * Player actor (isPlayer===true) uses pixelLotusActor.spec from localStorage if present.
 *
 * @param {Array<{id, side, school, isPlayer}>} actors
 * @param {Phaser.Scene} scene
 * @returns {Promise<Map<string, {textureKey, uniforms, enhancements}>>}
 */
export async function bakeAll(actors, scene) {
  const result = new Map();

  for (const actor of actors) {
    const textureKey = `char_${actor.id}`;

    let spec;
    let enhancements = null;

    if (actor.isPlayer) {
      try {
        // Key is 'scholomance_active_actor' (set by handleEnterVoid in ActorForgeLab).
        // Task 6 adds `spec` and `shaderEnhancements` fields to this stored object.
        const stored = JSON.parse(localStorage.getItem('scholomance_active_actor') ?? 'null');
        spec = stored?.spec ?? npcSpec(actor.school ?? 'SONIC');
        enhancements = stored?.shaderEnhancements ?? null;
      } catch {
        spec = npcSpec(actor.school ?? 'SONIC');
      }
    } else {
      spec = npcSpec(actor.school ?? 'SONIC');
    }

    try {
      await bake(textureKey, spec, scene);
      const uniforms = compileEffectsBytecode(spec);
      result.set(actor.id, { textureKey, uniforms, enhancements });
    } catch (err) {
      console.error(`[CharacterShaderRenderer] bake failed for actor ${actor.id}:`, err);
      // Fall through — ResonanceScene has a diamond fallback for missing textures.
    }
  }

  return result;
}
```

- [ ] **Step 2.3: Commit**

```bash
git add src/pages/Combat/scenes/CharacterShaderRenderer.js
git commit -m "$(cat <<'EOF'
feat(combat): CharacterShaderRenderer — forge pixel art + Phaser 4 postFX glow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire combatAssets.js and ResonanceScene.js

**Files:**
- Modify: `src/pages/Combat/assets/combatAssets.js`
- Modify: `src/pages/Combat/scenes/ResonanceScene.js`

- [ ] **Step 3.1: Add `buildCharacterTextures` to combatAssets.js**

Open `src/pages/Combat/assets/combatAssets.js`. At the end of the file, add:

```js
import { bakeAll } from '../scenes/CharacterShaderRenderer.js';

/**
 * Build character textures for all combat actors via CharacterShaderRenderer.
 * Returns Map<actorId, {textureKey, uniforms, enhancements}>.
 */
export async function buildCharacterTextures(actors, scene) {
  return bakeAll(actors, scene);
}
```

(Keep `buildScholarTexture`, `buildWraithTexture`, and `buildCombatTextures` intact — they are still used for the fallback path.)

- [ ] **Step 3.2: Read the current ResonanceScene `preload` and `_buildUnit`**

```bash
sed -n '40,75p' /home/deck/Desktop/Scholomance-V12-main/src/pages/Combat/scenes/ResonanceScene.js
sed -n '476,545p' /home/deck/Desktop/Scholomance-V12-main/src/pages/Combat/scenes/ResonanceScene.js
```

Confirm the import line is `import { buildCombatTextures, textureKeyForUnit } from '../assets/combatAssets.js';` and that `_buildUnit` calls `textureKeyForUnit(unit)` and then `this.textures.exists(key)`.

- [ ] **Step 3.3: Modify ResonanceScene to import and use CharacterShaderRenderer**

In `src/pages/Combat/scenes/ResonanceScene.js`:

**Change the import line** from:
```js
import { buildCombatTextures, textureKeyForUnit } from '../assets/combatAssets.js';
```
to:
```js
import { buildCombatTextures, textureKeyForUnit, buildCharacterTextures } from '../assets/combatAssets.js';
import { applyEffects } from './CharacterShaderRenderer.js';
```

**In `init(data)`**, add this line after `this._unitContainers = new Map();`:
```js
this._characterTextures = new Map(); // actorId → {textureKey, uniforms, enhancements}
```

**In `create()`**, add a call to bake character textures. Find the end of `create()` (it calls `this._buildEnvironment()` and `this._buildGrid()` near the bottom). Add BEFORE `this._buildEnvironment()`:

```js
// Bake forged character textures (async; fallback to SVG sprites if incomplete).
if (this._renderedUnits?.length) {
  buildCharacterTextures(this._renderedUnits, this).then(map => {
    this._characterTextures = map;
    this._rebuildUnits();
  }).catch(err => {
    console.warn('[ResonanceScene] buildCharacterTextures failed, using SVG fallback:', err);
  });
}
```

**In `_buildUnit(unit)`**, change the sprite creation block. Find:
```js
if (this.textures.exists(key)) {
  sprite = this.add.image(0, 0, key).setOrigin(0.5, 1);
  const targetW = this.tileW * (isScholar ? 1.85 : 2.15);
  sprite.setScale(targetW / sprite.width);
  sprite.y = this.tileH * 0.28;
  sprite.setOrigin(0.5, 1);
} else {
```

Replace with:
```js
// Prefer the forged character texture; fall back to SVG wand texture.
const charData = this._characterTextures?.get(unit.id);
const resolvedKey = charData?.textureKey ?? key;
if (this.textures.exists(resolvedKey)) {
  sprite = this.add.image(0, 0, resolvedKey).setOrigin(0.5, 1);
  const targetW = this.tileW * (isScholar ? 1.85 : 2.15);
  sprite.setScale(targetW / sprite.width);
  sprite.y = this.tileH * 0.28;
  sprite.setOrigin(0.5, 1);
  // Apply GPU glow effects if we have compiled uniforms.
  if (charData?.uniforms) {
    applyEffects(sprite, charData.uniforms, charData.enhancements, this);
  }
} else {
```

- [ ] **Step 3.4: Verify the combat page loads without errors**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx vite build 2>&1 | grep -E "error|Error|warn" | grep -v "WARN" | head -20
```

Expected: no TypeScript/import errors. (Build warnings are OK.)

- [ ] **Step 3.5: Commit**

```bash
git add src/pages/Combat/assets/combatAssets.js \
        src/pages/Combat/scenes/ResonanceScene.js
git commit -m "$(cat <<'EOF'
feat(combat): wire CharacterShaderRenderer into ResonanceScene — forged sprites + glow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Backend character-enhance route

**Files:**
- Create: `codex/server/routes/character-enhance.routes.js`
- Modify: `codex/server/index.js`
- Modify: `.env.example`

- [ ] **Step 4.1: Install `@anthropic-ai/sdk`**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npm install @anthropic-ai/sdk 2>&1 | tail -5
```

Expected: `added N packages` or `up to date`. Run once.

- [ ] **Step 4.2: Create the route file**

Create `codex/server/routes/character-enhance.routes.js`:

```js
import Anthropic from '@anthropic-ai/sdk';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(v)));
}

function parseEnhancements(text, fallbackSchool) {
  let parsed;
  try {
    // Strip code fences if present.
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Haiku returned non-JSON: ' + text.slice(0, 120));
  }
  return {
    glowIntensity:     clamp(parsed.glowIntensity     ?? 0.7, 0.3, 1.5),
    rimColor:          HEX_RE.test(parsed.rimColor ?? '') ? parsed.rimColor : null,
    atmosphereOpacity: clamp(parsed.atmosphereOpacity ?? 0.3, 0.0, 0.8),
  };
}

export async function characterEnhanceRoutes(fastify) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  fastify.post('/api/character/enhance', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    handler: async (request, reply) => {
      const { imageDataUrl, schoolName, characterName } = request.body ?? {};

      if (!imageDataUrl || typeof imageDataUrl !== 'string' ||
          !imageDataUrl.startsWith('data:image/png;base64,')) {
        return reply.status(400).send({ error: 'imageDataUrl must be a base64 PNG data URL' });
      }
      if (!schoolName || typeof schoolName !== 'string') {
        return reply.status(400).send({ error: 'schoolName required' });
      }

      const base64Data = imageDataUrl.replace('data:image/png;base64,', '');

      let text;
      try {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 128,
          system: 'Return only a valid JSON object with keys glowIntensity (number 0.3–1.5), rimColor (hex string "#rrggbb"), atmosphereOpacity (number 0.0–0.8). No prose, no explanation, no markdown.',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/png', data: base64Data },
              },
              {
                type: 'text',
                text: `This is a pixel art character from the ${schoolName} school. Suggest shader effect values to make this character's school identity more visually striking. Return only the JSON.`,
              },
            ],
          }],
        });
        text = msg.content[0]?.text ?? '';
      } catch (err) {
        fastify.log.error('[character-enhance] Anthropic API error:', err.message);
        return reply.status(502).send({ error: 'AI service unavailable' });
      }

      try {
        const enhancements = parseEnhancements(text, schoolName);
        return reply.send(enhancements);
      } catch (err) {
        fastify.log.error('[character-enhance] parse error:', err.message);
        return reply.status(502).send({ error: 'Could not parse AI response' });
      }
    },
  });
}
```

- [ ] **Step 4.3: Register the route in server/index.js**

Open `codex/server/index.js`. Find the line:
```js
await fastify.register(combatRoutes);
```

Add directly below it:
```js
fastify.register(characterEnhanceRoutes);
```

Also add the import at the top of the file near the other route imports:
```js
import { characterEnhanceRoutes } from './routes/character-enhance.routes.js';
```

- [ ] **Step 4.4: Add ANTHROPIC_API_KEY to .env.example**

Open `.env.example`. Add after any existing API key entries:
```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 4.5: Verify server still starts**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && node --input-type=module <<'EOF'
import { characterEnhanceRoutes } from './codex/server/routes/character-enhance.routes.js';
console.log('import OK:', typeof characterEnhanceRoutes);
EOF
```

Expected: `import OK: function`

- [ ] **Step 4.6: Commit**

```bash
git add codex/server/routes/character-enhance.routes.js \
        codex/server/index.js \
        .env.example \
        package.json \
        package-lock.json
git commit -m "$(cat <<'EOF'
feat(server): POST /api/character/enhance — Claude Haiku shader enhancement proxy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Frontend character-enhancement.js

**Files:**
- Create: `src/lib/character-enhancement.js`

- [ ] **Step 5.1: Create the frontend lib**

Create `src/lib/character-enhancement.js`:

```js
export class EnhancementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnhancementError';
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Call POST /api/character/enhance with the baked character image.
 *
 * @param {string} imageDataUrl  — data:image/png;base64,... from pngToDataUrl()
 * @param {object} spec          — CHARACTER-SPEC-v1 (for school name)
 * @returns {Promise<{glowIntensity: number, rimColor: string|null, atmosphereOpacity: number}>}
 */
export async function enhanceCharacter(imageDataUrl, spec) {
  const schoolName    = spec.combatProfile?.school ?? 'SONIC';
  const characterName = spec.id ?? 'unknown';

  let res;
  try {
    res = await fetch('/api/character/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, schoolName, characterName }),
    });
  } catch (err) {
    throw new EnhancementError('Network error: ' + err.message);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new EnhancementError(`Server error ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();

  // Validate shape.
  if (typeof data.glowIntensity      !== 'number' ||
      typeof data.atmosphereOpacity  !== 'number') {
    throw new EnhancementError('Invalid enhancement response: ' + JSON.stringify(data));
  }

  return {
    glowIntensity:     Math.max(0.3, Math.min(1.5, data.glowIntensity)),
    rimColor:          HEX_RE.test(data.rimColor ?? '') ? data.rimColor : null,
    atmosphereOpacity: Math.max(0.0, Math.min(0.8, data.atmosphereOpacity)),
  };
}
```

- [ ] **Step 5.2: Commit**

```bash
git add src/lib/character-enhancement.js
git commit -m "$(cat <<'EOF'
feat(lib): character-enhancement.js — frontend client for /api/character/enhance

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Actor Forge Lab — "Forge & Enhance" button + before/after panels

**Files:**
- Modify: `src/pages/internal/pixel-lotus/ActorForgeLab.tsx`
- Modify: `src/pages/internal/pixel-lotus/ActorForgeLab.css`

- [ ] **Step 6.1: Read the bottom of ActorForgeLab.tsx to find where to add state + button**

```bash
sed -n '88,120p' /home/deck/Desktop/Scholomance-V12-main/src/pages/internal/pixel-lotus/ActorForgeLab.tsx
sed -n '380,430p' /home/deck/Desktop/Scholomance-V12-main/src/pages/internal/pixel-lotus/ActorForgeLab.tsx
```

Note the existing `handleEnterVoid` function and the button JSX.

- [ ] **Step 6.2: Fix `handleEnterVoid` to include `spec` in the stored actor**

`CharacterShaderRenderer.bakeAll()` needs the CHARACTER-SPEC-v1 `spec` when the combat scene loads. The existing `handleEnterVoid` stores `forge.character.pixelLotusActor` which doesn't include it.

Find this block in `ActorForgeLab.tsx`:
```ts
localStorage.setItem('scholomance_active_actor', JSON.stringify({
  ...forge.character.pixelLotusActor,
  displayName: characterName,
}));
```

Change it to:
```ts
localStorage.setItem('scholomance_active_actor', JSON.stringify({
  ...forge.character.pixelLotusActor,
  displayName: characterName,
  spec: forge.character.spec,
}));
```

This adds the spec without breaking the existing `displayName` read in `useBattleSession.js`.

- [ ] **Step 6.3 (duplicate — skip)**

- [ ] **Step 6.4-a: Add the new import**

At the top of `ActorForgeLab.tsx`, after the existing imports, add:
```ts
import { enhanceCharacter, EnhancementError } from '../../../lib/character-enhancement';
```

- [ ] **Step 6.3: Add state variables**

Inside the component function, after the existing `const [facing, setFacing] = useState(...)` line, add:
```ts
type EnhancementState = 'idle' | 'forging' | 'enhancing' | 'enhanced' | 'error';
const [enhancementState, setEnhancementState] = useState<EnhancementState>('idle');
const [enhancementError, setEnhancementError] = useState<string | null>(null);
```

- [ ] **Step 6.4: Add the `handleForgeAndEnhance` function**

Add this function inside the component, after `handleEnterVoid`:
```ts
const handleForgeAndEnhance = async () => {
  if (!forge.character) return;
  setEnhancementState('forging');
  setEnhancementError(null);

  try {
    // Step 1: get base data URL from the already-forged south sprite.
    const pngBytes = forge.character.sprites?.south;
    if (!pngBytes) throw new EnhancementError('No south sprite available');
    const baseDataUrl = pngToDataUrl(pngBytes);

    setEnhancementState('enhancing');

    // Step 2: call AI enhancement.
    const spec = forge.character.spec;
    const enhancements = await enhanceCharacter(baseDataUrl, spec);

    // Step 3: merge shaderEnhancements into the existing actor record.
    // Key is 'scholomance_active_actor' — the same one handleEnterVoid writes.
    const stored = JSON.parse(localStorage.getItem('scholomance_active_actor') ?? '{}');
    stored.shaderEnhancements = enhancements;
    localStorage.setItem('scholomance_active_actor', JSON.stringify(stored));

    setEnhancementState('enhanced');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setEnhancementError(msg);
    setEnhancementState('error');
  }
};
```

- [ ] **Step 6.5: Add the "Forge & Enhance" button and before/after panels to JSX**

Find the existing "Enter the Void" button in the JSX. It should look something like:
```tsx
<button type="button" className="create-character-btn" onClick={handleEnterVoid} ...>
  Enter the Void
</button>
```

Add the following JSX **before** the Enter the Void button:

```tsx
{/* Before / after enhancement panels */}
{(enhancementState === 'enhanced' || enhancementState === 'error') && spriteUrl && (
  <div className="enhancement-panels">
    <div className="enhancement-panel">
      <div className="enhancement-panel-label">BASE</div>
      <img className="forged-sprite" src={spriteUrl} alt="Base sprite" />
    </div>
    <div className="enhancement-panel enhanced">
      <div className="enhancement-panel-label">ENHANCED ✦</div>
      <img className="forged-sprite" src={spriteUrl} alt="Enhanced sprite" />
      {enhancementState === 'enhanced' && (
        <div className="enhancement-badge">✦ Effects active in combat</div>
      )}
    </div>
  </div>
)}
{enhancementState === 'error' && enhancementError && (
  <div className="forge-error">Enhancement failed: {enhancementError}</div>
)}

{/* Forge & Enhance button */}
<button
  type="button"
  className="forge-enhance-btn"
  onClick={handleForgeAndEnhance}
  disabled={!forge.character || enhancementState === 'forging' || enhancementState === 'enhancing'}
>
  {enhancementState === 'forging'   ? 'Forging…'
   : enhancementState === 'enhancing' ? 'Enhancing…'
   : enhancementState === 'enhanced'  ? '✦ Re-Enhance'
   : '✦ Forge & Enhance'}
</button>
```

- [ ] **Step 6.6: Add CSS for the new elements**

Open `src/pages/internal/pixel-lotus/ActorForgeLab.css`. Add at the end:

```css
.enhancement-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
}

.enhancement-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.enhancement-panel.enhanced {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(167, 139, 250, 0.06);
}

.enhancement-panel-label {
  font-size: 10px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.06em;
}

.enhancement-panel.enhanced .enhancement-panel-label {
  color: #a78bfa;
}

.enhancement-badge {
  font-size: 9px;
  font-family: monospace;
  color: rgba(167, 139, 250, 0.7);
  text-align: center;
}

.forge-enhance-btn {
  width: 100%;
  background: rgba(167, 139, 250, 0.15);
  border: 1px solid rgba(167, 139, 250, 0.6);
  color: #c4b5fd;
  border-radius: 6px;
  padding: 10px 0;
  font-family: monospace;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 0.15s;
}

.forge-enhance-btn:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.28);
}

.forge-enhance-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 6.7: Run typecheck**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors. Fix any type mismatches before committing.

- [ ] **Step 6.8: Commit**

```bash
git add src/pages/internal/pixel-lotus/ActorForgeLab.tsx \
        src/pages/internal/pixel-lotus/ActorForgeLab.css \
        src/lib/character-enhancement.js
git commit -m "$(cat <<'EOF'
feat(forge-lab): Forge & Enhance button — AI enhancement flow + before/after panels

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full test run

- [ ] **Step 7.1: Run the bytecode compiler test suite**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx vitest run tests/core/pixelbrain/character-bytecode-compiler.test.js 2>&1 | tail -20
```

Expected: all 10+ tests pass.

- [ ] **Step 7.2: Run the full QA suite**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npm run test:qa 2>&1 | tail -30
```

Expected: same pass rate as before (no regressions). Pre-existing failures are OK; new failures need investigation.

- [ ] **Step 7.3: Typecheck**

```bash
cd /home/deck/Desktop/Scholomance-V12-main && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 7.4: Final commit if any loose changes**

```bash
git status
```

If clean: nothing to do. If there are fixes, stage and commit them.
