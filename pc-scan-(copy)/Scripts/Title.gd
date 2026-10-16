extends Control

func _ready():
	$StartBtn.pressed.connect(func():
		GameState.reset_state()
		get_tree().change_scene_to_file("res://Scenes/ADV.tscn")
	)
