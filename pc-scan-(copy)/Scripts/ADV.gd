extends Control

var texts: Array[String] = [
	"アルバイトの初日。",
	"指定されたPC内のデータをすべて消去するだけの簡単なバイトだ。",
	"……何も起きなければいいが。"
]

var current_index = 0
@onready var label = $PanelContainer/MarginContainer/RichTextLabel
var tween: Tween

func _ready():
	_show_text()
	gui_input.connect(_on_gui_input)

func _show_text():
	if current_index >= texts.size():
		get_tree().change_scene_to_file("res://Scenes/Room.tscn")
		return
		
	label.text = texts[current_index]
	label.visible_characters = 0
	
	if tween:
		tween.kill()
		
	tween = create_tween()
	var duration = float(texts[current_index].length()) * 0.05
	tween.tween_property(label, "visible_ratio", 1.0, duration)

func _on_gui_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if tween and tween.is_running():
			tween.kill()
			label.visible_ratio = 1.0
		else:
			current_index += 1
			_show_text()
