extends Control
class_name BaseWindow

## BaseWindow - 全疑似ウィンドウの基底クラス（コードベース生成）
## ドラッグ移動・リサイズ・最小化・最大化・閉じる を提供

@export var window_title: String = "ウィンドウ"
@export var app_type: String = "app"
@export var min_window_size: Vector2 = Vector2(280, 200)
@export var resizable: bool = true
@export var initial_size: Vector2 = Vector2(480, 360)

const TITLEBAR_HEIGHT := 30
const RESIZE_MARGIN := 6

var pid: String = ""
var _is_minimized: bool = false
var _is_maximized: bool = false
var _pre_maximize_rect: Rect2 = Rect2()
var _dragging: bool = false
var _drag_offset: Vector2 = Vector2.ZERO
var _resizing: bool = false
var _resize_dir: Vector2 = Vector2.ZERO
var _pre_minimize_height: float = 0.0

# UI References (built in _build_ui)
var title_bar: Panel
var title_label: Label
var btn_minimize: Button
var btn_maximize: Button
var btn_close: Button
var content_area: Control

func _ready() -> void:
	# サイズ初期化
	custom_minimum_size = min_window_size
	size = initial_size
	
	_build_ui()
	_apply_styles()
	
	# WindowManagerに登録
	pid = WindowManager.register_process(window_title, self, app_type)
	_focus_self()

## UIをコードで構築
func _build_ui() -> void:
	# 全体パネル（背景）
	var bg = Panel.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE  # 背景はgui_inputを横取りしない
	add_child(bg)
	bg.add_theme_stylebox_override("panel", _make_style(Color(0.10, 0.10, 0.16), 1, Color(0.35, 0.35, 0.65)))
	
	# タイトルバー
	title_bar = Panel.new()
	title_bar.set_anchor(SIDE_RIGHT, 1.0)
	title_bar.offset_bottom = TITLEBAR_HEIGHT
	add_child(title_bar)
	title_bar.add_theme_stylebox_override("panel", _make_style(Color(0.08, 0.08, 0.35)))
	
	# タイトルラベル
	title_label = Label.new()
	title_label.text = window_title
	title_label.add_theme_color_override("font_color", Color.WHITE)
	title_label.set_position(Vector2(36, 5))
	title_label.set_size(Vector2(size.x - 130, 20))
	title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE  # タイトルラベルはドラッグを妨げない
	title_bar.add_child(title_label)
	
	# ウィンドウアイコン（小さなカラーボックス）
	var win_icon = ColorRect.new()
	win_icon.color = Color(0.47, 0.47, 1.0)
	win_icon.position = Vector2(7, 7)
	win_icon.size = Vector2(16, 16)
	win_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE  # アイコンはドラッグを妨げない
	title_bar.add_child(win_icon)
	
	# タイトルバー右側ボタングループ
	var hbox = HBoxContainer.new()
	hbox.set_anchor(SIDE_LEFT, 1.0)
	hbox.set_anchor(SIDE_RIGHT, 1.0)
	hbox.position = Vector2(-90, 2)
	hbox.size = Vector2(90, TITLEBAR_HEIGHT - 4)
	title_bar.add_child(hbox)
	
	btn_minimize = _make_ctrl_button("─", false)
	btn_maximize = _make_ctrl_button("□", false)
	btn_close = _make_ctrl_button("✕", true)
	hbox.add_child(btn_minimize)
	hbox.add_child(btn_maximize)
	hbox.add_child(btn_close)
	
	btn_minimize.pressed.connect(_on_minimize)
	btn_maximize.pressed.connect(_on_maximize)
	btn_close.pressed.connect(close_window)
	
	# コンテンツエリア
	content_area = Control.new()
	content_area.set_anchor(SIDE_RIGHT, 1.0)
	content_area.set_anchor(SIDE_BOTTOM, 1.0)
	content_area.offset_top = TITLEBAR_HEIGHT
	content_area.clip_contents = true
	add_child(content_area)
	
	# タイトルバーのドラッグ入力
	title_bar.gui_input.connect(_on_titlebar_input)
	gui_input.connect(_on_self_input)

func _make_ctrl_button(text_str: String, is_close: bool) -> Button:
	var btn = Button.new()
	btn.text = text_str
	btn.custom_minimum_size = Vector2(28, 26)
	btn.flat = true
	if is_close:
		btn.add_theme_stylebox_override("normal", _make_style(Color(0.7, 0.12, 0.12)))
		btn.add_theme_stylebox_override("hover", _make_style(Color(1.0, 0.2, 0.2)))
	else:
		btn.add_theme_stylebox_override("normal", _make_style(Color(0.18, 0.18, 0.40)))
		btn.add_theme_stylebox_override("hover", _make_style(Color(0.28, 0.28, 0.60)))
	btn.add_theme_color_override("font_color", Color.WHITE)
	return btn

static func _make_style(color: Color, border_width: int = 0, border_color: Color = Color.TRANSPARENT) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = color
	if border_width > 0:
		sb.set_border_width_all(border_width)
		sb.border_color = border_color
	sb.corner_radius_top_left = 2
	sb.corner_radius_top_right = 2
	sb.corner_radius_bottom_left = 2
	sb.corner_radius_bottom_right = 2
	return sb

func _apply_styles() -> void:
	pass  # サブクラスでオーバーライド可能

func _on_titlebar_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_focus_self()
			_dragging = true
			_drag_offset = get_global_mouse_position() - global_position
		else:
			_dragging = false
	elif event is InputEventMouseMotion and _dragging:
		var new_pos = get_global_mouse_position() - _drag_offset
		global_position = _clamp_to_screen(new_pos)

func _on_self_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_focus_self()

func _input(event: InputEvent) -> void:
	if not resizable or _is_maximized:
		return
	if _resizing and event is InputEventMouseMotion:
		var delta = event.relative
		var new_size = size
		var new_pos = global_position
		if _resize_dir.x > 0:
			new_size.x = max(new_size.x + delta.x, min_window_size.x)
		elif _resize_dir.x < 0:
			new_size.x = max(new_size.x - delta.x, min_window_size.x)
			new_pos.x = global_position.x + delta.x
		if _resize_dir.y > 0:
			new_size.y = max(new_size.y + delta.y, min_window_size.y)
		elif _resize_dir.y < 0:
			new_size.y = max(new_size.y - delta.y, min_window_size.y)
			new_pos.y = global_position.y + delta.y
		size = new_size
		global_position = new_pos
		_on_window_resized()
	if event is InputEventMouseButton and not event.pressed:
		_resizing = false

func _process(_delta: float) -> void:
	if _dragging and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		_dragging = false
	
	# リサイズハンドル判定（マウスがウィンドウ端にいる場合）
	if not resizable or not is_visible_in_tree():
		return
	var local_mouse = get_local_mouse_position()
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and not _dragging and not _resizing:
		var dir = _get_resize_direction(local_mouse)
		if dir != Vector2.ZERO:
			_resizing = true
			_resize_dir = dir
			_focus_self()

func _get_resize_direction(pos: Vector2) -> Vector2:
	var dir = Vector2.ZERO
	if pos.x < RESIZE_MARGIN: dir.x = -1
	elif pos.x > size.x - RESIZE_MARGIN: dir.x = 1
	if pos.y > TITLEBAR_HEIGHT and pos.y < TITLEBAR_HEIGHT + RESIZE_MARGIN: dir.y = -1
	elif pos.y > size.y - RESIZE_MARGIN: dir.y = 1
	return dir

func _on_window_resized() -> void:
	# タイトルラベルの幅を更新
	if title_label:
		title_label.size = Vector2(size.x - 130, 20)

func _on_minimize() -> void:
	if not _is_minimized:
		_pre_minimize_height = size.y
		content_area.hide()
		size.y = TITLEBAR_HEIGHT
		_is_minimized = true
		btn_minimize.text = "▲"
	else:
		content_area.show()
		size.y = _pre_minimize_height
		_is_minimized = false
		btn_minimize.text = "─"

func _on_maximize() -> void:
	if _is_maximized:
		global_position = _pre_maximize_rect.position
		size = _pre_maximize_rect.size
		_is_maximized = false
		btn_maximize.text = "□"
	else:
		_pre_maximize_rect = Rect2(global_position, size)
		var vp = get_viewport_rect()
		global_position = Vector2.ZERO
		size = Vector2(vp.size.x, vp.size.y - WindowManager.TASKBAR_HEIGHT)
		_is_maximized = true
		btn_maximize.text = "❐"
	_on_window_resized()

func close_window() -> void:
	WindowManager.unregister_window(self)
	queue_free()

func _focus_self() -> void:
	WindowManager.focus_window(self)

func _clamp_to_screen(pos: Vector2) -> Vector2:
	var vp = get_viewport_rect()
	pos.x = clamp(pos.x, 0, vp.size.x - size.x)
	pos.y = clamp(pos.y, 0, vp.size.y - WindowManager.TASKBAR_HEIGHT - TITLEBAR_HEIGHT)
	return pos
