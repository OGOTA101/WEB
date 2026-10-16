extends Control

func _ready():
	var pc_btn = $MonitorBtn
	pc_btn.text = "PCを操作 (現在ON)" if GameState.is_pc_on else "PCの電源を付けて操作"
	
	pc_btn.pressed.connect(func():
		get_tree().change_scene_to_file("res://Scenes/PC_OS.tscn")
	)
	
	$PhoneBtn.pressed.connect(func():
		var phone_ui = load("res://Scenes/Phone.tscn").instantiate()
		add_child(phone_ui)
	)
