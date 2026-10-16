extends "res://scripts/core/BaseWindow.gd"

## DebugConsoleApp - Unity風デバッグログコンソール
## UnityエディタのConsoleと同様に、全ログ・警告・エラーを一覧表示・フィルタリング・検索・詳細確認できる
## Standalone(EXE) / Editorの両環境で完全動作

var _tree: Tree
var _detail_text: TextEdit
var _search_input: LineEdit
var _btn_collapse: CheckBox
var _btn_autoscroll: CheckBox

var _btn_info: Button
var _btn_warn: Button
var _btn_error: Button

var _lbl_status: Label
var _lbl_perf: Label

# フィルタ状態
var _filter_info: bool = true
var _filter_warn: bool = true
var _filter_error: bool = true
var _filter_search: String = ""
var _is_collapsed: bool = false
var _auto_scroll: bool = true

# 選択中ログの詳細
var _selected_entry: Dictionary = {}

func _ready() -> void:
	window_title = "デバッグコンソール (Console)"
	app_type = "developer_tool"
	initial_size = Vector2(780, 520)
	min_window_size = Vector2(500, 360)
	super._ready()
	
	DebugLogManager.register_console_window(self)
	_build_content()
	
	# シグナル接続
	DebugLogManager.log_added.connect(_on_log_added)
	DebugLogManager.logs_cleared.connect(_on_logs_cleared)
	
	_refresh_display()

func close_window() -> void:
	DebugLogManager.unregister_console_window(self)
	super.close_window()

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_left = 6
	vbox.offset_right = -6
	vbox.offset_top = 4
	vbox.offset_bottom = -4
	vbox.add_theme_constant_override("separation", 4)
	content_area.add_child(vbox)
	
	# 1. ツールバー
	_build_toolbar(vbox)
	
	# 2. メイン領域（上下スプリット：上=ログ一覧, 下=詳細）
	var split = VSplitContainer.new()
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	split.split_offset = 240
	vbox.add_child(split)
	
	_build_log_tree(split)
	_build_detail_pane(split)
	
	# 3. 下部ステータスバー
	_build_status_bar(vbox)

## 上部ツールバー構築
func _build_toolbar(parent: Control) -> void:
	var toolbar = HBoxContainer.new()
	toolbar.custom_minimum_size = Vector2(0, 32)
	toolbar.add_theme_constant_override("separation", 6)
	parent.add_child(toolbar)
	
	# クリアボタン
	var btn_clear = Button.new()
	btn_clear.text = "🗑 クリア"
	btn_clear.custom_minimum_size = Vector2(70, 28)
	btn_clear.pressed.connect(func(): DebugLogManager.clear_logs())
	toolbar.add_child(btn_clear)
	
	# 折りたたみ（Collapse）
	_btn_collapse = CheckBox.new()
	_btn_collapse.text = "Collapse"
	_btn_collapse.button_pressed = _is_collapsed
	_btn_collapse.toggled.connect(func(on: bool):
		_is_collapsed = on
		_refresh_display()
	)
	toolbar.add_child(_btn_collapse)
	
	# 自動スクロール
	_btn_autoscroll = CheckBox.new()
	_btn_autoscroll.text = "Auto-Scroll"
	_btn_autoscroll.button_pressed = _auto_scroll
	_btn_autoscroll.toggled.connect(func(on: bool): _auto_scroll = on)
	toolbar.add_child(_btn_autoscroll)
	
	# 検索バー
	_search_input = LineEdit.new()
	_search_input.placeholder_text = "🔍 絞り込み検索..."
	_search_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_search_input.clear_button_enabled = true
	_search_input.text_changed.connect(func(txt: String):
		_filter_search = txt.strip_edges().to_lower()
		_refresh_display()
	)
	toolbar.add_child(_search_input)
	
	# フィルタボタン：Info
	_btn_info = Button.new()
	_btn_info.toggle_mode = true
	_btn_info.button_pressed = _filter_info
	_btn_info.text = "ℹ️ 0"
	_btn_info.custom_minimum_size = Vector2(65, 28)
	_btn_info.toggled.connect(func(on: bool):
		_filter_info = on
		_refresh_display()
	)
	toolbar.add_child(_btn_info)
	
	# フィルタボタン：Warn
	_btn_warn = Button.new()
	_btn_warn.toggle_mode = true
	_btn_warn.button_pressed = _filter_warn
	_btn_warn.text = "⚠️ 0"
	_btn_warn.custom_minimum_size = Vector2(65, 28)
	_btn_warn.toggled.connect(func(on: bool):
		_filter_warn = on
		_refresh_display()
	)
	toolbar.add_child(_btn_warn)
	
	# フィルタボタン：Error
	_btn_error = Button.new()
	_btn_error.toggle_mode = true
	_btn_error.button_pressed = _filter_error
	_btn_error.text = "🛑 0"
	_btn_error.custom_minimum_size = Vector2(65, 28)
	_btn_error.toggled.connect(func(on: bool):
		_filter_error = on
		_refresh_display()
	)
	toolbar.add_child(_btn_error)
	
	# テストログ生成メニューボタン
	var btn_test = MenuButton.new()
	btn_test.text = "🧪 テスト"
	btn_test.custom_minimum_size = Vector2(65, 28)
	btn_test.flat = false
	var popup = btn_test.get_popup()
	popup.add_item("Info ログ出力", 0)
	popup.add_item("Warning ログ出力", 1)
	popup.add_item("Error ログ出力", 2)
	popup.id_pressed.connect(_on_test_menu_selected)
	toolbar.add_child(btn_test)

## ログ一覧ツリー構築
func _build_log_tree(parent: Control) -> void:
	_tree = Tree.new()
	_tree.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_tree.columns = 4
	_tree.set_column_title(0, "種別")
	_tree.set_column_title(1, "時刻")
	_tree.set_column_title(2, "メッセージ")
	_tree.set_column_title(3, "件数")
	_tree.column_titles_visible = true
	
	_tree.set_column_expand(0, false)
	_tree.set_column_custom_minimum_width(0, 75)
	
	_tree.set_column_expand(1, false)
	_tree.set_column_custom_minimum_width(1, 80)
	
	_tree.set_column_expand(2, true)
	
	_tree.set_column_expand(3, false)
	_tree.set_column_custom_minimum_width(3, 50)
	
	_tree.hide_root = true
	_tree.select_mode = Tree.SELECT_ROW
	_tree.item_selected.connect(_on_tree_item_selected)
	parent.add_child(_tree)

## 下部詳細ペイン構築
func _build_detail_pane(parent: Control) -> void:
	var panel = PanelContainer.new()
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.08, 0.12)
	sb.set_border_width_all(1)
	sb.border_color = Color(0.2, 0.2, 0.35)
	panel.add_theme_stylebox_override("panel", sb)
	parent.add_child(panel)
	
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 2)
	panel.add_child(vbox)
	
	var header_bar = HBoxContainer.new()
	header_bar.custom_minimum_size = Vector2(0, 24)
	vbox.add_child(header_bar)
	
	var title = Label.new()
	title.text = "【ログ詳細 / スタックトレース】"
	title.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	title.add_theme_font_size_override("font_size", 11)
	header_bar.add_child(title)
	
	var spacer = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_bar.add_child(spacer)
	
	var btn_copy = Button.new()
	btn_copy.text = "📋 コピー"
	btn_copy.custom_minimum_size = Vector2(70, 22)
	btn_copy.pressed.connect(func():
		if _selected_entry.is_empty():
			return
		var clip_text = "[%s][%s] %s\n詳細: %s" % [
			_selected_entry.get("time", ""),
			_selected_entry.get("level", ""),
			_selected_entry.get("message", ""),
			_selected_entry.get("details", "")
		]
		DisplayServer.clipboard_set(clip_text)
	)
	header_bar.add_child(btn_copy)
	
	_detail_text = TextEdit.new()
	_detail_text.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_detail_text.editable = false
	_detail_text.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	_detail_text.add_theme_font_size_override("font_size", 11)
	_detail_text.text = "ログを選択するとここに詳細メッセージとスタックトレースが表示されます。"
	vbox.add_child(_detail_text)

## 下部ステータスバー構築
func _build_status_bar(parent: Control) -> void:
	var hbox = HBoxContainer.new()
	hbox.custom_minimum_size = Vector2(0, 22)
	parent.add_child(hbox)
	
	_lbl_status = Label.new()
	_lbl_status.text = "全 0 件"
	_lbl_status.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	_lbl_status.add_theme_font_size_override("font_size", 11)
	hbox.add_child(_lbl_status)
	
	var sep = VSeparator.new()
	hbox.add_child(sep)
	
	_lbl_perf = Label.new()
	_lbl_perf.text = "FPS: -- | メモリ: -- MB"
	_lbl_perf.add_theme_color_override("font_color", Color(0.6, 0.8, 0.6))
	_lbl_perf.add_theme_font_size_override("font_size", 11)
	hbox.add_child(_lbl_perf)
	
	var spacer = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)
	
	var btn_folder = Button.new()
	btn_folder.text = "📂 ログ保存先を開く"
	btn_folder.custom_minimum_size = Vector2(130, 20)
	btn_folder.pressed.connect(func():
		var logs_dir = OS.get_user_data_dir() + "/logs"
		DirAccess.make_dir_absolute(logs_dir)
		OS.shell_open(ProjectSettings.globalize_path("user://logs"))
	)
	hbox.add_child(btn_folder)

func _process(delta: float) -> void:
	super._process(delta)
	# パフォーマンス情報を定期更新
	var fps = Engine.get_frames_per_second()
	var mem_mb = OS.get_static_memory_usage() / 1024.0 / 1024.0
	_lbl_perf.text = "FPS: %d | メモリ: %.1f MB" % [fps, mem_mb]

## ログ一覧の再描画
func _refresh_display() -> void:
	_tree.clear()
	var root = _tree.create_item()
	
	var raw_logs = DebugLogManager.get_logs()
	var counts = DebugLogManager.get_counts()
	
	# ボタンの件数ラベル更新
	_btn_info.text = "ℹ️ %d" % counts["INFO"]
	_btn_warn.text = "⚠️ %d" % counts["WARN"]
	_btn_error.text = "🛑 %d" % counts["ERROR"]
	
	# Collapse集計または通常一覧化
	var display_items: Array[Dictionary] = []
	if _is_collapsed:
		var map: Dictionary = {}
		for entry in raw_logs:
			var key = "%s:%s" % [entry["level"], entry["message"]]
			if map.has(key):
				map[key]["count"] += 1
				map[key]["time"] = entry["time"]
			else:
				var clone = entry.duplicate()
				clone["count"] = 1
				map[key] = clone
				display_items.append(clone)
	else:
		display_items = raw_logs
	
	var shown_count = 0
	var last_item: TreeItem = null
	
	for entry in display_items:
		var level: String = entry["level"]
		
		# レベルフィルタ
		if level == DebugLogManager.LEVEL_INFO and not _filter_info:
			continue
		if level == DebugLogManager.LEVEL_WARN and not _filter_warn:
			continue
		if level == DebugLogManager.LEVEL_ERROR and not _filter_error:
			continue
		
		# 検索フィルタ
		if not _filter_search.is_empty():
			var msg_lower = entry["message"].to_lower()
			var det_lower = entry["details"].to_lower()
			if not (_filter_search in msg_lower or _filter_search in det_lower):
				continue
		
		shown_count += 1
		var item = _tree.create_item(root)
		last_item = item
		
		# 種別アイコン・色分け
		var color = Color.WHITE
		var level_text = "[INFO]"
		match level:
			DebugLogManager.LEVEL_INFO:
				color = Color(0.4, 0.7, 1.0)
				level_text = "ℹ️ INFO"
			DebugLogManager.LEVEL_WARN:
				color = Color(1.0, 0.85, 0.3)
				level_text = "⚠️ WARN"
			DebugLogManager.LEVEL_ERROR:
				color = Color(1.0, 0.35, 0.35)
				level_text = "🛑 ERROR"
		
		item.set_text(0, level_text)
		item.set_custom_color(0, color)
		
		item.set_text(1, entry.get("time", ""))
		item.set_custom_color(1, Color(0.7, 0.7, 0.7))
		
		item.set_text(2, entry.get("message", ""))
		item.set_custom_color(2, color)
		
		var cnt = entry.get("count", 1)
		item.set_text(3, str(cnt) if cnt > 1 else "")
		item.set_custom_color(3, Color(1.0, 0.8, 0.4))
		
		item.set_metadata(0, entry)
	
	_lbl_status.text = "表示中: %d / 全 %d 件" % [shown_count, raw_logs.size()]
	
	if _auto_scroll and last_item:
		_tree.scroll_to_item(last_item)

## 新規ログ追加時イベント
func _on_log_added(_entry: Dictionary) -> void:
	# 常に再描画（フィルタ・カウント・集計を正しく保つ）
	_refresh_display()

## ログ消去時イベント
func _on_logs_cleared() -> void:
	_selected_entry = {}
	_detail_text.text = "ログがクリアされました。"
	_refresh_display()

## ツリー選択時
func _on_tree_item_selected() -> void:
	var sel = _tree.get_selected()
	if not sel:
		return
	var entry = sel.get_metadata(0)
	if entry is Dictionary:
		_selected_entry = entry
		var details_str = entry.get("details", "")
		if details_str.is_empty():
			details_str = "スタック情報なし"
		_detail_text.text = "【時刻】: %s\n【種別】: %s\n【メッセージ】:\n%s\n\n【詳細・スタック情報】:\n%s" % [
			entry.get("time", ""),
			entry.get("level", ""),
			entry.get("message", ""),
			details_str
		]

## テストメニュー選択
func _on_test_menu_selected(id: int) -> void:
	match id:
		0:
			DebugLogManager.info("テスト用情報ログ（Debug.Log相当）が出力されました。")
		1:
			DebugLogManager.warn("テスト用警告ログ（Debug.LogWarning相当）：リソースキャッシュの整合性を確認してください。")
		2:
			DebugLogManager.error("テスト用エラーログ（Debug.LogError相当）：未定義の参照または予期せぬ例外が発生しました。")
