extends BaseWindow

## RecycleBinApp（コードベース生成版）

var _item_list: ItemList
var _restore_btn: Button
var _delete_btn: Button
var _empty_btn: Button
var _status_label: Label

func _ready() -> void:
	window_title = "ゴミ箱"
	app_type = "system"
	initial_size = Vector2(520, 380)
	super._ready()
	_build_content()
	RecycleBin.bin_changed.connect(_refresh_list)
	_refresh_list()

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(vbox)
	
	_item_list = ItemList.new()
	_item_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_item_list.item_selected.connect(_on_item_selected)
	vbox.add_child(_item_list)
	
	var hbox = HBoxContainer.new()
	hbox.custom_minimum_size = Vector2(0, 36)
	vbox.add_child(hbox)
	
	_restore_btn = Button.new()
	_restore_btn.text = "復元"
	_restore_btn.disabled = true
	_restore_btn.custom_minimum_size = Vector2(90, 30)
	_restore_btn.pressed.connect(_restore_selected)
	hbox.add_child(_restore_btn)
	
	_delete_btn = Button.new()
	_delete_btn.text = "完全削除"
	_delete_btn.disabled = true
	_delete_btn.custom_minimum_size = Vector2(90, 30)
	_delete_btn.pressed.connect(_delete_selected)
	hbox.add_child(_delete_btn)
	
	var spacer = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)
	
	_empty_btn = Button.new()
	_empty_btn.text = "ゴミ箱を空にする"
	_empty_btn.custom_minimum_size = Vector2(140, 30)
	_empty_btn.pressed.connect(_empty_bin)
	hbox.add_child(_empty_btn)
	
	_status_label = Label.new()
	_status_label.custom_minimum_size = Vector2(0, 22)
	_status_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	_status_label.add_theme_font_size_override("font_size", 11)
	vbox.add_child(_status_label)

func _refresh_list() -> void:
	_item_list.clear()
	var items = RecycleBin.get_items()
	for item in items:
		_item_list.add_item("🗑 %s  (削除: %s)" % [item.get("label", "不明"), item.get("deleted_at", "-")])
	_status_label.text = "  %d 個のアイテム" % items.size()
	_empty_btn.disabled = items.is_empty()
	_restore_btn.disabled = true
	_delete_btn.disabled = true

func _on_item_selected(_idx: int) -> void:
	_restore_btn.disabled = false
	_delete_btn.disabled = false

func _restore_selected() -> void:
	var sel = _item_list.get_selected_items()
	if sel.is_empty():
		return
	var item_data = RecycleBin.restore_item(sel[0])
	if not item_data.is_empty():
		# デスクトップへ復元通知は Desktop.gd のシグナルで対応
		pass

func _delete_selected() -> void:
	var sel = _item_list.get_selected_items()
	if sel.is_empty():
		return
	var dialog = ConfirmationDialog.new()
	dialog.title = "完全削除の確認"
	dialog.dialog_text = "このアイテムを完全に削除しますか？\nこの操作は元に戻せません。"
	get_tree().root.add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(func():
		RecycleBin.delete_permanently(sel[0])
		dialog.queue_free()
	)
	dialog.canceled.connect(dialog.queue_free)

func _empty_bin() -> void:
	var dialog = ConfirmationDialog.new()
	dialog.title = "ゴミ箱を空にする"
	dialog.dialog_text = "ゴミ箱内のすべてのアイテムを永久に削除しますか？"
	get_tree().root.add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(func():
		RecycleBin.empty_bin()
		dialog.queue_free()
	)
	dialog.canceled.connect(dialog.queue_free)
