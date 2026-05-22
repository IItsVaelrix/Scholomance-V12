/**
 * ResonanceScene.js — Phaser 3 Scene
 *
 * Renders the 9x9 "Geometric Lexicon" tactical board.
 * Receives fully-derived render state from React via public API methods.
 */

import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE  = 9;
const LABEL_OFF  = 20;   
const ARM_LEN    = 8;   
const INSET      = 2;    

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const RUNE_CHARS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᛗ', 'ᛚ', '♩', '∅', '◈', '⟁', '✦'];

const SCHOOL_COLORS = {
  SONIC:   0x651fff,
  VOID:    0x5a5a7a,
  PSYCHIC: 0x00e5ff,
  ALCHEMY: 0xe91e63,
  WILL:    0xffea00,
};

const SCHOOL_GLYPHS = {
  SONIC:   '♩',
  VOID:    '∅',
  PSYCHIC: '◈',
  ALCHEMY: '✦',
  WILL:    '⬡',
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class ResonanceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResonanceScene' });
  }

  preload() {
    // No external assets.
  }

  init(data) {
    this.onSelectCell = data?.onSelectCell ?? null;

    this._ignited         = false;
    this._schoolColor     = SCHOOL_COLORS.SONIC;
    this._tileViewModels  = [];
    this._renderedUnits   = [];
    this._cursorTile      = null;
    this._unitContainers  = new Map();
    this._tiles           = [];       
    this._labels_col      = [];
    this._labels_row      = [];

    this._calculateMetrics();
  }

  _calculateMetrics() {
    const { width, height } = this.scale;
    
    // Mathematically perfect fit: 
    // Take the minimum dimension, subtract label offsets, and divide by grid size.
    const availableSize = Math.min(width, height) - (LABEL_OFF * 2.5);
    this.cellSize = Math.floor(availableSize / GRID_SIZE);
    
    this._offsetX = -((GRID_SIZE * this.cellSize) / 2);
    this._offsetY = -((GRID_SIZE * this.cellSize) / 2);
  }

  create() {
    // Generate texture in create to ensure renderer is ready
    if (!this.textures.exists('dust')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('dust', 4, 4);
      g.destroy();
    }

    this.gridContainer = this.add.container(0, 0);
    this.unitContainer = this.add.container(0, 0);
    this.runeContainer = this.add.container(0, 0);

    this._buildLabels();
    this._buildGrid();
    this._buildAtmosphere();
    this.recenter();

    if (!this._ignited) {
      this._playIgnition();
      this._ignited = true;
    }

    this.scale.on('resize', this._handleResize, this);
  }

  _handleResize() {
    this._calculateMetrics();
    this.recenter();
    // In a full implementation, we'd reposition all tiles here.
    // For now, recenter() handles the container movement.
  }

  _buildLabels() {
    const ox = this._offsetX;
    const oy = this._offsetY;

    for (let x = 0; x < GRID_SIZE; x++) {
      const lbl = this.add.text(
        ox + x * this.cellSize + this.cellSize / 2,
        oy - LABEL_OFF,
        COL_LABELS[x],
        { fontSize: '11px', color: '#7a6030', fontFamily: 'JetBrains Mono, monospace' }
      ).setOrigin(0.5, 0.5).setAlpha(1);
      this.gridContainer.add(lbl);
      this._labels_col.push(lbl);
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      const lbl = this.add.text(
        ox - LABEL_OFF,
        oy + y * this.cellSize + this.cellSize / 2,
        (y + 1).toString(),
        { fontSize: '11px', color: '#7a6030', fontFamily: 'JetBrains Mono, monospace' }
      ).setOrigin(0.5, 0.5).setAlpha(1);
      this.gridContainer.add(lbl);
      this._labels_row.push(lbl);
    }
  }

  _buildGrid() {
    const ox = this._offsetX;
    const oy = this._offsetY;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = ox + x * this.cellSize;
        const py = oy + y * this.cellSize;

        const base = this.add.graphics();
        base.setAlpha(1);

        const shadow = this.add.graphics();
        shadow.setAlpha(0);

        const cursor = this.add.graphics();
        cursor.setAlpha(0);

        const tileContainer = this.add.container(px, py, [base, shadow, cursor]);

        tileContainer.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, this.cellSize, this.cellSize),
          Phaser.Geom.Rectangle.Contains
        );

        tileContainer.on('pointerover', () => this._onTileHover(base, x, y));
        tileContainer.on('pointerout',  () => this._onTileHoverEnd(base, x, y));
        tileContainer.on('pointerdown', () => {
          if (this.onSelectCell) this.onSelectCell({ x, y });
        });

        this.gridContainer.add(tileContainer);
        this._drawTileBase(base);
        this._tiles.push({ x, y, px, py, base, shadow, cursor, container: tileContainer });
      }
    }
  }

  _drawTileBase(gfx, vm = null) {
    gfx.clear();
    gfx.fillStyle(0x020210, 0.78);
    gfx.fillRect(0, 0, this.cellSize, this.cellSize);
    gfx.lineStyle(1, this._schoolColor, 0.18);
    gfx.strokeRect(0.5, 0.5, this.cellSize - 1, this.cellSize - 1);

    if (vm) {
      if (vm.isReachable) {
        gfx.fillStyle(0x00e5ff, 0.12);
        gfx.fillRect(1, 1, this.cellSize - 2, this.cellSize - 2);
      } else if (vm.isTargetable) {
        if (vm.previewKind === 'aoe') {
          gfx.fillStyle(0xff4444, 0.2);
        } else {
          gfx.fillStyle(0x651fff, 0.1);
        }
        gfx.fillRect(1, 1, this.cellSize - 2, this.cellSize - 2);
      }
    }
  }

  _drawTileHovered(gfx, vm = null) {
    gfx.clear();
    gfx.fillStyle(0x020210, 0.85);
    gfx.fillRect(0, 0, this.cellSize, this.cellSize);
    gfx.lineStyle(1.5, this._schoolColor, 0.42);
    gfx.strokeRect(0.5, 0.5, this.cellSize - 1, this.cellSize - 1);

    if (vm) {
      if (vm.isReachable) {
        gfx.fillStyle(0x00e5ff, 0.2); 
        gfx.fillRect(1, 1, this.cellSize - 2, this.cellSize - 2);
      } else if (vm.isTargetable) {
        if (vm.previewKind === 'aoe') {
          gfx.fillStyle(0xff4444, 0.35);
        } else {
          gfx.fillStyle(0x651fff, 0.18);
        }
        gfx.fillRect(1, 1, this.cellSize - 2, this.cellSize - 2);
      }
    }
  }

  _drawCursorOverlay(gfx) {
    gfx.clear();
    const c = this._schoolColor;
    gfx.lineStyle(2, c, 0.9);
    gfx.strokeRect(INSET, INSET, this.cellSize - INSET * 2, this.cellSize - INSET * 2);

    gfx.lineStyle(2, c, 1.0);
    const s = INSET;
    const e = this.cellSize - INSET;
    gfx.lineBetween(s, s, s + ARM_LEN, s);
    gfx.lineBetween(s, s, s, s + ARM_LEN);
    gfx.lineBetween(e, s, e - ARM_LEN, s);
    gfx.lineBetween(e, s, e, s + ARM_LEN);
    gfx.lineBetween(s, e, s + ARM_LEN, e);
    gfx.lineBetween(s, e, s, e - ARM_LEN);
    gfx.lineBetween(e, e, e - ARM_LEN, e);
    gfx.lineBetween(e, e, e, e - ARM_LEN);
  }

  _drawOccupancyShadow(gfx) {
    gfx.clear();
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(this.cellSize / 2, this.cellSize / 2, this.cellSize * 0.55, this.cellSize * 0.22);
  }

  _drawFieldEffect(gfx, kind) {
    gfx.clear();
    if (kind === 'RESONANCE_BUFF') {
      // Pulsing Gold Glyph
      gfx.lineStyle(1.5, 0xffea00, 0.6);
      gfx.strokeCircle(this.cellSize / 2, this.cellSize / 2, this.cellSize * 0.25);
      gfx.fillStyle(0xffea00, 0.1);
      gfx.fillCircle(this.cellSize / 2, this.cellSize / 2, this.cellSize * 0.25);
    } else if (kind === 'POISON_SNARE') {
      // Dark Void Ripple
      gfx.lineStyle(1.5, 0x5a5a7a, 0.6);
      gfx.strokeRect(this.cellSize * 0.3, this.cellSize * 0.3, this.cellSize * 0.4, this.cellSize * 0.4);
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillRect(this.cellSize * 0.3, this.cellSize * 0.3, this.cellSize * 0.4, this.cellSize * 0.4);
    }
  }

  _onTileHover(gfx, x, y) {
    const vm = this._tileViewModels.find(t => t.coord.x === x && t.coord.y === y);
    if (vm?.isCursor) return;
    this._drawTileHovered(gfx, vm);
  }

  _onTileHoverEnd(gfx, x, y) {
    const vm = this._tileViewModels.find(t => t.coord.x === x && t.coord.y === y);
    if (vm?.isCursor) return;
    this._drawTileBase(gfx, vm);
  }

  _buildAtmosphere() {
    const halfW = (GRID_SIZE * this.cellSize) / 2;
    const halfH = (GRID_SIZE * this.cellSize) / 2;

    const spawnRune = () => {
      if (!this.sys?.isActive()) return;
      const char = Phaser.Utils.Array.GetRandom(RUNE_CHARS);
      const rx = Phaser.Math.FloatBetween(-halfW + 8, halfW - 8);
      const ry = Phaser.Math.FloatBetween(-halfH + 8, halfH - 8);
      const rune = this.add.text(rx, ry, char, { fontSize: '13px', color: '#ffffff', fontFamily: 'serif' }).setAlpha(0);
      this.runeContainer.add(rune);
      const duration = Phaser.Math.Between(5500, 9000);
      this.tweens.add({
        targets: rune,
        x: rx + Phaser.Math.FloatBetween(-18, 18),
        y: ry + Phaser.Math.FloatBetween(-28, -8),
        alpha: { from: 0, to: 0.1 },
        duration: duration / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          rune.destroy();
          if (this.sys?.isActive()) spawnRune();
        },
      });
    };

    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 380 + 800, spawnRune);
    }
  }

  _playIgnition() {
    const cx = 4, cy = 4;
    this._tiles.forEach(tile => {
      const dist = Math.abs(tile.x - cx) + Math.abs(tile.y - cy);
      this.tweens.add({ targets: tile.base, alpha: 1, duration: 320, delay: dist * 75 + 80, ease: 'Sine.easeOut' });
    });
  }

  setArenaSchool(school) {
    this._schoolColor = SCHOOL_COLORS[school] ?? SCHOOL_COLORS.SONIC;
    if (!this._tiles.length) return;
    this._tiles.forEach(tile => {
      const vm = this._tileViewModels.find(t => t.coord.x === tile.x && t.coord.y === tile.y);
      if (!vm?.isCursor) this._drawTileBase(tile.base, vm);
    });
  }

  setCursor(coord) {
    this._tiles.forEach(tile => {
      tile.cursor.clear();
      tile.cursor.setAlpha(0);
      const vm = this._tileViewModels.find(t => t.coord.x === tile.x && t.coord.y === tile.y);
      this._drawTileBase(tile.base, vm);
    });

    this._cursorTile = coord;
    if (!coord) return;

    const tile = this._tiles.find(t => t.x === coord.x && t.y === coord.y);
    if (!tile) return;

    this._drawCursorOverlay(tile.cursor);
    tile.cursor.setAlpha(0.85);
    this.tweens.add({ targets: tile.cursor, alpha: { from: 0.65, to: 1.0 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  updateTileStates(viewModels) {
    this._tileViewModels = viewModels || [];
    if (!this._tiles.length) return;

    this._tiles.forEach(tile => {
      const vm = this._tileViewModels.find(m => m.coord.x === tile.x && m.coord.y === tile.y);
      if (!vm) return;
      this._drawTileBase(tile.base, vm);

      if (vm.hasHazard) {
        this._drawFieldEffect(tile.shadow, vm.hazardKind);
        tile.shadow.setAlpha(1);
      } else if (vm.isOccupied) {
        this._drawOccupancyShadow(tile.shadow);
        tile.shadow.setAlpha(1);
      } else {
        tile.shadow.clear();
        tile.shadow.setAlpha(0);
      }
    });
  }

  renderUnits(renderedUnits) {
    this._renderedUnits = renderedUnits || [];
    if (this._animating) {
      this._pendingUnitsRebuild = true;
      return;
    }
    this._rebuildUnits();
  }

  _rebuildUnits() {
    this._pendingUnitsRebuild = false;
    this._unitContainers.forEach(c => c.destroy());
    this._unitContainers.clear();
    if (!this.unitContainer) return;

    this._renderedUnits.forEach(unit => {
      const { px, py } = this._getTilePixelCenter(unit.position.x, unit.position.y);
      const color = SCHOOL_COLORS[unit.school] ?? SCHOOL_COLORS.SONIC;
      const glyph = SCHOOL_GLYPHS[unit.school] ?? '✦';
      const isScholar = unit.side === 'scholar';
      const container = this.add.container(px, py);

      const glow = this.add.graphics();
      glow.fillStyle(color, isScholar ? 0.13 : 0.1);
      glow.fillCircle(0, 0, isScholar ? 22 : 24);

      const sigil = this.add.graphics();
      const halfW = isScholar ? 13 : 15;
      const halfH = isScholar ? 18 : 20;
      sigil.lineStyle(isScholar ? 2 : 1.5, color, 1.0);
      sigil.beginPath();
      sigil.moveTo(0, -halfH); sigil.lineTo(halfW, 0); sigil.lineTo(0, halfH); sigil.lineTo(-halfW, 0);
      sigil.closePath(); sigil.strokePath();
      sigil.fillStyle(color, 0.2); sigil.fillCircle(0, 0, isScholar ? 7 : 8);

      const glyphText = this.add.text(0, 0, glyph, { fontSize: isScholar ? '11px' : '10px', color: `#${color.toString(16).padStart(6, '0')}`, fontFamily: 'JetBrains Mono, monospace' }).setOrigin(0.5, 0.5);

      container.add([glow, sigil, glyphText]);
      this.tweens.add({ targets: container, y: py - 6, duration: isScholar ? 2100 : 2700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.unitContainer.add(container);
      this._unitContainers.set(unit.id, container);
    });
  }

  animateMove(unitId, targetCoord, descriptor, onComplete) {
    const container = this._unitContainers.get(unitId);
    if (!container) return onComplete();
    const unit = this._renderedUnits.find(u => u.id === unitId);
    const targetPos = this._getTilePixelCenter(targetCoord.x, targetCoord.y);
    const d = descriptor.PHONEMIC_STEP || descriptor;

    // Block renderUnits from destroying this container mid-animation.
    // The existing guard in renderUnits checks this._animating but it was never set.
    this._animating = true;

    const emitter = this.add.particles(0, 0, 'dust', {
      speed: { min: 5, max: 15 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: d.particles.alpha, end: 0 },
      lifespan: d.particles.lifespan,
      frequency: d.particles.frequency,
      follow: container,
      blendMode: 'ADD'
    });
    this.unitContainer.add(emitter);

    // 1. "Grab" - Slight lift and anticipation
    this.tweens.add({
      targets: container,
      scale: 1.15,
      y: container.y - 12, // Lift up
      duration: d.anticipation.duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // 2. "Glide" - Deliberate vector traversal
        this.tweens.add({
          targets: container,
          x: targetPos.px,
          y: targetPos.py - 12, // Maintain lift
          duration: d.traversal.duration,
          ease: 'Cubic.easeInOut',
          onComplete: () => {
            // 3. "Snap" - Drop and gravity lock
            this.tweens.add({
              targets: container,
              y: targetPos.py,
              scale: 1.0,
              duration: d.settle.duration,
              ease: 'Back.easeOut',
              onComplete: () => {
                emitter.stop();
                this.time.delayedCall(d.particles.lifespan, () => emitter.destroy());

                // 4. Ripple & Glow
                this._playTileLockEffect(targetCoord, unit?.school || 'SONIC');

                // Animation complete — allow pending unit rebuild to fire.
                this._animating = false;
                if (this._pendingUnitsRebuild) this._rebuildUnits();

                onComplete();
              }
            });
          }
        });
      }
    });
  }

  animateCast(unitId, targetCoord, school, descriptor, onComplete) {
    const container = this._unitContainers.get(unitId);
    if (!container) return onComplete();
    const color = SCHOOL_COLORS[school] || SCHOOL_COLORS.SONIC;
    const d = descriptor.LEXICAL_CHARGE || descriptor;

    this._animating = true;

    const chargeParticles = this.add.particles(0, 0, 'dust', { scale: { start: 0.4, end: 0 }, alpha: { start: 0.8, end: 0 }, speed: { min: d.particles.speed / 2, max: d.particles.speed }, lifespan: 400, emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 30), quantity: d.particles.quantity }, duration: d.anticipation.duration, blendMode: 'ADD' });
    container.add(chargeParticles);
    this.tweens.add({ targets: container, angle: d.anticipation.angle, scale: d.anticipation.scale, duration: d.anticipation.duration, yoyo: true, ease: d.anticipation.ease });
    const chargeGlow = this.add.graphics();
    chargeGlow.lineStyle(2, color, 1); chargeGlow.strokeCircle(0, 0, 10); container.add(chargeGlow);
    this.tweens.add({
      targets: chargeGlow, scale: d.pulse.scale, alpha: d.pulse.alpha, duration: d.pulse.duration, ease: d.pulse.ease,
      onComplete: () => {
        chargeGlow.destroy(); chargeParticles.destroy();
        const castingUnit = this._renderedUnits.find(u => u.id === unitId);
        this.playCastEffect(castingUnit?.position ?? { x: 2, y: 4 }, targetCoord, school);

        this._animating = false;
        if (this._pendingUnitsRebuild) this._rebuildUnits();

        onComplete();
      }
    });
  }

  animateHit(affectedTiles, school, descriptor, onComplete) {
    const d = descriptor.IMPACT_FLASH || descriptor;
    affectedTiles.forEach((coord, i) => {
      const tile = this._tiles.find(t => t.x === coord.x && t.y === coord.y);
      if (!tile) return;
      const { px, py } = this._getTilePixelCenter(coord.x, coord.y);
      const burst = this.add.particles(px, py, 'dust', { speed: { min: d.particles.speed / 3, max: d.particles.speed }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 500, gravityY: 100, quantity: d.particles.quantity, duration: 100, blendMode: 'ADD' });
      this.unitContainer.add(burst);
      const flash = this.add.graphics(); flash.fillStyle(0xffffff, d.flash.alpha); flash.fillRect(0, 0, this.cellSize, this.cellSize); tile.container.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: d.flash.duration, delay: i * 30, onComplete: () => { flash.destroy(); this.time.delayedCall(500, () => burst.destroy()); } });
      if (i === 0) this.cameras.main.shake(d.shake.duration, d.shake.intensity);
    });
    this.time.delayedCall(300, onComplete);
  }

  animateTurnShift(activeSide, descriptor, onComplete) {
    const d = descriptor.TURN_SWEEP || descriptor;
    this.tweens.add({ targets: this.gridContainer, alpha: d.dim.alpha, duration: d.dim.duration, yoyo: true, ease: 'Sine.easeInOut' });
    this._unitContainers.forEach((c, id) => {
      const isActive = (activeSide === 'scholar' && id === 'player') || (activeSide === 'enemy' && id === 'opponent');
      this.tweens.add({ targets: c, scale: isActive ? d.aura.scale : 1.0, duration: d.aura.duration, ease: d.aura.ease });
    });
    this.time.delayedCall(d.aura.duration + 100, onComplete);
  }

  playCastEffect(origin, target, school = 'SONIC') {
    const start = this._getTilePixelCenter(origin.x, origin.y);
    const end = this._getTilePixelCenter(target.x, target.y);
    const color = SCHOOL_COLORS[school] ?? SCHOOL_COLORS.SONIC;
    const beam = this.add.graphics(); this.unitContainer.add(beam);
    const progress = { t: 0 };
    this.tweens.add({
      targets: progress, t: 1, duration: 380, ease: 'Quad.easeIn',
      onUpdate: () => { beam.clear(); beam.lineStyle(2, color, 0.9 * (1 - progress.t * 0.25)); beam.lineBetween(start.px, start.py, start.px + (end.px - start.px) * progress.t, start.py + (end.py - start.py) * progress.t); },
      onComplete: () => { beam.destroy(); switch (school) { case 'VOID': this._playVoidHollow(target); break; case 'PSYCHIC': this._playPsychicSchism(target); break; default: this._playRipple(target, color); } }
    });
  }

  recenter() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    if (this.gridContainer) this.gridContainer.setPosition(cx, cy);
    if (this.unitContainer) this.unitContainer.setPosition(cx, cy);
    if (this.runeContainer) this.runeContainer.setPosition(cx, cy);
  }

  _playRipple(target, color) {
    const { px, py } = this._getTilePixelCenter(target.x, target.y);
    const ring = this.add.graphics(); ring.lineStyle(2, color, 1); ring.strokeCircle(0, 0, 8);
    const c = this.add.container(px, py, [ring]); this.unitContainer.add(c);
    this.tweens.add({ targets: ring, scaleX: 7, scaleY: 7, alpha: 0, duration: 750, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
  }

  _playVoidHollow(target) {
    const { px, py } = this._getTilePixelCenter(target.x, target.y);
    const hollow = this.add.graphics(); hollow.fillStyle(0x000000, 1); hollow.fillCircle(0, 0, 5);
    const c = this.add.container(px, py, [hollow]); this.unitContainer.add(c);
    this.tweens.add({ targets: hollow, scaleX: 9, scaleY: 9, alpha: 0, duration: 680, ease: 'Expo.easeIn', onComplete: () => c.destroy() });
  }

  _playPsychicSchism(target) {
    const { px, py } = this._getTilePixelCenter(target.x, target.y);
    const c = this.add.container(px, py); this.unitContainer.add(c);
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) * (Math.PI / 180);
      const line = this.add.graphics(); line.lineStyle(2, 0x00e5ff, 0.9); line.lineBetween(0, 0, Math.cos(angle) * 34, Math.sin(angle) * 34); c.add(line);
      this.tweens.add({ targets: line, alpha: 0, x: Math.cos(angle) * 16, y: Math.sin(angle) * 16, duration: 440, ease: 'Cubic.easeOut' });
    }
    this.time.delayedCall(480, () => c.destroy());
  }

  _getTilePixelCenter(x, y) {
    return { px: this._offsetX + x * this.cellSize + this.cellSize / 2, py: this._offsetY + y * this.cellSize + this.cellSize / 2 };
  }

  _playTileLockEffect(target, school) {
    const { px, py } = this._getTilePixelCenter(target.x, target.y);
    const color = SCHOOL_COLORS[school] ?? SCHOOL_COLORS.SONIC;

    // 1. Lock-in Ripple
    const ripple = this.add.graphics();
    ripple.lineStyle(2, color, 0.8);
    ripple.strokeRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
    
    const rippleContainer = this.add.container(px, py, [ripple]);
    this.gridContainer.add(rippleContainer);

    this.tweens.add({
      targets: ripple,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => rippleContainer.destroy()
    });

    // 2. Snap Glow
    const glow = this.add.graphics();
    glow.fillStyle(color, 0.3);
    glow.fillRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
    
    const glowContainer = this.add.container(px, py, [glow]);
    this.gridContainer.add(glowContainer);

    this.tweens.add({
      targets: glow,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => glowContainer.destroy()
    });
  }
}
