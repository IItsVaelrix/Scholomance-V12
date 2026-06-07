extends Control
class_name CombatPage

@onready var mud_log = $MarginContainer/HBoxContainer/LeftPage/MudLog
@onready var oracle_scribe = $MarginContainer/HBoxContainer/LeftPage/ScribeStack/OracleScribe
@onready var extraction_scribe = $MarginContainer/HBoxContainer/LeftPage/ScribeStack/ExtractionScribe
@onready var command_band = $MarginContainer/HBoxContainer/LeftPage/CommandBand
@onready var battle_arena = $MarginContainer/HBoxContainer/RightPage/ArenaFrame/BattleArena

var bridge: CombatBridge
var store: CombatStateStore

func _ready() -> void:
	bridge = CombatBridge.new()
	add_child(bridge)
	
	store = CombatStateStore.new()
	add_child(store)
	
	oracle_scribe.command_submitted.connect(_on_command_submitted)
	extraction_scribe.command_submitted.connect(_on_command_submitted)
	command_band.action_selected.connect(_on_action_selected)
	
	bridge.state_patch_received.connect(store.apply_patch)
	bridge.init_received.connect(_on_init_received)
	bridge.action_received.connect(_on_action_received)
	
	# Wire up the dynamic store to the renderers since they _ready before us
	if battle_arena:
		var grid_layer = battle_arena.get_node_or_null("GridLayer")
		var unit_layer = battle_arena.get_node_or_null("UnitLayer")
		
		if grid_layer:
			grid_layer._store = store
			store.state_updated.connect(grid_layer.queue_redraw)
			
		if unit_layer:
			unit_layer._store = store
			store.state_updated.connect(unit_layer._on_state_updated)

func _on_command_submitted(command_text: String, source: String) -> void:
	bridge.send_command(command_text, source)

func _on_action_selected(action_name: String) -> void:
	bridge.send_command(action_name, "CommandBand")

func _on_init_received(packet: Dictionary) -> void:
	store.apply_init(packet)

func _on_action_received(action: Dictionary) -> void:
	store.apply_action(action)
	
	# Trigger visual effects based on action
	if action.has("command") and (action.command.begins_with("CAST ") or action.command.begins_with("COUNTER ")):
		var actor_id = action.get("actorId", "unknown")
		var resolved_spell = action.get("resolvedSpell", {})
		if resolved_spell and resolved_spell.has("intent"):
			var phrase = resolved_spell.get("intent", "...")
			if battle_arena and battle_arena.unit_layer and battle_arena.unit_layer.has_method("show_speech_bubble"):
				battle_arena.unit_layer.show_speech_bubble(actor_id, phrase.to_upper())
