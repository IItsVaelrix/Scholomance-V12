/**
 * armor-proportion-validator.js
 *
 * Deterministic human-wearable proportion gate for chestplate-class armor.
 * This is intentionally geometry-derived: it validates the composed part
 * bounds, not just the input spec params.
 */

function err(reason, context) {
  const e = new Error(`armor-proportion-validator: ${reason}`);
  e.cause = context;
  return e;
}

function round(value) {
  return Number(Number(value || 0).toFixed(4));
}

function boundsForPart(silhouette, partId) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  silhouette.partOf.forEach((pid, key) => {
    if (pid !== partId) return;
    const [x, y] = key.split(',').map(Number);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  if (!Number.isFinite(minX)) return null;
  return Object.freeze({
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

function chestWidthAt(silhouette, bodyId, targetY) {
  let minX = Infinity;
  let maxX = -Infinity;
  silhouette.partOf.forEach((pid, key) => {
    if (pid !== bodyId) return;
    const [x, y] = key.split(',').map(Number);
    if (y !== targetY) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  });
  return Number.isFinite(minX) ? maxX - minX + 1 : 0;
}

export function validateArmorProportions({ spec, silhouette } = {}) {
  if (!spec || !silhouette) throw err('spec and silhouette are required');
  if (spec.class !== 'armor' || !String(spec.archetype || '').includes('chestplate')) {
    return Object.freeze({ ok: true, skipped: true, diagnostics: [] });
  }

  const profile = spec.proportions?.profile || 'human_regular';
  const allowOversizedPauldrons = Boolean(spec.proportions?.allowOversizedPauldrons);
  const bodyPart = spec.parts.find((part) => part.id === 'body' || part.profile?.startsWith('armor.chestplate'));
  if (!bodyPart) throw err('chestplate body part is required', { specId: spec.id });

  const bodyBounds = boundsForPart(silhouette, bodyPart.id);
  if (!bodyBounds) throw err('body part produced no cells', { specId: spec.id, bodyId: bodyPart.id });

  const pauldronParts = spec.parts.filter((part) => part.id.includes('pauldron') || part.profile?.includes('pauldron'));
  const pauldronBounds = pauldronParts
    .map((part) => ({ id: part.id, bounds: boundsForPart(silhouette, part.id) }))
    .filter((entry) => entry.bounds);

  const shoulderY = bodyBounds.minY + Math.max(1, Math.floor(bodyBounds.height * 0.12));
  const bodyChestWidth = Math.max(
    chestWidthAt(silhouette, bodyPart.id, shoulderY),
    Math.round(bodyBounds.width * 0.82),
  );
  let shoulderMinX = bodyBounds.minX;
  let shoulderMaxX = bodyBounds.maxX;
  let maxPauldronHeight = 0;
  let maxPauldronOuterDrop = 0;
  for (const { bounds } of pauldronBounds) {
    shoulderMinX = Math.min(shoulderMinX, bounds.minX);
    shoulderMaxX = Math.max(shoulderMaxX, bounds.maxX);
    maxPauldronHeight = Math.max(maxPauldronHeight, bounds.height);
    maxPauldronOuterDrop = Math.max(maxPauldronOuterDrop, Math.max(0, bounds.maxY - shoulderY));
  }

  const shoulderWidth = shoulderMaxX - shoulderMinX + 1;
  const neckGapWidth = Math.max(0, spec.parts.find((part) => part.id === 'collar')?.params?.neckWidth ?? bodyPart.params?.neckWidth ?? 12);
  const waistY = bodyBounds.minY + Math.floor(bodyBounds.height * 0.7);
  const waistWidth = chestWidthAt(silhouette, bodyPart.id, waistY) || Math.round(bodyBounds.width * 0.68);

  const diagnostics = Object.freeze({
    profile,
    shoulderWidth,
    bodyChestWidth,
    shoulderRatio: round(shoulderWidth / Math.max(1, bodyChestWidth)),
    pauldronHeight: maxPauldronHeight,
    pauldronHeightRatio: round(maxPauldronHeight / Math.max(1, bodyBounds.height)),
    pauldronOuterDrop: maxPauldronOuterDrop,
    pauldronOuterDropRatio: round(maxPauldronOuterDrop / Math.max(1, bodyBounds.height)),
    neckGapWidth,
    neckGapRatio: round(neckGapWidth / Math.max(1, bodyChestWidth)),
    waistWidth,
    waistRatio: round(waistWidth / Math.max(1, bodyChestWidth)),
    bodyBounds,
    pauldronBounds,
  });

  const failures = [];
  if (profile === 'human_regular' && !allowOversizedPauldrons) {
    if (diagnostics.shoulderRatio > 1.28) failures.push('shoulderWidth exceeds bodyChestWidth * 1.28');
    if (diagnostics.pauldronOuterDropRatio > 0.18) failures.push('pauldronOuterDrop exceeds torsoHeight * 0.18');
    if (diagnostics.pauldronHeightRatio > 0.22) failures.push('pauldronHeight exceeds torsoHeight * 0.22');
    if (diagnostics.neckGapRatio < 0.24) failures.push('neckGapWidth is below bodyChestWidth * 0.24');
    if (diagnostics.waistRatio < 0.58 || diagnostics.waistRatio > 0.78) {
      failures.push('waistWidth must be between bodyChestWidth * 0.58 and * 0.78');
    }
  }

  if (failures.length > 0) {
    throw err('human_regular chestplate proportions failed', {
      specId: spec.id,
      failures,
      diagnostics,
    });
  }

  return Object.freeze({
    ok: true,
    diagnostics,
    failures: Object.freeze(failures),
  });
}
