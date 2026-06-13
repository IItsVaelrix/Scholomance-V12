import { characterToSVG } from './character-to-svg.js';

export const RENDERERS = Object.freeze({
  pixelart:    { outputType: 'png' },
  illustrated: { render: characterToSVG, outputType: 'svg' },
});

export function getRenderer(name) {
  const r = RENDERERS[name ?? 'pixelart'];
  if (!r) throw new Error(`[renderer-registry] unknown renderer: ${name}`);
  return r;
}
