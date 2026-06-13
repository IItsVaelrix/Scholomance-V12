export const CHARACTER_SKELETON_CONTRACT = 'PB-CONSTRUCTION-SKELETON-v1';

export function createCharacterSkeleton(bodyResult, direction = 'south') {
  if (!bodyResult || !bodyResult.anchors) {
    return null;
  }

  const an = bodyResult.anchors;

  const head = {
    top: an.headTop || an.tip || { x: 16, y: 2 },
    center: an.headCenter || { x: 16, y: 6 },
    chin: an.headChin || { x: 16, y: 10 },
  };

  const face = {
    eyeLeft: an.eyeLeft || null,
    eyeRight: an.eyeRight || null,
    nose: an.nose || null,
    mouth: an.mouth || null,
    earLeft: an.earLeft || null,
    earRight: an.earRight || null,
  };

  const torso = {
    shoulderL: an.shoulderL || { x: 9, y: 13 },
    shoulderR: an.shoulderR || { x: 23, y: 13 },
    hipL: an.hipL || { x: 12, y: 26 },
    hipR: an.hipR || { x: 20, y: 26 },
  };

  const legs = {
    kneeL: an.kneeL || { x: 12, y: 34 },
    kneeR: an.kneeR || { x: 20, y: 34 },
    ankleL: an.ankleL || { x: 13, y: 42 },
    ankleR: an.ankleR || { x: 19, y: 42 },
  };

  return {
    contract: CHARACTER_SKELETON_CONTRACT,
    head,
    face,
    torso,
    legs,
  };
}

export function getCharacterSkeletonAnchors(skeleton) {
  if (!skeleton) return {};
  const out = {};
  for (const [region, anchors] of Object.entries(skeleton)) {
    if (typeof anchors === 'object' && anchors !== null && !Array.isArray(anchors)) {
      for (const [name, point] of Object.entries(anchors)) {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          out[`${region}.${name}`] = point;
          out[name] = point;
        }
      }
    }
  }
  return out;
}

export function hashCharacterSkeleton(skeleton) {
  if (!skeleton) return 'null';
  const { hashString } = await_import_hashString();
  return `fnv1a_${hashString(JSON.stringify(skeleton)).toString(16).padStart(8, '0')}`;
}

async function await_import_hashString() {
  const mod = await import('./shared.js');
  return mod;
}

export function validateCharacterSkeleton(skeleton) {
  if (!skeleton || skeleton.contract !== CHARACTER_SKELETON_CONTRACT) {
    throw new Error(`character-construction-skeleton: contract must be "${CHARACTER_SKELETON_CONTRACT}"`);
  }
  const required = ['head.top', 'head.center', 'head.chin', 'torso.shoulderL', 'torso.shoulderR', 'torso.hipL', 'torso.hipR'];
  for (const key of required) {
    const [region, name] = key.split('.');
    const point = skeleton[region]?.[name];
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      throw new Error(`character-construction-skeleton: missing required anchor "${key}"`);
    }
  }
  return true;
}
