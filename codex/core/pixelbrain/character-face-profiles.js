import { registerPartProfile } from './part-profile-library.js';

registerPartProfile('character.face.eye.round', (params = {}, options = {}) => {
  const isLeft = String(options.side || 'left') === 'left';
  const cx = roundInt(params.cx ?? (isLeft ? -2 : 2));
  const cy = roundInt(params.cy ?? 0);
  const color = params.color || null;
  const cells = [];
  cells.push({ x: cx - 1, y: cy, ...(color ? { color } : {}) });
  cells.push({ x: cx, y: cy, ...(color ? { color } : {}) });
  cells.push({ x: cx - 1, y: cy + 1, ...(color ? { color } : {}) });
  cells.push({ x: cx, y: cy + 1, ...(color ? { color } : {}) });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.eye.almond', (params = {}, options = {}) => {
  const isLeft = String(options.side || 'left') === 'left';
  const cx = roundInt(params.cx ?? (isLeft ? -2 : 2));
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + (isLeft ? -1 : 1), y: cy - 1 });
  cells.push({ x: cx, y: cy - 1 });
  cells.push({ x: cx + (isLeft ? -1 : 1), y: cy });
  cells.push({ x: cx, y: cy + 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.eye.narrow', (params = {}, options = {}) => {
  const isLeft = String(options.side || 'left') === 'left';
  const cx = roundInt(params.cx ?? (isLeft ? -2 : 2));
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + (isLeft ? -1 : 1), y: cy });
  cells.push({ x: cx, y: cy + 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.eye.voidTouched', (params = {}, options = {}) => {
  const isLeft = String(options.side || 'left') === 'left';
  const cx = roundInt(params.cx ?? (isLeft ? -2 : 2));
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + (isLeft ? -1 : 1), y: cy - 1, color: '#6050F0' });
  cells.push({ x: cx, y: cy - 1, color: '#4038C0' });
  cells.push({ x: cx + (isLeft ? -1 : 1), y: cy, color: '#6050F0' });
  cells.push({ x: cx, y: cy + 1, color: '#4038C0' });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.nose.small', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, tip: { x: cx, y: cy + 1 } },
  };
});

registerPartProfile('character.face.nose.straight', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  cells.push({ x: cx, y: cy + 2 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, tip: { x: cx, y: cy + 2 } },
  };
});

registerPartProfile('character.face.nose.broad', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx - 1, y: cy });
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + 1, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, tip: { x: cx, y: cy + 1 } },
  };
});

registerPartProfile('character.face.mouth.small', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + 1, y: cy });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.mouth.wide', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx - 1, y: cy });
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + 1, y: cy });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.mouth.smile', (params = {}, options = {}) => {
  const cx = roundInt(params.cx ?? 0);
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx - 1, y: cy });
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + 1, y: cy });
  cells.push({ x: cx, y: cy - 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.ear.round', (params = {}, options = {}) => {
  const side = String(options.side || 'left');
  const cx = roundInt(params.cx ?? (side === 'left' ? -1 : 1));
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.ear.pointed', (params = {}, options = {}) => {
  const side = String(options.side || 'left');
  const cx = roundInt(params.cx ?? (side === 'left' ? -1 : 1));
  const cy = roundInt(params.cy ?? 0);
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  cells.push({ x: cx + (side === 'left' ? -1 : 1), y: cy });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

registerPartProfile('character.face.ear.elongated', (params = {}, options = {}) => {
  const side = String(options.side || 'left');
  const cx = roundInt(params.cx ?? (side === 'left' ? -1 : 1));
  const cy = roundInt(params.cy ?? 0);
  const dir = side === 'left' ? -1 : 1;
  const cells = [];
  cells.push({ x: cx, y: cy });
  cells.push({ x: cx + dir, y: cy });
  cells.push({ x: cx, y: cy + 1 });
  cells.push({ x: cx + dir * 2, y: cy - 1 });
  return {
    cells,
    anchors: { base: { x: cx, y: cy }, center: { x: cx, y: cy } },
  };
});

function roundInt(v) {
  return Math.round(Number(v) || 0);
}
