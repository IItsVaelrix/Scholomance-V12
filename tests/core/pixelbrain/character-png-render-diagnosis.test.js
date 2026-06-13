/**
 * Character Foundry PNG Render Diagnosis
 *
 * Symptom: the Actor Forge Lab preview <img> decodes a width/height from
 * IHDR but renders nothing — strict decoders (zlib, PIL) reject the IDAT.
 *
 * Each test asserts what a WORKING pipeline must satisfy. A failing test
 * confirms its theory as a culprit; a passing test exonerates it.
 * After the encoder is fixed, this whole suite must pass and stays on
 * as the regression suite for character sprite rendering.
 */

import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { forgeCharacter } from '../../../codex/core/pixelbrain/character-foundry.js';

const SCALE = 4; // renderPng default
const CANVAS = { width: 32, height: 48, gridSize: 1 };

function buildSpec() {
  return {
    contract: 'CHARACTER-SPEC-v1',
    id: 'diagnosis.human.feminine.v1',
    class: 'character',
    archetype: 'human',
    canvas: { ...CANVAS },
    seed: 1337,
    bytecode: 'VW-SCHOLAR-COMMON-RESONANT',
    presentation: { gender: 'feminine', heightClass: 'average', buildClass: 'average' },
    directions: ['south', 'east', 'north', 'west'],
    materials: { skin: 'skin_light', hair: 'hair_brown', eyes: 'eye_brown' },
    body: { profile: 'character.body.human.feminine' },
    face: [
      { id: 'leftEye', profile: 'character.face.eye.almond', attach: { parent: 'body', at: 'face.eyeLeft' } },
      { id: 'rightEye', profile: 'character.face.eye.almond', attach: { parent: 'body', at: 'face.eyeRight' } },
      { id: 'nose', profile: 'character.face.nose.small', attach: { parent: 'body', at: 'face.nose' } },
      { id: 'mouth', profile: 'character.face.mouth.small', attach: { parent: 'body', at: 'face.mouth' } },
    ],
    hair: { profile: 'character.hair.longStraight', params: { color: 'hair_brown' }, attach: { parent: 'body', at: 'headTop' } },
    clothing: [
      { id: 'bottom', profile: 'character.clothing.bottom.beginnerSkirt' },
      { id: 'top', profile: 'character.clothing.top.beginnerRobe' },
      { id: 'shoes', profile: 'character.clothing.shoes.beginnerBoots' },
    ],
  };
}

function parsePngChunks(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i += 1) {
    if (bytes[i] !== sig[i]) throw new Error(`bad PNG signature at byte ${i}`);
  }
  const chunks = [];
  let pos = 8;
  while (pos < bytes.length) {
    const length = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    chunks.push({ type, data: bytes.subarray(pos + 8, pos + 8 + length) });
    pos += 12 + length;
  }
  return chunks;
}

function ihdrSize(chunks) {
  const ihdr = chunks.find(c => c.type === 'IHDR').data;
  const w = (ihdr[0] << 24) | (ihdr[1] << 16) | (ihdr[2] << 8) | ihdr[3];
  const h = (ihdr[4] << 24) | (ihdr[5] << 16) | (ihdr[6] << 8) | ihdr[7];
  return { w, h };
}

function idatBytes(chunks) {
  const parts = chunks.filter(c => c.type === 'IDAT').map(c => c.data);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/** Full strict decode: zlib inflate + scanline unfilter → RGBA */
function decodePngToRgba(bytes) {
  const chunks = parsePngChunks(bytes);
  const { w, h } = ihdrSize(chunks);
  const raw = zlib.inflateSync(idatBytes(chunks)); // throws on invalid zlib
  const stride = w * 4;
  expect(raw.length).toBe((stride + 1) * h);
  const rgba = new Uint8Array(w * h * 4);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      const up = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0;
      let v = row[x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) v += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      rgba[y * stride + x] = v & 0xff;
    }
  }
  return { w, h, rgba };
}

const character = forgeCharacter(buildSpec(), {});
const southPng = character.sprites.south;

describe('character foundry PNG render diagnosis', () => {
  it('theory 1: IDAT must be a valid zlib stream (header + adler32)', () => {
    const idat = idatBytes(parsePngChunks(southPng));
    // zlib header: CMF low nibble = 8 (deflate), (CMF*256+FLG) % 31 === 0
    const cmf = idat[0];
    const flg = idat[1];
    expect(cmf & 0x0f, 'CMF compression method must be 8 (deflate)').toBe(8);
    expect((cmf * 256 + flg) % 31, 'zlib header check bytes must validate').toBe(0);
    expect(() => zlib.inflateSync(idat), 'IDAT must inflate cleanly').not.toThrow();
  });

  it('theory 2: deflate blocks must carry the full filtered payload (no 16-bit length truncation)', () => {
    const { w, h } = ihdrSize(parsePngChunks(southPng));
    const expectedFiltered = (w * 4 + 1) * h; // 98,496 for 128×192 — exceeds one stored block (max 65,535)
    const idat = idatBytes(parsePngChunks(southPng));
    const raw = zlib.inflateSync(idat); // throws if block structure is broken
    expect(raw.length, 'inflated scanline data must match filtered image size').toBe(expectedFiltered);
  });

  it('theory 3: decoded sprite must contain visible non-background character pixels', () => {
    const { w, h, rgba } = decodePngToRgba(southPng);
    expect(w).toBe(CANVAS.width * SCALE);
    expect(h).toBe(CANVAS.height * SCALE);
    let nonBackground = 0;
    let opaque = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] > 0) opaque += 1;
      const isBg = rgba[i] === 10 && rgba[i + 1] === 10 && rgba[i + 2] === 18;
      if (!isBg && rgba[i + 3] > 0) nonBackground += 1;
    }
    expect(opaque, 'sprite must have opaque pixels').toBeGreaterThan(0);
    // 574 lattice cells × 16 px/cell ≈ 9,184 expected character pixels
    expect(nonBackground, 'character pixels must be visible against background').toBeGreaterThan(1000);
  });

  it('theory 4: spritesheet frames must be composed from raw RGBA, not encoded PNG bytes', () => {
    const sheet = decodePngToRgba(character.spritesheet);
    const south = decodePngToRgba(southPng);
    expect(sheet.w).toBe(CANVAS.width * SCALE * 4);
    expect(sheet.h).toBe(CANVAS.height * SCALE);
    // Frame 0 of the sheet must be pixel-identical to the south sprite
    let mismatches = 0;
    for (let y = 0; y < south.h; y += 1) {
      for (let x = 0; x < south.w; x += 1) {
        const a = (y * south.w + x) * 4;
        const b = (y * sheet.w + x) * 4;
        if (
          south.rgba[a] !== sheet.rgba[b] ||
          south.rgba[a + 1] !== sheet.rgba[b + 1] ||
          south.rgba[a + 2] !== sheet.rgba[b + 2]
        ) mismatches += 1;
      }
    }
    expect(mismatches, 'sheet frame 0 must equal the south sprite').toBe(0);
  });

  it('theory 5: chunked btoa data-URL conversion must preserve bytes (UI path)', () => {
    // Mirrors pngToDataUrl in ActorForgeLab.tsx
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < southPng.length; i += CHUNK) {
      bin += String.fromCharCode(...southPng.subarray(i, i + CHUNK));
    }
    const b64 = btoa(bin);
    const roundTripped = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    expect(roundTripped.length).toBe(southPng.length);
    expect(Buffer.compare(Buffer.from(roundTripped), Buffer.from(southPng))).toBe(0);
  });
});
