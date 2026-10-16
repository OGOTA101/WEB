extends VBoxContainer
class_name DesktopIcon

@onready var texture_rect = $Texture
@onready var name_label = $NameLabel

var file_data: VirtualFileEntry

func _ready():
	gui_input.connect(_on_gui_input)
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)

func setup(data: VirtualFileEntry):
	file_data = data
	if file_data:
		name_label.text = file_data.file_name
		if file_data.icon_texture:
			texture_rect.texture = file_data.icon_texture
		position = file_data.default_position

func _on_mouse_entered():
	modulate = Color(1.2, 1.2, 1.5)

func _on_mouse_exited():
	modulate = Color.WHITE

func _on_gui_input(event: InputEvent):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.double_click:
			GameState.request_open_window(file_data)

func _get_drag_data(at_position):
	var preview = Control.new()
	var tex = TextureRect.new()
	tex.texture = texture_rect.texture
	tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tex.custom_minimum_size = Vector2(64, 64)
	tex.position = -Vector2(32, 32)
	preview.add_child(tex)
	set_drag_preview(preview)
	return self

func get_file_data() -> VirtualFileEntry:
	return file_data

func _can_drop_data(at_position, data):
	if data is Control and data.has_method("get_file_data"):
		if file_data and file_data.file_type == VirtualFileEntry.FileType.TRASH:
			var dropped_file = data.get_file_data()
			if dropped_file and dropped_file.file_type != VirtualFileEntry.FileType.TRASH and dropped_file.file_type != VirtualFileEntry.FileType.APP_TASKMANAGER:
				return true
	return false

func _drop_data(at_position, data):
	var dropped_file = data.get_file_data()
	if not GameState.trash_files.has(dropped_file):
		GameState.trash_files.append(dropped_file)
		data.queue_free()
		GameState.emit_signal("file_state_updated")
