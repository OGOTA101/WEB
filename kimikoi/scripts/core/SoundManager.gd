extends Node

## SoundManager - システム音量管理（BGM/SE/マスター）
## AudioBus "Master" "BGM" "SE" を使用

var master_volume: float = 1.0
var bgm_volume: float = 0.8
var se_volume: float = 1.0

var _current_bgm: AudioStreamPlayer = null

func _ready() -> void:
	_apply_volumes()

func set_master_volume(val: float) -> void:
	master_volume = clamp(val, 0.0, 1.0)
	_apply_volumes()

func set_bgm_volume(val: float) -> void:
	bgm_volume = clamp(val, 0.0, 1.0)
	_apply_volumes()

func set_se_volume(val: float) -> void:
	se_volume = clamp(val, 0.0, 1.0)
	_apply_volumes()

func _apply_volumes() -> void:
	AudioServer.set_bus_volume_db(
		AudioServer.get_bus_index("Master"),
		linear_to_db(master_volume)
	)
	var bgm_bus = AudioServer.get_bus_index("BGM")
	if bgm_bus >= 0:
		AudioServer.set_bus_volume_db(bgm_bus, linear_to_db(bgm_volume))
	var se_bus = AudioServer.get_bus_index("SE")
	if se_bus >= 0:
		AudioServer.set_bus_volume_db(se_bus, linear_to_db(se_volume))

func play_se(stream: AudioStream, parent: Node = null) -> void:
	var player = AudioStreamPlayer.new()
	player.stream = stream
	player.bus = "SE" if AudioServer.get_bus_index("SE") >= 0 else "Master"
	var target = parent if parent else Engine.get_main_loop().current_scene
	target.add_child(player)
	player.play()
	player.finished.connect(player.queue_free)

func play_bgm(stream: AudioStream) -> void:
	if _current_bgm and is_instance_valid(_current_bgm):
		_current_bgm.stop()
		_current_bgm.queue_free()
	_current_bgm = AudioStreamPlayer.new()
	_current_bgm.stream = stream
	_current_bgm.bus = "BGM" if AudioServer.get_bus_index("BGM") >= 0 else "Master"
	Engine.get_main_loop().current_scene.add_child(_current_bgm)
	_current_bgm.play()

func stop_bgm() -> void:
	if _current_bgm and is_instance_valid(_current_bgm):
		_current_bgm.stop()
