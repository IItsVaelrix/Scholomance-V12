/**
 * SCHOLOMANCE FAIRLY ODD WAND — SCENE-SIDE ROLE DISPATCHER
 * 
 * Manages the registration and execution of visual drawers for individual semantic roles.
 * Decouples scene coordinates from imperative rendering code.
 */

export interface RoleCoordinate {
  x: number;
  y: number;
  z?: number;
  emphasis?: number;
  source?: string;
  role: string;
  material?: string;
  color?: string;
  [key: string]: any;
}

export interface RoleBinding {
  role: string;
  depth: number;
  filter?: (coord: RoleCoordinate) => boolean;
  draw: (
    ctx: CanvasRenderingContext2D,
    coords: RoleCoordinate[],
    canvasSize: { width: number; height: number }
  ) => void;
}

class RoleDispatcher {
  private registry: Map<string, RoleBinding> = new Map();

  /**
   * Register a render handler for a specific semantic role.
   * @param binding - The role drawer binding definition.
   */
  public registerRoleDrawer(binding: RoleBinding): void {
    this.registry.set(binding.role, binding);
  }

  /**
   * Clear all registered role drawers.
   */
  public clearRegistry(): void {
    this.registry.clear();
  }

  /**
   * Get all registered role drawer bindings.
   */
  public getBindings(): RoleBinding[] {
    return Array.from(this.registry.values());
  }

  /**
   * Core dispatch loop. Groups coordinate points by role and draws them in depth order.
   * @param ctx - Canvas 2D rendering context.
   * @param coordinates - Array of role-tagged coordinates.
   * @param canvasSize - Canvas dimensions.
   */
  public dispatchRoles(
    ctx: CanvasRenderingContext2D,
    coordinates: RoleCoordinate[],
    canvasSize: { width: number; height: number }
  ): void {
    if (!ctx || !Array.isArray(coordinates) || coordinates.length === 0) {
      return;
    }

    // 1. Group coordinates by role
    const grouped = new Map<string, RoleCoordinate[]>();
    coordinates.forEach(coord => {
      if (!coord.role) return;
      if (!grouped.has(coord.role)) {
        grouped.set(coord.role, []);
      }
      grouped.get(coord.role)!.push(coord);
    });

    // 2. Sort registered bindings by depth (lower depth draws first, i.e., backgrounds)
    const bindings = Array.from(this.registry.values()).sort((a, b) => a.depth - b.depth);

    // Track which roles have been handled by registered drawers
    const handledRoles = new Set<string>();

    // 3. Render matched roles in depth order
    bindings.forEach(binding => {
      const coords = grouped.get(binding.role);
      if (coords && coords.length > 0) {
        handledRoles.add(binding.role);
        
        // Apply optional filter
        const filteredCoords = binding.filter ? coords.filter(binding.filter) : coords;
        
        if (filteredCoords.length > 0) {
          ctx.save();
          binding.draw(ctx, filteredCoords, canvasSize);
          ctx.restore();
        }
      }
    });

    // 4. Fallback drawer: draw unhandled roles as shimmering glyph clusters or golden ink dots
    grouped.forEach((coords, role) => {
      if (!handledRoles.has(role) && coords.length > 0) {
        ctx.save();
        this.drawFallbackGlyphs(ctx, coords, role);
        ctx.restore();
      }
    });
  }

  private drawFallbackGlyphs(
    ctx: CanvasRenderingContext2D,
    coords: RoleCoordinate[],
    role: string
  ): void {
    if (!coords.length) return;

    ctx.save();
    try {
      const minX = Math.min(...coords.map(c => Number(c.x) || 0));
      const maxX = Math.max(...coords.map(c => Number(c.x) || 0));
      const minY = Math.min(...coords.map(c => Number(c.y) || 0));
      const maxY = Math.max(...coords.map(c => Number(c.y) || 0));

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';

      coords.forEach((coord, index) => {
        if (index === 0) ctx.moveTo(coord.x, coord.y);
        else ctx.lineTo(coord.x, coord.y);
      });

      ctx.stroke();

      // existing dots + labels
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.4)'; // Gold glow
      ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';  // Gold ink

      coords.forEach(coord => {
        const size = 3 + (coord.emphasis || 0.5) * 3;
        ctx.beginPath();
        // Draw elegant small squares resembling ancient type
        ctx.rect(coord.x - size / 2, coord.y - size / 2, size, size);
        ctx.fill();

        // Subtle labeling of custom roles if highly emphasized
        const pseudoRand = Math.abs(Math.sin(coord.x * 12.9898 + coord.y * 78.233) * 43758.5453) % 1;
        if (coord.emphasis && coord.emphasis > 0.95 && pseudoRand < 0.05) {
          ctx.font = '8px monospace';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
          ctx.fillText(role, coord.x + 6, coord.y + 3);
        }
      });
    } finally {
      ctx.restore();
    }
  }
}

export const roleDispatcher = new RoleDispatcher();
