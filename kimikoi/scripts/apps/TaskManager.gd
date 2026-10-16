extends BaseWindow

## TaskManager - タスクマネージャー（コードベース生成版）

var _item_list: ItemList
var _kill_btn: Button
var _refresh_btn: Button
var _status_label: Label
var _update_timer: float = 0.0
const UPDATE_INTERVAL := 2.0

func _ready() -> void:
	window_title = "タスクマネージャー"
	app_type = "system"
	initial_size = Vector2(560, 420)
	super._ready()
	_build_content()
	WindowManager.process_list_changed.connect(_refresh_list)
	_refresh_list()

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(vbox)
	
	# ヘッダー
	var header = Label.new()
	header.text = "  プロセス名                      CPU%      MEM(MB)   状態"
	header.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	header.add_theme_font_size_override("font_size", 11)
	vbox.add_child(header)
	
	# アイテムリスト
	_item_list = ItemList.new()
	_item_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_item_list.item_selected.connect(_on_item_selected)
	vbox.add_child(_item_list)
	
	# ボタン行
	var hbox = HBoxContainer.new()
	hbox.custom_minimum_size = Vector2(0, 36)
	vbox.add_child(hbox)
	
	_kill_btn = Button.new()
	_kill_btn.text = "プロセスの終了"
	_kill_btn.disabled = true
	_kill_btn.custom_minimum_size = Vector2(140, 30)
	_kill_btn.pressed.connect(_kill_selected)
	hbox.add_child(_kill_btn)
	
	var spacer = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)
	
	_refresh_btn = Button.new()
	_refresh_btn.text = "更新"
	_refresh_btn.custom_minimum_size = Vector2(80, 30)
	_refresh_btn.pressed.connect(_refresh_list)
	hbox.add_child(_refresh_btn)
	
	# ステータスバー
	_status_label = Label.new()
	_status_label.custom_minimum_size = Vector2(0, 22)
	_status_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	_status_label.add_theme_font_size_override("font_size", 11)
	vbox.add_child(_status_label)

func _process(delta: float) -> void:
	super._process(delta)
	_update_timer += delta
	if _update_timer >= UPDATE_INTERVAL:
		_update_timer = 0.0
		_refresh_list()

func _refresh_list() -> void:
	_item_list.clear()
	var processes = WindowManager.get_processes()
	for p in processes:
		var text = "%-30s %6.1f%%  %6d MB   %s" % [
			p["name"], p["cpu"], p["memory"], p["status"]
		]
		_item_list.add_item(text)
		_item_list.set_item_metadata(_item_list.item_count - 1, p["pid"])
	_status_label.text = "  プロセス数: %d" % processes.size()
	_kill_btn.disabled = true

func _on_item_selected(_idx: int) -> void:
	_kill_btn.disabled = false

func _kill_selected() -> void:
	var sel = _item_list.get_selected_items()
	if sel.is_empty():
		return
	var pid_val = _item_list.get_item_metadata(sel[0])
	var proc_name = "不明"
	for p in WindowManager.get_processes():
		if p["pid"] == pid_val:
			proc_name = p["name"]
	var dialog = ConfirmationDialog.new()
	dialog.title = "プロセスの終了"
	dialog.dialog_text = "「%s」を強制終了しますか？" % proc_name
	get_tree().root.add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(func():
		WindowManager.kill_process(pid_val)
		dialog.queue_free()
	)
	dialog.canceled.connect(dialog.queue_free)
