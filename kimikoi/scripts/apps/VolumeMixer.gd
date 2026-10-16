extends BaseWindow

## VolumeMixer（コードベース生成版）

func _ready() -> void:
	window_title = "音量ミキサー"
	app_type = "system"
	initial_size = Vector2(320, 220)
	super._ready()
	_build_content()

func _build_content() -> void:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_top = 8
	vbox.offset_left = 12
	vbox.offset_right = -12
	vbox.offset_bottom = -8
	content_area.add_child(vbox)
	
	var title_row = Label.new()
	title_row.text = "音量の調整"
	title_row.add_theme_color_override("font_color", Color(0.7, 0.7, 1.0))
	vbox.add_child(title_row)
	vbox.add_child(HSeparator.new())
	
	_build_slider_row(vbox, "🔊 マスター", SoundManager.master_volume, func(v): SoundManager.set_master_volume(v))
	_build_slider_row(vbox, "🎵 BGM    ", SoundManager.bgm_volume, func(v): SoundManager.set_bgm_volume(v))
	_build_slider_row(vbox, "💥 SE     ", SoundManager.se_volume, func(v): SoundManager.set_se_volume(v))

func _build_slider_row(parent: Control, label_text: String, init_val: float, cb: Callable) -> void:
	var hbox = HBoxContainer.new()
	parent.add_child(hbox)
	
	var lbl = Label.new()
	lbl.text = label_text
	lbl.custom_minimum_size = Vector2(90, 0)
	lbl.add_theme_color_override("font_color", Color.WHITE)
	hbox.add_child(lbl)
	
	var sl = HSlider.new()
	sl.min_value = 0.0
	sl.max_value = 1.0
	sl.step = 0.01
	sl.value = init_val
	sl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(sl)
	
	var val_label = Label.new()
	val_label.custom_minimum_size = Vector2(40, 0)
	val_label.add_theme_color_override("font_color", Color.WHITE)
	val_label.text = "%d%%" % int(init_val * 100)
	hbox.add_child(val_label)
	
	sl.value_changed.connect(func(v: float):
		cb.call(v)
		val_label.text = "%d%%" % int(v * 100)
	)
