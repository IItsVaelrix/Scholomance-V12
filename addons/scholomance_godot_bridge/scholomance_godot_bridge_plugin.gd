@tool
extends EditorPlugin

var pixelbrain_importer: EditorImportPlugin
var wand_importer: EditorImportPlugin
var divwand_importer: EditorImportPlugin
var frame_timeline_importer: EditorImportPlugin

func _enter_tree() -> void:
	pixelbrain_importer = preload("res://addons/scholomance_godot_bridge/importers/pixelbrain_importer.gd").new()
	wand_importer = preload("res://addons/scholomance_godot_bridge/importers/wand_importer.gd").new()
	divwand_importer = preload("res://addons/scholomance_godot_bridge/importers/divwand_importer.gd").new()
	frame_timeline_importer = preload("res://addons/scholomance_godot_bridge/importers/frame_timeline_importer.gd").new()

	add_import_plugin(pixelbrain_importer)
	add_import_plugin(wand_importer)
	add_import_plugin(divwand_importer)
	add_import_plugin(frame_timeline_importer)

func _exit_tree() -> void:
	if frame_timeline_importer != null:
		remove_import_plugin(frame_timeline_importer)
	if divwand_importer != null:
		remove_import_plugin(divwand_importer)
	if wand_importer != null:
		remove_import_plugin(wand_importer)
	if pixelbrain_importer != null:
		remove_import_plugin(pixelbrain_importer)

	frame_timeline_importer = null
	divwand_importer = null
	wand_importer = null
	pixelbrain_importer = null
