extends Node2D
class_name BattleArena

@onready var grid_layer = $GridLayer
@onready var unit_layer = $UnitLayer
@onready var spell_layer = $SpellLayer
@onready var backdrop = $ShaderBackdrop

func _ready() -> void:
	pass

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var mx = event.position.x
		var my = event.position.y
		
		var A = (mx - ArenaGridRenderer.ORIGIN_X) / (ArenaGridRenderer.TILE_W / 2.0)
		var B = (my - ArenaGridRenderer.ORIGIN_Y) / (ArenaGridRenderer.TILE_H / 2.0)
		var gx = round((A + B) / 2.0)
		var gy = round((B - A) / 2.0)
		
		_handle_grid_click(int(gx), int(gy))

func _handle_grid_click(gx: int, gy: int) -> void:
	var store = get_node_or_null("/root/CombatPage/CombatStateStore")
	if not store: return
	
	# Check if gx, gy is within bounds
	var cols = store.arena.get("cols", 8)
	var rows = store.arena.get("rows", 8)
	if gx < 0 or gx >= cols or gy < 0 or gy >= rows:
		return
		
	if store.actor_id != "player":
		return
		
	var player = null
	for u in store.units:
		if u.get("id") == "player":
			player = u
			break
			
	if not player: return
	
	var px = player.position.x
	var py = player.position.y
	var dx = gx - px
	var dy = gy - py
	
	var dist = abs(dx) + abs(dy)
	var moves = player.get("movesRemaining", 0)
	
	if dist > 0 and dist <= moves:
		# Check if target is empty
		for u in store.units:
			if u.position.x == gx and u.position.y == gy:
				return # occupied
				
		for b in store.arena.get("blocked", []):
			if b.col == gx and b.row == gy:
				return # blocked
				
		var bridge = get_node_or_null("/root/CombatPage/CombatBridge")
		if bridge:
			bridge.send_command("MOVE %d %d" % [dx, dy], "ArenaClick")

func update_arena(state: Dictionary) -> void:
	# Dispatch state to sub-renderers
	pass
