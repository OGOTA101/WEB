extends BaseWindow

## FileExplorer（コードベース生成版）

var _path_bar: LineEdit
var _file_list: ItemList
var _tree_panel: Tree
var _status_label: Label
var _search_box: LineEdit
var _btn_back: Button
var _btn_forward: Button
var _btn_up: Button

var _current_path: String = OS.get_user_data_dir()
var _history: Array[String] = []
var _history_pos: int = -1

func _ready() -> void:
	window_title = "ファイルエクスプローラー"
	initial_size = Vector2(640, 480)
	super._ready()
	_build_content()
	_navigate_to(_current_path)

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(vbox)
	
	# ツールバー
	var toolbar = _build_toolbar()
	vbox.add_child(toolbar)
	
	# メインコンテンツ（ツリー + ファイルリスト）
	var hbox = HBoxContainer.new()
	hbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(hbox)
	
	# 左ツリー
	_tree_panel = Tree.new()
	_tree_panel.custom_minimum_size = Vector2(180, 0)
	_tree_panel.hide_root = false
	_tree_panel.item_selected.connect(_on_tree_selected)
	hbox.add_child(_tree_panel)
	
	var split_sep = VSeparator.new()
	hbox.add_child(split_sep)
	
	# 右ファイルリスト
	_file_list = ItemList.new()
	_file_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_file_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_file_list.item_activated.connect(_on_item_activated)
	hbox.add_child(_file_list)
	
	# ステータスバー
	_status_label = Label.new()
	_status_label.custom_minimum_size = Vector2(0, 22)
	_status_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	_status_label.add_theme_font_size_override("font_size", 11)
	vbox.add_child(_status_label)
	
	_build_tree_sidebar()

func _build_toolbar() -> Control:
	var hbox = HBoxContainer.new()
	hbox.custom_minimum_size = Vector2(0, 32)
	
	_btn_back = Button.new()
	_btn_back.text = "◀"
	_btn_back.custom_minimum_size = Vector2(30, 28)
	_btn_back.disabled = true
	_btn_back.pressed.connect(_go_back)
	hbox.add_child(_btn_back)
	
	_btn_forward = Button.new()
	_btn_forward.text = "▶"
	_btn_forward.custom_minimum_size = Vector2(30, 28)
	_btn_forward.disabled = true
	_btn_forward.pressed.connect(_go_forward)
	hbox.add_child(_btn_forward)
	
	_btn_up = Button.new()
	_btn_up.text = "▲"
	_btn_up.custom_minimum_size = Vector2(30, 28)
	_btn_up.pressed.connect(_go_up)
	hbox.add_child(_btn_up)
	
	var refresh = Button.new()
	refresh.text = "🔄"
	refresh.custom_minimum_size = Vector2(30, 28)
	refresh.pressed.connect(func(): _navigate_to(_current_path))
	hbox.add_child(refresh)
	
	_path_bar = LineEdit.new()
	_path_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_path_bar.placeholder_text = "パスを入力..."
	_path_bar.text_submitted.connect(func(p): _navigate_to(p))
	hbox.add_child(_path_bar)
	
	_search_box = LineEdit.new()
	_search_box.custom_minimum_size = Vector2(140, 0)
	_search_box.placeholder_text = "🔍 検索..."
	_search_box.text_changed.connect(_filter_files)
	hbox.add_child(_search_box)
	
	return hbox

func _build_tree_sidebar() -> void:
	_tree_panel.clear()
	var root = _tree_panel.create_item()
	root.set_text(0, "📁 クイックアクセス")
	
	var places = [
		{"name": "🖥 デスクトップ", "path": OS.get_system_dir(OS.SYSTEM_DIR_DESKTOP)},
		{"name": "📄 ドキュメント", "path": OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS)},
		{"name": "⬇ ダウンロード", "path": OS.get_system_dir(OS.SYSTEM_DIR_DOWNLOADS)},
		{"name": "🖼 ピクチャ",     "path": OS.get_system_dir(OS.SYSTEM_DIR_PICTURES)},
		{"name": "🎮 ゲームデータ", "path": OS.get_user_data_dir()},
	]
	for place in places:
		var item = _tree_panel.create_item(root)
		item.set_text(0, place["name"])
		item.set_metadata(0, place["path"])

func _on_tree_selected() -> void:
	var sel = _tree_panel.get_selected()
	if sel and sel.get_metadata(0):
		_navigate_to(str(sel.get_metadata(0)))

func _navigate_to(path: String) -> void:
	var da = DirAccess.open(path)
	if not da:
		_status_label.text = "  ⚠ アクセスできません: " + path
		return
	
	_current_path = path
	_path_bar.text = path
	
	if _history_pos < 0 or (_history.size() > 0 and _history[_history_pos] != path):
		_history = _history.slice(0, _history_pos + 1)
		_history.append(path)
		_history_pos = _history.size() - 1
	
	_refresh_list(da)
	_btn_back.disabled = _history_pos <= 0
	_btn_forward.disabled = _history_pos >= _history.size() - 1

func _refresh_list(da: DirAccess) -> void:
	_file_list.clear()
	var entries: Array[Dictionary] = []
	da.list_dir_begin()
	var name = da.get_next()
	while name != "":
		if name != "." and name != "..":
			entries.append({"name": name, "is_dir": da.current_is_dir()})
		name = da.get_next()
	da.list_dir_end()
	
	entries.sort_custom(func(a, b):
		if a["is_dir"] != b["is_dir"]:
			return a["is_dir"]
		return a["name"].to_lower() < b["name"].to_lower()
	)
	
	for entry in entries:
		var prefix = "📁 " if entry["is_dir"] else "📄 "
		_file_list.add_item(prefix + entry["name"])
		_file_list.set_item_metadata(_file_list.item_count - 1, {
			"path": _current_path.path_join(entry["name"]),
			"is_dir": entry["is_dir"],
		})
	
	_status_label.text = "  %d 個のアイテム  |  %s" % [entries.size(), _current_path]

func _filter_files(query: String) -> void:
	for i in _file_list.item_count:
		var text = _file_list.get_item_text(i).to_lower()
		_file_list.set_item_disabled(i, query.to_lower() != "" and not query.to_lower() in text)

func _on_item_activated(idx: int) -> void:
	var meta = _file_list.get_item_metadata(idx)
	if meta and meta["is_dir"]:
		_navigate_to(meta["path"])

func _go_back() -> void:
	if _history_pos > 0:
		_history_pos -= 1
		var da = DirAccess.open(_history[_history_pos])
		if da:
			_current_path = _history[_history_pos]
			_path_bar.text = _current_path
			_refresh_list(da)
		_btn_back.disabled = _history_pos <= 0
		_btn_forward.disabled = false

func _go_forward() -> void:
	if _history_pos < _history.size() - 1:
		_history_pos += 1
		var da = DirAccess.open(_history[_history_pos])
		if da:
			_current_path = _history[_history_pos]
			_path_bar.text = _current_path
			_refresh_list(da)
		_btn_back.disabled = false
		_btn_forward.disabled = _history_pos >= _history.size() - 1

func _go_up() -> void:
	var parent = _current_path.get_base_dir()
	if parent != _current_path and parent != "":
		_navigate_to(parent)
