extends Node2D
class_name ArenaUnitRenderer

const TILE_W := 64.0
const TILE_H := 32.0
const ORIGIN_X := 400.0
const ORIGIN_Y := 100.0

var _store: CombatStateStore
var _unit_sprites := {}

	pass

func _on_state_updated() -> void:
    if not _store: return
    
    var current_ids = []
    
    for unit in _store.units:
        var id = unit.get("id", "unknown")
        current_ids.append(id)
        
        var pos = unit.get("position", {"x": 0, "y": 0})
        var target_x = ORIGIN_X + (pos.x - pos.y) * (TILE_W / 2.0)
        var target_y = ORIGIN_Y + (pos.x + pos.y) * (TILE_H / 2.0)
        # Offset slightly up so they stand on the tile
        var target_pos = Vector2(target_x, target_y - TILE_H/2)
        
        if not _unit_sprites.has(id):
            var sprite = _create_unit_sprite(unit)
            add_child(sprite)
            sprite.position = target_pos
            _unit_sprites[id] = sprite
        else:
            var sprite = _unit_sprites[id]
            if sprite.position.distance_to(target_pos) > 1.0:
                var tween = create_tween()
                tween.tween_property(sprite, "position", target_pos, 0.3).set_trans(Tween.TRANS_SINE)
                
    # Cleanup dead units
    var to_remove = []
    for id in _unit_sprites.keys():
        if id not in current_ids:
            _unit_sprites[id].queue_free()
            to_remove.append(id)
            
    for id in to_remove:
        _unit_sprites.erase(id)

func _create_unit_sprite(unit_data: Dictionary) -> Sprite2D:
    # Minimal placeholder using Godot's default icon or a color rect if missing
    var sprite = Sprite2D.new()
    
    # We'll just draw a Colored polygon for now
    var poly = Polygon2D.new()
    poly.polygon = PackedVector2Array([
        Vector2(-20, -20), Vector2(20, -20),
        Vector2(20, 20), Vector2(-20, 20)
    ])
    
    if unit_data.get("id") == "player":
        poly.color = Color(0.1, 0.6, 0.9, 1.0) # Blue
    else:
        poly.color = Color(0.9, 0.2, 0.2, 1.0) # Red
        
    sprite.add_child(poly)
    
    # Add speech bubble label
    var label = Label.new()
    label.name = "SpeechBubble"
    label.text = ""
    label.visible = false
    label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    label.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
    label.position = Vector2(-100, -80)
    label.size = Vector2(200, 50)
    label.add_theme_color_override("font_color", Color(1, 1, 1, 1))
    label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 1))
    label.add_theme_constant_override("outline_size", 4)
    sprite.add_child(label)
    
    return sprite

func show_speech_bubble(unit_id: String, phrase: String, duration: float = 3.0) -> void:
    if not _unit_sprites.has(unit_id): return
    var sprite = _unit_sprites[unit_id]
    var label = sprite.get_node_or_null("SpeechBubble")
    if label:
        label.text = phrase
        label.visible = true
        
        # Kill any existing timer on this label
        for child in label.get_children():
            if child is Timer:
                child.queue_free()
                
        var timer = Timer.new()
        timer.wait_time = duration
        timer.one_shot = true
        timer.timeout.connect(func(): label.visible = false)
        label.add_child(timer)
        timer.start()
