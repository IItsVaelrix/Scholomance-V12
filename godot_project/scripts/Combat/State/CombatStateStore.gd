extends Node
class_name CombatStateStore

const CombatEngine = preload("res://scripts/Combat/Core/CombatEngine.gd")

signal state_updated
signal log_updated

var engine: CombatEngine = CombatEngine.new()
var internal_state: Dictionary = {}

var current_round: int = 0
var actor_id: String = ""
var logs: Array = []
var units: Array = []
var arena: Dictionary = {}
var tiles: Array = []

func apply_init(packet: Dictionary) -> void:
	internal_state = {}
	_hydrate_state_from_snapshot(internal_state, packet.get("snapshot", {}))
	_sync_to_public_variables()

func apply_action(packet: Dictionary) -> void:
	var action = packet.get("action", {})
	internal_state = engine.apply_resolved_action(internal_state, action)
	_sync_to_public_variables()

func _sync_to_public_variables() -> void:
	current_round = internal_state.get("turnCount", 1)
	actor_id = internal_state.get("activeTurnSide", "player")
	units = internal_state.get("entities", [])
	arena = {"cols": internal_state.get("gridWidth", 8), "rows": internal_state.get("gridHeight", 8), "blocked": []}
	# Convert grid back to tiles? Or just use internal_state directly in ArenaRenderer.
	# Actually Arena expects the format that was previously parsed.
	# We will just expose internal_state directly to Arena or convert it here.
	var grid_arr = internal_state.get("grid", [])
	var blocked_list = []
	for r in range(grid_arr.size()):
		for c in range(grid_arr[r].size()):
			if grid_arr[r][c].get("blocked", false):
				blocked_list.append({"row": r, "col": c})
	arena["blocked"] = blocked_list
	
	state_updated.emit()

func apply_patch(patch: Dictionary) -> void:
	var bs = patch.get("battleState", {})
	if bs and bs.has("turnCount"): current_round = bs["turnCount"]
	if bs and bs.has("activeTurnSide"): actor_id = bs["activeTurnSide"]
	if bs and bs.has("entities"): units = bs["entities"]
	if bs and bs.has("grid"): arena = bs["grid"]
	if patch.has("tileViewModels"): 
		tiles = patch["tileViewModels"]
	state_updated.emit()

func _hydrate_state_from_snapshot(state: Dictionary, snapshot: Dictionary) -> void:
	state["activeTurnSide"] = snapshot.get("turn", "player")
	state["turnCount"] = snapshot.get("round", 1)
	state["rngState"] = snapshot.get("rngState", "0")
	
	var grid_data = snapshot.get("grid", {})
	var blocked = grid_data.get("blocked", [])
	var cols = int(grid_data.get("cols", 8))
	var rows = int(grid_data.get("rows", 8))
	
	state["gridWidth"] = cols
	state["gridHeight"] = rows
	
	var grid_arr = []
	for r in range(rows):
		var row_arr = []
		for c in range(cols):
			row_arr.append({"occupantId": null, "blocked": false})
		grid_arr.append(row_arr)
		
	for b in blocked:
		grid_arr[int(b.get("row", 0))][int(b.get("col", 0))]["blocked"] = true
		
	state["grid"] = grid_arr
	
	var entities = []
	for u in snapshot.get("units", []):
		entities.append({
			"id": u.get("id", ""),
			"hp": int(u.get("hp", 0)),
			"mp": int(u.get("mp", 0)),
			"movesRemaining": int(u.get("ap", 0)),
			"position": {"x": int(u.get("col", 0)), "y": int(u.get("row", 0))},
			"statusEffects": u.get("statuses", [])
		})
		grid_arr[int(u.get("row", 0))][int(u.get("col", 0))]["occupantId"] = u.get("id", "")
		
	state["entities"] = entities
