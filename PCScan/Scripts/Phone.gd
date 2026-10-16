extends ColorRect

func _ready():
	$Panel/VBox/CloseBtn.pressed.connect(func():
		queue_free()
	)
	
	$Panel/VBox/ReportBtn.pressed.connect(func():
		var res = GameState.evaluate_result()
		GameState.set_meta("result_end", res)
		get_tree().change_scene_to_file("res://Scenes/Result.tscn")
	)
