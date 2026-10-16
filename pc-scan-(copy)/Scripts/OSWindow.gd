extends Panel
class_name OSWindow

var title_label: Label
var close_btn: Button
var content_container: MarginContainer
var file_data: VirtualFileEntry

var dragging: bool = false
var drag_offset: Vector2
var is_maximized: bool = false
var prev_rect: Rect2

func _init():
	custom_minimum_size = Vector2(400, 300)
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(vbox)
	
	var header = ColorRect.new()
	header.color = Color(0.1, 0.1, 0.4, 1)
	header.custom_minimum_size = Vector2(0, 30)
	vbox.add_child(header)
	
	var hbox = HBoxContainer.new()
	hbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	header.add_child(hbox)
	
	var spacer1 = Control.new()
	spacer1.custom_minimum_size = Vector2(5, 0)
	hbox.add_child(spacer1)
	
	title_label = Label.new()
	title_label.text = "Window Title"
	title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(title_label)
	
	var spacer_mid = Control.new()
	spacer_mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer_mid)
	
	var min_btn = Button.new()
	min_btn.text = "_"
	hbox.add_child(min_btn)
	
	var max_btn = Button.new()
	max_btn.text = "□"
	hbox.add_child(max_btn)
	
	close_btn = Button.new()
	close_btn.text = "X"
	hbox.add_child(close_btn)
	
	var scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_child(scroll)
	
	content_container = MarginContainer.new()
	content_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content_container.add_theme_constant_override("margin_left", 10)
	content_container.add_theme_constant_override("margin_top", 10)
	content_container.add_theme_constant_override("margin_right", 10)
	content_container.add_theme_constant_override("margin_bottom", 10)
	scroll.add_child(content_container)

	close_btn.pressed.connect(close_window)
	max_btn.pressed.connect(toggle_maximize)
	min_btn.pressed.connect(minimize_window)
	header.gui_input.connect(_on_header_gui_input)
	gui_input.connect(_on_gui_input)

func setup(data: VirtualFileEntry):
	file_data = data
	title_label.text = data.file_name
	
	for c in content_container.get_children():
		c.queue_free()
		
	match data.file_type:
		VirtualFileEntry.FileType.TEXT, VirtualFileEntry.FileType.CURSED:
			var label = RichTextLabel.new()
			label.text = data.text_content
			label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			label.size_flags_vertical = Control.SIZE_EXPAND_FILL
			label.add_theme_color_override("default_color", Color.BLACK)
			var bg = ColorRect.new()
			bg.color = Color.WHITE
			bg.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			bg.size_flags_vertical = Control.SIZE_EXPAND_FILL
			bg.add_child(label)
			label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
			content_container.add_child(bg)
			
		VirtualFileEntry.FileType.FOLDER:
			var grid = GridContainer.new()
			grid.columns = 4
			grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
			content_container.add_child(grid)
			for child_data in data.children:
				if child_data.get_instance_id() in GameState.permanently_deleted_ids:
					continue
				if child_data in GameState.trash_files:
					continue
				var icon = load("res://Scenes/DesktopIcon.tscn").instantiate()
				grid.add_child(icon)
				icon.setup(child_data)
				
		VirtualFileEntry.FileType.LOCKED:
			var vbox = VBoxContainer.new()
			vbox.alignment = BoxContainer.ALIGNMENT_CENTER
			var label = Label.new()
			label.text = "パスワードを入力してください"
			var pass_input = LineEdit.new()
			pass_input.secret = true
			var unlock_btn = Button.new()
			unlock_btn.text = "解除"
			vbox.add_child(label)
			vbox.add_child(pass_input)
			vbox.add_child(unlock_btn)
			content_container.add_child(vbox)
			unlock_btn.pressed.connect(func():
				if pass_input.text == data.unlock_password:
					data.file_type = VirtualFileEntry.FileType.FOLDER
					setup(data)
				else:
					pass_input.text = ""
					label.text = "パスワードが違います"
			)
			
		VirtualFileEntry.FileType.TRASH:
			var vbox = VBoxContainer.new()
			var empty_btn = Button.new()
			empty_btn.text = "ごみ箱を空にする"
			empty_btn.pressed.connect(GameState.empty_trash)
			vbox.add_child(empty_btn)
			var list = ItemList.new()
			list.size_flags_vertical = Control.SIZE_EXPAND_FILL
			for t in GameState.trash_files:
				list.add_item(t.file_name)
			vbox.add_child(list)
			content_container.add_child(vbox)
			GameState.file_state_updated.connect(func():
				if not is_instance_valid(list): return
				list.clear()
				for t in GameState.trash_files:
					list.add_item(t.file_name)
			)
			
		VirtualFileEntry.FileType.APP_TASKMANAGER:
			var vbox = VBoxContainer.new()
			var label = Label.new()
			label.text = "システムプロセス管理"
			vbox.add_child(label)
			var kill_btn = Button.new()
			kill_btn.text = "sys プロセスを強制終了"
			kill_btn.pressed.connect(func():
				GameState.trigger_gameover()
			)
			vbox.add_child(kill_btn)
			content_container.add_child(vbox)

func close_window():
	queue_free()

func toggle_maximize():
	if not is_maximized:
		prev_rect = Rect2(position, size)
		set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		is_maximized = true
	else:
		set_anchors_preset(Control.PRESET_TOP_LEFT)
		size = prev_rect.size
		position = prev_rect.position
		is_maximized = false

func minimize_window():
	visible = false

func _on_header_gui_input(event: InputEvent):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				dragging = true
				drag_offset = get_global_mouse_position() - global_position
				_focus()
			else:
				dragging = false
	elif event is InputEventMouseMotion and dragging and not is_maximized:
		global_position = get_global_mouse_position() - drag_offset

func _on_gui_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		_focus()

func _focus():
	if get_parent():
		get_parent().move_child(self, -1)
