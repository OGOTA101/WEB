extends Control

## Taskbar - コードベース生成版タスクバー

const TASKBAR_HEIGHT := 40

var _window_btn_box: HBoxContainer
var _clock_label: Label
var _start_btn: Button
var _start_menu: Panel
var _start_menu_visible: bool = false
var _vol_btn: Button
var _vol_popup: Panel
var _master_slider: HSlider
var _bgm_slider: HSlider
var _se_slider: HSlider
var _clock_timer: float = 0.0

func _ready() -> void:
	_build_taskbar()
	WindowManager.process_list_changed.connect(_refresh_window_buttons)
	_update_clock()

func _build_taskbar() -> void:
	# タスクバー本体スタイル
	var bg = Panel.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.07, 0.07, 0.18)
	bg.add_theme_stylebox_override("panel", sb)
	add_child(bg)
	
	var hbox = HBoxContainer.new()
	hbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 2)
	add_child(hbox)
	
	# --- スタートボタン ---
	_start_btn = Button.new()
	_start_btn.text = "  🪟  スタート  "
	_start_btn.custom_minimum_size = Vector2(130, TASKBAR_HEIGHT)
	_start_btn.flat = true
	_start_btn.add_theme_color_override("font_color", Color.WHITE)
	var sb_start = StyleBoxFlat.new()
	sb_start.bg_color = Color(0.15, 0.15, 0.55)
	_start_btn.add_theme_stylebox_override("normal", sb_start)
	var sb_start_h = StyleBoxFlat.new()
	sb_start_h.bg_color = Color(0.25, 0.25, 0.75)
	_start_btn.add_theme_stylebox_override("hover", sb_start_h)
	_start_btn.pressed.connect(_toggle_start_menu)
	hbox.add_child(_start_btn)
	
	# セパレーター
	var sep = VSeparator.new()
	hbox.add_child(sep)
	
	# --- ウィンドウボタンエリア ---
	_window_btn_box = HBoxContainer.new()
	_window_btn_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_window_btn_box.add_theme_constant_override("separation", 2)
	hbox.add_child(_window_btn_box)
	
	# --- 右端エリア ---
	var right_box = HBoxContainer.new()
	right_box.alignment = BoxContainer.ALIGNMENT_END
	hbox.add_child(right_box)
	
	# 音量ボタン
	_vol_btn = Button.new()
	_vol_btn.text = "🔊"
	_vol_btn.custom_minimum_size = Vector2(38, TASKBAR_HEIGHT)
	_vol_btn.flat = true
	_vol_btn.add_theme_color_override("font_color", Color.WHITE)
	_vol_btn.pressed.connect(_toggle_vol_popup)
	right_box.add_child(_vol_btn)
	
	# 時計ラベル
	_clock_label = Label.new()
	_clock_label.custom_minimum_size = Vector2(100, TASKBAR_HEIGHT)
	_clock_label.add_theme_color_override("font_color", Color.WHITE)
	_clock_label.add_theme_font_size_override("font_size", 11)
	_clock_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_clock_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	right_box.add_child(_clock_label)
	
	# --- スタートメニュー ---
	_build_start_menu()
	
	# --- 音量ポップアップ ---
	_build_vol_popup()

func _build_start_menu() -> void:
	_start_menu = Panel.new()
	_start_menu.custom_minimum_size = Vector2(280, 420)
	_start_menu.position = Vector2(0, -420)
	var sm_style = StyleBoxFlat.new()
	sm_style.bg_color = Color(0.08, 0.08, 0.22)
	sm_style.set_border_width_all(1)
	sm_style.border_color = Color(0.3, 0.3, 0.7)
	_start_menu.add_theme_stylebox_override("panel", sm_style)
	_start_menu.hide()
	add_child(_start_menu)
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_top = 8
	vbox.offset_left = 8
	vbox.offset_right = -8
	vbox.offset_bottom = -8
	_start_menu.add_child(vbox)
	
	var header = Label.new()
	header.text = "KIMIKOI OS"
	header.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	header.add_theme_font_size_override("font_size", 16)
	vbox.add_child(header)
	
	var sep = HSeparator.new()
	vbox.add_child(sep)
	
	# アプリ一覧
	var apps = [
		{"name": "📁  ファイルエクスプローラー", "path": "res://scenes/apps/FileExplorer.tscn"},
		{"name": "📄  メモ帳", "path": "res://scenes/apps/Notepad.tscn"},
		{"name": "🕐  時計", "path": "res://scenes/apps/ClockApp.tscn"},
		{"name": "🔊  音量ミキサー", "path": "res://scenes/apps/VolumeMixer.tscn"},
		{"name": "🗑  ゴミ箱", "path": "res://scenes/apps/RecycleBinApp.tscn"},
		{"name": "⚙  設定", "path": "res://scenes/apps/Settings.tscn"},
		{"name": "📊  タスクマネージャー", "path": "res://scenes/apps/TaskManager.tscn"},
		{"name": "🛠  デバッグコンソール", "path": "res://scenes/apps/DebugConsoleApp.tscn"},
	]
	
	for app in apps:
		var btn = Button.new()
		btn.text = app["name"]
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.flat = false
		btn.add_theme_color_override("font_color", Color.WHITE)
		var btn_path = app["path"]
		btn.pressed.connect(func():
			AppLauncher.launch(btn_path)
			_toggle_start_menu()
		)
		vbox.add_child(btn)
	
	var spacer = Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(spacer)
	
	var sep2 = HSeparator.new()
	vbox.add_child(sep2)
	
	# 電源ボタン（ゲーム終了）
	var quit_btn = Button.new()
	quit_btn.text = "⏻  シャットダウン"
	quit_btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	quit_btn.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))
	quit_btn.pressed.connect(func():
		get_tree().quit()
	)
	vbox.add_child(quit_btn)

func _build_vol_popup() -> void:
	_vol_popup = Panel.new()
	_vol_popup.custom_minimum_size = Vector2(220, 160)
	_vol_popup.position = Vector2(-180, -165)
	# スタートボタン分右に置く（右端から）
	var vp_style = StyleBoxFlat.new()
	vp_style.bg_color = Color(0.08, 0.08, 0.22)
	vp_style.set_border_width_all(1)
	vp_style.border_color = Color(0.35, 0.35, 0.7)
	_vol_popup.add_theme_stylebox_override("panel", vp_style)
	_vol_popup.hide()
	add_child(_vol_popup)
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_top = 8
	vbox.offset_left = 10
	vbox.offset_right = -10
	vbox.offset_bottom = -8
	_vol_popup.add_child(vbox)
	
	_master_slider = _make_vol_row(vbox, "マスター", SoundManager.master_volume, func(v): SoundManager.set_master_volume(v))
	_bgm_slider = _make_vol_row(vbox, "BGM", SoundManager.bgm_volume, func(v): SoundManager.set_bgm_volume(v))
	_se_slider = _make_vol_row(vbox, "SE", SoundManager.se_volume, func(v): SoundManager.set_se_volume(v))

func _make_vol_row(parent: Control, label_text: String, init_val: float, callback: Callable) -> HSlider:
	var row = HBoxContainer.new()
	parent.add_child(row)
	var lbl = Label.new()
	lbl.text = label_text
	lbl.custom_minimum_size = Vector2(60, 0)
	lbl.add_theme_color_override("font_color", Color.WHITE)
	lbl.add_theme_font_size_override("font_size", 11)
	row.add_child(lbl)
	var sl = HSlider.new()
	sl.min_value = 0.0
	sl.max_value = 1.0
	sl.step = 0.02
	sl.value = init_val
	sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sl.value_changed.connect(callback)
	row.add_child(sl)
	return sl

func _process(delta: float) -> void:
	_clock_timer += delta
	if _clock_timer >= 1.0:
		_clock_timer = 0.0
		_update_clock()

func _update_clock() -> void:
	var t = Time.get_datetime_dict_from_system()
	_clock_label.text = "%02d:%02d\n%04d/%02d/%02d" % [
		t["hour"], t["minute"],
		t["year"], t["month"], t["day"]
	]

func _toggle_start_menu() -> void:
	_start_menu_visible = !_start_menu_visible
	if _start_menu_visible:
		_start_menu.show()
		_vol_popup.hide()
	else:
		_start_menu.hide()

func _toggle_vol_popup() -> void:
	if _vol_popup.visible:
		_vol_popup.hide()
	else:
		_vol_popup.show()
		_start_menu.hide()
		_start_menu_visible = false

func hide_menus() -> void:
	_start_menu.hide()
	_start_menu_visible = false
	_vol_popup.hide()

func _refresh_window_buttons() -> void:
	for child in _window_btn_box.get_children():
		child.queue_free()
	
	for process in WindowManager.get_processes():
		var win = process["window"]
		if not is_instance_valid(win):
			continue
		var btn = Button.new()
		btn.text = " %s" % process["name"]
		btn.custom_minimum_size = Vector2(140, TASKBAR_HEIGHT - 6)
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.flat = false
		var sb_n = StyleBoxFlat.new()
		sb_n.bg_color = Color(0.15, 0.15, 0.35)
		btn.add_theme_stylebox_override("normal", sb_n)
		var sb_h = StyleBoxFlat.new()
		sb_h.bg_color = Color(0.25, 0.25, 0.55)
		btn.add_theme_stylebox_override("hover", sb_h)
		btn.add_theme_color_override("font_color", Color.WHITE)
		btn.add_theme_font_size_override("font_size", 11)
		btn.pressed.connect(func():
			if is_instance_valid(win):
				win.show()
				WindowManager.focus_window(win)
		)
		_window_btn_box.add_child(btn)
