class_name FileSystem extends RefCounted

static func build_file_system() -> Array[VirtualFileEntry]:
	var root : Array[VirtualFileEntry] = []
	
	var ic_folder = load("res://Assets/Icons/folder.svg")
	var ic_file = load("res://Assets/Icons/file.svg")
	var ic_lock = load("res://Assets/Icons/lock.svg")
	var ic_trash = load("res://Assets/Icons/trash.svg")
	var ic_audio = load("res://Assets/Icons/audio.svg")
	var ic_image = load("res://Assets/Icons/image.svg")
	var ic_exe = load("res://Assets/Icons/exe.svg")
	var ic_cursed = load("res://Assets/Icons/cursed.svg")
	
	var doc = VirtualFileEntry.new()
	doc.file_type = VirtualFileEntry.FileType.FOLDER
	doc.file_name = "マイドキュメント"
	doc.icon_texture = ic_folder
	doc.default_position = Vector2(50, 50)
	
	var h1 = VirtualFileEntry.new()
	h1.file_type = VirtualFileEntry.FileType.TEXT
	h1.file_name = "手順書.txt"
	h1.icon_texture = ic_file
	h1.text_content = "アルバイト作業手順\n1. デスクトップやフォルダ内の不要ファイルをすべて[ごみ箱]へドラッグ\n2. ごみ箱を「空にする」で完全消去\n3. 全て完了したらスマホから[完了報告]してください。"
	
	var h2 = VirtualFileEntry.new()
	h2.file_type = VirtualFileEntry.FileType.TEXT
	h2.file_name = "memo1.txt"
	h2.icon_texture = ic_file
	h2.text_content = "開かずの領域のパスワードは0714ではなく9999だ。"

	var h3 = VirtualFileEntry.new()
	h3.file_type = VirtualFileEntry.FileType.TEXT
	h3.file_name = "memo2.txt"
	h3.icon_texture = ic_file
	h3.text_content = "絶対に消せ、あれは見つけるな"
	
	doc.children.append_array([h1, h2, h3])
	
	var locked = VirtualFileEntry.new()
	locked.file_type = VirtualFileEntry.FileType.LOCKED
	locked.file_name = "残存データ"
	locked.icon_texture = ic_lock
	locked.default_position = Vector2(50, 150)
	locked.unlock_password = "9999"
	
	var cursed = VirtualFileEntry.new()
	cursed.file_type = VirtualFileEntry.FileType.CURSED
	cursed.file_name = "呪いの本体.doc"
	cursed.icon_texture = ic_cursed
	cursed.text_content = "縺ゅあああああああああああああああああ...\nミツケタ、ノニ……\n\n『オマエ モ データ ニ シテヤル』"

	var dummy1 = VirtualFileEntry.new()
	dummy1.file_type = VirtualFileEntry.FileType.TEXT
	dummy1.file_name = "ダミー.txt"
	dummy1.icon_texture = ic_file
	dummy1.text_content = "空っぽ"
	
	locked.children.append_array([cursed, dummy1])

	var trash = VirtualFileEntry.new()
	trash.file_type = VirtualFileEntry.FileType.TRASH
	trash.file_name = "ごみ箱"
	trash.icon_texture = ic_trash
	trash.default_position = Vector2(50, 250)
	
	var taskmgr = VirtualFileEntry.new()
	taskmgr.file_type = VirtualFileEntry.FileType.APP_TASKMANAGER
	taskmgr.file_name = "cleanup.exe"
	taskmgr.icon_texture = ic_exe
	taskmgr.default_position = Vector2(50, 350)
	
	var audio_f = VirtualFileEntry.new()
	audio_f.file_type = VirtualFileEntry.FileType.AUDIO
	audio_f.file_name = "不明な音声.wav"
	audio_f.icon_texture = ic_audio
	audio_f.default_position = Vector2(200, 50)
	audio_f.text_content = "「...私...見つけ......」\n（音が途切れた）"
	
	var img_f = VirtualFileEntry.new()
	img_f.file_type = VirtualFileEntry.FileType.IMAGE
	img_f.file_name = "家族写真.png"
	img_f.icon_texture = ic_image
	img_f.default_position = Vector2(350, 50)
	img_f.text_content = "顔が全て塗りつぶされている...\n画像ファイルが壊れています。"
	
	var txt_f = VirtualFileEntry.new()
	txt_f.file_type = VirtualFileEntry.FileType.TEXT
	txt_f.file_name = "遺言.doc"
	txt_f.icon_texture = ic_file
	txt_f.default_position = Vector2(200, 150)
	txt_f.text_content = "『あああああ...』"
	
	root.append_array([doc, locked, trash, taskmgr, audio_f, img_f, txt_f])
	
	return root

static func get_total_deletable(nodes: Array[VirtualFileEntry]) -> int:
	var c = 0
	for n in nodes:
		if n.file_type in [VirtualFileEntry.FileType.TEXT, VirtualFileEntry.FileType.IMAGE, VirtualFileEntry.FileType.AUDIO, VirtualFileEntry.FileType.CURSED]:
			c += 1
		if n.children.size() > 0:
			c += get_total_deletable(n.children)
	return c
