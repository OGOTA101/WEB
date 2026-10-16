extends Node

## WindowManager - ウィンドウの生成・フォーカス・Zオーダー・プロセス管理
## すべてのウィンドウはここを通じて登録・削除される

signal window_opened(window_data: Dictionary)
signal window_closed(window_id: String)
signal window_focused(window_id: String)
signal process_list_changed()

const TASKBAR_HEIGHT := 40

var _windows: Array[Control] = []
var _processes: Array[Dictionary] = []
var _window_id_counter: int = 0

## プロセス登録（タスクマネージャーで表示されるエントリ）
func register_process(name: String, window_node: Control, app_type: String = "app") -> String:
	var pid = "PID_%04d" % _window_id_counter
	_window_id_counter += 1
	var entry = {
		"pid": pid,
		"name": name,
		"app_type": app_type,
		"window": window_node,
		"status": "running",
		"cpu": 0.0,
		"memory": randi_range(8, 128),
	}
	_processes.append(entry)
	_windows.append(window_node)
	process_list_changed.emit()
	return pid

## プロセス終了（タスクマネージャーからの強制終了含む）
func kill_process(pid: String) -> void:
	for i in _processes.size():
		if _processes[i]["pid"] == pid:
			var win = _processes[i]["window"]
			if is_instance_valid(win):
				win.close_window()
			_processes.remove_at(i)
			process_list_changed.emit()
			return

## ウィンドウがCloseボタンを押したとき呼ばれる（ウィンドウ自身が呼ぶ）
func unregister_window(window_node: Control) -> void:
	_windows.erase(window_node)
	for i in _processes.size():
		if _processes[i]["window"] == window_node:
			_processes.remove_at(i)
			process_list_changed.emit()
			return

## フォーカス：対象ウィンドウを最前面へ
func focus_window(window_node: Control) -> void:
	var parent = window_node.get_parent()
	if parent:
		parent.move_child(window_node, parent.get_child_count() - 1)
	window_focused.emit(window_node.name)

## 全ウィンドウリストを返す（タスクバー向け）
func get_all_windows() -> Array:
	return _windows

## プロセスリストを返す（タスクマネージャー向け）
func get_processes() -> Array:
	return _processes

## CPU使用率をランダムシミュレート（毎フレーム）
func _process(_delta: float) -> void:
	for entry in _processes:
		entry["cpu"] = randf_range(0.0, 5.0)
