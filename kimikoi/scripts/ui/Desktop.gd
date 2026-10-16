extends Control

## Desktop.gd - メインシーン（コードで全UI構築）
## 壁紙・アイコン・ウィンドウレイヤー・タスクバー・右クリックメニューを構築する

const TASKBAR_HEIGHT := 40
const ICON_GRID_SIZE := 80

var _wallpaper: ColorRect  # 壁紙（テクスチャ差替え対応）
var _icon_layer: Control
var _window_layer: Control
var _taskbar: Control
var _selection_rect: Panel
var _context_menu: PopupMenu

var _selecting: bool = false
var _select_start: Vector2 = Vector2.ZERO

# デフォルトアプリ一覧（ラベル、パス、アイコンカラー、システムアイコンか）
const DEFAULT_ICONS = [
	{"label": "ゴミ箱",               "path": "res://scenes/apps/RecycleBinApp.tscn",  "color": Color(0.5, 0.5, 0.6), "system": true},
	{"label": "タスクマネージャー",   "path": "res://scenes/apps/TaskManager.tscn",    "color": Color(0.3, 0.7, 1.0)},
	{"label": "メモ帳",               "path": "res://scenes/apps/Notepad.tscn",        "color": Color(1.0, 0.9, 0.3)},
	{"label": "ファイル\nエクスプローラー", "path": "res://scenes/apps/FileExplorer.tscn", "color": Color(1.0, 0.7, 0.2)},
	{"label": "時計",                 "path": "res://scenes/apps/ClockApp.tscn",       "color": Color(0.3, 1.0, 0.7)},
	{"label": "音量ミキサー",         "path": "res://scenes/apps/VolumeMixer.tscn",    "color": Color(0.9, 0.4, 1.0)},
	{"label": "設定",                 "path": "res://scenes/apps/Settings.tscn",       "color": Color(0.7, 0.7, 0.7)},
	{"label": "デバッグ\nコンソール", "path": "res://scenes/apps/DebugConsoleApp.tscn", "color": Color(0.8, 0.4, 0.9)},
]

func _ready() -> void:
	add_to_group("desktop")
	_build_scene()
	AppLauncher.set_window_layer(_window_layer)
	RecycleBin.bin_changed.connect(_update_trash_icon)

func _build_scene() -> void:
	# 1. 壁紙レイヤー
	_wallpaper = ColorRect.new()
	_wallpaper.color = Color(0.04, 0.04, 0.14)  # デフォルト：深い紺
	_wallpaper.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_wallpaper.mouse_filter = Control.MOUSE_FILTER_IGNORE  # 壁紙はクリックを通過させる
	_wallpaper.name = "Wallpaper"
	add_child(_wallpaper)
	
	# 2. アイコンレイヤー
	_icon_layer = Control.new()
	_icon_layer.set_anchor(SIDE_RIGHT, 1.0)
	_icon_layer.set_anchor(SIDE_BOTTOM, 1.0)
	_icon_layer.offset_bottom = -TASKBAR_HEIGHT
	_icon_layer.mouse_filter = Control.MOUSE_FILTER_PASS  # アイコン以外の場所はDesktopへ通過
	_icon_layer.name = "IconLayer"
	add_child(_icon_layer)
	
	# 3. ウィンドウレイヤー
	_window_layer = Control.new()
	_window_layer.set_anchor(SIDE_RIGHT, 1.0)
	_window_layer.set_anchor(SIDE_BOTTOM, 1.0)
	_window_layer.offset_bottom = -TASKBAR_HEIGHT
	_window_layer.mouse_filter = Control.MOUSE_FILTER_PASS  # ウィンドウ以外はDesktopへ通過
	_window_layer.name = "WindowLayer"
	add_child(_window_layer)
	
	# 4. タスクバー
	_taskbar = Control.new()
	_taskbar.script = load("res://scripts/ui/Taskbar.gd")
	_taskbar.set_anchor(SIDE_LEFT, 0.0)
	_taskbar.set_anchor(SIDE_RIGHT, 1.0)
	_taskbar.set_anchor(SIDE_TOP, 1.0)
	_taskbar.set_anchor(SIDE_BOTTOM, 1.0)
	_taskbar.offset_top = -TASKBAR_HEIGHT
	_taskbar.offset_bottom = 0.0
	_taskbar.name = "Taskbar"
	add_child(_taskbar)
	
	# 5. 選択矩形（ラバーバンド）
	_selection_rect = Panel.new()
	var sel_style = StyleBoxFlat.new()
	sel_style.bg_color = Color(0.3, 0.5, 1.0, 0.2)
	sel_style.set_border_width_all(1)
	sel_style.border_color = Color(0.4, 0.6, 1.0, 0.8)
	_selection_rect.add_theme_stylebox_override("panel", sel_style)
	_selection_rect.hide()
	_selection_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_selection_rect)
	
	# 6. 右クリックコンテキストメニュー
	_context_menu = PopupMenu.new()
	_context_menu.add_item("表示", 0)
	_context_menu.add_item("アイコンを整列", 1)
	_context_menu.add_separator()
	_context_menu.add_item("新規フォルダ", 2)
	_context_menu.add_separator()
	_context_menu.add_item("壁紙の変更...", 3)
	_context_menu.add_item("ディスプレイ設定", 4)
	_context_menu.add_separator()
	_context_menu.add_item("🛠 デバッグコンソール (F12)", 5)
	_context_menu.id_pressed.connect(_on_context)
	add_child(_context_menu)
	
	# 7. アイコン配置
	_setup_icons()

func _setup_icons() -> void:
	for i in DEFAULT_ICONS.size():
		var data = DEFAULT_ICONS[i]
		var icon = _spawn_icon(
			data["label"],
			data.get("color", Color.WHITE),
			data.get("path", ""),
			data.get("system", false)
		)
		# 左端に縦に並べる
		icon.global_position = Vector2(10, 10 + i * (ICON_GRID_SIZE + 10))

func _spawn_icon(label: String, color: Color, path: String, system: bool = false) -> DesktopIcon:
	var icon = DesktopIcon.new()
	icon.icon_label = label
	icon.icon_color = color
	icon.app_scene_path = path
	icon.is_system_icon = system
	_icon_layer.add_child(icon)
	return icon

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			if not _is_over_window_or_icon(event.global_position):
				_context_menu.position = event.global_position
				_context_menu.popup()
		
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_deselect_all()
				if is_instance_valid(_taskbar) and _taskbar.has_method("hide_menus"):
					_taskbar.hide_menus()
				# ラバーバンド開始
				if not _is_over_window_or_icon(event.global_position):
					_selecting = true
					_select_start = event.global_position
					_selection_rect.show()
			else:
				if _selecting:
					_selecting = false
					_selection_rect.hide()
					_apply_selection()
	
	elif event is InputEventMouseMotion and _selecting:
		var mouse_pos = event.global_position
		var rect = Rect2(_select_start, mouse_pos - _select_start).abs()
		_selection_rect.global_position = rect.position
		_selection_rect.size = rect.size

func _is_over_window_or_icon(pos: Vector2) -> bool:
	for win in WindowManager.get_all_windows():
		if is_instance_valid(win) and win.get_global_rect().has_point(pos):
			return true
	for icon in _icon_layer.get_children():
		if icon is DesktopIcon and icon.get_global_rect().has_point(pos):
			return true
	return false

func _deselect_all() -> void:
	if not is_instance_valid(_icon_layer):
		return
	for icon in _icon_layer.get_children():
		if icon is DesktopIcon:
			icon.deselect()

func _apply_selection() -> void:
	var sel = Rect2(_selection_rect.global_position, _selection_rect.size)
	for icon in _icon_layer.get_children():
		if icon is DesktopIcon and sel.intersects(icon.get_global_rect()):
			icon._bg.show()
			icon._selected = true

func _on_context(id: int) -> void:
	match id:
		0: _toggle_icons_visible()
		1: _sort_icons()
		2: _create_new_folder()
		3: _change_wallpaper()
		4: AppLauncher.launch("res://scenes/apps/Settings.tscn")
		5: AppLauncher.launch("res://scenes/apps/DebugConsoleApp.tscn")

func _toggle_icons_visible() -> void:
	for icon in _icon_layer.get_children():
		icon.visible = not icon.visible

func _sort_icons() -> void:
	var icons: Array = []
	for icon in _icon_layer.get_children():
		if icon is DesktopIcon:
			icons.append(icon)
	var vp := get_viewport_rect()
	var rows_max := int((vp.size.y - TASKBAR_HEIGHT) / (ICON_GRID_SIZE + 10))
	var col := 0
	var row := 0
	for icon in icons:
		icon.global_position = Vector2(10 + col * ICON_GRID_SIZE, 10 + row * (ICON_GRID_SIZE + 10))
		row += 1
		if row >= rows_max:
			row = 0
			col += 1

func _create_new_folder() -> void:
	var icon = _spawn_icon("新しいフォルダ", Color(1.0, 0.8, 0.2), "")
	icon.global_position = get_global_mouse_position()

func _change_wallpaper() -> void:
	var dialog = FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.filters = ["*.png,*.jpg,*.jpeg,*.bmp,*.webp ; 画像ファイル"]
	get_tree().root.add_child(dialog)
	dialog.popup_centered(Vector2(600, 450))
	dialog.file_selected.connect(func(path: String):
		var img = Image.load_from_file(path)
		if img:
			var tex = ImageTexture.create_from_image(img)
			# ColorRectをTextureRectに変換
			var tr = TextureRect.new()
			tr.texture = tex
			tr.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
			tr.stretch_mode = TextureRect.STRETCH_SCALE
			tr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
			tr.name = "Wallpaper"
			_wallpaper.replace_by(tr)
			_wallpaper = tr
		dialog.queue_free()
	)
	dialog.canceled.connect(dialog.queue_free)

## ゴミ箱アイコンラベル更新
func _update_trash_icon() -> void:
	var count = RecycleBin.get_count()
	for icon in _icon_layer.get_children():
		if icon is DesktopIcon and icon.is_system_icon and "ゴミ箱" in icon.icon_label:
			icon._label_node.text = "ゴミ箱 (%d)" % count if count > 0 else "ゴミ箱"
			# ゴミ箱が空かどうかで色変更
			icon._icon_rect.color = Color(0.6, 0.4, 0.3) if count > 0 else Color(0.5, 0.5, 0.6)
