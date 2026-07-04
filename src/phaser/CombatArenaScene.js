import Phaser from 'phaser';
import { generateBattleLeylines } from '../../codex/core/leyline.engine.js';
import { processorBridge } from '../../codex/core/shared/processor-bridge.js';
import { ITEM_DATABASE } from '../data/itemDatabase.js';
import { combat_leylineUri } from '../pages/Combat/assets/generated/combat-leyline.js';
import { CombatStatController } from '../game/combat/combatStatController.js';

const PALETTES = {
  voidsteel: { shine: 0x4a5a7a, lit: 0x2a3a5a, core: 0x1a2a4a, rim: 0x0a1020, shadow: 0x050510 },
  void_ice: { shine: 0x88bbdd, lit: 0x447799, core: 0x224466, rim: 0x112233, shadow: 0x08111a },
  obsidian: { shine: 0x332244, lit: 0x221133, core: 0x110022, rim: 0x0a0011, shadow: 0x05000a },
  amethyst: { shine: 0xffaaff, lit: 0xcc55ff, core: 0x8800bb, rim: 0x440077, shadow: 0x220044 },
  cyan_glow: { shine: 0x00ffff, lit: 0x0088cc, core: 0x004488, rim: 0x002244, shadow: 0x001122 },
  royal_purple: { shine: 0xd8b2ff, lit: 0x9b66ff, core: 0x6600cc, rim: 0x330066, shadow: 0x1a0033 },
  // Light checker cell — a subtly-lit arcane slate that reads against obsidian without going muddy.
  arcane_slate: { shine: 0x453a5e, lit: 0x2e2440, core: 0x1e1730, rim: 0x120c20, shadow: 0x080512 }
};

// Character walk cycle: f0 is the idle/rest pose, f1..f8 are the 8 walk frames.
// The base body and every frame-locked armor asset export this same f0..f8 layout.
const WALK_FRAME_COUNT = 8;

// Geologic Bytecode Opcodes
const OP = {
  UPLIFT: 0x01,
  ERODE: 0x02,
  FOLD: 0x03,
  SMOOTH: 0x04,
  FLATTEN: 0x05 // Intentional intelligent carving
};

export default function createCombatArenaScene(phaserRuntime) {
  return class CombatArenaScene extends phaserRuntime.Scene {
    constructor() {
      super({ key: 'CombatArenaScene' });
      const lMag = Math.sqrt(1 + 1);
      this.lx = -1 / lMag;
      this.ly = -1 / lMag;
    }

    preload() {
      // Load actual ideal-human textures from generated-assets.
      // f0 = idle/rest pose; f1..f8 = the 8-frame walk cycle.
      for (let i = 0; i <= WALK_FRAME_COUNT; i++) {
        const key = `ideal-human-f${i}`;
        this.load.image(key, `/generated-assets/IdealHuman/IdealHuman-f${i}-png.png`);
      }

      // Load all armor sprite frames from the item database (same f0..f8 layout,
      // frame-locked to the body so equipped walking stays in sync).
      Object.values(ITEM_DATABASE).forEach(item => {
        if (item.sprite) {
          const basePath = item.sprite.replace('-f0-png.png', '');
          for (let i = 0; i <= WALK_FRAME_COUNT; i++) {
            if (i === 0) this.load.image(item.assetId, `${basePath}-f0-png.png`);
            this.load.image(`${item.assetId}-f${i}`, `${basePath}-f${i}-png.png`);
          }
        }
      });
    }

    getLambertColor(nx, ny, nz, palette) {
      const mag = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      const nnx = nx / mag;
      const nny = ny / mag;
      const nnz = nz / mag;
      
      // Light comes from top-left-forward
      const cosTheta = (nnx * this.lx) + (nny * this.ly) + (nnz * 0.5); 
      
      if (cosTheta >= 0.70) return palette.shine;
      if (cosTheta >= 0.30) return palette.lit;
      if (cosTheta >= -0.10) return palette.core;
      if (cosTheta >= -0.50) return palette.rim;
      return palette.shadow;
    }

    create() {
    console.log('[CombatArenaScene] Starting...');
      const { width, height } = this.scale;
      this.cameras.main.scrollX = -width / 2;
      // Shift camera slightly up to frame the obelisk peak
      this.cameras.main.scrollY = -height / 2 - 40;
      
      // Zoom out to give the island breathing room and reveal the space around it.
      // Universe bg is now massively oversized + resize handler to ensure it always fills the full viewport (no side black bars).
      this.cameras.main.setZoom(1.1);

      // Subtle camera idle drift to sell "alive" parallax-on-stars
      // Note: galaxy redraw on resize ensures full viewport fill even after drift/zoom
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: this.cameras.main.scrollX + 3,
        scrollY: this.cameras.main.scrollY - 2,
        duration: 7000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Initialize Doom Fire Canvas Texture (32x48 grid)
      this.fireW = 32;
      this.fireH = 48;
      this.fireTexture = this.textures.createCanvas('doom-fire', this.fireW, this.fireH);
      this.fireContext = this.fireTexture.getContext();
      this.fireImageData = this.fireContext.createImageData(this.fireW, this.fireH);
      this.firePixels = new Float32Array(this.fireW * this.fireH);
      this._frameSeed = 1;
      
      // Bottom row will be dynamically seeded in update() for a flame shape

      // Disable default browser right-click menu so we can use right-click for inspection
      this.input.mouse.disableContextMenu();

      if (this.cameras.main.postFX) {
        // Keep a handle on the bloom so the obelisk discharge can flash it.
        this.baseBloom = 1.5;
        this.bloomFx = this.cameras.main.postFX.addBloom(0x00ffff, 1, 1, 1.2, this.baseBloom);
        this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.6);
        this.cameras.main.postFX.addNoise(0.04);
      }

      this.drawGalaxyBackground();

      // Keep camera centered on universe when window resizes (prevents black bars shifting)
      // ALSO refresh galaxy bg so it continues to take up the WHOLE viewport (gene-enforced).
      this.scale.on('resize', (gameSize) => {
        this.cameras.main.scrollX = -gameSize.width / 2;
        this.cameras.main.scrollY = -gameSize.height / 2 - 40;
        if (this.galaxyBg) {
          this.galaxyBg.destroy();
        }
        this.drawGalaxyBackground();
      });
      
      // Global left-click handler for interacting
      this.input.on('pointerdown', (pointer) => {
        try {
          const hitObjects = this.input.hitTestPointer(pointer) || [];
          if (hitObjects.length > 0) {
            const gameObject = hitObjects[0];
            
            if ((pointer.button === 0 || (pointer.leftButtonDown && pointer.leftButtonDown())) && gameObject.interactData) {
              console.log(`[Combat] Left-click: Interacting with Tile (${gameObject.interactData.tx}, ${gameObject.interactData.ty})`);
              this.events.emit('tile-interact', {
                ...gameObject.interactData,
                type: 'interact'
              });
              
              // Brief feedback flash for interact
              if (gameObject.setFillStyle) {
                gameObject.setFillStyle(PALETTES.void_ice.shine, 0.8);
                this.time.delayedCall(150, () => {
                  if (gameObject.input && gameObject.input.isOver) gameObject.setFillStyle(PALETTES.cyan_glow.shine, 0.3);
                  else gameObject.setFillStyle(0xffffff, 0);
                });
              }
            }
          }
        } catch (e) {
          console.error("Pointerdown error:", e);
          this.events.emit('tile-error', { type: 'error', text: e.message });
        }
      });

      // BULLETPROOF native right-click override via manual raycasting
      if (this.game.canvas) {
        this.game.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          try {
            const canvasBounds = this.game.canvas.getBoundingClientRect();
            const x = e.clientX - canvasBounds.left;
            const y = e.clientY - canvasBounds.top;
            
            // Project DOM screen coordinates into Phaser World space
            const worldPoint = this.cameras.main.getWorldPoint(x, y);
            
            // Iterate from top to bottom (z-index)
            const children = this.sys.displayList.getChildren();
            let hitTile = null;
            
            for (let i = children.length - 1; i >= 0; i--) {
              const child = children[i];
              if (child.inspectData && child.input && child.input.hitArea) {
                // Polygons are mapped at 0,0 local, so worldPoint directly checks against the hitArea
                if (Phaser.Geom.Polygon.Contains(child.input.hitArea, worldPoint.x, worldPoint.y)) {
                  hitTile = child;
                  break;
                }
              }
            }
            
            if (hitTile) {
              // Project the isometric lattice world coordinate into 2D screen space
              let bounds = new Phaser.Geom.Rectangle();
              Phaser.Geom.Polygon.GetAABB(hitTile.input.hitArea, bounds);
              const tileWorldX = bounds.centerX;
              const tileWorldY = bounds.centerY;
                
              // Convert world space to screen space
              const displayPoint = new Phaser.Math.Vector2();
              displayPoint.x = (tileWorldX - this.cameras.main.scrollX) * this.cameras.main.zoom;
              displayPoint.y = (tileWorldY - this.cameras.main.scrollY) * this.cameras.main.zoom;
                
              console.log(`[Combat] Native Right-click: Inspecting Tile (${hitTile.inspectData.tx}, ${hitTile.inspectData.ty})`);
              this.events.emit('tile-inspect', { 
                ...hitTile.inspectData,
                screenX: displayPoint.x, 
                screenY: displayPoint.y,
                type: 'inspect'
              });
              
              if (hitTile.setFillStyle) {
                hitTile.setFillStyle(PALETTES.amethyst.shine, 0.6);
                this.time.delayedCall(150, () => {
                  if (hitTile.input && hitTile.input.isOver) hitTile.setFillStyle(PALETTES.cyan_glow.shine, 0.3);
                  else hitTile.setFillStyle(0xffffff, 0);
                });
              }
            }
          } catch (err) {
            console.error("Contextmenu error:", err);
            this.events.emit('tile-error', { type: 'error', text: err.message });
          }
        });
      }

      // Generate the massive voxel terrain via Geologic VM
      const terrainRadius = 14; 
      const terrainSize = terrainRadius * 2 + 1;
      const heightmap = this.runGeologicVM(terrainSize, terrainRadius);
      
      this.drawVoxelTerrain(heightmap, terrainSize, terrainRadius);

      // Sporadic ice smoke — one shared emitter, single particle per burst,
      // 3–5s gaps. Caps simultaneous wisps well under 3.
      if (this.icePeakPositions && this.icePeakPositions.length > 0) {
        // Continuous vapor. Each puff is emitted from a random peak and its alpha ramps
        // 0 → peak → 0 across its life, so wisps breathe in and out instead of the old
        // one-particle-every-few-seconds burst that popped in and out like a god particle.
        const peaks = this.icePeakPositions;
        const peakZone = {
          getRandomPoint: (point) => {
            const peak = Phaser.Utils.Array.GetRandom(peaks);
            point.x = peak.x + Phaser.Math.Between(-6, 6);
            point.y = peak.y + Phaser.Math.Between(-4, 4);
            return point;
          }
        };
        const iceSmokeEmitter = this.add.particles(0, 0, 'ice-smoke', {
          speed: { min: 3, max: 9 },
          angle: { min: 255, max: 285 },              // gentle upward drift
          scale: { start: 0.16, end: 0.6 },           // a small puff that expands as it rises
          alpha: { values: [0, 0.22, 0.18, 0], ease: 'Sine.easeInOut' }, // fade in, hold, fade out
          rotate: { min: -15, max: 15 },
          lifespan: { min: 4500, max: 7000 },
          frequency: 850,                             // a soft, steady stream — no dead gaps
          quantity: 1,
          blendMode: 'NORMAL',
          emitZone: { type: 'random', source: peakZone },
        });
        iceSmokeEmitter.setDepth(40); // Ice vapor drifts in front of the arena geometry, like the snow
      }

      // Draw the crisp combat grid on top
      const gridSize = 9;
      const tw = 80;
      const th = 40;
      const toIso = (tx, ty) => {
        const ox = tx - Math.floor(gridSize / 2);
        const oy = ty - Math.floor(gridSize / 2);
        return {
          x: (ox - oy) * (tw / 2),
          y: (ox + oy) * (th / 2)
        };
      };

      // Generate battle leylines from the engine
      // Leylines must NEVER appear on runes. Runes live exclusively on the diagonals.
      const runeBlocked = [];
      for (let i = 0; i < gridSize; i++) {
        runeBlocked.push({ x: i, y: i });                 // main diagonal
        runeBlocked.push({ x: i, y: gridSize - 1 - i });  // anti-diagonal
      }
      // dedupe center (already blocked)
      const uniqueBlocked = [...new Set(runeBlocked.map(c => `${c.x},${c.y}`))]
        .map(k => { const [x,y] = k.split(',').map(Number); return {x,y}; })
        .filter(c => !(c.x === 4 && c.y === 4));

      this.leylines = generateBattleLeylines({
         battleSeed: 1337,
         width: gridSize,
         height: gridSize,
         blockedCoords: [{x: 4, y: 4}, ...uniqueBlocked], // Center + all rune diagonals blocked
         count: 5 // Scatter 5 leylines across the battlefield
      });

      // The combat grid sits perfectly flush on the carved plateau
      const targetZ = 12;
      const zScale = 4;
      const plateauZ = targetZ * zScale;
      
      this.draw3DGrid(gridSize, tw, th, toIso, plateauZ);
      
      // Draw the massive central obelisk
      this.drawObelisk(tw, th, plateauZ);
      
      // Place torches on the sides of the obelisk
      const cx = 0;
      const cy = -plateauZ;
      this.drawTorch(cx - tw, cy); // Left
      this.drawTorch(cx + tw, cy); // Right
      
      this.drawTeleportationPortal();

      // Spawn the new IdealHuman character model on the grid inside a Container
      const playerPos = toIso(4, 6);
      
      const playerContainer = this.add.container(playerPos.x, playerPos.y - plateauZ);
      playerContainer.setDepth(25); // Starts in front of obelisk
      
      // The SCDL export draws the figure on a 64x128 canvas with the feet at
      // y~112, leaving ~16px of empty padding below. Origin (0.5, 1) would pin
      // that empty canvas bottom to the tile center, floating the feet ~16px
      // north (up-screen) onto the tile's back edge. Anchor to the feet row so
      // the character plants on the tile CENTER. All body-part layers share this
      // one canvas coordinate system, so every layer MUST use the same origin.
      const FEET_ORIGIN_Y = 112 / 128; // = 0.875, the feet row of the shared canvas
      const playerImg = this.add.sprite(0, 0, 'ideal-human-f0');
      playerImg.setOrigin(0.5, FEET_ORIGIN_Y);
      playerContainer.add(playerImg);

      // Armor layers on top of base model
      const armorLayers = {
        chest: this.add.sprite(0, 0, 'ideal-human-f0').setOrigin(0.5, FEET_ORIGIN_Y).setVisible(false),
        legs: this.add.sprite(0, 0, 'ideal-human-f0').setOrigin(0.5, FEET_ORIGIN_Y).setVisible(false),
        boots: this.add.sprite(0, 0, 'ideal-human-f0').setOrigin(0.5, FEET_ORIGIN_Y).setVisible(false),
        head: this.add.sprite(0, 0, 'ideal-human-f0').setOrigin(0.5, FEET_ORIGIN_Y).setVisible(false),
        weapon: this.add.sprite(0, 0, 'ideal-human-f0').setOrigin(0.5, FEET_ORIGIN_Y).setVisible(false),
      };
      playerContainer.add(armorLayers.chest);
      playerContainer.add(armorLayers.legs);
      playerContainer.add(armorLayers.boots);
      playerContainer.add(armorLayers.head);
      playerContainer.add(armorLayers.weapon);
      
      // Register SCDL compiled frames as Phaser animations
      this.anims.create({
        key: 'player-walk',
        frames: Array.from({ length: WALK_FRAME_COUNT }, (_, k) => ({ key: `ideal-human-f${k + 1}` })),
        frameRate: 18,
        repeat: -1
      });
      this.anims.create({
        key: 'player-idle',
        frames: [{ key: 'ideal-human-f0' }],
        frameRate: 1,
        repeat: -1
      });

      // Register animations for armor pieces
      Object.values(ITEM_DATABASE).forEach(item => {
        if (item.sprite) {
          this.anims.create({
            key: `${item.assetId}-walk`,
            frames: Array.from({ length: WALK_FRAME_COUNT }, (_, k) => ({ key: `${item.assetId}-f${k + 1}` })),
            frameRate: 18,
            repeat: -1
          });
        }
      });

      playerImg.play('player-idle');

      // Give him a subtle breathing animation (default idle)
      this.idleTween = this.tweens.add({
        targets: [playerImg, ...Object.values(armorLayers)],
        scaleY: 0.98,
        y: 1, // Local sink
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Store player and input for the update loop
      this.playerImg = playerImg;
      this.playerArmorLayers = armorLayers;
      this.playerContainer = playerContainer;
      this.playerGridPos = { tx: 4, ty: 6 };
      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown', this.handleGlobalKeydown);
      
      // Listen for React equipment changes
      window.addEventListener('equipment-changed', this.handleEquipmentChange);
      // Ask for initial equipment state
      window.dispatchEvent(new CustomEvent('request-equipment-state'));
      this.isWalking = false;

      // Helper to compute grid to screen position
      this.getIsoTarget = (tx, ty) => {
        const ox = tx - Math.floor(gridSize / 2);
        const oy = ty - Math.floor(gridSize / 2);
        return {
          x: (ox - oy) * (tw / 2),
          y: (ox + oy) * (th / 2) - plateauZ
        };
      };

      // --- Combat stat tree (slice 1) ---
      this.stats = new CombatStatController();
      this.stats.registerEntity('player', { tx: 4, ty: 6 });

      // Sparring dummy: reuse the IdealHuman idle pose as a fixed attack target.
      this.dummyGridPos = { tx: 4, ty: 4 };
      const dummyScreen = this.getIsoTarget(this.dummyGridPos.tx, this.dummyGridPos.ty);
      this.dummyContainer = this.add.container(dummyScreen.x, dummyScreen.y);
      this.dummyContainer.setDepth(24);
      const dummyImg = this.add.sprite(0, 0, 'ideal-human-f0');
      dummyImg.setOrigin(0.5, FEET_ORIGIN_Y);
      dummyImg.setTint(0x88aacc); // cool tint so it reads as "not the player"
      this.dummyContainer.add(dummyImg);
      this.dummyImg = dummyImg;
      this.stats.registerEntity('dummy', { hp: 100, maxHp: 100, tx: this.dummyGridPos.tx, ty: this.dummyGridPos.ty });

      // Procedural smoke wisp — FBM noise with soft circular mask, light cool-gray
      if (!this.textures.exists('smoke-wisp')) {
        const w = 128, h = 128;
        const sTex = this.textures.createCanvas('smoke-wisp', w, h);
        const sCtx = sTex.getContext();
        const imageData = sCtx.createImageData(w, h);
        const data = imageData.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let n = 0, amp = 1, freq = 0.05, max = 0;
            for (let o = 0; o < 4; o++) {
              n += this.smoothNoise2D(x * freq, y * freq) * amp;
              max += amp;
              amp *= 0.5;
              freq *= 2;
            }
            n = Math.max(0, (n / max - 0.45) * 2.4);
            const dx = x - w / 2, dy = y - h / 2;
            const r = Math.sqrt(dx * dx + dy * dy) / (w / 2);
            const edge = Math.max(0, 1 - r);
            const edgeSoft = edge * edge * (3 - 2 * edge);
            const a = Math.min(1, n * edgeSoft) * 0.9;
            const idx = (y * w + x) * 4;
            data[idx] = 210;
            data[idx + 1] = 205;
            data[idx + 2] = 220;
            data[idx + 3] = Math.floor(a * 255);
          }
        }
        sCtx.putImageData(imageData, 0, 0);
        sTex.refresh();
      }

      // Continuous mist mass — large overlapping sprites with offset breathing cycles
      const mistConfigs = [
        { x: -320, y: 290, scale: 3.4, alpha: 0.18 },
        { x: -160, y: 260, scale: 3.9, alpha: 0.20 },
        { x: 20,   y: 305, scale: 3.6, alpha: 0.22 },
        { x: 200,  y: 270, scale: 3.7, alpha: 0.20 },
        { x: 340,  y: 295, scale: 3.2, alpha: 0.18 }
      ];
      mistConfigs.forEach((cfg, i) => {
        const m = this.add.image(cfg.x, cfg.y, 'smoke-wisp');
        m.setDepth(60); // Atmospheric haze drifts in front of the arena geometry (portal 50, torches 30)
        m.setBlendMode(Phaser.BlendModes.NORMAL);
        m.setAlpha(cfg.alpha);
        m.setScale(cfg.scale);
        this.tweens.add({
          targets: m,
          alpha: cfg.alpha * 0.4,
          scale: cfg.scale * 1.08,
          x: cfg.x + Phaser.Math.Between(-18, 18),
          y: cfg.y + Phaser.Math.Between(-10, 10),
          duration: Phaser.Math.Between(6500, 9500),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 700
        });
      });

      this.boundHandleCombatCast = this.handleCombatCast.bind(this);
      window.addEventListener('combat-cast', this.boundHandleCombatCast);
      this.events.once('destroy', () => {
        window.removeEventListener('combat-cast', this.boundHandleCombatCast);
      });

      this.boundHandleHudAttack = () => this.performBasicAttack();
      this.boundHandleHudEndTurn = () => this.endPlayerTurn();
      window.addEventListener('combat-attack', this.boundHandleHudAttack);
      window.addEventListener('combat-endturn', this.boundHandleHudEndTurn);
      this.events.once('destroy', () => {
        window.removeEventListener('combat-attack', this.boundHandleHudAttack);
        window.removeEventListener('combat-endturn', this.boundHandleHudEndTurn);
      });
      this.emitCombatStats(); // seed the HUD with initial values

      this.events.emit('arena-ready');
    }

    handleCombatCast(event) {
      const { text, weave } = event.detail;
      const weaveStr = (weave || '').toLowerCase();
      const textStr = (text || '').toLowerCase();
      
      if (weaveStr.includes('enchant') && weaveStr.includes('flame') && textStr.includes('incinerator blade')) {
        const sword = this.playerArmorLayers['weapon'];
        if (sword && sword.visible) {
          sword.setTint(0xff6600); // fiery
          
          if (this.add.particles) {
            const flameEmitter = this.add.particles(0, 0, 'doom-fire', {
              speed: { min: 30, max: 80 },
              angle: { min: 250, max: 290 },
              scale: { start: 0.5, end: 0 },
              alpha: { start: 0.8, end: 0 },
              blendMode: 'ADD',
              lifespan: 500,
              gravityY: -100,
              tint: 0xffaa00
            });
            flameEmitter.startFollow(sword);
            if (!this.activeEnchantments) this.activeEnchantments = [];
            this.activeEnchantments.push(flameEmitter);
            
            console.log("Sword Enchanted with Flames! Bonus Burn Damage Applied.");
          }
        }
      }
    }

    handleEquipmentChange = (event) => {
      const equipment = event.detail;
      if (!this.playerArmorLayers) return;
      
      const layerMap = {
        'head': this.playerArmorLayers.head,
        'chest': this.playerArmorLayers.chest,
        'legs': this.playerArmorLayers.legs,
        'boots': this.playerArmorLayers.boots,
        'weapon': this.playerArmorLayers.weapon
      };
      
      for (const [slot, sprite] of Object.entries(layerMap)) {
        if (!sprite) continue;
        const item = equipment[slot];
        const assetId = item ? item.assetId : null;
        const frame0Id = assetId ? `${assetId}-f0` : null;
        if (frame0Id && this.textures.exists(frame0Id)) {
          sprite.setTexture(frame0Id);
          sprite.setVisible(true);
        } else {
          sprite.setVisible(false);
        }
      }
    };
    
    emitCombatStats = () => {
      const p = this.stats?.getEntity('player');
      const d = this.stats?.getEntity('dummy');
      if (!p) return;
      window.dispatchEvent(new CustomEvent('combat-stats-changed', {
        detail: {
          movementPointsRemaining: p.movementPointsRemaining,
          movementPoints: p.movementPoints,
          attackPoints: p.attackPoints,
          attackRange: p.attackRange,
          attackUsed: p.attackUsed,
          dummyHp: d ? d.hp : null,
          dummyMaxHp: d ? d.maxHp : null,
        },
      }));
    };

    performBasicAttack = () => {
      if (!this.stats) return;
      const [targetId] = this.stats.inRangeTargetIds('player', ['dummy']);
      if (!targetId) return; // No valid target in range.
      const result = this.stats.resolveAttack('player', targetId);
      if (!result) return;
      // Quick hit-flash on the dummy (tween-based; no setTintFill — Phaser 4 safe).
      if (this.dummyContainer) {
        this.tweens.add({
          targets: this.dummyContainer,
          alpha: 0.35,
          yoyo: true,
          duration: 80,
          repeat: 1,
        });
        if (result.targetDefeated) {
          this.tweens.add({ targets: this.dummyContainer, alpha: 0, duration: 400, delay: 200 });
        }
      }
      this.emitCombatStats();
    };

    endPlayerTurn = () => {
      if (!this.stats) return;
      this.stats.endTurn('player');
      this.emitCombatStats();
    };

    handleGlobalKeydown = (e) => {
      if (this.isWalking) return;

      if (e.key === 'f' || e.key === 'F') { this.performBasicAttack(); return; }
      if (e.key === ' ' || e.key === 'Enter') { this.endPlayerTurn(); return; }

      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'w') { dx = -1; dy = 0; }
      else if (e.key === 'ArrowDown' || e.key === 's') { dx = 1; dy = 0; }
      else if (e.key === 'ArrowLeft' || e.key === 'a') { dx = 0; dy = 1; }
      else if (e.key === 'ArrowRight' || e.key === 'd') { dx = 0; dy = -1; }
      
      if (dx === 0 && dy === 0) return;
      
      const newTx = this.playerGridPos.tx + dx;
      const newTy = this.playerGridPos.ty + dy;
      
      // Grid bounds (0-8)
      if (newTx < 0 || newTx > 8 || newTy < 0 || newTy > 8) return;
      
      // Teleporter Collision (top right corner 8, 0)
      if (newTx === 8 && newTy === 0) {
        console.log("Blocked by Teleporter collision!");
        return;
      }

      if (this.stats && !this.stats.canMove('player')) {
        return; // Out of movement points this turn.
      }

      this.isWalking = true;
      this.playerGridPos.tx = newTx;
      this.playerGridPos.ty = newTy;

      if (this.stats) {
        this.stats.spendMove('player');
        this.stats.setPosition('player', newTx, newTy);
        this.emitCombatStats();
      }

      const targetPos = this.getIsoTarget(newTx, newTy);
      
      const bobTargets = [this.playerImg, ...Object.values(this.playerArmorLayers)].filter(Boolean);
      if (this.playerImg) {
        this.playerImg.play('player-walk', true);
        Object.values(this.playerArmorLayers).forEach(layer => {
          if (layer && layer.visible && layer.texture.key) {
             const baseAssetId = layer.texture.key.replace(/-f\d+$/, '');
             const walkKey = baseAssetId + '-walk';
             if (this.anims.exists(walkKey)) {
                layer.play(walkKey, true);
             }
          }
        });

        // Procedural walk bob: pause the idle breathing and add a subtle vertical
        // rise on each passing frame (~2 dips per stride) so the stride has weight.
        // Applied to every layer together, on top of the feet-anchored origin.
        if (this.idleTween) this.idleTween.pause();
        bobTargets.forEach(s => { s.y = 0; s.scaleY = 1; });
        if (this.walkBob) this.walkBob.stop();
        this.walkBob = this.tweens.add({
          targets: bobTargets,
          y: -2.5,
          duration: 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      this.tweens.add({
        targets: this.playerContainer,
        x: targetPos.x,
        y: targetPos.y,
        duration: 350,
        onComplete: () => {
          this.isWalking = false;
          // Stop the walk bob, settle the layers, and hand vertical motion back
          // to the idle breathing tween.
          if (this.walkBob) { this.walkBob.stop(); this.walkBob = null; }
          bobTargets.forEach(s => { s.y = 0; s.scaleY = 1; });
          if (this.idleTween) this.idleTween.resume();
          if (this.playerImg) {
            this.playerImg.play('player-idle', true);
            Object.values(this.playerArmorLayers).forEach(layer => {
               if (layer && layer.visible && layer.texture.key) {
                 layer.stop();
                 const baseAssetId = layer.texture.key.replace(/-f\d+$/, '');
                 const idleKey = baseAssetId + '-f0';
                 if (this.textures.exists(idleKey)) {
                   layer.setTexture(idleKey);
                 }
               }
            });
          }
        }
      });
    };

    // Custom deterministic Value Noise since Phaser doesn't bundle SimplexNoise by default
    noise2D(x, y) {
      const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
      return hash - Math.floor(hash);
    }

    smoothNoise2D(x, y) {
      const intX = Math.floor(x);
      const intY = Math.floor(y);
      const fracX = x - intX;
      const fracY = y - intY;
      
      // Bilinear interpolation
      const v1 = this.noise2D(intX, intY);
      const v2 = this.noise2D(intX + 1, intY);
      const v3 = this.noise2D(intX, intY + 1);
      const v4 = this.noise2D(intX + 1, intY + 1);
      
      const i1 = v1 * (1 - fracX) + v2 * fracX;
      const i2 = v3 * (1 - fracX) + v4 * fracX;
      
      return i1 * (1 - fracY) + i2 * fracY;
    }

    runGeologicVM(size, radius) {
      // 1. Initial Tectonic Density Map using Value Noise
      let map = Array(size).fill(0).map(() => Array(size).fill(0));
      
      for(let x=0; x<size; x++) {
        for(let y=0; y<size; y++) {
          // Distance from center to create an island mask
          const dx = x - radius;
          const dy = y - radius;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist > radius) continue; // Cutoff to circle

          // Multiple noise octaves - much smoother and lower frequency
          const n1 = this.smoothNoise2D(x * 0.05, y * 0.05);
          const n2 = this.smoothNoise2D(x * 0.15, y * 0.15) * 0.3;
          
          // Dome shape multiplier
          const dome = Math.max(0, 1 - Math.pow(dist / radius, 1.2));
          
          map[x][y] = (n1 + n2) * dome * 15; // Gentler base height
        }
      }

      // 2. Geologic Bytecode Instructions Program (Intentional Construction)
      const program = [
        { op: OP.UPLIFT, amount: 2, freq: 0.1 }, // Gentle natural variance
        { op: OP.ERODE, passes: 4, capacity: 1.0 }, // Natural weathering
        { op: OP.SMOOTH, passes: 5 }, // Very smooth natural terrain
        // Intelligent Design Pass: Carve a perfect flat plateau for the arena foundation
        { op: OP.FLATTEN, radius: 5.5, targetZ: 12, blend: 2 } 
      ];

      // Execute VM Program
      program.forEach(inst => {
        switch(inst.op) {
          case OP.UPLIFT:
            for(let x=0; x<size; x++) {
              for(let y=0; y<size; y++) {
                if (map[x][y] > 0) {
                  const upliftNoise = this.smoothNoise2D(x * inst.freq + 100, y * inst.freq + 100);
                  if (upliftNoise > 0.5) map[x][y] += inst.amount * upliftNoise;
                }
              }
            }
            break;
            
          case OP.FOLD:
            for(let x=0; x<size; x++) {
              for(let y=0; y<size; y++) {
                if (map[x][y] > 0) {
                  // Create ridges
                  const fold = Math.sin((inst.axis ? x : y) * 0.5);
                  if (fold > 0.5) map[x][y] += inst.severity * fold;
                }
              }
            }
            break;

          case OP.ERODE:
            // Cellular Automata erosion
            for(let p=0; p<inst.passes; p++) {
              let nextMap = JSON.parse(JSON.stringify(map));
              for(let x=1; x<size-1; x++) {
                for(let y=1; y<size-1; y++) {
                  if (map[x][y] <= 0) continue;
                  
                  let lowestNeighbor = map[x][y];
                  let targetX = x, targetY = y;
                  
                  // Check 4 neighbors
                  const neighbors = [[-1,0], [1,0], [0,-1], [0,1]];
                  neighbors.forEach(([dx, dy]) => {
                    if (map[x+dx][y+dy] < lowestNeighbor) {
                      lowestNeighbor = map[x+dx][y+dy];
                      targetX = x+dx;
                      targetY = y+dy;
                    }
                  });
                  
                  const diff = map[x][y] - lowestNeighbor;
                  if (diff > inst.capacity) {
                    const sediment = diff * 0.3; // Transport 30% of diff
                    nextMap[x][y] -= sediment;
                    nextMap[targetX][targetY] += sediment;
                  }
                }
              }
              map = nextMap;
            }
            break;

          case OP.SMOOTH:
            for(let p=0; p<inst.passes; p++) {
              let nextMap = JSON.parse(JSON.stringify(map));
              for(let x=1; x<size-1; x++) {
                for(let y=1; y<size-1; y++) {
                  if (map[x][y] <= 0) continue;
                  let sum = map[x][y];
                  sum += map[x-1][y] + map[x+1][y] + map[x][y-1] + map[x][y+1];
                  nextMap[x][y] = sum / 5;
                }
              }
              map = nextMap;
            }
            break;
            
          case OP.FLATTEN:
            // Simulates intelligent mages carving a foundation
            for(let x=0; x<size; x++) {
              for(let y=0; y<size; y++) {
                const dx = x - radius;
                const dy = y - radius;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist <= inst.radius) {
                  // Perfect flat foundation
                  map[x][y] = inst.targetZ;
                } else if (dist <= inst.radius + inst.blend) {
                  // Terraced blend down to natural terrain
                  const t = (dist - inst.radius) / inst.blend;
                  // Lerp between targetZ and natural terrain
                  map[x][y] = inst.targetZ * (1 - t) + map[x][y] * t;
                }
              }
            }
            break;
        }
      });

      return map;
    }

    drawVoxelTerrain(heightmap, size, radius) {
      this.icePeakPositions = [];
      const graphics = this.add.graphics();
      graphics.setDepth(5); // Island terrain above galaxy but below grid if needed (gene protected)
      
      const shimmerGraphics = this.add.graphics();
      shimmerGraphics.setDepth(6); // Ice peaks sit just above the island terrain (5), below the grid (10)
      if (shimmerGraphics.postFX) {
        shimmerGraphics.postFX.addShine(1, 0.2, 5, false); // Shimmer shader
        shimmerGraphics.postFX.addBloom(0x00ffff, 1, 1, 1.5, 1.2); // Ice bloom
      }
      
      const vTw = 60; // voxel tile width
      const vTh = 30; // voxel tile height
      const zScale = 4; // multiplier for height z

      // Painter's algorithm: sort voxels back to front
      const voxels = [];
      for(let x=0; x<size; x++) {
        for(let y=0; y<size; y++) {
          if (heightmap[x][y] > 1) {
            voxels.push({ x, y, z: heightmap[x][y] });
          }
        }
      }
      voxels.sort((a, b) => (a.x + a.y) - (b.x + b.y));

      voxels.forEach(v => {
        let isEdge = false;
        const neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
        for(let [dx,dy] of neighbors) {
           const nx = v.x+dx, ny = v.y+dy;
           if (nx < 0 || ny < 0 || nx >= size || ny >= size || heightmap[nx][ny] <= 1) {
              isEdge = true;
              break;
           }
        }

        // Quantize height for chunked bitmask look
        let blockZ = Math.floor(v.z) * zScale;
        let isTallestPeak = false;
        if (isEdge) {
           const extraHeight = 80 + Math.random() * 60;
           blockZ += extraHeight; // Make perimeter walls massively tall
           if (extraHeight > 125) isTallestPeak = true; // Only top ~25% of perimeter walls
        }
        
        // Base coordinate (0,0 is center)
        const ox = v.x - radius;
        const oy = v.y - radius;
        
        const px = (ox - oy) * (vTw / 2);
        const py = (ox + oy) * (vTh / 2);

        // Calculate discrete normal from local derivatives for layered shading
        const hLeft = v.x > 0 ? heightmap[v.x-1][v.y] : 0;
        const hRight = v.x < size-1 ? heightmap[v.x+1][v.y] : 0;
        const hUp = v.y > 0 ? heightmap[v.x][v.y-1] : 0;
        const hDown = v.y < size-1 ? heightmap[v.x][v.y+1] : 0;
        
        const dx = hRight - hLeft;
        const dy = hDown - hUp;
        
        // Color ramping based on elevation bands
        let palette = PALETTES.voidsteel; // deep trench rock
        if (isEdge) {
           palette = PALETTES.obsidian; // Force the wall perimeter to be obsidian
        } else if (v.z > 22) {
           palette = PALETTES.cyan_glow; // glowing peaks
        } else if (v.z > 14) {
           palette = PALETTES.void_ice; // snowy/icy slopes
        } else if (v.z > 8) {
           palette = PALETTES.obsidian; // mid rock
        }
        // Top face normal is affected by slope
        const topColor = this.getLambertColor(-dx, -dy, 4, palette);
        // Left face normal (-1, 1, 0)
        const leftColor = this.getLambertColor(-1, 1, 0, palette);
        // Right face normal (1, 1, 0)
        const rightColor = this.getLambertColor(1, 1, 0, palette);

        // Base geometry definition for a 3D isometric column
        // We project the base far down to give the floating island deep roots
        const rootDepth = 250 - (Math.abs(ox) + Math.abs(oy)) * 10;
        
        const pTopCenter = { x: px, y: py - blockZ };
        const pTopLeft = { x: px - vTw/2, y: py + vTh/2 - blockZ };
        const pTopRight = { x: px + vTw/2, y: py + vTh/2 - blockZ };
        const pTopBottom = { x: px, y: py + vTh - blockZ };

        const pBotLeft = { x: px - vTw/2, y: py + vTh/2 + rootDepth };
        const pBotRight = { x: px + vTw/2, y: py + vTh/2 + rootDepth };
        const pBotBottom = { x: px, y: py + vTh + rootDepth };

        // Left Face
        graphics.fillStyle(leftColor, 1);
        graphics.beginPath();
        graphics.moveTo(pTopLeft.x, pTopLeft.y);
        graphics.lineTo(pTopBottom.x, pTopBottom.y);
        graphics.lineTo(pBotBottom.x, pBotBottom.y);
        graphics.lineTo(pBotLeft.x, pBotLeft.y);
        graphics.closePath();
        graphics.fillPath();

        // Right Face
        graphics.fillStyle(rightColor, 1);
        graphics.beginPath();
        graphics.moveTo(pTopBottom.x, pTopBottom.y);
        graphics.lineTo(pTopRight.x, pTopRight.y);
        graphics.lineTo(pBotRight.x, pBotRight.y);
        graphics.lineTo(pBotBottom.x, pBotBottom.y);
        graphics.closePath();
        graphics.fillPath();

        let hitPolyPoints;

        if (isEdge) {
           const variant = Math.random() > 0.5 ? 1 : 2;
           let tip;
           if (variant === 1) {
               // Variant 1: Centered Spire
               tip = { x: pTopCenter.x, y: pTopCenter.y - 30 - Math.random() * 40 };
           } else {
               // Variant 2: Asymmetrical Slanted Shard
               const lean = Math.random() > 0.5 ? 25 : -25;
               tip = { x: pTopCenter.x + lean, y: pTopCenter.y - 15 - Math.random() * 25 };
           }
           
           if (isTallestPeak) {
               // Obsidian Crystal Wall Tip transitions to Shining Ice Peak
               const icyLeft = this.getLambertColor(-1, 1, 0, PALETTES.cyan_glow);
               const icyRight = this.getLambertColor(1, 1, 0, PALETTES.cyan_glow);

               // Left Crystal Face
               shimmerGraphics.fillStyle(icyLeft, 1);
               shimmerGraphics.beginPath();
               shimmerGraphics.moveTo(pTopLeft.x, pTopLeft.y);
               shimmerGraphics.lineTo(pTopBottom.x, pTopBottom.y);
               shimmerGraphics.lineTo(tip.x, tip.y);
               shimmerGraphics.closePath();
               shimmerGraphics.fillPath();
               
               // Right Crystal Face
               shimmerGraphics.fillStyle(icyRight, 1);
               shimmerGraphics.beginPath();
               shimmerGraphics.moveTo(pTopBottom.x, pTopBottom.y);
               shimmerGraphics.lineTo(pTopRight.x, pTopRight.y);
               shimmerGraphics.lineTo(tip.x, tip.y);
               shimmerGraphics.closePath();
               shimmerGraphics.fillPath();

               // Add stroke details to the shimmer layer
               shimmerGraphics.lineStyle(1.5, PALETTES.cyan_glow.shine, 0.8);
               shimmerGraphics.beginPath();
               shimmerGraphics.moveTo(pTopLeft.x, pTopLeft.y);
               shimmerGraphics.lineTo(tip.x, tip.y);
               shimmerGraphics.lineTo(pTopRight.x, pTopRight.y);
               shimmerGraphics.moveTo(pTopBottom.x, pTopBottom.y);
               shimmerGraphics.lineTo(tip.x, tip.y);
               shimmerGraphics.strokePath();
               
                // Emit softly drifting snowflakes from the frozen peak
                if (this.add.particles) {
                    const snow = this.add.particles(tip.x, tip.y, 'twinkle-star', {
                        speedY: { min: 10, max: 30 },
                        speedX: { min: -15, max: 15 },
                        scale: { start: 0.2, end: 0 },
                        alpha: { start: 0.6, end: 0 },
                        lifespan: { min: 2000, max: 5000 },
                        frequency: Phaser.Math.Between(400, 1500),
                        blendMode: 'ADD',
                        tint: 0xaaffff
                    });
                    snow.setDepth(40); // Falling snow is atmospheric — in front of the arena geometry

                    // Record this peak for the shared ice-smoke emitter
                    this.icePeakPositions.push({ x: tip.x, y: tip.y });
                }
           } else {
               // Normal Obsidian Crystal Wall Tip
               graphics.fillStyle(leftColor, 1);
               graphics.beginPath();
               graphics.moveTo(pTopLeft.x, pTopLeft.y);
               graphics.lineTo(pTopBottom.x, pTopBottom.y);
               graphics.lineTo(tip.x, tip.y);
               graphics.closePath();
               graphics.fillPath();
               
               graphics.fillStyle(rightColor, 1);
               graphics.beginPath();
               graphics.moveTo(pTopBottom.x, pTopBottom.y);
               graphics.lineTo(pTopRight.x, pTopRight.y);
               graphics.lineTo(tip.x, tip.y);
               graphics.closePath();
               graphics.fillPath();
           }

           hitPolyPoints = [tip.x, tip.y, pTopRight.x, pTopRight.y, pTopBottom.x, pTopBottom.y, pTopLeft.x, pTopLeft.y];
        } else {
           // Normal Flat Top Face
           graphics.fillStyle(topColor, 1);
           graphics.beginPath();
           graphics.moveTo(pTopCenter.x, pTopCenter.y);
           graphics.lineTo(pTopRight.x, pTopRight.y);
           graphics.lineTo(pTopBottom.x, pTopBottom.y);
           graphics.lineTo(pTopLeft.x, pTopLeft.y);
           graphics.closePath();
           graphics.fillPath();

           hitPolyPoints = [pTopCenter.x, pTopCenter.y, pTopRight.x, pTopRight.y, pTopBottom.x, pTopBottom.y, pTopLeft.x, pTopLeft.y];
        }

        // Quantized bitmask-style rim lines
        graphics.lineStyle(1, palette.lit, isEdge ? 0.6 : 0.4);
        graphics.strokePath();

        // Create an interactive zone wrapping this voxel's top geometry
        const poly = new Phaser.Geom.Polygon(hitPolyPoints);

        const interactiveTile = this.add.polygon(0, 0, hitPolyPoints, 0xffffff, 0).setOrigin(0).setDepth(15);
        interactiveTile.setInteractive(poly, Phaser.Geom.Polygon.Contains);

        interactiveTile.inspectData = { tx: v.x, ty: v.y, isIsland: true, height: v.z };
        interactiveTile.interactData = { tx: v.x, ty: v.y, isIsland: true, height: v.z };

        interactiveTile.on('pointerover', () => {
          interactiveTile.setFillStyle(PALETTES.cyan_glow.shine, 0.3); // Bright hover glow
          this.input.setDefaultCursor('pointer');
        });

        interactiveTile.on('pointerout', () => {
          interactiveTile.setFillStyle(0xffffff, 0); // Hide
          this.input.setDefaultCursor('default');
        });
      });
    }

    draw3DGrid(gridSize, tw, th, toIso, zOffset) {
      const graphics = this.add.graphics();
      graphics.setDepth(10); // Arena grid on top of galaxy background (gene protected)

      
      const tiles = [];
      for (let tx = 0; tx < gridSize; tx++) {
        for (let ty = 0; ty < gridSize; ty++) {
          tiles.push({ tx, ty });
        }
      }
      tiles.sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty));

      tiles.forEach(({ tx, ty }) => {
        const pt = toIso(tx, ty);
        const depth = 8; 
        
        const isDiagonal = (tx === ty) || (tx === gridSize - 1 - ty);
        // Dark checker cell (and all rune diagonals) are obsidian black.
        let palette = PALETTES.obsidian;

        // Light checker cell: a clean, intentional arcane-slate tone — reads as a board,
        // stays dark and grimoire. Diagonals stay obsidian so the rune tiles are uniform.
        if (!isDiagonal && (tx + ty) % 2 === 0) {
           palette = PALETTES.arcane_slate;
        }

        const topColor = this.getLambertColor(0, 0, 1, palette);
        const leftFaceColor = this.getLambertColor(-1, 1, 0, palette);
        const rightFaceColor = this.getLambertColor(1, 1, 0, palette);

        const py = pt.y - zOffset;

        const p1 = { x: pt.x, y: py - th/2 };
        const p2 = { x: pt.x + tw/2, y: py };
        const p3 = { x: pt.x, y: py + th/2 };
        const p4 = { x: pt.x - tw/2, y: py };

        // Left Face
        graphics.fillStyle(leftFaceColor, 1);
        graphics.beginPath();
        graphics.moveTo(p4.x, p4.y);
        graphics.lineTo(p3.x, p3.y);
        graphics.lineTo(p3.x, p3.y + depth);
        graphics.lineTo(p4.x, p4.y + depth);
        graphics.closePath();
        graphics.fillPath();

        // Right Face
        graphics.fillStyle(rightFaceColor, 1);
        graphics.beginPath();
        graphics.moveTo(p3.x, p3.y);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(p2.x, p2.y + depth);
        graphics.lineTo(p3.x, p3.y + depth);
        graphics.closePath();
        graphics.fillPath();

        // Top Face
        graphics.fillStyle(topColor, 1);
        graphics.beginPath();
        graphics.moveTo(p1.x, p1.y);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(p3.x, p3.y);
        graphics.lineTo(p4.x, p4.y);
        graphics.closePath();
        graphics.fillPath();

        graphics.lineStyle(1.5, palette.lit, 0.6);
        graphics.strokePath();

        if (isDiagonal && (tx !== 4 || ty !== 4)) {
          this.drawVectorRune(pt.x, py, tw, th);
        }

        // Render Leylines from the engine
        // Double guard: leylines never appear on runes (diagonal tiles)
        const leyline = this.leylines && this.leylines.find(l => l.coord.x === tx && l.coord.y === ty);
        let lColor = null;
        if (leyline && !isDiagonal) {
           const colors = {
             'ALCHEMY': 0xff3300, 'PSYCHIC': 0xff00ff, 'VITAL': 0x00ffaa,
             'SONIC': 0xffff00, 'LORE': 0x0088ff, 'CELESTIAL': 0xffffff,
             'WARD': 0x88bbff, 'NECROTIC': 0x99ffcc, 'CODEX': 0xaa00ff,
             'ENTROPY': 0x444444, 'VOID': 0x220044
           };
           lColor = colors[leyline.affinity] || 0xffffff;

           // === TASK 1: Wire the actual PixelBrain PNG prop ===
           // Use the generated high-fidelity fissure PNG (badlands cracks) instead of vector.
           // Tint per affinity so color resonates correctly. The PNG carries the eroded structure.
           if (!this.textures.exists('leyline-fissure')) {
             this.textures.addBase64('leyline-fissure', combat_leylineUri);
           }
           const fissure = this.add.image(pt.x, py + 1, 'leyline-fissure');
           fissure.setScale(0.48, 0.62); // Bumped for visibility. 0.32/0.42 read too small as a ground fissure indicator on the isometric tile.
           fissure.setTint(lColor);
           fissure.setAlpha(0.93);
           fissure.setBlendMode(Phaser.BlendModes.ADD);
           fissure.setDepth(8);

           // Store for hover soundwave pulsing
           if (!this.leylineVisuals) this.leylineVisuals = new Map();
           this.leylineVisuals.set(`${tx},${ty}`, {
             fissure,
             color: lColor,
             baseScaleX: fissure.scaleX,
             baseScaleY: fissure.scaleY,
             x: pt.x,
             y: py
           });
        }

        // Overlay an interactive invisible polygon on the top face for mouse events
        const hitPoly = new Phaser.Geom.Polygon([
          p1.x, p1.y,
          p2.x, p2.y,
          p3.x, p3.y,
          p4.x, p4.y
        ]);

        const interactiveTile = this.add.polygon(0, 0, hitPoly.points, 0xffffff, 0).setOrigin(0).setDepth(15);
        interactiveTile.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
        
        interactiveTile.inspectData = { 
          tx, ty, isGrid: true, 
          leyline: (leyline && !isDiagonal) ? { affinity: leyline.affinity, id: leyline.id } : null,
          isObelisk: (tx === 4 && ty === 4)
        };
        
        interactiveTile.interactData = { 
          tx, ty, isGrid: true, 
          leyline: (leyline && !isDiagonal) ? { affinity: leyline.affinity, id: leyline.id } : null,
          isObelisk: (tx === 4 && ty === 4)
        };

        // Attach leyline data for targeted hover effects
        if (leyline && !isDiagonal) {
          interactiveTile.leylineHover = { tx, ty, color: lColor };
        }

        interactiveTile.on('pointerover', () => {
          interactiveTile.setFillStyle(PALETTES.cyan_glow.shine, 0.3); // Bright hover glow
          this.input.setDefaultCursor('pointer');

          // Leyline-specific: pulse with soundwaves
          if (interactiveTile.leylineHover) {
            this.startLeylineSoundwavePulse(interactiveTile.leylineHover);
          }
        });

        interactiveTile.on('pointerout', () => {
          interactiveTile.setFillStyle(0xffffff, 0); // Hide
          this.input.setDefaultCursor('default');

          if (interactiveTile.leylineHover) {
            this.stopLeylineSoundwavePulse(interactiveTile.leylineHover);
          }
        });
      });
    }

    // PixelBrain: Hover soundwave pulse for leylines
    // When hovering a leyline tile, create expanding soundwave rings in the affinity color.
    // Feels like sonic resonance pulsing outward from the fissures.
    startLeylineSoundwavePulse(leylineData) {
      const key = `${leylineData.tx},${leylineData.ty}`;
      if (!this.leylineVisuals || !this.leylineVisuals.has(key)) return;
      if (this.leylineWaves && this.leylineWaves.has(key)) return; // already pulsing

      const visual = this.leylineVisuals.get(key);
      const { x, y, color } = visual;

      if (!this.leylineWaves) this.leylineWaves = new Map();
      const waveEntry = { gfs: [], tweens: [] };
      this.leylineWaves.set(key, waveEntry);

      // Create 3 staggered expanding soundwave rings (isometric ellipse)
      // Each ring gets its own Graphics so they don't fight on clear()
      for (let i = 0; i < 3; i++) {
        const delay = i * 160;
        const progress = { val: 0 };

        const ringGfx = this.add.graphics();
        ringGfx.setPosition(x, y);
        ringGfx.setDepth(7);
        waveEntry.gfs.push(ringGfx);

        const tween = this.tweens.add({
          targets: progress,
          val: 1,
          duration: 720,
          delay,
          repeat: -1,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            const p = progress.val;
            ringGfx.clear();

            const maxW = 52;
            const maxH = 24; // isometric squash

            const w = maxW * p;
            const h = maxH * p;
            const alpha = Math.max(0.08, (1 - p) * 0.75);

            // Outer wave ring
            ringGfx.lineStyle(2.5, color, alpha);
            ringGfx.strokeEllipse(0, 0, w, h);

            // Inner detail ring for richer soundwave texture
            if (p > 0.2) {
              ringGfx.lineStyle(1, color, alpha * 0.6);
              ringGfx.strokeEllipse(0, 0, w * 0.55, h * 0.55);
            }
          }
        });

        waveEntry.tweens.push(tween);
      }

      // Subtle pulse on the fissure itself for extra presence
      if (visual.fissure && visual.baseScaleX) {
        const pulseTween = this.tweens.add({
          targets: visual.fissure,
          scaleX: visual.baseScaleX * 1.07,
          scaleY: visual.baseScaleY * 1.07,
          duration: 380,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        waveEntry.tweens.push(pulseTween);
      }
    }

    stopLeylineSoundwavePulse(leylineData) {
      const key = `${leylineData.tx},${leylineData.ty}`;
      if (!this.leylineWaves || !this.leylineWaves.has(key)) return;

      const entry = this.leylineWaves.get(key);
      entry.tweens.forEach(t => t.stop());
      entry.gfs.forEach(g => g && g.destroy());

      // Restore fissure scale
      const visual = this.leylineVisuals && this.leylineVisuals.get(key);
      if (visual && visual.fissure && visual.baseScaleX) {
        visual.fissure.setScale(visual.baseScaleX, visual.baseScaleY);
      }

      this.leylineWaves.delete(key);
    }

    // Ensure waves are cleaned if the scene shuts down
    shutdown() {
      if (this.leylineWaves) {
        this.leylineWaves.forEach(entry => {
          entry.tweens.forEach(t => t.stop());
          entry.gfs.forEach(g => g && g.destroy());
        });
        this.leylineWaves.clear();
      }
    }

    drawVectorRune(x, y, tw, th) {
      const graphics = this.add.graphics();
      graphics.setBlendMode(Phaser.BlendModes.ADD);
      
      graphics.fillStyle(PALETTES.cyan_glow.core, 0.4);
      graphics.fillEllipse(x, y, tw * 0.4, th * 0.4);

      graphics.lineStyle(3, PALETTES.cyan_glow.shine, 1);
      const type = (Math.abs(Math.floor(x)) + Math.abs(Math.floor(y))) % 3;
      
      graphics.beginPath();
      if (type === 0) {
        graphics.moveTo(x, y - th*0.15);
        graphics.lineTo(x + tw*0.12, y + th*0.15);
        graphics.lineTo(x - tw*0.12, y + th*0.15);
        graphics.closePath();
        graphics.moveTo(x - tw*0.06, y);
        graphics.lineTo(x + tw*0.06, y);
      } else if (type === 1) {
        graphics.moveTo(x, y - th*0.2);
        graphics.lineTo(x + tw*0.12, y);
        graphics.lineTo(x, y + th*0.2);
        graphics.lineTo(x - tw*0.12, y);
        graphics.closePath();
      } else {
        graphics.moveTo(x - tw*0.08, y - th*0.15);
        graphics.lineTo(x + tw*0.08, y + th*0.15);
        graphics.moveTo(x, y - th*0.15);
        graphics.lineTo(x + tw*0.16, y + th*0.15);
      }
      graphics.strokePath();
    }

    drawObelisk(tw, th, zOffset) {
      const graphics = this.add.graphics();
      graphics.setDepth(20); // Pillar on top (gene protected)
      
      const cx = 0;
      const cy = -zOffset; // Center of the grid
      
      const bRadiusX = (tw / 2) * 0.7; // Base takes up 70% of the center tile
      const bRadiusY = (th / 2) * 0.7;
      
      const shaftHeight = 160; // Reduced height to fit on screen
      const capHeight = 60;
      
      // Base points
      const bLeft = { x: cx - bRadiusX, y: cy };
      const bRight = { x: cx + bRadiusX, y: cy };
      const bBottom = { x: cx, y: cy + bRadiusY };
      
      // Top of shaft points
      const tLeft = { x: bLeft.x, y: bLeft.y - shaftHeight };
      const tRight = { x: bRight.x, y: bRight.y - shaftHeight };
      const tBottom = { x: bBottom.x, y: bBottom.y - shaftHeight };
      
      // Pyramid tip
      const tip = { x: cx, y: cy - shaftHeight - capHeight };

      // Obsidian palette for the rock
      const palette = PALETTES.obsidian;
      
      const leftFaceColor = this.getLambertColor(-1, 1, 0, palette);
      const rightFaceColor = this.getLambertColor(1, 1, 0, palette);
      const capLeftColor = this.getLambertColor(-1, 1, 2, palette);
      const capRightColor = this.getLambertColor(1, 1, 2, palette);
      
      // Left Shaft
      graphics.fillStyle(leftFaceColor, 1);
      graphics.beginPath();
      graphics.moveTo(tLeft.x, tLeft.y);
      graphics.lineTo(tBottom.x, tBottom.y);
      graphics.lineTo(bBottom.x, bBottom.y);
      graphics.lineTo(bLeft.x, bLeft.y);
      graphics.closePath();
      graphics.fillPath();

      // Right Shaft
      graphics.fillStyle(rightFaceColor, 1);
      graphics.beginPath();
      graphics.moveTo(tBottom.x, tBottom.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.lineTo(bRight.x, bRight.y);
      graphics.lineTo(bBottom.x, bBottom.y);
      graphics.closePath();
      graphics.fillPath();

      // Left Cap
      graphics.fillStyle(capLeftColor, 1);
      graphics.beginPath();
      graphics.moveTo(tLeft.x, tLeft.y);
      graphics.lineTo(tBottom.x, tBottom.y);
      graphics.lineTo(tip.x, tip.y);
      graphics.closePath();
      graphics.fillPath();

      // Right Cap
      graphics.fillStyle(capRightColor, 1);
      graphics.beginPath();
      graphics.moveTo(tBottom.x, tBottom.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.lineTo(tip.x, tip.y);
      graphics.closePath();
      graphics.fillPath();
      
      // Sharp lit edges
      graphics.lineStyle(2, palette.lit, 0.8);
      graphics.beginPath();
      graphics.moveTo(tLeft.x, tLeft.y);
      graphics.lineTo(tip.x, tip.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.moveTo(tip.x, tip.y);
      graphics.lineTo(tBottom.x, tBottom.y);
      graphics.lineTo(bBottom.x, bBottom.y);
      graphics.strokePath();

      // Glowing Royal Purple Runes
      graphics.lineStyle(3, PALETTES.royal_purple.shine, 0.9);
      graphics.beginPath();
      // Center line rune
      graphics.moveTo(tBottom.x, tBottom.y - 10);
      graphics.lineTo(tBottom.x, bBottom.y - 20);
      graphics.strokePath();
      
      // Glowing rings
      for (let i = 1; i <= 4; i++) {
         const h = shaftHeight * (i / 5);
         const hy = cy + bRadiusY - h;
         graphics.lineStyle(2, PALETTES.royal_purple.lit, 0.8);
         graphics.beginPath();
         graphics.moveTo(cx - bRadiusX, cy - h);
         graphics.lineTo(cx, hy);
         graphics.lineTo(cx + bRadiusX, cy - h);
         graphics.strokePath();
      }
      graphics.fillStyle(PALETTES.royal_purple.shine, 1);
      graphics.fillEllipse(tip.x, tip.y, 15, 15);
      graphics.setBlendMode(Phaser.BlendModes.NORMAL);

      // ── Charge/discharge FX layers (animated in updateObeliskFx) ────────
      // Additive overlays sit above the obelisk: chargeGfx pulses the runes +
      // orb, boltGfx paints the tesla arcs during the discharge.
      const chargeGfx = this.add.graphics().setDepth(900);
      chargeGfx.setBlendMode(Phaser.BlendModes.ADD);
      const boltGfx = this.add.graphics().setDepth(1000);
      boltGfx.setBlendMode(Phaser.BlendModes.ADD);

      this.obeliskFx = {
        cx, cy, bRadiusX, bRadiusY, shaftHeight,
        orbX: tip.x, orbY: tip.y,
        spineX: tBottom.x, spineTopY: tBottom.y, baseY: bBottom.y,
        chargeGfx, boltGfx,
        phase: 'charge',
        t: 0,
        chargeMs: 3500,   // purple lines swell for ~3.5s
        dischargeMs: 480, // tesla blast
        cooldownMs: 6500, // rest between discharges
        intensity: 0,
        bolts: [],
      };
    }

    // Redraw the pulsing runes + orb glow at a given charge intensity (0..1).
    drawObeliskCharge(intensity) {
      const fx = this.obeliskFx;
      const g = fx.chargeGfx;
      g.clear();
      const i = Math.max(0, Math.min(1, intensity));
      if (i <= 0.01) return;

      const bright = PALETTES.royal_purple.shine;
      const core = PALETTES.royal_purple.core;
      const alpha = 0.25 + i * 0.75;

      // Glowing chevron rings (mirror the baked geometry, brighter with charge)
      g.lineStyle(2 + i * 2.5, bright, alpha);
      for (let k = 1; k <= 4; k++) {
        const h = fx.shaftHeight * (k / 5);
        const hy = fx.cy + fx.bRadiusY - h;
        g.beginPath();
        g.moveTo(fx.cx - fx.bRadiusX, fx.cy - h);
        g.lineTo(fx.cx, hy);
        g.lineTo(fx.cx + fx.bRadiusX, fx.cy - h);
        g.strokePath();
      }
      // Central spine
      g.lineStyle(2 + i * 2, bright, alpha);
      g.beginPath();
      g.moveTo(fx.spineX, fx.spineTopY - 10);
      g.lineTo(fx.spineX, fx.baseY - 20);
      g.strokePath();

      // Orb glow — layered radial bloom that swells as it charges
      const glowR = 8 + i * 26;
      g.fillStyle(core, 0.10 + i * 0.20);
      g.fillEllipse(fx.orbX, fx.orbY, glowR * 2.2, glowR * 2.2);
      g.fillStyle(bright, 0.20 + i * 0.35);
      g.fillEllipse(fx.orbX, fx.orbY, glowR, glowR);
      g.fillStyle(0xffffff, 0.30 + i * 0.55);
      g.fillEllipse(fx.orbX, fx.orbY, 6 + i * 8, 6 + i * 8);
    }

    // Seed the discharge bolt directions (upward-biased fan from the orb).
    buildTeslaBolts() {
      const count = 9;
      const bolts = [];
      for (let k = 0; k < count; k++) {
        const base = -Math.PI * 0.92 + (k / (count - 1)) * (Math.PI * 0.84);
        bolts.push({
          angle: base + (Math.random() - 0.5) * 0.4,
          len: 90 + Math.random() * 110,
        });
      }
      return bolts;
    }

    // Perpendicular-jittered polyline between two points (lightning path).
    jaggedPoints(x0, y0, x1, y1, segments, maxOffset) {
      const pts = [{ x: x0, y: y0 }];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / len;
      const py = dx / len;
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const taper = Math.sin(t * Math.PI); // widest jitter mid-span
        const off = (Math.random() - 0.5) * 2 * maxOffset * taper;
        pts.push({ x: x0 + dx * t + px * off, y: y0 + dy * t + py * off });
      }
      pts.push({ x: x1, y: y1 });
      return pts;
    }

    strokePolyline(g, pts, width, color, alpha) {
      if (alpha <= 0) return;
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) g.lineTo(pts[k].x, pts[k].y);
      g.strokePath();
    }

    // Regenerate the tesla arcs each frame so they crackle; `fade` is 1→0.
    drawTeslaDischarge(fade) {
      const fx = this.obeliskFx;
      const g = fx.boltGfx;
      g.clear();
      const a = Math.max(0, fade);

      // Central emission beam shooting straight up out of the orb.
      const beamLen = 150 + (1 - a) * 70;
      g.fillStyle(PALETTES.royal_purple.shine, 0.28 * a);
      g.fillTriangle(fx.orbX - 20, fx.orbY, fx.orbX + 20, fx.orbY, fx.orbX, fx.orbY - beamLen);
      g.fillStyle(0xffffff, 0.55 * a);
      g.fillTriangle(fx.orbX - 8, fx.orbY, fx.orbX + 8, fx.orbY, fx.orbX, fx.orbY - beamLen);

      for (const bolt of fx.bolts) {
        const ex = fx.orbX + Math.cos(bolt.angle) * bolt.len;
        const ey = fx.orbY + Math.sin(bolt.angle) * bolt.len;
        const pts = this.jaggedPoints(fx.orbX, fx.orbY, ex, ey, 6, bolt.len * 0.28);
        this.strokePolyline(g, pts, 9, PALETTES.royal_purple.core, 0.30 * a);    // aura
        this.strokePolyline(g, pts, 4.5, PALETTES.royal_purple.shine, 0.65 * a); // glow
        this.strokePolyline(g, pts, 2, 0xffffff, a);                            // hot core

        if (Math.random() < 0.7) {
          const bi = 2 + Math.floor(Math.random() * (pts.length - 3));
          const anchor = pts[bi];
          const bAng = bolt.angle + (Math.random() - 0.5) * 1.2;
          const bLen = bolt.len * (0.3 + Math.random() * 0.35);
          const bpts = this.jaggedPoints(
            anchor.x, anchor.y,
            anchor.x + Math.cos(bAng) * bLen, anchor.y + Math.sin(bAng) * bLen,
            4, bLen * 0.3
          );
          this.strokePolyline(g, bpts, 3, PALETTES.royal_purple.shine, 0.45 * a);
          this.strokePolyline(g, bpts, 1.25, 0xffffff, 0.8 * a);
        }
      }

      // Orb flash
      g.fillStyle(0xffffff, 0.9 * a);
      g.fillEllipse(fx.orbX, fx.orbY, 16 + (1 - a) * 22, 16 + (1 - a) * 22);
      g.fillStyle(PALETTES.royal_purple.shine, 0.55 * a);
      g.fillEllipse(fx.orbX, fx.orbY, 34 + (1 - a) * 60, 34 + (1 - a) * 60);

      // Expanding shock ring (isometric squash)
      const ringR = 20 + (1 - a) * 170;
      g.lineStyle(3.5 * a, PALETTES.royal_purple.shine, 0.6 * a);
      g.strokeEllipse(fx.orbX, fx.orbY, ringR * 2, ringR * 1.2);
    }

    updateObeliskFx(time, delta) {
      const fx = this.obeliskFx;
      if (!fx) return 0;
      fx.t += delta;

      let plasmaTarget = 0;

      if (fx.phase === 'charge') {
        const p = Math.min(1, fx.t / fx.chargeMs);
        const flicker = 1 + (Math.random() - 0.5) * 0.15 * p; // crackle as it peaks
        fx.intensity = Math.min(1, p * p * flicker);
        this.drawObeliskCharge(fx.intensity);
        if (this.bloomFx) this.bloomFx.strength = this.baseBloom + fx.intensity * 0.6;
        plasmaTarget = fx.intensity;
        if (fx.t >= fx.chargeMs) {
          fx.phase = 'discharge';
          fx.t = 0;
          fx.bolts = this.buildTeslaBolts();
        }
      } else if (fx.phase === 'discharge') {
        const p = Math.min(1, fx.t / fx.dischargeMs);
        const fade = 1 - p;
        this.drawObeliskCharge(Math.max(fade, 0.6)); // orb stays hot mid-blast
        this.drawTeslaDischarge(fade);
        if (this.bloomFx) this.bloomFx.strength = this.baseBloom + fade * 1.6;
        plasmaTarget = 1; // peak plasma during the bolt strike
        if (fx.t >= fx.dischargeMs) {
          fx.phase = 'cooldown';
          fx.t = 0;
          fx.boltGfx.clear();
        }
      } else { // cooldown
        const p = Math.min(1, fx.t / fx.cooldownMs);
        fx.intensity = (1 - p) * 0.5;
        this.drawObeliskCharge(fx.intensity);
        if (this.bloomFx) this.bloomFx.strength = this.baseBloom + fx.intensity * 0.2;
        plasmaTarget = (1 - p) * 0.35;
        if (fx.t >= fx.cooldownMs) {
          fx.phase = 'charge';
          fx.t = 0;
        }
      }

      return plasmaTarget;
    }

    applyPlasmaSmooth(plasma) {
      if (!this.torchEffects) return;
      for (const effect of this.torchEffects) {
        if (!effect.fireSprite) continue;
        const baseScale = 2.16;
        effect.fireSprite.setScale(baseScale + plasma * 0.55);
        const g = Math.floor(255 - plasma * 75);
        const tint = (255 << 16) | (g << 8) | 255;
        effect.fireSprite.setTint(tint);
        if (effect.fireSprite._plasmaBloom) {
          effect.fireSprite._plasmaBloom.strength = plasma * 1.2;
        }
      }
    }

    async update(time, delta) {
      // 1. Advance obelisk phase, draw orb/tesla, return raw plasma target
      const plasmaTarget = this.updateObeliskFx(time, delta);
      if (!this.firePixels) return;

      // 2. Hand the per-frame visual work to the AMP worker.
      //    Falls back to direct (main-thread) execution if the worker is unavailable.
      let result;
      try {
        result = await processorBridge.execute('arena.tick', {
          firePixels: this.firePixels,
          fireW: this.fireW,
          fireH: this.fireH,
          seed: this._frameSeed++,
          torcheffects: (this.torchEffects || []).map(() => ({})),
          plasma: {
            target: plasmaTarget,
            current: this._plasmaSmooth || 0,
            rate: 0.07,
          },
        });
      } catch (e) {
        console.warn('[CombatArena] arena.tick failed, skipping frame:', e.message);
        return;
      }

      if (!result) return;

      // 3. Doom fire: worker mapped the new intensity grid to RGBA already.
      //    Swap it into the existing ImageData, push to the GPU, refresh the texture.
      this.firePixels = result.firePixelsNext;
      this.fireImageData.data.set(result.fireRgba);
      this.fireContext.putImageData(this.fireImageData, 0, 0);
      this.fireTexture.refresh();

      // 4. Plasma: worker did the lerp; apply the smooth value to the torch sprites.
      this._plasmaSmooth = result.plasma.smooth;
      this.applyPlasmaSmooth(result.plasma.smooth);

      // 5. Torch glow: apply worker-computed flicker to shadow/ambient, then
      //    re-render the light-pool canvas (time-based, stays on main thread).
      if (this.torchEffects && result.torchData) {
        const t = time * 0.001;
        for (let i = 0; i < this.torchEffects.length && i < result.torchData.length; i++) {
          const effect = this.torchEffects[i];
          const { shadowScale, ambientAlpha, ambientScale } = result.torchData[i];
          effect.shadow.alpha = effect.shadow.bobAlpha * (0.85 + (result.torchData[i].flicker) * 0.15);
          effect.shadow.setScale(effect.shadow.bobScale * shadowScale, effect.shadow.bobScale * shadowScale);
          effect.ambient.alpha = ambientAlpha;
          effect.ambient.setScale(ambientScale, ambientScale);
          this.renderTorchGlowCanvas(effect, t);
        }
      }
    }

    renderTorchGlowCanvas(effect, t) {
      const ctx = effect.glowCtx;
      const size = effect.size;
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);

      ctx.globalCompositeOperation = 'source-over';
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
      grd.addColorStop(0, 'rgba(51, 0, 170, 1)');
      grd.addColorStop(1, 'rgba(51, 0, 170, 0)');
      ctx.fillStyle = grd;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      ctx.rotate(t * 1.2);
      ctx.fillRect(-45, -5, 90, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      ctx.rotate(-t * 0.8);
      ctx.fillRect(-45, -4, 90, 8);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      for (let i = 0; i < 3; i++) {
        const angle = t * 2 + (i * Math.PI * 0.6);
        const rx = Math.cos(angle) * 25;
        const ry = Math.sin(angle) * 25;
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      effect.glowTex.refresh();
    }
    
    drawTorch(x, y) {
      if (!this.torchEffects) this.torchEffects = [];
      const tIndex = this.torchEffects.length;
      
      // 0. Realistic ground shadow for the floating matrix
      const shadow = this.add.graphics();
      shadow.fillStyle(PALETTES.obsidian.shadow, 1);
      shadow.fillEllipse(0, 0, 18, 9);
      shadow.setPosition(x, y + 10);
      shadow.bobAlpha = 0.8;
      shadow.bobScale = 1.0;
      
      // 1. Ambient ground glow (Dynamic canvas for internal shadow casting)
      const size = 128;
      const texKey = 'ambient-glow-' + tIndex;
      let glowTex = this.textures.get(texKey);
      if (glowTex.key !== texKey) { // Create if it doesn't exist
          glowTex = this.textures.createCanvas(texKey, size, size);
      }
      const glowCtx = glowTex.getContext();
      
      const ambient = this.add.sprite(x, y + 10, texKey);
      ambient.setBlendMode(Phaser.BlendModes.ADD);
      
      // Container to synchronize floating bob animation
      const bobContainer = this.add.container(0, 0);

      // 2. Floating Obsidian Crystal Base (Inverted Pyramid)
      const graphics = this.add.graphics();
      const pw = 14;  
      const ph = 7;   
      const drop = 25; 
      const floatY = y - 15; // Float above ground
      
      const tTop = { x: x, y: floatY - ph };
      const tRight = { x: x + pw, y: floatY };
      const tBottom = { x: x, y: floatY + ph };
      const tLeft = { x: x - pw, y: floatY };
      const bottomTip = { x: x, y: floatY + drop };

      const palette = PALETTES.obsidian;
      const leftColor = this.getLambertColor(-1, 0.5, -0.5, palette);
      const rightColor = this.getLambertColor(1, 0.5, -0.5, palette);
      const topColor = this.getLambertColor(0, 0, 1, palette);

      graphics.fillStyle(leftColor, 1);
      graphics.beginPath();
      graphics.moveTo(tLeft.x, tLeft.y);
      graphics.lineTo(tBottom.x, tBottom.y);
      graphics.lineTo(bottomTip.x, bottomTip.y);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(rightColor, 1);
      graphics.beginPath();
      graphics.moveTo(tBottom.x, tBottom.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.lineTo(bottomTip.x, bottomTip.y);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(topColor, 1);
      graphics.beginPath();
      graphics.moveTo(tTop.x, tTop.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.lineTo(tBottom.x, tBottom.y);
      graphics.lineTo(tLeft.x, tLeft.y);
      graphics.closePath();
      graphics.fillPath();

      graphics.lineStyle(1, palette.lit, 0.8);
      graphics.beginPath();
      graphics.moveTo(tLeft.x, tLeft.y);
      graphics.lineTo(bottomTip.x, bottomTip.y);
      graphics.lineTo(tRight.x, tRight.y);
      graphics.moveTo(tBottom.x, tBottom.y);
      graphics.lineTo(bottomTip.x, bottomTip.y);
      graphics.strokePath();
      
      bobContainer.add(graphics);

      // 3. Mount the dynamic Doom Fire texture
      const fireSprite = this.add.sprite(x, floatY + 5, 'doom-fire');
      fireSprite.setOrigin(0.5, 1);
      fireSprite.setScale(2.16);
      fireSprite.setBlendMode(Phaser.BlendModes.ADD);
      if (fireSprite.postFX) {
        fireSprite._plasmaBloom = fireSprite.postFX.addBloom(0xccffff, 1, 1, 1, 0);
      }
      bobContainer.add(fireSprite);

      this.torchEffects.push({ shadow, ambient, glowTex, glowCtx, size, fireSprite });

      bobContainer.setDepth(30); // Ensure torches on top of galaxy

      // 4. Gyroscopic Containment Rings (Armillary Matrix)
      const ring1 = this.add.graphics();
      ring1.setBlendMode(Phaser.BlendModes.ADD);
      ring1.lineStyle(2, PALETTES.royal_purple.shine, 0.9);
      ring1.strokeEllipse(0, 0, 45, 15);
      ring1.setPosition(x, floatY - 20);
      ring1.rotation = 0.3;
      ring1.setDepth(31);

      const ring2 = this.add.graphics();
      ring2.setBlendMode(Phaser.BlendModes.ADD);
      ring2.lineStyle(1.5, PALETTES.royal_purple.core, 1);
      ring2.strokeEllipse(0, 0, 55, 12);
      ring2.setPosition(x, floatY - 25);
      ring2.rotation = -0.4;
      ring2.setDepth(31);
      
      bobContainer.add([ring1, ring2]);
      bobContainer.setDepth(30);
      
      // Animate rings spinning in opposite directions
      this.tweens.add({
        targets: ring1,
        rotation: ring1.rotation + Math.PI * 2,
        duration: 6000,
        repeat: -1,
        ease: 'Linear'
      });
      this.tweens.add({
        targets: ring2,
        rotation: ring2.rotation - Math.PI * 2,
        duration: 9000,
        repeat: -1,
        ease: 'Linear'
      });

      // 5. High Fidelity Particle Emitter for Doom Fire Sparks
      if (this.add.particles) {
        const emitter = this.add.particles(x, floatY - 20, 'doom-fire', {
          speed: { min: 20, max: 80 },
          angle: { min: 250, max: 290 }, // Emits upwards
          scale: { start: 0.3, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 1500,
          blendMode: 'ADD',
          frequency: 50,
          tint: [0xff4400, 0xffaa00, 0xff0044]
        });
        bobContainer.add(emitter);
      } else {
        const runes = this.add.graphics();
        runes.setBlendMode(Phaser.BlendModes.ADD);
        runes.fillStyle(PALETTES.royal_purple.lit, 1);
        runes.fillEllipse(x - 25, floatY - 45, 3, 3);
        runes.fillEllipse(x + 30, floatY - 20, 2, 2);
        runes.fillEllipse(x + 15, floatY - 55, 4, 4);
        runes.fillEllipse(x - 30, floatY - 15, 2, 2);
        bobContainer.add(runes);
      }

      // 6. Slowly bob the entire matrix up and down asynchronously
      const bobDuration = Phaser.Math.Between(1500, 2500);
      const bobDelay = Phaser.Math.Between(0, 500);
      
      this.tweens.add({
         targets: bobContainer,
         y: -12, // Float higher
         duration: bobDuration,
         yoyo: true,
         repeat: -1,
         ease: 'Sine.easeInOut',
         delay: bobDelay
      });

      // Synchronize the ground shadow with the float height
      // We tween custom properties so the update loop can mix in chaotic flickering
      this.tweens.add({
         targets: shadow,
         bobScale: 1.8,
         bobAlpha: 0.3,
         duration: bobDuration,
         yoyo: true,
         repeat: -1,
         ease: 'Sine.easeInOut',
         delay: bobDelay
      });
    }
    
    drawTeleportationPortal() {
      // Anchored on the Northeast grid tile (8,0)
      const px = 320;
      const py = -125;
      const pW = 48; // Portal width
      const pH = 160; // Portal height

      const portalGroup = this.add.container(px, py);

      // 0. Solid 3D Isometric Support Platform
      const mechPlatform = this.add.graphics();
      const platW = 60; // Width of the platform
      const platH = 30; // Isometric depth
      const platZ = 20; // Vertical thickness
      
      mechPlatform.lineStyle(2, 0x447799, 1);
      
      // Top face
      mechPlatform.fillStyle(0x0a101a, 1);
      mechPlatform.beginPath();
      mechPlatform.moveTo(0, 85 - platH);
      mechPlatform.lineTo(platW, 85);
      mechPlatform.lineTo(0, 85 + platH);
      mechPlatform.lineTo(-platW, 85);
      mechPlatform.closePath();
      mechPlatform.fillPath();
      mechPlatform.strokePath();

      // Left face
      mechPlatform.fillStyle(0x050a10, 1);
      mechPlatform.beginPath();
      mechPlatform.moveTo(-platW, 85);
      mechPlatform.lineTo(0, 85 + platH);
      mechPlatform.lineTo(0, 85 + platH + platZ);
      mechPlatform.lineTo(-platW, 85 + platZ);
      mechPlatform.closePath();
      mechPlatform.fillPath();
      mechPlatform.strokePath();

      // Right face
      mechPlatform.fillStyle(0x0f1520, 1);
      mechPlatform.beginPath();
      mechPlatform.moveTo(0, 85 + platH);
      mechPlatform.lineTo(platW, 85);
      mechPlatform.lineTo(platW, 85 + platZ);
      mechPlatform.lineTo(0, 85 + platH + platZ);
      mechPlatform.closePath();
      mechPlatform.fillPath();
      mechPlatform.strokePath();
      
      portalGroup.add(mechPlatform);

      // 1. Arcane/Technological Skeleton (Backplate)
      const mechBack = this.add.graphics();
      mechBack.fillStyle(0x0a101a, 1);
      mechBack.fillRect(-22, -80, 44, 160);
      portalGroup.add(mechBack);

      // 2. Holographic Portal Energy Surface (Cellular Drip Algorithm)
      if (!this.textures.exists('portal-energy')) {
        this.textures.createCanvas('portal-energy', pW, pH);
      }
      const portalTex = this.textures.get('portal-energy');
      const pCtx = portalTex.getContext();
      
      const portalImg = this.add.image(0, 0, 'portal-energy');
      portalImg.setBlendMode(Phaser.BlendModes.ADD);
      portalImg.setAlpha(0.9);
      if (portalImg.postFX) portalImg.postFX.addBloom(0x4400ff, 1.5, 1.5, 2, 1.5);
      portalGroup.add(portalImg);

      // 3. Imposing Mechanical Skeleton (Front frame)
      const mechFront = this.add.graphics();
      mechFront.fillStyle(0x1a2a3a, 1);
      mechFront.lineStyle(2, 0x0f1520, 1);

      mechFront.beginPath();
      // Outer border (sharp, angled geometry)
      mechFront.moveTo(-35, 85);
      mechFront.lineTo(-35, -85);
      mechFront.lineTo(-15, -105);
      mechFront.lineTo(15, -105);
      mechFront.lineTo(35, -85);
      mechFront.lineTo(35, 85);
      // Inner hole cutting through
      mechFront.lineTo(20, 85);
      mechFront.lineTo(20, -80);
      mechFront.lineTo(0, -100);
      mechFront.lineTo(-20, -80);
      mechFront.lineTo(-20, 85);
      mechFront.closePath();
      mechFront.fillPath();
      mechFront.strokePath();

      // Obsidian Bezel filling the top triangle gap
      mechFront.fillStyle(0x161220, 1); // Darker obsidian for left side
      mechFront.beginPath();
      mechFront.moveTo(-20, -80);
      mechFront.lineTo(0, -100);
      mechFront.lineTo(0, -85); // inner point
      mechFront.closePath();
      mechFront.fillPath();

      mechFront.fillStyle(0x1f192b, 1); // Brighter obsidian for right side
      mechFront.beginPath();
      mechFront.moveTo(20, -80);
      mechFront.lineTo(0, -100);
      mechFront.lineTo(0, -85);
      mechFront.closePath();
      mechFront.fillPath();

      // Sharp highlight stroke for the obsidian bezel
      mechFront.lineStyle(1, 0x443366, 0.8);
      mechFront.beginPath();
      mechFront.moveTo(-20, -80);
      mechFront.lineTo(0, -100);
      mechFront.lineTo(20, -80);
      mechFront.lineTo(0, -85);
      mechFront.closePath();
      mechFront.strokePath();

      // Arcane tech nodes
      mechFront.fillStyle(0x00ffff, 1);
      const nodes = [
        {x: -25, y: -75}, {x: 25, y: -75},
        {x: -25, y: -10}, {x: 25, y: -10},
        {x: -25, y: 55},  {x: 25, y: 55},
        {x: 0, y: -95}
      ];
      nodes.forEach(n => mechFront.fillCircle(n.x, n.y, 3));
      if (mechFront.postFX) mechFront.postFX.addBloom(0x00ffff, 1, 1, 1, 1.2);
      
      portalGroup.add(mechFront);
      portalGroup.setDepth(18); // Teleporter behind the player (player layers start at 20)

      // Arrays for 2D Water Ripple simulation
      let buf1 = new Float32Array(pW * pH);
      let buf2 = new Float32Array(pW * pH);
      let angle = 0;

      this.time.addEvent({
        delay: 30, // ~33fps
        loop: true,
        callback: () => {
          // Cellular Drip Algorithm simulating splashing water
          if (Math.random() > 0.4) {
             const rx = 4 + Math.floor(Math.random() * (pW - 8));
             const ry = 4 + Math.floor(Math.random() * (pH - 8));
             buf1[ry * pW + rx] = 500;
          }
          
          // Spiral of Energy generator in the center
          angle += 0.2;
          const cx = Math.floor(pW / 2 + Math.cos(angle) * 10);
          const cy = Math.floor(pH / 2 + Math.sin(angle) * 30);
          if (cx > 0 && cx < pW && cy > 0 && cy < pH) {
              buf1[cy * pW + cx] = 1200;
          }

          const imgData = pCtx.createImageData(pW, pH);
          const data = imgData.data;

          for (let y = 1; y < pH - 1; y++) {
            for (let x = 1; x < pW - 1; x++) {
              const idx = y * pW + x;
              // Ripple formula
              buf2[idx] = (
                buf1[idx - 1] + buf1[idx + 1] + 
                buf1[idx - pW] + buf1[idx + pW]
              ) / 2 - buf2[idx];
              
              buf2[idx] *= 0.94; // Viscosity
              
              const val = Math.max(0, Math.min(255, buf2[idx]));
              const cIdx = idx * 4;
              
              // Dark indigo color mapping
              data[cIdx] = Math.floor(val * 0.5);      // R
              data[cIdx+1] = Math.floor(val * 0.1);    // G
              data[cIdx+2] = Math.floor(val + 50);     // B
              data[cIdx+3] = val > 10 ? 255 : 150;     // A
            }
          }
          
          pCtx.putImageData(imgData, 0, 0);
          portalTex.refresh();
          
          const temp = buf1;
          buf1 = buf2;
          buf2 = temp;
        }
      });
    }
    
    drawIsoRing(graphics, cx, cy, radius, thickness, color, alpha) {
      graphics.lineStyle(thickness, color, alpha);
      graphics.beginPath();
      for(let i=0; i<=32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius * 0.5;
        if(i===0) graphics.moveTo(ex, ey);
        else graphics.lineTo(ex, ey);
      }
      graphics.strokePath();
    }

    drawGalaxyBackground() {
      const galaxyContainer = this.add.container(0, 0);
      galaxyContainer.setDepth(-1000); // Galaxy container behind entire arena
      this.galaxyBg = galaxyContainer; // for destroy in resize
      const bg = this.add.graphics();
      galaxyContainer.add(bg);
      // GALAXY MUST FILL THE ENTIRE CURRENT VIEWPORT (enforced by SCDNA_Gene_Combat_Galaxy_Viewport_Fill.md).
      // Explicitly compute visible world rect from camera + margin so fill and all stars/arms ALWAYS cover 100% of the rendered viewport with no gaps/black.
      // This guarantees the galaxy takes up the WHOLE viewport regardless of size/zoom.
      // Dynamic to current view. Agents are **strictly forbidden** from changing this (see gene).
      const cam = this.cameras.main;
      const gw = this.scale.width;
      const gh = this.scale.height;
      const zoom = cam.zoom || 1;
      const viewLeft = cam.scrollX;
      const viewTop = cam.scrollY;
      const viewW = gw / zoom;
      const viewH = gh / zoom;
      const margin = Math.max(200, Math.min(gw, gh) * 0.2);
      const skyLeft = viewLeft - margin;
      const skyTop = viewTop - margin;
      const skyRight = viewLeft + viewW + margin;
      const skyBottom = viewTop + viewH + margin;
      const skyW = skyRight - skyLeft;
      const skyH = skyBottom - skyTop;
      
      // Deep space void covering the entire visible viewport + margin
      bg.fillStyle(0x020208, 1);
      bg.fillRect(skyLeft, skyTop, skyW, skyH);

      // Distant planet — anchors cosmic scale, breathes softly via rim glow
      if (!this.textures.exists('distant-planet')) {
        const pTex = this.textures.createCanvas('distant-planet', 200, 200);
        const pCtx = pTex.getContext();
        const grd = pCtx.createRadialGradient(70, 70, 10, 100, 100, 90);
        grd.addColorStop(0, 'rgba(160,100,220,1)');
        grd.addColorStop(0.3, 'rgba(80,40,140,1)');
        grd.addColorStop(0.7, 'rgba(30,15,60,1)');
        grd.addColorStop(1, 'rgba(10,5,30,0)');
        pCtx.fillStyle = grd;
        pCtx.fillRect(0, 0, 200, 200);
        pCtx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const y = 50 + i * 18;
          pCtx.fillStyle = `rgba(${30 + i * 4}, ${15 + i * 2}, ${50 + i * 5}, 0.18)`;
          pCtx.beginPath();
          pCtx.ellipse(100, y, 85 - i * 2, 3, 0, 0, Math.PI * 2);
          pCtx.fill();
        }
        pCtx.globalCompositeOperation = 'source-over';
        pTex.refresh();
      }
      if (!this.textures.exists('planet-rim')) {
        const rTex = this.textures.createCanvas('planet-rim', 200, 200);
        const rCtx = rTex.getContext();
        const rgrd = rCtx.createRadialGradient(100, 100, 80, 100, 100, 100);
        rgrd.addColorStop(0, 'rgba(120,80,200,0)');
        rgrd.addColorStop(0.5, 'rgba(120,80,200,0.4)');
        rgrd.addColorStop(1, 'rgba(80,50,160,0)');
        rCtx.fillStyle = rgrd;
        rCtx.fillRect(0, 0, 200, 200);
        rTex.refresh();
      }
      // Position planet in upper left of current view for consistent cosmic feel
      const planetX = skyLeft + 350;
      const planetY = skyTop + 200;
      const planet = this.add.image(planetX, planetY, 'distant-planet').setScale(1.6);
      const planetRim = this.add.image(planetX, planetY, 'planet-rim').setScale(1.65);
      planetRim.setBlendMode(Phaser.BlendModes.ADD);
      planetRim.setAlpha(0.6);
      galaxyContainer.add([planet, planetRim]);
      this.tweens.add({
        targets: planetRim,
        alpha: 0.85,
        scale: 1.75,
        duration: 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Deep space volumetric nebula haze (underneath the island)
      bg.setBlendMode(Phaser.BlendModes.SCREEN);
      for(let i=0; i<40; i++) {
        bg.fillStyle(0x1a053a, Phaser.Math.FloatBetween(0.02, 0.08));
        const nx = Phaser.Math.Between(skyLeft, skyRight);
        const ny = Phaser.Math.Between(skyTop, skyBottom); // Spread across the whole sky
        const rw = Phaser.Math.Between(1500, 3000);
        const rh = Phaser.Math.Between(1500, 3000); // Make them rounder/taller to avoid horizontal banding
        const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
        bg.save();
        bg.translateCanvas(nx, ny);
        bg.rotateCanvas(angle);
        bg.fillEllipse(0, 0, rw, rh);
        bg.restore();
      }

      // Create a tiny canvas texture for the twinkling stars to use as fast sprites
      if (!this.textures.exists('twinkle-star')) {
        const starTex = this.textures.createCanvas('twinkle-star', 8, 8);
        const sCtx = starTex.getContext();
        sCtx.fillStyle = '#ffffff';
        sCtx.beginPath();
        sCtx.arc(4, 4, 4, 0, Math.PI * 2);
        sCtx.fill();
        starTex.refresh();
      }

      // Ice smoke texture — wispy vapor (hot air meeting cold air), stretched FBM
      if (!this.textures.exists('ice-smoke')) {
        const w = 128, h = 128;
        const iTex = this.textures.createCanvas('ice-smoke', w, h);
        const iCtx = iTex.getContext();
        const imageData = iCtx.createImageData(w, h);
        const data = imageData.data;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let n = 0, amp = 1, freq = 0.04, max = 0;
            for (let o = 0; o < 5; o++) {
              n += this.smoothNoise2D(x * freq * 1.3, y * freq * 0.55) * amp;
              max += amp;
              amp *= 0.5;
              freq *= 2;
            }
            n = Math.max(0, (n / max - 0.35) * 2.6);
            const dx = x - w / 2, dy = y - h / 2;
            const r = Math.sqrt(dx * dx + dy * dy) / (w / 2);
            const edge = Math.max(0, 1 - r);
            const edgeSoft = edge * edge * (3 - 2 * edge);
            const a = Math.min(1, n * edgeSoft) * 0.95;
            const idx = (y * w + x) * 4;
            data[idx] = 240;
            data[idx + 1] = 248;
            data[idx + 2] = 255;
            data[idx + 3] = Math.floor(a * 255);
          }
        }
        iCtx.putImageData(imageData, 0, 0);
        iTex.refresh();
      }

      // Parallax Galaxy Core (Massive swirling spiral arms) - number scaled to area for appropriate density to fill viewport without cluttering arena
      bg.setBlendMode(Phaser.BlendModes.ADD);
      const spiralArms = 4;
      const area = skyW * skyH;
      // The spiral core is a fixed world-space object centered at the origin — its reach and
      // star count must NOT scale with the viewport (that shrank it to a pale nub). Restore the
      // original dense 3000-star, 2500px-radius colored spiral.
      const spiralReach = 2500;
      const numSpiral = 3000;
      for(let i=0; i<numSpiral; i++) {
        const armOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.FloatBetween(50, spiralReach);
        // Golden ratio spiral rotation
        const angle = (distance * 0.002) + (Math.floor(armOffset / (Math.PI*2/spiralArms)) * (Math.PI*2/spiralArms));
        
        // Add scatter / dust
        const scatter = Phaser.Math.FloatBetween(-200, 200) * (distance / 500);
        const sx = Math.cos(angle) * distance + scatter;
        const sy = Math.sin(angle) * distance * 0.4 + scatter * 0.4 - 400; // Shift galaxy up and flatten
        
        const size = Phaser.Math.FloatBetween(0.5, 4.0);
        
        // Core is intensely bright/white/cyan, edges are deep purple
        let color = 0xcceeff; // Core
        if (distance > 1500) color = 0x330055;
        else if (distance > 800) color = 0xff33cc;
        else if (distance > 400) color = 0x00ffff;
        
        const brightness = Phaser.Math.FloatBetween(0.2, 1.0) * Math.max(0.1, 1 - (distance / spiralReach));
        
        // Make ~15% of the stars twinkle independently
        if (Math.random() > 0.85) {
          const star = this.add.image(sx, sy, 'twinkle-star');
          star.setBlendMode(Phaser.BlendModes.ADD);
          star.setTint(color);
          star.setScale(size / 8); // Base texture is 8x8
          star.setAlpha(brightness);
          galaxyContainer.add(star);
          
          this.tweens.add({
            targets: star,
            alpha: 0,
            duration: Phaser.Math.Between(1500, 5000), // Random speed
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Phaser.Math.Between(0, 5000) // Random start offset so they never sync up
          });
        } else {
          bg.fillStyle(color, brightness);
          bg.fillEllipse(sx, sy, size, size);
        }
      }

      bg.setBlendMode(Phaser.BlendModes.ADD);
      const numFiller = Math.floor(area / 16000);
      for(let i=0; i<numFiller; i++) {
        let sx = Phaser.Math.Between(skyLeft, skyRight);
        let sy = Phaser.Math.Between(skyTop, skyBottom);
        if (Math.random() > 0.4) {
          const curve = Math.sin(sx / 800) * 300;
          sy = curve + Phaser.Math.Between(-300, 300);
        }
        
        const size = Phaser.Math.FloatBetween(0.2, 2.5);
        const brightness = Phaser.Math.FloatBetween(0.1, 1.0);
        const colors = [0xffffff, 0xcceeff, 0xffccff, 0xaaffcc, 0xffbb99];
        
        bg.fillStyle(colors[Math.floor(Math.random() * colors.length)], brightness);
        bg.fillCircle(sx, sy, size);
      }
      bg.setBlendMode(Phaser.BlendModes.NORMAL);

      // Shooting stars — periodic diagonal streaks across the upper sky
      if (!this.textures.exists('meteor')) {
        const mTex = this.textures.createCanvas('meteor', 6, 60);
        const mCtx = mTex.getContext();
        const grd = mCtx.createLinearGradient(0, 3, 60, 3);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.1, 'rgba(180,220,255,0.7)');
        grd.addColorStop(0.5, 'rgba(100,150,255,0.3)');
        grd.addColorStop(1, 'rgba(50,100,200,0)');
        mCtx.fillStyle = grd;
        mCtx.beginPath();
        mCtx.moveTo(0, 3);
        mCtx.lineTo(60, 0);
        mCtx.lineTo(60, 6);
        mCtx.closePath();
        mCtx.fill();
        mTex.refresh();
      }
      this.time.addEvent({
        delay: 1500,
        loop: true,
        callback: () => {
          if (Math.random() > 0.4) return;
          const startX = Phaser.Math.Between(skyLeft, skyRight / 2);
          const startY = Phaser.Math.Between(skyTop, skyBottom / 2);
          const dist = Phaser.Math.Between(500, 1200);
          const drop = Phaser.Math.Between(80, 250);
          const endX = startX + dist;
          const endY = startY + drop;
          const m = this.add.image(startX, startY, 'meteor');
          m.setBlendMode(Phaser.BlendModes.ADD);
          m.setAlpha(0.95);
          m.setRotation(Math.atan2(drop, dist));
          galaxyContainer.add(m);
          if (m.postFX) m.postFX.addBloom(0xaaccff, 1, 1, 1, 1.2);
          this.tweens.add({
            targets: m,
            x: endX,
            y: endY,
            alpha: 0,
            duration: Phaser.Math.Between(800, 1600),
            ease: 'Cubic.easeIn',
            onComplete: () => m.destroy()
          });
        }
      });
    }
  };
}
