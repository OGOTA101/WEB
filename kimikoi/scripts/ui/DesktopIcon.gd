extends Control
class_name DesktopIcon

## DesktopIcon - コードベース生成版
## グリッドスナップ・ダブルクリック起動・右クリックメニュー・ゴミ箱送り・リネーム対応

const GRID_SIZE := 80
const ICON_SIZE := 48
const DBL_CLICK_TIME := 0.35

@export var icon_label: String = "アイコン"
@export var icon_color: Color = Color(0.47, 0.53, 1.0)
@export var app_scene_path: String = ""
@export var is_system_icon: bool = false

var _selected: bool = false
var _dragging: bool = false
var _drag_offset: Vector2 = Vector2.ZERO
var _last_click_time: float = -1.0
var _context_menu: PopupMenu = null

# UIノード
var _bg: Panel
var _icon_rect: ColorRect
var _label_node: Label

func _ready() -> void:
	custom_minimum_size = Vector2(GRID_SIZE, GRID_SIZE + 20)
	size = custom_minimum_size
	mouse_filter = Control.MOUSE_FILTER_STOP  # アイコン自身は必ずイベントを受け取る
	
	_build_ui()
	_build_context_menu()

func _build_ui() -> void:
	# 選択ハイライト（背景）
	_bg = Panel.new()
	_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE  # ハイライトはクリックを間引かない
	var bg_style = StyleBoxFlat.new()
	bg_style.bg_color = Color(0.3, 0.5, 1.0, 0.3)
	bg_style.corner_radius_top_left = 4
	bg_style.corner_radius_top_right = 4
	bg_style.corner_radius_bottom_left = 4
	bg_style.corner_radius_bottom_right = 4
	_bg.add_theme_stylebox_override("panel", bg_style)
	_bg.hide()
	add_child(_bg)
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE  # vboxはクリックを間引かない
	add_child(vbox)
	
	# アイコン（カラーブロック）
	var icon_container = Control.new()
	icon_container.custom_minimum_size = Vector2(ICON_SIZE, ICON_SIZE)
	icon_container.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	icon_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(icon_container)
	
	_icon_rect = ColorRect.new()
	_icon_rect.color = icon_color
	_icon_rect.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_icon_rect.size = Vector2(ICON_SIZE - 8, ICON_SIZE - 8)
	_icon_rect.position = Vector2(4, 4)
	_icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE  # アイコン画像はクリックを間引かない
	icon_container.add_child(_icon_rect)
	
	# ラベル
	_label_node = Label.new()
	_label_node.text = icon_label
	_label_node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label_node.add_theme_color_override("font_color", Color.WHITE)
	_label_node.add_theme_font_size_override("font_size", 11)
	_label_node.autowrap_mode = TextServer.AUTOWRAP_WORD
	_label_node.custom_minimum_size = Vector2(GRID_SIZE, 28)
	_label_node.mouse_filter = Control.MOUSE_FILTER_IGNORE  # ラベルはクリックを間引かない
	vbox.add_child(_label_node)

func _build_context_menu() -> void:
	_context_menu = PopupMenu.new()
	_context_menu.add_item("開く", 0)
	_context_menu.add_separator()
	if not is_system_icon:
		_context_menu.add_item("削除（ゴミ箱へ）", 1)
	_context_menu.add_item("名前の変更", 2)
	_context_menu.add_separator()
	_context_menu.add_item("プロパティ", 3)
	add_child(_context_menu)
	_context_menu.id_pressed.connect(_on_context)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_select()
				_dragging = true
				_drag_offset = get_global_mouse_position() - global_position
				var now := Time.get_ticks_msec() / 1000.0
				if now - _last_click_time < DBL_CLICK_TIME:
					_dragging = false
					_launch()
				_last_click_time = now
			else:
				if _dragging:
					_snap_to_grid()
				_dragging = false
		
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			_select()
			_context_menu.position = get_global_mouse_position()
			_context_menu.popup()
	
	elif event is InputEventMouseMotion and _dragging:
		global_position = get_global_mouse_position() - _drag_offset

func _select() -> void:
	# 親（IconLayer）の全アイコンを解除
	var parent = get_parent()
	if parent:
		for child in parent.get_children():
			if child is DesktopIcon and child != self:
				child.deselect()
	_selected = true
	_bg.show()

func deselect() -> void:
	_selected = false
	_bg.hide()

func _launch() -> void:
	if app_scene_path != "":
		AppLauncher.launch(app_scene_path)

func _snap_to_grid() -> void:
	var vp := get_viewport_rect()
	var sx: float = round(global_position.x / GRID_SIZE) * GRID_SIZE
	var sy: float = round(global_position.y / GRID_SIZE) * GRID_SIZE
	sx = clamp(sx, 0.0, vp.size.x - GRID_SIZE)
	sy = clamp(sy, 0.0, vp.size.y - WindowManager.TASKBAR_HEIGHT - GRID_SIZE - 20.0)
	global_position = Vector2(sx, sy)

func _on_context(id: int) -> void:
	match id:
		0: _launch()
		1: _trash()
		2: _rename()
		3: _properties()

func _trash() -> void:
	RecycleBin.add_item({
		"label": icon_label,
		"app_scene_path": app_scene_path,
		"is_system_icon": is_system_icon,
		"original_pos": global_position,
	})
	queue_free()

func _rename() -> void:
	var dialog = AcceptDialog.new()
	dialog.title = "名前の変更"
	var le = LineEdit.new()
	le.text = icon_label
	le.custom_minimum_size = Vector2(240, 30)
	dialog.add_child(le)
	get_tree().root.add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(func():
		if le.text.strip_edges() != "":
			icon_label = le.text.strip_edges()
			_label_node.text = icon_label
		dialog.queue_free()
	)
	dialog.canceled.connect(dialog.queue_free)

func _properties() -> void:
	var d = AcceptDialog.new()
	d.title = "プロパティ"
	d.dialog_text = "名前: %s\nパス: %s\nシステム: %s" % [icon_label, app_scene_path, str(is_system_icon)]
	get_tree().root.add_child(d)
	d.popup_centered()
	d.confirmed.connect(d.queue_free)
