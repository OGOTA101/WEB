extends BaseWindow

## Notepad - メモ帳（コードベース生成版）

var _text_edit: TextEdit
var _status_label: Label
var _current_path: String = ""
var _is_modified: bool = false

func _ready() -> void:
	window_title = "無題 - メモ帳"
	initial_size = Vector2(560, 440)
	super._ready()
	_build_content()

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(vbox)
	
	# メニューバー
	var menu_bar = _build_menu_bar()
	vbox.add_child(menu_bar)
	
	# テキストエディット
	_text_edit = TextEdit.new()
	_text_edit.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_text_edit.text_changed.connect(_on_text_changed)
	_text_edit.add_theme_color_override("font_color", Color.WHITE)
	var te_style = StyleBoxFlat.new()
	te_style.bg_color = Color(0.07, 0.07, 0.12)
	_text_edit.add_theme_stylebox_override("normal", te_style)
	vbox.add_child(_text_edit)
	
	# ステータスバー
	_status_label = Label.new()
	_status_label.custom_minimum_size = Vector2(0, 22)
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	_status_label.add_theme_font_size_override("font_size", 11)
	_status_label.text = "  準備完了"
	vbox.add_child(_status_label)

func _build_menu_bar() -> Control:
	var hbox = HBoxContainer.new()
	hbox.custom_minimum_size = Vector2(0, 28)
	
	var menus = {
		"ファイル": [
			{"name": "新規", "id": 0, "shortcut": "Ctrl+N"},
			{"name": "開く...", "id": 1, "shortcut": "Ctrl+O"},
			{"name": "上書き保存", "id": 2, "shortcut": "Ctrl+S"},
			{"name": "名前を付けて保存...", "id": 3},
			{"separator": true},
			{"name": "閉じる", "id": 4},
		],
		"編集": [
			{"name": "元に戻す", "id": 10},
			{"separator": true},
			{"name": "切り取り", "id": 11},
			{"name": "コピー", "id": 12},
			{"name": "貼り付け", "id": 13},
			{"separator": true},
			{"name": "すべて選択", "id": 14},
			{"name": "文字数カウント", "id": 15},
		],
	}
	
	for menu_name in menus:
		var popup = PopupMenu.new()
		popup.name = menu_name
		for item in menus[menu_name]:
			if item.get("separator", false):
				popup.add_separator()
			else:
				popup.add_item(item["name"], item["id"])
		popup.id_pressed.connect(_on_menu_id)
		
		var btn = MenuButton.new()
		btn.text = menu_name
		btn.add_theme_color_override("font_color", Color.WHITE)
		btn.get_popup().clear()
		for item in menus[menu_name]:
			if item.get("separator", false):
				btn.get_popup().add_separator()
			else:
				btn.get_popup().add_item(item.get("name", ""), item.get("id", 0))
		btn.get_popup().id_pressed.connect(_on_menu_id)
		hbox.add_child(btn)
	
	return hbox

func _on_menu_id(id: int) -> void:
	match id:
		0: _new_file()
		1: _open_file()
		2: _save_file()
		3: _save_as()
		4: close_window()
		10: _text_edit.undo()
		11: _text_edit.cut()
		12: _text_edit.copy()
		13: _text_edit.paste()
		14: _text_edit.select_all()
		15: _char_count()

func _on_text_changed() -> void:
	_is_modified = true
	_update_title()
	var text = _text_edit.text
	var line = _text_edit.get_caret_line() + 1
	var col = _text_edit.get_caret_column() + 1
	_status_label.text = "  %d 行, %d 列 | 文字数: %d" % [line, col, text.length()]

func _update_title() -> void:
	var name = _current_path.get_file() if _current_path != "" else "無題"
	var title = ("*" if _is_modified else "") + name + " - メモ帳"
	window_title = title
	if title_label:
		title_label.text = title

func _new_file() -> void:
	_text_edit.text = ""
	_current_path = ""
	_is_modified = false
	_update_title()

func _open_file() -> void:
	var d = FileDialog.new()
	d.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	d.filters = ["*.txt ; テキストファイル", "*.* ; 全ファイル"]
	get_tree().root.add_child(d)
	d.popup_centered(Vector2(600, 400))
	d.file_selected.connect(func(path: String):
		var f = FileAccess.open(path, FileAccess.READ)
		if f:
			_text_edit.text = f.get_as_text()
			f.close()
			_current_path = path
			_is_modified = false
			_update_title()
		d.queue_free()
	)
	d.canceled.connect(d.queue_free)

func _save_file() -> void:
	if _current_path == "":
		_save_as()
	else:
		_write(_current_path)

func _save_as() -> void:
	var d = FileDialog.new()
	d.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	d.filters = ["*.txt ; テキストファイル"]
	get_tree().root.add_child(d)
	d.popup_centered(Vector2(600, 400))
	d.file_selected.connect(func(path: String):
		_write(path)
		d.queue_free()
	)
	d.canceled.connect(d.queue_free)

func _write(path: String) -> void:
	var f = FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(_text_edit.text)
		f.close()
		_current_path = path
		_is_modified = false
		_update_title()

func _char_count() -> void:
	var t = _text_edit.text
	var d = AcceptDialog.new()
	d.title = "文字数カウント"
	d.dialog_text = "総文字数: %d\n行数: %d" % [t.length(), t.split("\n").size()]
	get_tree().root.add_child(d)
	d.popup_centered()
	d.confirmed.connect(d.queue_free)
