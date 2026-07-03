/**
 * SCDL Grammar — Recursive-Descent Parser
 *
 * Parses SCDL source text into a SCDL-AST-v1 JSON object.
 * Pure function: same input → same output. No side effects.
 *
 * Grammar summary:
 *   program       ::= asset_decl palette_block? part_block* export_decl?
 *   asset_decl    ::= 'asset' IDENT IDENT 'canvas' INT 'x' INT
 *   palette_block ::= 'palette' '{' (IDENT '=' HEX_COLOR)* '}'
 *   part_block    ::= 'part' IDENT 'material' IDENT '{' part_op* '}'
 *   part_op       ::= symmetry_op | trace_op | fill_op | rim_op | cell_op
 *                   | glow_op
 *                   | circle_op | ring_op | rect_op | polygon_op | path_op
 *                   | sphere_op
 *   sphere_op     ::= 'sphere' NUMBER NUMBER 'radius' NUMBER ('light' NUMBER NUMBER)? color_ref+
 *   export_decl   ::= 'export' IDENT+
 *
 *   Vector ops (rasterized to cells by the expand-vector pass):
 *   circle  cx cy 'radius' NUMBER color_ref
 *   ring    cx cy 'radius' NUMBER 'width' NUMBER color_ref
 *   rect    x y w h color_ref
 *   polygon (NUMBER NUMBER)+ color_ref
 *   path    STRING color_ref
 *   sphere  cx cy 'radius' NUMBER ['light' NUMBER NUMBER] tier_color_ref+
 */

import { hashString } from '../shared.js';

// ─── Tokenizer ───────────────────────────────────────────────────────────────

const TOKEN_TYPES = Object.freeze({
  IDENT:     'IDENT',
  HEX:       'HEX',
  BAD_HEX:   'BAD_HEX',
  INT:       'INT', // signed numeric literal; dimensions still require integers
  STRING:    'STRING', // "body"
  LBRACE:    'LBRACE',
  RBRACE:    'RBRACE',
  LPAREN:    'LPAREN',
  RPAREN:    'RPAREN',
  EQUALS:    'EQUALS',
  DOT:       'DOT',
  X:         'X',      // 'x' in dimensions (64x64)
  EOF:       'EOF',
  COMMENT:   'COMMENT',
});

/**
 * Tokenize SCDL source text.
 * @param {string} source
 * @returns {Array<{type:string, value:string, line:number, col:number}>}
 */
export function tokenize(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col = 1;
  const src = String(source || '');

  function peek()  { return src[pos] || ''; }
  function advance() {
    const ch = src[pos++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }
  function loc() { return { line, col }; }

  while (pos < src.length) {
    const ch = peek();

    // Whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // '#' — could be comment, hex colour, or malformed hex literal
    if (ch === '#') {
      const startLoc = loc();
      // Look ahead to see if the next 6 characters are hex digits
      let isHex = true;
      for (let i = 1; i <= 6; i++) {
        const nextCh = src[pos + i] || '';
        if (!/[0-9a-fA-F]/.test(nextCh)) {
          isHex = false;
          break;
        }
      }
      // Ensure the 7th char is not a hex digit
      if (isHex) {
        const seventhCh = src[pos + 7] || '';
        if (/[0-9a-fA-F]/.test(seventhCh)) {
          isHex = false;
        }
      }

      if (isHex) {
        advance(); // consume '#'
        let hex = '';
        for (let i = 0; i < 6; i++) {
          hex += advance();
        }
        tokens.push({ type: TOKEN_TYPES.HEX, value: `#${hex}`, line: startLoc.line, col: startLoc.col });
      } else if (!/\s/.test(src[pos + 1] || '')) {
        advance(); // consume '#'
        let raw = '#';
        while (pos < src.length && !/\s/.test(peek()) && !['{', '}', '(', ')'].includes(peek())) {
          raw += advance();
        }
        tokens.push({ type: TOKEN_TYPES.BAD_HEX, value: raw, line: startLoc.line, col: startLoc.col });
      } else {
        // It's a comment — consume to end of line
        while (pos < src.length && peek() !== '\n') advance();
      }
      continue;
    }

    // String literal
    if (ch === '"') {
      const startLoc = loc();
      advance();
      let str = '';
      while (pos < src.length && peek() !== '"') str += advance();
      advance(); // closing "
      tokens.push({ type: TOKEN_TYPES.STRING, value: str, line: startLoc.line, col: startLoc.col });
      continue;
    }

    // Braces / parens / punctuation
    if (ch === '{') { tokens.push({ type: TOKEN_TYPES.LBRACE, value: '{', line, col }); advance(); continue; }
    if (ch === '}') { tokens.push({ type: TOKEN_TYPES.RBRACE, value: '}', line, col }); advance(); continue; }
    if (ch === '(') { tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(', line, col }); advance(); continue; }
    if (ch === ')') { tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')', line, col }); advance(); continue; }
    if (ch === '=') { tokens.push({ type: TOKEN_TYPES.EQUALS, value: '=', line, col }); advance(); continue; }
    if (ch === '.') { tokens.push({ type: TOKEN_TYPES.DOT,    value: '.', line, col }); advance(); continue; }

    // Numeric literal
    if (/[0-9-]/.test(ch)) {
      const startLoc = loc();
      let num = '';
      if (peek() === '-') {
        num += advance();
        if (!/[0-9]/.test(peek())) continue;
      }
      while (/[0-9]/.test(peek())) num += advance();
      if (peek() === '.' && /[0-9]/.test(src[pos + 1] || '')) {
        num += advance();
        while (/[0-9]/.test(peek())) num += advance();
      }
      // Check if followed by 'x' (dimension syntax: 64x64)
      if (!num.includes('.') && !num.startsWith('-') && peek() === 'x' && /[0-9]/.test(src[pos + 1])) {
        tokens.push({ type: TOKEN_TYPES.INT, value: num, line: startLoc.line, col: startLoc.col });
        advance(); // consume 'x'
        tokens.push({ type: TOKEN_TYPES.X, value: 'x', line, col });
        continue;
      }
      tokens.push({ type: TOKEN_TYPES.INT, value: num, line: startLoc.line, col: startLoc.col });
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(ch)) {
      const startLoc = loc();
      let ident = '';
      while (/[a-zA-Z0-9_]/.test(peek())) ident += advance();
      tokens.push({ type: TOKEN_TYPES.IDENT, value: ident, line: startLoc.line, col: startLoc.col });
      continue;
    }

    // Unknown char — skip
    advance();
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: '', line, col });
  return tokens;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse SCDL source text into a SCDL-AST-v1 object.
 *
 * @param {string} source - Raw SCDL source
 * @returns {{ ast: object|null, errors: import('./scdl.errors.js').SCDLError[] }}
 */
export function parseSCDL(source) {
  // Re-tokenize with proper hex detection (tokenizer above handles both # cases;
  // we do a single-pass tokenizer that treats '#' followed by 6 hex chars as HEX
  // and '#' followed by anything else as a comment start)
  const tokens = _tokenizeFull(source);
  const errors = [];
  const checksum = _checksumSource(source);

  // Parser state
  let cursor = 0;
  function peek(offset = 0) { return tokens[Math.min(cursor + offset, tokens.length - 1)]; }
  function at(...types)     { return types.includes(peek().type); }
  function atValue(v)       { return peek().value === v; }
  function loc()            { return { line: peek().line, col: peek().col }; }

  function consume(type, expectedValue) {
    const tok = peek();
    if (type && tok.type !== type) {
      return null; // caller checks
    }
    if (expectedValue !== undefined && tok.value !== expectedValue) {
      return null;
    }
    cursor++;
    return tok;
  }

  function expect(type, expectedValue, errMsg) {
    const tok = consume(type, expectedValue);
    if (!tok) {
      errors.push(_mkErr(errMsg, loc()));
      return { type: 'MISSING', value: '', line: loc().line, col: loc().col };
    }
    return tok;
  }

  // ── asset declaration ──
  function parseAsset() {
    const l = loc();
    if (!atValue('asset')) return null;
    consume(); // 'asset'
    const nameTok = consume(TOKEN_TYPES.IDENT);
    // 'canvas'
    if (!atValue('canvas')) {
      errors.push(_mkWarn(`Expected 'canvas' keyword after asset name`, loc()));
    } else {
      consume(); // 'canvas'
    }
    // WxH
    const wTok = consume(TOKEN_TYPES.INT);
    consume(TOKEN_TYPES.X); // 'x'
    const hTok = consume(TOKEN_TYPES.INT);
    return {
      asset: nameTok?.value || 'unnamed',
      type:  nameTok?.value || 'unknown',
      canvas: {
        width:  wTok  ? parseInt(wTok.value, 10)  : 0,
        height: hTok  ? parseInt(hTok.value, 10)  : 0,
      },
      sourceLocation: l,
    };
  }

  // ── palette block ──
  function parsePalette() {
    if (!atValue('palette')) return null;
    consume(); // 'palette'
    expect(TOKEN_TYPES.LBRACE, undefined, `Expected '{' after 'palette'`);
    const paletteEntries = {};
    while (!at(TOKEN_TYPES.RBRACE, TOKEN_TYPES.EOF)) {
      const nameTok = consume(TOKEN_TYPES.IDENT);
      consume(TOKEN_TYPES.EQUALS);
      const hexTok  = consume(TOKEN_TYPES.HEX) || consume(TOKEN_TYPES.BAD_HEX);
      if (nameTok && hexTok) {
        paletteEntries[nameTok.value] = hexTok.value;
      } else {
        const bad = peek();
        errors.push(_mkErr(`Unexpected token '${bad.value}' in palette block`, loc()));
        consume(); // guarantee progress
      }
    }
    consume(TOKEN_TYPES.RBRACE);
    return paletteEntries;
  }

  // ── part operations ──
  function parseOp(partId, opIndex) {
    const l = loc();
    const verb = peek().value;
    const opId = `op:${partId || 'part'}:${opIndex}:${verb}`;

    if (verb === 'symmetry') {
      consume(); // 'symmetry'
      const axisTok = consume(TOKEN_TYPES.IDENT);
      const axis = axisTok?.value || 'x';
      return { id: opId, op: 'symmetry', axis, loc: l, sourceSpan: l };
    }

    if (verb === 'trace') {
      consume(); // 'trace'
      if (atValue('outline')) consume();
      if (atValue('from'))    consume();
      let region = 'image.region.unknown';
      if (atValue('image')) {
        consume();
        consume(TOKEN_TYPES.DOT);
        const part1 = consume(TOKEN_TYPES.IDENT);
        consume(TOKEN_TYPES.LPAREN);
        const keyTok = consume(TOKEN_TYPES.STRING);
        consume(TOKEN_TYPES.RPAREN);
        if (part1 && keyTok) region = `image.${part1.value}.${keyTok.value}`;
      }
      return { id: opId, op: 'trace', source: region, intent: true, loc: l, sourceSpan: l };
    }

    if (verb === 'fill') {
      consume();
      const colRef = _parseColorRef();
      return { id: opId, op: 'fill', colorRef: colRef, loc: l, sourceSpan: l };
    }

    if (verb === 'rim') {
      consume();
      const colRef = _parseColorRef();
      let compass = 'north';
      if (atValue('at')) {
        consume();
        const compassParts = [];
        while (at(TOKEN_TYPES.IDENT) && ['north','south','east','west'].includes(peek().value)) {
          compassParts.push(consume().value);
        }
        compass = compassParts.join(' ') || 'north';
      }
      return { id: opId, op: 'rim', colorRef: colRef, compass, loc: l, sourceSpan: l };
    }

    if (verb === 'cell') {
      consume();
      const xTok = consume(TOKEN_TYPES.INT);
      const yTok = consume(TOKEN_TYPES.INT);
      const colRef = _parseColorRef();
      return {
        id: opId,
        op: 'cell',
        x: xTok ? parseInt(xTok.value, 10) : 0,
        y: yTok ? parseInt(yTok.value, 10) : 0,
        colorRef: colRef,
        loc: l,
        sourceSpan: l,
      };
    }

    if (verb === 'glow') {
      consume();
      if (atValue('radius')) consume();
      const rTok = consume(TOKEN_TYPES.INT);
      return { id: opId, op: 'glow', radius: rTok ? parseInt(rTok.value, 10) : 1, hint: true, loc: l, sourceSpan: l };
    }

    if (verb === 'circle') {
      consume();
      const cxTok = consume(TOKEN_TYPES.INT);
      const cyTok = consume(TOKEN_TYPES.INT);
      if (atValue('radius')) consume();
      const rTok = consume(TOKEN_TYPES.INT);
      const colRef = _parseColorRef();
      return {
        id: opId, op: 'circle',
        cx: cxTok ? parseFloat(cxTok.value) : 0,
        cy: cyTok ? parseFloat(cyTok.value) : 0,
        radius: rTok ? parseFloat(rTok.value) : 0,
        colorRef: colRef,
        loc: l, sourceSpan: l,
      };
    }

    if (verb === 'ring') {
      consume();
      const cxTok = consume(TOKEN_TYPES.INT);
      const cyTok = consume(TOKEN_TYPES.INT);
      if (atValue('radius')) consume();
      const rTok = consume(TOKEN_TYPES.INT);
      if (atValue('width')) consume();
      const wTok = consume(TOKEN_TYPES.INT);
      const colRef = _parseColorRef();
      return {
        id: opId, op: 'ring',
        cx: cxTok ? parseFloat(cxTok.value) : 0,
        cy: cyTok ? parseFloat(cyTok.value) : 0,
        radius: rTok ? parseFloat(rTok.value) : 0,
        width: wTok ? parseFloat(wTok.value) : 1,
        colorRef: colRef,
        loc: l, sourceSpan: l,
      };
    }

    if (verb === 'rect') {
      consume();
      const xTok = consume(TOKEN_TYPES.INT);
      const yTok = consume(TOKEN_TYPES.INT);
      const wTok = consume(TOKEN_TYPES.INT);
      const hTok = consume(TOKEN_TYPES.INT);
      const colRef = _parseColorRef();
      return {
        id: opId, op: 'rect',
        x: xTok ? parseFloat(xTok.value) : 0,
        y: yTok ? parseFloat(yTok.value) : 0,
        w: wTok ? parseFloat(wTok.value) : 0,
        h: hTok ? parseFloat(hTok.value) : 0,
        colorRef: colRef,
        loc: l, sourceSpan: l,
      };
    }

    if (verb === 'polygon') {
      consume();
      const points = [];
      while (at(TOKEN_TYPES.INT)) {
        const xt = consume();
        const yt = consume(TOKEN_TYPES.INT);
        if (xt && yt) points.push([parseFloat(xt.value), parseFloat(yt.value)]);
        else break;
      }
      const colRef = _parseColorRef();
      return { id: opId, op: 'polygon', points, colorRef: colRef, loc: l, sourceSpan: l };
    }

    if (verb === 'path') {
      consume();
      const dTok = consume(TOKEN_TYPES.STRING);
      const colRef = _parseColorRef();
      return { id: opId, op: 'path', d: dTok ? dTok.value : '', colorRef: colRef, loc: l, sourceSpan: l };
    }

    if (verb === 'sphere') {
      consume();
      const cxTok = consume(TOKEN_TYPES.INT);
      const cyTok = consume(TOKEN_TYPES.INT);
      if (atValue('radius')) consume();
      const rTok = consume(TOKEN_TYPES.INT);

      let lx = -1, ly = -1;
      if (atValue('light')) {
        consume();
        const lxTok = consume(TOKEN_TYPES.INT);
        const lyTok = consume(TOKEN_TYPES.INT);
        if (lxTok) lx = parseFloat(lxTok.value);
        if (lyTok) ly = parseFloat(lyTok.value);
      }

      const tierColorRefs = [];
      while (tierColorRefs.length < 5 &&
             (at(TOKEN_TYPES.IDENT) || at(TOKEN_TYPES.HEX) || at(TOKEN_TYPES.BAD_HEX))) {
        tierColorRefs.push(_parseColorRef());
      }

      return {
        id: opId, op: 'sphere',
        cx: cxTok ? parseFloat(cxTok.value) : 0,
        cy: cyTok ? parseFloat(cyTok.value) : 0,
        radius: rTok ? parseFloat(rTok.value) : 0,
        lx, ly,
        tierColorRefs,
        loc: l, sourceSpan: l,
      };
    }

    // Unknown verb inside part
    const bad = peek();
    errors.push(_mkErr(`Unknown part op '${bad.value}'`, l));
    consume();
    return null;
  }

  function _parseColorRef() {
    if (at(TOKEN_TYPES.HEX)) {
      const tok = consume(TOKEN_TYPES.HEX);
      return { kind: 'hex', value: tok.value };
    }
    if (at(TOKEN_TYPES.BAD_HEX)) {
      const tok = consume(TOKEN_TYPES.BAD_HEX);
      return { kind: 'hex', value: tok.value };
    }
    if (at(TOKEN_TYPES.IDENT)) {
      const tok = consume(TOKEN_TYPES.IDENT);
      return { kind: 'alias', value: tok.value };
    }
    return { kind: 'hex', value: '#000000' };
  }

  // ── part block ──
  function parsePart() {
    if (!atValue('part')) return null;
    const l = loc();
    consume(); // 'part'
    const idTok       = consume(TOKEN_TYPES.IDENT);
    // optional 'material' keyword
    let material = 'source';
    if (atValue('material')) {
      consume(); // 'material'
      const matTok = consume(TOKEN_TYPES.IDENT);
      material = matTok?.value || 'source';
    }
    expect(TOKEN_TYPES.LBRACE, undefined, `Expected '{' for part '${idTok?.value}'`);
    const partId = idTok?.value || 'unnamed';
    const ops = [];
    let opIndex = 0;
    while (!at(TOKEN_TYPES.RBRACE, TOKEN_TYPES.EOF)) {
      const op = parseOp(partId, opIndex++);
      if (op) ops.push(op);
    }
    consume(TOKEN_TYPES.RBRACE);
    return { id: partId, material, ops, loc: l, sourceSpan: l };
  }

  // ── export declaration ──
  function parseExport() {
    if (!atValue('export')) return null;
    consume(); // 'export'
    const targets = [];
    while (at(TOKEN_TYPES.IDENT)) {
      targets.push(consume().value);
    }
    return targets;
  }

  // ── Program ──
  const assetDecl = parseAsset();
  if (!assetDecl) {
    errors.push(_mkErr(`Missing 'asset' declaration`, { line: 1, col: 1 }));
  }

  const palette = (atValue('palette') ? parsePalette() : null) || {};
  const parts = [];
  while (atValue('part')) {
    const p = parsePart();
    if (p) parts.push(p);
  }
  const exports = (atValue('export') ? parseExport() : null) || ['json'];

  // Build AST
  const ast = {
    contract:       'SCDL-AST-v1',
    version:        '1.0.0',
    checksum,
    asset:          assetDecl?.asset || 'unnamed',
    type:           assetDecl?.type  || 'unknown',
    canvas:         assetDecl?.canvas || { width: 0, height: 0 },
    palette,
    parts,
    exports,
    sourceLocation: assetDecl?.sourceLocation || { line: 1, col: 1 },
  };

  return { ast: errors.some(e => e.severity === 'ERROR') ? null : ast, rawAst: ast, errors };
}

// ─── Full tokenizer (handles # as hex vs comment) ────────────────────────────

function _tokenizeFull(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col  = 1;
  const src = String(source || '');

  function ch()    { return src[pos] || ''; }
  function ahead(n){ return src[pos + n] || ''; }
  function adv()   {
    const c = src[pos++];
    if (c === '\n') { line++; col = 1; } else { col++; }
    return c;
  }
  while (pos < src.length) {
    // whitespace
    if (/\s/.test(ch())) { adv(); continue; }

    // '#' — could be hex colour, malformed hex literal, or comment
    if (ch() === '#') {
      const savedLine = line, savedCol = col;
      adv(); // consume '#'
      // Is it 6 hex chars?
      let hex = '';
      let lookahead = 0;
      while (hex.length < 6 && /[0-9a-fA-F]/.test(ahead(lookahead))) {
        hex += src[pos + lookahead];
        lookahead++;
      }
      if (hex.length === 6 && (pos + 6 >= src.length || !/[0-9a-fA-F]/.test(src[pos + 6]))) {
        // It's a hex colour
        for (let i = 0; i < 6; i++) adv();
        tokens.push({ type: TOKEN_TYPES.HEX, value: `#${hex}`, line: savedLine, col: savedCol });
      } else if (!/\s/.test(ch())) {
        let raw = '#';
        while (pos < src.length && !/\s/.test(ch()) && !['{', '}', '(', ')'].includes(ch())) {
          raw += adv();
        }
        tokens.push({ type: TOKEN_TYPES.BAD_HEX, value: raw, line: savedLine, col: savedCol });
      } else {
        // It's a comment — skip to end of line
        while (pos < src.length && ch() !== '\n') adv();
      }
      continue;
    }

    // string literal
    if (ch() === '"') {
      const sl = line, sc = col;
      adv();
      let str = '';
      while (pos < src.length && ch() !== '"') str += adv();
      adv();
      tokens.push({ type: TOKEN_TYPES.STRING, value: str, line: sl, col: sc });
      continue;
    }

    // punctuation
    const PUNCT = { '{': TOKEN_TYPES.LBRACE, '}': TOKEN_TYPES.RBRACE,
                    '(': TOKEN_TYPES.LPAREN, ')': TOKEN_TYPES.RPAREN,
                    '=': TOKEN_TYPES.EQUALS, '.': TOKEN_TYPES.DOT };
    if (PUNCT[ch()]) {
      const t = PUNCT[ch()];
      const sl = line, sc = col;
      adv();
      tokens.push({ type: t, value: src[pos - 1], line: sl, col: sc });
      continue;
    }

    // number (and dimension 'x')
    if (/[0-9-]/.test(ch())) {
      const sl = line, sc = col;
      let num = '';
      if (ch() === '-') {
        num += adv();
        if (!/[0-9]/.test(ch())) continue;
      }
      while (/[0-9]/.test(ch())) num += adv();
      if (ch() === '.' && /[0-9]/.test(ahead(1))) {
        num += adv();
        while (/[0-9]/.test(ch())) num += adv();
      }
      tokens.push({ type: TOKEN_TYPES.INT, value: num, line: sl, col: sc });
      // if followed by 'x' and more digits → dimension separator
      if (!num.includes('.') && !num.startsWith('-') && ch() === 'x' && /[0-9]/.test(ahead(1))) {
        const xl = line, xc = col;
        adv(); // consume 'x'
        tokens.push({ type: TOKEN_TYPES.X, value: 'x', line: xl, col: xc });
      }
      continue;
    }

    // identifier
    if (/[a-zA-Z_]/.test(ch())) {
      const sl = line, sc = col;
      let id = '';
      while (/[a-zA-Z0-9_]/.test(ch())) id += adv();
      tokens.push({ type: TOKEN_TYPES.IDENT, value: id, line: sl, col: sc });
      continue;
    }

    // unknown — skip
    adv();
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: '', line, col });
  return tokens;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _checksumSource(source) {
  try {
    const h = hashString(String(source || '').trim().replace(/\r\n/g, '\n'));
    return h.toString(16).padStart(16, '0');
  } catch (_) {
    return '0000000000000000';
  }
}

function _mkErr(message, loc) {
  // Lazy import avoid circular dep — errors module imported by compiler not grammar
  return { _deferred: true, severity: 'ERROR', message, loc: loc || { line: 0, col: 0 } };
}

function _mkWarn(message, loc) {
  return { _deferred: true, severity: 'WARN', message, loc: loc || { line: 0, col: 0 } };
}
