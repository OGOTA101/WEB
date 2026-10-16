extends Node

## DebugLogManager - デバッグログ管理シングルトン（Autoload）
## Unityのコンソールログと同様に、全ログ・警告・エラーを収集・管理する
## Editor実行時・スタンドアローンEXE実行時の両方で動作可能

signal log_added(entry: Dictionary)
signal logs_cleared()

# ログレベル定数
const LEVEL_INFO := "INFO"
const LEVEL_WARN := "WARN"
const LEVEL_ERROR := "ERROR"

# 最大ログ保存件数
const MAX_LOGS := 1000

# 内部ログ識別用プレフィックス（自前ログの二重登録防止）
const INTERNAL_TAG := "[DLM]"

# ログファイルポーリング間隔（秒）
const POLL_INTERVAL := 0.15

# ログ保存用配列
var _logs: Array[Dictionary] = []
var _log_counter: int = 0

# ログファイル読み込み追跡位置
var _last_file_pos: int = 0
var _poll_timer: float = 0.0

# ログ種別カウント
var count_info: int = 0
var count_warn: int = 0
var count_error: int = 0

# デバッグコンソールウィンドウの参照
var _console_window: Control = null

func _ready() -> void:
	# プロセス処理を有効化（ポーズ時でも動作するようにALWAYSに設定）
	process_mode = Node.PROCESS_MODE_ALWAYS
	
	# 初回起動ログ
	info("=== デバッグログマネージャー初期化完了 ===")
	info("実行プラットフォーム: %s | エンジン: Godot %s" % [OS.get_name(), Engine.get_version_info()["string"]])
	info("実行モード: %s" % ("エディタ (Editor)" if OS.has_feature("editor") else "スタンドアローン (EXE/Standalone)"))
	
	# 既存ログファイルの初期位置を現在の末尾に合わせる（起動前の過去ログ重複防止）
	_init_log_file_pos()

## ログファイルの現在サイズを取得して初期読み込み位置とする
func _init_log_file_pos() -> void:
	var path = "user://logs/godot.log"
	if FileAccess.file_exists(path):
		var f = FileAccess.open(path, FileAccess.READ)
		if f:
			_last_file_pos = f.get_length()
			f.close()

func _process(delta: float) -> void:
	_poll_timer += delta
	if _poll_timer >= POLL_INTERVAL:
		_poll_timer = 0.0
		_poll_godot_log_file()

## Godotが出力する user://logs/godot.log の追加分を読み込んで解析する
func _poll_godot_log_file() -> void:
	var path = "user://logs/godot.log"
	if not FileAccess.file_exists(path):
		return
	
	var f = FileAccess.open(path, FileAccess.READ)
	if not f:
		return
	
	var length = f.get_length()
	if length < _last_file_pos:
		# ログファイルがローテーションまたはクリアされた場合
		_last_file_pos = 0
	
	if length == _last_file_pos:
		f.close()
		return
	
	# 未読位置までシークして新規追加分を行ごとに取得
	f.seek(_last_file_pos)
	while not f.eof_reached() and f.get_position() < length:
		var line = f.get_line().strip_edges()
		if line.is_empty():
			continue
		
		# 自身がAPI経由で出力した行（タグ付き）はスキップ（二重登録防止）
		if INTERNAL_TAG in line:
			continue
		
		# ログレベルを自動判定
		var level = LEVEL_INFO
		var upper = line.to_upper()
		if "ERROR" in upper or "CRITICAL" in upper or "FATAL" in upper or "ASSERTION FAILED" in upper:
			level = LEVEL_ERROR
		elif "WARNING" in upper or "WARN" in upper:
			level = LEVEL_WARN
		
		_add_entry(line, level, "Godot Engine Console", false)
	
	_last_file_pos = f.get_position()
	f.close()

## 通常情報ログ（Unityの Debug.Log に相当）
func info(message: String, details: String = "") -> void:
	print("%s %s" % [INTERNAL_TAG, message])
	_add_entry(message, LEVEL_INFO, details, true)

## 警告ログ（Unityの Debug.LogWarning に相当）
func warn(message: String, details: String = "") -> void:
	push_warning("%s %s" % [INTERNAL_TAG, message])
	_add_entry(message, LEVEL_WARN, details, true)

## エラーログ（Unityの Debug.LogError に相当）
func error(message: String, details: String = "") -> void:
	push_error("%s %s" % [INTERNAL_TAG, message])
	_add_entry(message, LEVEL_ERROR, details, true)

## 内部ログ追加処理
func _add_entry(message: String, level: String, details: String, from_api: bool) -> void:
	_log_counter += 1
	var t = Time.get_time_dict_from_system()
	var time_str = "%02d:%02d:%02d" % [t["hour"], t["minute"], t["second"]]
	
	# 詳細が空でAPI経由の場合はスタックトレースを取得
	if details.is_empty() and from_api:
		var stack = get_stack()
		if stack.size() > 2:
			var s = stack[2]
			details = "%s:%d in %s()" % [s.get("source", ""), s.get("line", 0), s.get("function", "")]
	
	var entry: Dictionary = {
		"id": _log_counter,
		"time": time_str,
		"level": level,
		"message": message,
		"details": details,
		"count": 1
	}
	
	# カウント更新
	match level:
		LEVEL_INFO:
			count_info += 1
		LEVEL_WARN:
			count_warn += 1
		LEVEL_ERROR:
			count_error += 1
	
	# ログ配列に追加（上限チェック）
	_logs.append(entry)
	if _logs.size() > MAX_LOGS:
		var removed = _logs.pop_front()
		# カウント減算
		match removed["level"]:
			LEVEL_INFO: count_info = max(0, count_info - 1)
			LEVEL_WARN: count_warn = max(0, count_warn - 1)
			LEVEL_ERROR: count_error = max(0, count_error - 1)
	
	log_added.emit(entry)

## ログ全消去（Unity Consoleの Clear に相当）
func clear_logs() -> void:
	_logs.clear()
	count_info = 0
	count_warn = 0
	count_error = 0
	logs_cleared.emit()

## 保存されている全ログを取得
func get_logs() -> Array[Dictionary]:
	return _logs

## ログ種別カウントを取得
func get_counts() -> Dictionary:
	return {
		"INFO": count_info,
		"WARN": count_warn,
		"ERROR": count_error,
		"TOTAL": _logs.size()
	}

## デバッグコンソールウィンドウの参照を登録
func register_console_window(win: Control) -> void:
	_console_window = win

## デバッグコンソールウィンドウの登録解除
func unregister_console_window(win: Control) -> void:
	if _console_window == win:
		_console_window = null

## F12キー または チルダキー(`) でデバッグコンソールをトグル開閉
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F12 or event.keycode == KEY_QUOTELEFT:
			toggle_console()

## デバッグコンソールのトグル表示
func toggle_console() -> void:
	if is_instance_valid(_console_window):
		if _console_window.visible:
			_console_window.close_window()
		else:
			_console_window.show()
			WindowManager.focus_window(_console_window)
	else:
		AppLauncher.launch("res://scenes/apps/DebugConsoleApp.tscn")
