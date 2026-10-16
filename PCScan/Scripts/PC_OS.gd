extends Control

@onready var time_label = $Taskbar/HBox/Tray/TimeLabel
@onready var desktop_bg = $DesktopBackground
@onready var icon_container = $IconContainer
@onready var network_icon = $Taskbar/HBox/Tray/NetworkIcon
@onready var window_layer = $WindowLayer
@onready var task_tabs = $Taskbar/HBox/TaskTabs
@onready var power_overlay = $PowerOverlay
@onready var power_btn = $PowerOverlay/PowerBtn

const DesktopIconScene = preload("res://Scenes/DesktopIcon.tscn")

var glitch_rect: ColorRect
var popup_menu: PopupMenu

var selection_start: Vector2 = Vector2.ZERO
var selection_current: Vector2 = Vector2.ZERO
var is_selecting: bool = false
var selection_rect: Rect2

func _ready():
	$Taskbar/HBox/StartButton.pressed.connect(func():
		GameState.is_pc_on = false
		get_tree().change_scene_to_file("res://Scenes/Room.tscn")
	)
	
	GameState.open_window_requested.connect(_on_open_window)
	GameState.system_crashed.connect(_on_gameover)
	
	var files = FileSystem.build_file_system()
	GameState.total_deletable_count = FileSystem.get_total_deletable(files)
	
	for file_data in files:
		if file_data.get_instance_id() in GameState.permanently_deleted_ids:
			continue
		if file_data in GameState.trash_files:
			continue
		var icon = DesktopIconScene.instantiate()
		icon_container.add_child(icon)
		icon.setup(file_data)
		
	var timer = Timer.new()
	timer.wait_time = 1.0
	timer.autostart = true
	timer.timeout.connect(_update_time)
	add_child(timer)
	_update_time()
	
	var net_timer = Timer.new()
	net_timer.wait_time = 0.5
	net_timer.autostart = true
	net_timer.timeout.connect(_blink_network)
	add_child(net_timer)

	glitch_rect = ColorRect.new()
	glitch_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var sm = ShaderMaterial.new()
	sm.shader = load("res://Scripts/Glitch.gdshader")
	glitch_rect.material = sm
	glitch_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(glitch_rect)

	if not GameState.is_pc_on:
		power_overlay.visible = true
	else:
		power_overlay.visible = false

	power_btn.pressed.connect(func():
		GameState.is_pc_on = true
		power_overlay.visible = false
	)
	
	_setup_context_menu()
	desktop_bg.gui_input.connect(_on_desktop_gui_input)

func _setup_context_menu():
	popup_menu = PopupMenu.new()
	popup_menu.add_item("最新の情報に更新", 0)
	popup_menu.add_item("アイコンの整列", 1)
	add_child(popup_menu)
	popup_menu.id_pressed.connect(func(id):
		if id == 1:
			_arrange_icons()
	)

func _on_desktop_gui_input(event: InputEvent):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			popup_menu.position = get_viewport().get_mouse_position()
			popup_menu.popup()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				is_selecting = true
				selection_start = event.position
				selection_current = event.position
				queue_redraw()
				_clear_selection()
			else:
				is_selecting = false
				queue_redraw()
	elif event is InputEventMouseMotion and is_selecting:
		selection_current = event.position
		queue_redraw()
		_update_selection()

func _clear_selection():
	for c in icon_container.get_children():
		if c is DesktopIcon:
			c.modulate = Color.WHITE

func _update_selection():
	var rect_min = Vector2(min(selection_start.x, selection_current.x), min(selection_start.y, selection_current.y))
	var rect_max = Vector2(max(selection_start.x, selection_current.x), max(selection_start.y, selection_current.y))
	selection_rect = Rect2(rect_min, rect_max - rect_min)
	
	for c in icon_container.get_children():
		if c is DesktopIcon:
			var center = c.global_position + c.size / 2.0
			if selection_rect.has_point(center):
				c.modulate = Color(0.5, 0.5, 1.0) # Selected color
			else:
				c.modulate = Color.WHITE

func _draw():
	if is_selecting:
		draw_rect(selection_rect, Color(0.2, 0.5, 1.0, 0.3), true)
		draw_rect(selection_rect, Color(0.2, 0.5, 1.0, 0.8), false, 1.0)

func _arrange_icons():
	var icons = []
	for c in icon_container.get_children():
		if c is DesktopIcon:
			icons.append(c)
	icons.sort_custom(func(a,b): return a.name_label.text < b.name_label.text)
	
	var grid_x = 50
	var grid_y = 50
	for i in range(icons.size()):
		var icon = icons[i]
		var tween = create_tween()
		tween.tween_property(icon, "position", Vector2(grid_x, grid_y), 0.3)
		grid_y += 100
		if grid_y > 600:
			grid_y = 50
			grid_x += 100

func _update_time():
	var time_dict = Time.get_time_dict_from_system()
	time_label.text = "%02d:%02d " % [time_dict.hour, time_dict.minute]

func _blink_network():
	network_icon.visible = randf() > 0.3

func _can_drop_data(at_position, data):
	return data is Control

func _drop_data(at_position, data):
	var adjusted_pos = at_position - Vector2(32, 10)
	if data.get_parent() == icon_container:
		data.position = adjusted_pos
	else:
		if data.get_parent() != null:
			data.get_parent().remove_child(data)
		icon_container.add_child(data)
		data.position = adjusted_pos

func _on_open_window(file_data: VirtualFileEntry):
	var window = OSWindow.new()
	window_layer.add_child(window)
	window.position = Vector2(100, 100) + Vector2(randf_range(-20, 20), randf_range(-20, 20))
	window.setup(file_data)
	
	var task_btn = Button.new()
	task_btn.text = file_data.file_name
	task_tabs.add_child(task_btn)
	
	task_btn.pressed.connect(func():
		window.visible = true
		window._focus()
	)
	
	window.tree_exited.connect(func():
		task_btn.queue_free()
	)

func _on_gameover():
	var tween = create_tween()
	tween.tween_method(func(v): 
		if glitch_rect and glitch_rect.material:
			glitch_rect.material.set_shader_parameter("shake_power", v)
			glitch_rect.material.set_shader_parameter("color_aberration", v), 
		0.0, 1.0, 1.0)
	await tween.finished
	GameState.set_meta("result_end", "意識の同化")
	get_tree().change_scene_to_file("res://Scenes/Result.tscn")
