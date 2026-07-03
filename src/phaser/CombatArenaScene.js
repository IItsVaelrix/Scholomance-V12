import Phaser from 'phaser';
import { generateBattleLeylines } from '../../codex/core/leyline.engine.js';

const PALETTES = {
  voidsteel: { shine: 0x4a5a7a, lit: 0x2a3a5a, core: 0x1a2a4a, rim: 0x0a1020, shadow: 0x050510 },
  void_ice: { shine: 0xffffff, lit: 0xcceeff, core: 0x88bbdd, rim: 0x447799, shadow: 0x224466 },
  obsidian: { shine: 0x332244, lit: 0x221133, core: 0x110022, rim: 0x0a0011, shadow: 0x05000a },
  amethyst: { shine: 0xffaaff, lit: 0xcc55ff, core: 0x8800bb, rim: 0x440077, shadow: 0x220044 },
  cyan_glow: { shine: 0xffffff, lit: 0xaaffff, core: 0x00ffff, rim: 0x0088cc, shadow: 0x004488 },
  royal_purple: { shine: 0xd8b2ff, lit: 0x9b66ff, core: 0x6600cc, rim: 0x330066, shadow: 0x1a0033 }
};

// Generate 36-color Indigo Palette for Doom Fire
const INDIGO_PALETTE = [{ r: 0, g: 0, b: 0, a: 0 }]; // Index 0 is transparent
for (let i = 1; i < 36; i++) {
  let r, g, b;
  const t = i / 35;
  if (t < 0.2) {
    r = 0; g = 0; b = t * 5 * 255; // Black to Deep Blue
  } else if (t < 0.5) {
    const t2 = (t - 0.2) / 0.3;
    r = t2 * 120; g = 0; b = 255; // Blue to Indigo/Purple
  } else if (t < 0.8) {
    const t2 = (t - 0.5) / 0.3;
    r = 120 - t2 * 120; g = t2 * 255; b = 255; // Purple to Cyan
  } else {
    const t2 = (t - 0.8) / 0.2;
    r = t2 * 255; g = 255; b = 255; // Cyan to White
  }
  INDIGO_PALETTE.push({ r: Math.floor(r), g: Math.floor(g), b: Math.floor(b), a: 255 });
}

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
      // Procedural generation, no static assets needed.
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
      const { width, height } = this.scale;
      this.cameras.main.scrollX = -width / 2;
      // Shift camera slightly up to frame the obelisk peak
      this.cameras.main.scrollY = -height / 2 - 40;
      
      // Zoom out to give the island breathing room and reveal the space around it
      this.cameras.main.setZoom(1.1);

      // Initialize Doom Fire Canvas Texture (32x48 grid)
      this.fireW = 32;
      this.fireH = 48;
      this.fireTexture = this.textures.createCanvas('doom-fire', this.fireW, this.fireH);
      this.fireContext = this.fireTexture.getContext();
      this.fireImageData = this.fireContext.createImageData(this.fireW, this.fireH);
      this.firePixels = new Array(this.fireW * this.fireH).fill(0);
      
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
      this.leylines = generateBattleLeylines({
         battleSeed: 1337,
         width: gridSize,
         height: gridSize,
         blockedCoords: [{x: 4, y: 4}], // Center obelisk is blocked
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

      this.events.emit('arena-ready');
    }

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
      const graphics = this.add.graphics();
      
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
        if (isEdge) {
           blockZ += 80 + Math.random() * 60; // Make perimeter walls massively tall
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
           // Obsidian Crystal Wall Tip
           const tip = { x: pTopCenter.x, y: pTopCenter.y - 30 - Math.random() * 40 };
           
           // Left Crystal Face
           graphics.fillStyle(leftColor, 1);
           graphics.beginPath();
           graphics.moveTo(pTopLeft.x, pTopLeft.y);
           graphics.lineTo(pTopBottom.x, pTopBottom.y);
           graphics.lineTo(tip.x, tip.y);
           graphics.closePath();
           graphics.fillPath();
           
           // Right Crystal Face
           graphics.fillStyle(rightColor, 1);
           graphics.beginPath();
           graphics.moveTo(pTopBottom.x, pTopBottom.y);
           graphics.lineTo(pTopRight.x, pTopRight.y);
           graphics.lineTo(tip.x, tip.y);
           graphics.closePath();
           graphics.fillPath();

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

        const interactiveTile = this.add.polygon(0, 0, hitPolyPoints, 0xffffff, 0).setOrigin(0);
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
        // User requested platforms to be obsidian black
        let palette = PALETTES.obsidian;
        
        // Slight variation for checkerboard to keep the grid readable
        if (!isDiagonal && (tx + ty) % 2 === 0) {
           palette = {
             shine: 0x443355, lit: 0x332244, core: 0x1a0a2a, rim: 0x0d001a, shadow: 0x05000a
           };
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
        const leyline = this.leylines && this.leylines.find(l => l.coord.x === tx && l.coord.y === ty);
        if (leyline) {
           const colors = {
             'ALCHEMY': 0xff3300, 'PSYCHIC': 0xff00ff, 'VITAL': 0x00ffaa,
             'SONIC': 0xffff00, 'LORE': 0x0088ff, 'CELESTIAL': 0xffffff,
             'WARD': 0x88bbff, 'NECROTIC': 0x99ffcc, 'CODEX': 0xaa00ff,
             'ENTROPY': 0x444444, 'VOID': 0x220044
           };
           const lColor = colors[leyline.affinity] || 0xffffff;
           
           // Draw a glowing isometric aura
           graphics.fillStyle(lColor, 0.2);
           graphics.fillEllipse(pt.x, py, tw * 0.7, th * 0.7);
           
           // Inner bright core
           graphics.fillStyle(lColor, 0.7);
           graphics.fillEllipse(pt.x, py, tw * 0.35, th * 0.35);
           
           // Outer pulsing rim
           graphics.lineStyle(1.5, lColor, 0.9);
           graphics.strokeEllipse(pt.x, py, tw * 0.7, th * 0.7);
        }

        // Overlay an interactive invisible polygon on the top face for mouse events
        const hitPoly = new Phaser.Geom.Polygon([
          p1.x, p1.y,
          p2.x, p2.y,
          p3.x, p3.y,
          p4.x, p4.y
        ]);

        const interactiveTile = this.add.polygon(0, 0, hitPoly.points, 0xffffff, 0).setOrigin(0);
        interactiveTile.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
        
        interactiveTile.inspectData = { 
          tx, ty, isGrid: true, 
          leyline: leyline ? { affinity: leyline.affinity, id: leyline.id } : null,
          isObelisk: (tx === 4 && ty === 4)
        };
        
        interactiveTile.interactData = { 
          tx, ty, isGrid: true, 
          leyline: leyline ? { affinity: leyline.affinity, id: leyline.id } : null,
          isObelisk: (tx === 4 && ty === 4)
        };

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
      if (!fx) return;
      fx.t += delta;

      if (fx.phase === 'charge') {
        const p = Math.min(1, fx.t / fx.chargeMs);
        const flicker = 1 + (Math.random() - 0.5) * 0.15 * p; // crackle as it peaks
        fx.intensity = Math.min(1, p * p * flicker);
        this.drawObeliskCharge(fx.intensity);
        if (this.bloomFx) this.bloomFx.strength = this.baseBloom + fx.intensity * 0.6;
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
        if (fx.t >= fx.cooldownMs) {
          fx.phase = 'charge';
          fx.t = 0;
        }
      }
    }

    update(time, delta) {
      this.updateObeliskFx(time, delta);
      if (!this.firePixels) return;
      
      // Dynamic Flame Seeding (Full, round base)
      const cx = this.fireW / 2;
      const radius = this.fireW / 2 - 2; // Leave a tiny gap on edges
      for (let x = 0; x < this.fireW; x++) {
        const dist = Math.abs(x - cx);
        let base = 0;
        if (dist <= radius) {
           // Elliptical arc creates a very full, round bottom
           const normalized = dist / radius;
           base = Math.sqrt(1 - normalized * normalized) * 35;
        }
        if (base > 0) {
           base -= Math.floor(Math.random() * 5); // Add chaotic flicker
        }
        this.firePixels[(this.fireH - 1) * this.fireW + x] = Math.max(0, base);
      }

      // Doom Fire Algorithm execution pass (Teardrop Shaped)
      for (let x = 0; x < this.fireW; x++) {
        for (let y = 1; y < this.fireH; y++) {
          const src = y * this.fireW + x;
          const pixel = this.firePixels[src];
          
          if (pixel === 0) {
            this.firePixels[src - this.fireW] = 0;
          } else {
            const rand = Math.floor(Math.random() * 3);
            const drift = rand - 1; // -1, 0, or 1
            const dstX = x + drift;
            
            // Prevent wrapping around array edges which causes blocky artifacts
            if (dstX >= 0 && dstX < this.fireW) {
              const dst = (y - 1) * this.fireW + dstX;
              
              let cooling = (rand & 1); // Standard random decay
              
              // Force taper: thinness at the top
              const heightPercent = 1.0 - (y / this.fireH); // 0 at base, 1 at peak
              const distFromCenter = Math.abs(dstX - cx);
              
              // Teardrop envelope: allowed width shrinks sharply near the top
              const allowedWidth = radius * (1 - Math.pow(heightPercent, 1.5));
              
              if (distFromCenter > allowedWidth) {
                 cooling += 2; // Cool rapidly outside the teardrop
              }

              this.firePixels[dst] = Math.max(0, pixel - cooling);
            }
          }
        }
      }
      
      // Map intensities to the Indigo Palette and write to ImageData
      const data = this.fireImageData.data;
      for (let i = 0; i < this.firePixels.length; i++) {
        const intensity = Math.max(0, Math.min(35, Math.floor(this.firePixels[i])));
        const color = INDIGO_PALETTE[intensity];
        const idx = i * 4;
        data[idx] = color.r;
        data[idx+1] = color.g;
        data[idx+2] = color.b;
        data[idx+3] = color.a;
      }
      
      // Render to the dynamic canvas texture
      this.fireContext.putImageData(this.fireImageData, 0, 0);
      this.fireTexture.refresh();

      // Apply chaotic flickering to shadows and ambient glows based on fire
      if (this.torchEffects) {
         const t = time * 0.001;
         this.torchEffects.forEach(effect => {
            const flicker = Math.random();
            
            // Shadow flickers slightly to mimic fire jitter
            effect.shadow.alpha = effect.shadow.bobAlpha * (0.85 + flicker * 0.15);
            const sScale = effect.shadow.bobScale * (0.96 + flicker * 0.08);
            effect.shadow.setScale(sScale, sScale);
            
            // Ambient glow overall intensity flickers aggressively
            effect.ambient.alpha = 0.3 + flicker * 0.5;
            const aScale = 0.95 + flicker * 0.1;
            effect.ambient.setScale(aScale, aScale);
            
            // Re-render the light pool with internal dynamic sweeping shadows
            const ctx = effect.glowCtx;
            const size = effect.size;
            const cx = size / 2;
            const cy = size / 2;
            
            ctx.clearRect(0, 0, size, size);
            
            // Draw the soft radial light base
            ctx.globalCompositeOperation = 'source-over';
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
            grd.addColorStop(0, 'rgba(51, 0, 170, 1)'); // intense core
            grd.addColorStop(1, 'rgba(51, 0, 170, 0)'); // fade out
            
            ctx.fillStyle = grd;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, 0.5); // Squash into isometric ellipse
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Erase shadows to mimic physical objects crossing the firelight
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Soft but distinct shadows
            
            // Spinning ring 1 shadow
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, 0.5); // Shadows conform to ground perspective
            ctx.rotate(t * 1.2); 
            ctx.fillRect(-45, -5, 90, 10);
            ctx.restore();
            
            // Spinning ring 2 shadow
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, 0.5);
            ctx.rotate(-t * 0.8);
            ctx.fillRect(-45, -4, 90, 8);
            ctx.restore();
            
            // Floating runes (3 small shadows orbiting)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, 0.5);
            for(let i = 0; i < 3; i++) {
               const angle = t * 2 + (i * Math.PI * 0.6);
               const rx = Math.cos(angle) * 25;
               const ry = Math.sin(angle) * 25;
               ctx.beginPath();
               ctx.arc(rx, ry, 6, 0, Math.PI * 2);
               ctx.fill();
            }
            ctx.restore();
            
            effect.glowTex.refresh();
         });
      }
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
      
      this.torchEffects.push({ shadow, ambient, glowTex, glowCtx, size });
      
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
      fireSprite.setScale(1.8); 
      fireSprite.setBlendMode(Phaser.BlendModes.ADD);
      bobContainer.add(fireSprite);
      
      // 4. Gyroscopic Containment Rings (Armillary Matrix)
      const ring1 = this.add.graphics();
      ring1.setBlendMode(Phaser.BlendModes.ADD);
      ring1.lineStyle(2, PALETTES.royal_purple.shine, 0.9);
      ring1.strokeEllipse(0, 0, 45, 15);
      ring1.setPosition(x, floatY - 20);
      ring1.rotation = 0.3;

      const ring2 = this.add.graphics();
      ring2.setBlendMode(Phaser.BlendModes.ADD);
      ring2.lineStyle(1.5, PALETTES.royal_purple.core, 1);
      ring2.strokeEllipse(0, 0, 55, 12);
      ring2.setPosition(x, floatY - 25);
      ring2.rotation = -0.4;
      
      bobContainer.add([ring1, ring2]);
      
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

      // 5. Floating Runes/Sparks
      const runes = this.add.graphics();
      runes.setBlendMode(Phaser.BlendModes.ADD);
      runes.fillStyle(PALETTES.royal_purple.lit, 1);
      runes.fillEllipse(x - 25, floatY - 45, 3, 3);
      runes.fillEllipse(x + 30, floatY - 20, 2, 2);
      runes.fillEllipse(x + 15, floatY - 55, 4, 4);
      runes.fillEllipse(x - 30, floatY - 15, 2, 2);
      bobContainer.add(runes);

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
      const bg = this.add.graphics();
      const skyW = 6000;
      const skyH = 4000;
      
      // Deep space void covering massive area
      bg.fillStyle(0x020208, 1);
      bg.fillRect(-skyW/2, -skyH/2, skyW, skyH);

      bg.setBlendMode(Phaser.BlendModes.SCREEN);
      for(let i=0; i<60; i++) {
        bg.fillStyle(0x330055, Phaser.Math.FloatBetween(0.01, 0.05));
        const nx = Phaser.Math.Between(-skyW/2, skyW/2);
        const ny = Phaser.Math.Between(-skyH/2, skyH/4);
        const rw = Phaser.Math.Between(800, 1500);
        const rh = Phaser.Math.Between(400, 800);
        const angle = Phaser.Math.FloatBetween(-0.2, 0.2);
        
        bg.save();
        bg.translateCanvas(nx, ny);
        bg.rotateCanvas(angle);
        bg.fillEllipse(0, 0, rw, rh);
        bg.restore();
      }

      for(let i=0; i<40; i++) {
        bg.fillStyle(0x004466, Phaser.Math.FloatBetween(0.02, 0.06));
        const nx = Phaser.Math.Between(-skyW/2, skyW/2);
        const ny = Phaser.Math.Between(-skyH/3, skyH/2);
        const rw = Phaser.Math.Between(600, 1200);
        const rh = Phaser.Math.Between(300, 600);
        bg.fillEllipse(nx, ny, rw, rh);
      }

      bg.setBlendMode(Phaser.BlendModes.ADD);
      for(let i=0; i<1500; i++) {
        let sx = Phaser.Math.Between(-skyW/2, skyW/2);
        let sy = Phaser.Math.Between(-skyH/2, skyH/2);
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
    }
  };
}
