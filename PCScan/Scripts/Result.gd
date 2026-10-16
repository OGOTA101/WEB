extends Control

func _ready():
	var end_type = ""
	if GameState.has_meta("result_end"):
		end_type = GameState.get_meta("result_end")
	else:
		if not GameState.is_system_alive:
			end_type = "意識の同化"

	var text = ""
	match end_type:
		"仕事放棄": 
			text = "PCを触る気にもなれず、完了報告だけを済ませた。\n……楽な仕事でよかった。\n\nだが、数日後。\n深夜、誰もいないはずの玄関からノックの音が鳴り続けている。"
			$VBox/Title.text = "結末：仕事放棄"
		"意識の同化": 
			text = "「警告が出たけど、邪魔だから消してやる」\nタスクマネージャーからプロセスを強制終了した。\n\n……その途端、画面が激しく乱れ始めた。……"
			$VBox/Title.text = "結末：意識の同化"
			$VBox/Title.add_theme_color_override("font_color", Color(1, 0, 0))
		"仕事失敗": 
			text = "「よくわからないけど、これでいいや」\n適当に報告を済ませ、眠りについた。\n\n……真夜中、PCが勝手に起動する音がした。……\n『オマエ モ データ ニ シテヤル』"
			$VBox/Title.text = "結末：仕事失敗"
		"残留する呪い": 
			text = "「やっかいなファイルは粗方消したし、この辺で報告しておくか」\n作業完了を報告し、端末の電源を落とした。\n\n……『ミツケタ、ノニ……マダ……ノコッテル……』"
			$VBox/Title.text = "結末：残留する呪い"
		"生還": 
			text = "「……よし、これで完全にすべてのファイルが消えたはずだ」\n\nこれにてミッションコンプリート。その数日後、口座には目を疑うような額の報酬が振り込まれていた。あの不気味なPCのことは忘れて、自由な生活を楽しもう。"
			$VBox/Title.text = "結末：生還（トゥルーエンド）"
			$VBox/Title.add_theme_color_override("font_color", Color(0, 1, 0))
		
	$VBox/Desc.text = text
	
	var pb = $VBox/ProgressBar
	var target_ratio = GameState.get_clean_ratio()
	pb.value = 0
	var sb_bg = StyleBoxFlat.new()
	sb_bg.bg_color = Color(0.2, 0.2, 0.2)
	var sb_fill = StyleBoxFlat.new()
	
	if target_ratio < 50:
		sb_fill.bg_color = Color(0.8, 0.1, 0.1)
	elif target_ratio < 100:
		sb_fill.bg_color = Color(0.8, 0.8, 0.1)
	else:
		sb_fill.bg_color = Color(0.1, 0.8, 0.1)
	
	pb.add_theme_stylebox_override("background", sb_bg)
	pb.add_theme_stylebox_override("fill", sb_fill)
	
	var tween = create_tween()
	tween.tween_property(pb, "value", float(target_ratio), 2.0).set_trans(Tween.TRANS_OUT).set_ease(Tween.EASE_OUT)
	
	$VBox/RetryBtn.pressed.connect(func():
		GameState.reset_state()
		get_tree().change_scene_to_file("res://Scenes/Title.tscn")
	)
