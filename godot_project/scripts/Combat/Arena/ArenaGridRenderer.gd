extends Node2D
class_name ArenaGridRenderer

const TILE_W := 64.0
const TILE_H := 32.0
const ORIGIN_X := 400.0
const ORIGIN_Y := 100.0
const GRID_COLOR := Color(0.788, 0.635, 0.153, 0.3) # combat-accent

var _store: CombatStateStore

	pass

func _draw() -> void:
    if not _store or not _store.arena.has("cols"):
        return
        
    var cols = _store.arena.get("cols", 8)
    var rows = _store.arena.get("rows", 8)
    var blocked = _store.arena.get("blocked", [])
    
    for x in range(cols):
        for y in range(rows):
            var px = ORIGIN_X + (x - y) * (TILE_W / 2.0)
            var py = ORIGIN_Y + (x + y) * (TILE_H / 2.0)
            
            var points = PackedVector2Array([
                Vector2(px, py - TILE_H/2),
                Vector2(px + TILE_W/2, py),
                Vector2(px, py + TILE_H/2),
                Vector2(px - TILE_W/2, py),
                Vector2(px, py - TILE_H/2)
            ])
            
            draw_polyline(points, GRID_COLOR, 2.0)
            
            # Draw blocked/obstacles
            var is_blocked = false
            for b in blocked:
                if b.col == x and b.row == y:
                    is_blocked = true
                    break
            
            if is_blocked:
                draw_colored_polygon(points, Color(0.5, 0.1, 0.1, 0.4))
