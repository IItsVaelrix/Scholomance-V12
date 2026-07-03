/**
 * lower-booleans.js
 * Modular boolean geometry lowering for expand-vector.
 * Enforces semantic ownership rules:
 *   union A B     -> dominant/outer role (first wins)
 *   subtract A B  -> role of A
 *   intersect A B -> ambiguous unless explicit
 *
 * Called from expand-vector.pass.js
 */

import { pushCell, inBounds } from './expand-vector.pass.js'; // shared helpers (would be extracted)

export function applyBooleanOp(boolOp, targets, part, W, H, ops, errors) {
  // Simplified: in practice collect cell sets from previous ops
  // and compute intersection/union on geometry, then assign ownership.
  let role = null;
  let material = part.material || 'source';

  if (boolOp === 'union') {
    role = 'union-result'; // or take from dominant
  } else if (boolOp === 'subtract') {
    role = part.role || 'body'; // A keeps its identity
  } else if (boolOp === 'intersect') {
    role = 'intersect-ambiguous';
    // In real, push PB-SEM-002 if roles differ
  }

  // Demo cell with ownership
  const demoX = Math.floor(W / 2);
  const demoY = Math.floor(H / 2);
  if (inBounds(demoX, demoY, W, H)) {
    pushCell(ops, demoX, demoY, '#ffffff', {}, {
      role,
      material,
      booleanOp: boolOp,
      targets
    });
  }
}