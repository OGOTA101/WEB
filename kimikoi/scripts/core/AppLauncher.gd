## AppLauncher - シーンパスからウィンドウを動的生成してWindowLayerへ追加する
## シーンファイルなし → スクリプトを直接インスタンス化する方式

extends Node

var _window_layer: Control = null

## WindowLayerを登録（Desktop.gd._ready()から呼ぶ）
func set_window_layer(layer: Control) -> void:
	_window_layer = layer

## メインのlaunch：スクリプトパスからウィンドウを生成
func launch(scene_path: String, spawn_pos: Vector2 = Vector2.ZERO) -> Control:
	if not _window_layer:
		push_error("AppLauncher: WindowLayer not set!")
		return null
	
	var window: Control = null
	# .tscn ファイルが存在する場合はシーンからインスタンス化
	if ResourceLoader.exists(scene_path) and scene_path.ends_with(".tscn"):
		var packed = load(scene_path) as PackedScene
		if packed:
			window = packed.instantiate() as Control
	
	# シーンファイルがない場合はスクリプトパスから生成
	if not window:
		var script_path = _resolve_script_path(scene_path)
		if script_path == "":
			push_error("AppLauncher: Unknown app path: " + scene_path)
			return null
		var script = load(script_path)
		if not script:
			push_error("AppLauncher: Cannot load script: " + script_path)
			return null
		window = Control.new()
		window.script = script
	
	# 生成位置（スタッガーさせてウィンドウが重ならないように）
	var count = _window_layer.get_child_count()
	if spawn_pos == Vector2.ZERO:
		spawn_pos = Vector2(60 + count * 30, 50 + count * 24)
	
	_window_layer.add_child(window)
	window.global_position = spawn_pos
	return window

func _resolve_script_path(scene_path: String) -> String:
	# scenes/apps/Xxxx.tscn → scripts/apps/Xxxx.gd
	var mapping := {
		"res://scenes/apps/TaskManager.tscn":    "res://scripts/apps/TaskManager.gd",
		"res://scenes/apps/RecycleBinApp.tscn":  "res://scripts/apps/RecycleBinApp.gd",
		"res://scenes/apps/Notepad.tscn":        "res://scripts/apps/Notepad.gd",
		"res://scenes/apps/VolumeMixer.tscn":    "res://scripts/apps/VolumeMixer.gd",
		"res://scenes/apps/ClockApp.tscn":       "res://scripts/apps/ClockApp.gd",
		"res://scenes/apps/Settings.tscn":       "res://scripts/apps/Settings.gd",
		"res://scenes/apps/FileExplorer.tscn":   "res://scripts/apps/FileExplorer.gd",
		"res://scenes/apps/DebugConsoleApp.tscn": "res://scripts/apps/DebugConsoleApp.gd",
	}
	if mapping.has(scene_path):
		return mapping[scene_path]
	if scene_path.ends_with(".gd"):
		return scene_path
	return ""
