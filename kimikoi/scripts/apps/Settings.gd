extends BaseWindow

## Settings（コードベース生成版）

func _ready() -> void:
	window_title = "設定"
	app_type = "system"
	initial_size = Vector2(500, 400)
	super._ready()
	_build_content()

func _build_content() -> void:
	var tab = TabContainer.new()
	tab.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(tab)
	
	_build_display_tab(tab)
	_build_sound_tab(tab)
	_build_language_tab(tab)

func _build_display_tab(tab: TabContainer) -> void:
	var container = VBoxContainer.new()
	container.name = "ディスプレイ"
	container.offset_top = 8
	container.offset_left = 12
	tab.add_child(container)
	
	var title = Label.new()
	title.text = "画面の設定"
	title.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	container.add_child(title)
	container.add_child(HSeparator.new())
	
	# 解像度
	var res_row = HBoxContainer.new()
	container.add_child(res_row)
	var res_label = Label.new()
	res_label.text = "解像度"
	res_label.custom_minimum_size = Vector2(120, 0)
	res_label.add_theme_color_override("font_color", Color.WHITE)
	res_row.add_child(res_label)
	var res_opt = OptionButton.new()
	res_opt.add_item("1920 × 1080")
	res_opt.add_item("1280 × 720")
	res_opt.add_item("2560 × 1440")
	res_opt.item_selected.connect(func(idx: int):
		var resolutions = [Vector2i(1920,1080), Vector2i(1280,720), Vector2i(2560,1440)]
		DisplayServer.window_set_size(resolutions[idx])
	)
	res_row.add_child(res_opt)
	
	# フルスクリーン
	var fs_row = HBoxContainer.new()
	container.add_child(fs_row)
	var fs_label = Label.new()
	fs_label.text = "フルスクリーン"
	fs_label.custom_minimum_size = Vector2(120, 0)
	fs_label.add_theme_color_override("font_color", Color.WHITE)
	fs_row.add_child(fs_label)
	var fs_check = CheckBox.new()
	fs_check.button_pressed = DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
	fs_check.toggled.connect(func(on: bool):
		if on:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		else:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	)
	fs_row.add_child(fs_check)

func _build_sound_tab(tab: TabContainer) -> void:
	var container = VBoxContainer.new()
	container.name = "サウンド"
	tab.add_child(container)
	
	var title = Label.new()
	title.text = "音量の設定"
	title.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	container.add_child(title)
	container.add_child(HSeparator.new())
	
	for row_data in [
		{"label": "マスター", "get": func(): return SoundManager.master_volume, "set": func(v): SoundManager.set_master_volume(v)},
		{"label": "BGM",     "get": func(): return SoundManager.bgm_volume,    "set": func(v): SoundManager.set_bgm_volume(v)},
		{"label": "SE",      "get": func(): return SoundManager.se_volume,     "set": func(v): SoundManager.set_se_volume(v)},
	]:
		var hbox = HBoxContainer.new()
		container.add_child(hbox)
		var lbl = Label.new()
		lbl.text = row_data["label"]
		lbl.custom_minimum_size = Vector2(100, 0)
		lbl.add_theme_color_override("font_color", Color.WHITE)
		hbox.add_child(lbl)
		var sl = HSlider.new()
		sl.min_value = 0.0
		sl.max_value = 1.0
		sl.step = 0.01
		sl.value = row_data["get"].call()
		sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var val_lbl = Label.new()
		val_lbl.text = "%d%%" % int(sl.value * 100)
		val_lbl.add_theme_color_override("font_color", Color.WHITE)
		val_lbl.custom_minimum_size = Vector2(45, 0)
		sl.value_changed.connect(func(v: float):
			row_data["set"].call(v)
			val_lbl.text = "%d%%" % int(v * 100)
		)
		hbox.add_child(sl)
		hbox.add_child(val_lbl)

func _build_language_tab(tab: TabContainer) -> void:
	var container = VBoxContainer.new()
	container.name = "言語"
	tab.add_child(container)
	
	var title = Label.new()
	title.text = "言語設定"
	title.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	container.add_child(title)
	container.add_child(HSeparator.new())
	
	var hbox = HBoxContainer.new()
	container.add_child(hbox)
	var lbl = Label.new()
	lbl.text = "表示言語"
	lbl.custom_minimum_size = Vector2(120, 0)
	lbl.add_theme_color_override("font_color", Color.WHITE)
	hbox.add_child(lbl)
	var lang_opt = OptionButton.new()
	lang_opt.add_item("日本語")
	lang_opt.add_item("English")
	lang_opt.add_item("中文")
	hbox.add_child(lang_opt)
	
	var note = Label.new()
	note.text = "※言語切替の詳細実装はゲーム本編のI2 Localizationシステムと連携されます"
	note.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	note.add_theme_font_size_override("font_size", 10)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD
	container.add_child(note)
