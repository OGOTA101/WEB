extends BaseWindow

## ClockApp（コードベース生成版）
## デジタル時計・タイマー・ストップウォッチ

var _tab: TabContainer
var _digital_label: Label
var _date_label: Label

# タイマー
var _timer_total: float = 0.0
var _timer_remaining: float = 0.0
var _timer_running: bool = false
var _timer_display: Label
var _timer_start_btn: Button
var _timer_h: SpinBox
var _timer_m: SpinBox
var _timer_s: SpinBox

# ストップウォッチ
var _sw_elapsed: float = 0.0
var _sw_running: bool = false
var _sw_display: Label
var _sw_start_btn: Button
var _laps: Array[float] = []
var _lap_list: ItemList

func _ready() -> void:
	window_title = "時計"
	initial_size = Vector2(380, 320)
	super._ready()
	_build_content()

func _build_content() -> void:
	_tab = TabContainer.new()
	_tab.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content_area.add_child(_tab)
	
	_build_clock_tab()
	_build_timer_tab()
	_build_stopwatch_tab()

func _build_clock_tab() -> void:
	var container = VBoxContainer.new()
	container.name = "時計"
	container.alignment = BoxContainer.ALIGNMENT_CENTER
	_tab.add_child(container)
	
	_digital_label = Label.new()
	_digital_label.text = "00:00:00"
	_digital_label.add_theme_font_size_override("font_size", 48)
	_digital_label.add_theme_color_override("font_color", Color(0.5, 0.9, 1.0))
	_digital_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(_digital_label)
	
	_date_label = Label.new()
	_date_label.text = ""
	_date_label.add_theme_font_size_override("font_size", 14)
	_date_label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.9))
	_date_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(_date_label)

func _build_timer_tab() -> void:
	var container = VBoxContainer.new()
	container.name = "タイマー"
	container.alignment = BoxContainer.ALIGNMENT_CENTER
	_tab.add_child(container)
	
	_timer_display = Label.new()
	_timer_display.text = "00:00.00"
	_timer_display.add_theme_font_size_override("font_size", 42)
	_timer_display.add_theme_color_override("font_color", Color(1.0, 0.7, 0.3))
	_timer_display.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(_timer_display)
	
	var spin_row = HBoxContainer.new()
	spin_row.alignment = BoxContainer.ALIGNMENT_CENTER
	container.add_child(spin_row)
	
	_timer_h = _make_spinbox(0, 23, "時")
	_timer_m = _make_spinbox(0, 59, "分")
	_timer_s = _make_spinbox(0, 59, "秒")
	spin_row.add_child(_timer_h)
	spin_row.add_child(_timer_m)
	spin_row.add_child(_timer_s)
	
	var btn_row = HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	container.add_child(btn_row)
	
	_timer_start_btn = Button.new()
	_timer_start_btn.text = "スタート"
	_timer_start_btn.custom_minimum_size = Vector2(100, 32)
	_timer_start_btn.pressed.connect(_toggle_timer)
	btn_row.add_child(_timer_start_btn)
	
	var reset_btn = Button.new()
	reset_btn.text = "リセット"
	reset_btn.custom_minimum_size = Vector2(80, 32)
	reset_btn.pressed.connect(_reset_timer)
	btn_row.add_child(reset_btn)

func _make_spinbox(min_v: int, max_v: int, suffix: String) -> SpinBox:
	var sb = SpinBox.new()
	sb.min_value = min_v
	sb.max_value = max_v
	sb.suffix = suffix
	sb.custom_minimum_size = Vector2(80, 30)
	return sb

func _build_stopwatch_tab() -> void:
	var container = VBoxContainer.new()
	container.name = "ストップウォッチ"
	_tab.add_child(container)
	
	_sw_display = Label.new()
	_sw_display.text = "00:00.00"
	_sw_display.add_theme_font_size_override("font_size", 42)
	_sw_display.add_theme_color_override("font_color", Color(0.3, 1.0, 0.5))
	_sw_display.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(_sw_display)
	
	var btn_row = HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	container.add_child(btn_row)
	
	_sw_start_btn = Button.new()
	_sw_start_btn.text = "スタート"
	_sw_start_btn.custom_minimum_size = Vector2(100, 32)
	_sw_start_btn.pressed.connect(_toggle_stopwatch)
	btn_row.add_child(_sw_start_btn)
	
	var lap_btn = Button.new()
	lap_btn.text = "ラップ"
	lap_btn.custom_minimum_size = Vector2(80, 32)
	lap_btn.pressed.connect(_record_lap)
	btn_row.add_child(lap_btn)
	
	var reset_btn = Button.new()
	reset_btn.text = "リセット"
	reset_btn.custom_minimum_size = Vector2(80, 32)
	reset_btn.pressed.connect(_reset_stopwatch)
	btn_row.add_child(reset_btn)
	
	_lap_list = ItemList.new()
	_lap_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	container.add_child(_lap_list)

func _process(delta: float) -> void:
	super._process(delta)
	var t = Time.get_datetime_dict_from_system()
	_digital_label.text = "%02d:%02d:%02d" % [t["hour"], t["minute"], t["second"]]
	_date_label.text = "%04d年%02d月%02d日 (%s曜日)" % [
		t["year"], t["month"], t["day"],
		["日","月","火","水","木","金","土"][Time.get_day_of_week_from_unix_time(Time.get_unix_time_from_system())]
	]
	if _timer_running:
		_timer_remaining -= delta
		if _timer_remaining <= 0.0:
			_timer_remaining = 0.0
			_timer_running = false
			_timer_start_btn.text = "スタート"
			_show_timer_done()
		_timer_display.text = _fmt(_timer_remaining)
	if _sw_running:
		_sw_elapsed += delta
		_sw_display.text = _fmt(_sw_elapsed)

func _fmt(sec: float) -> String:
	var m = int(sec) / 60
	var s = int(sec) % 60
	var ms = int((sec - int(sec)) * 100)
	return "%02d:%02d.%02d" % [m, s, ms]

func _toggle_timer() -> void:
	if not _timer_running:
		if _timer_remaining <= 0.0:
			_timer_remaining = _timer_h.value * 3600 + _timer_m.value * 60 + _timer_s.value
		if _timer_remaining > 0.0:
			_timer_running = true
			_timer_start_btn.text = "一時停止"
	else:
		_timer_running = false
		_timer_start_btn.text = "再開"

func _reset_timer() -> void:
	_timer_running = false
	_timer_remaining = 0.0
	_timer_start_btn.text = "スタート"
	_timer_display.text = "00:00.00"

func _show_timer_done() -> void:
	var d = AcceptDialog.new()
	d.title = "タイマー終了"
	d.dialog_text = "設定した時間が経過しました！"
	get_tree().root.add_child(d)
	d.popup_centered()
	d.confirmed.connect(d.queue_free)

func _toggle_stopwatch() -> void:
	_sw_running = !_sw_running
	_sw_start_btn.text = "一時停止" if _sw_running else "スタート"

func _record_lap() -> void:
	if _sw_running:
		_laps.append(_sw_elapsed)
		_lap_list.add_item("Lap %d:  %s" % [_laps.size(), _fmt(_sw_elapsed)])

func _reset_stopwatch() -> void:
	_sw_running = false
	_sw_elapsed = 0.0
	_laps.clear()
	_lap_list.clear()
	_sw_display.text = "00:00.00"
	_sw_start_btn.text = "スタート"
