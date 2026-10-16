class_name VirtualFileEntry extends Resource

enum FileType { FOLDER, TEXT, IMAGE, AUDIO, LOCKED, TRASH, APP_TASKMANAGER, CURSED }

@export var file_type: FileType = FileType.TEXT
@export var file_name: String = "新しいファイル"
@export var icon_texture: Texture2D
@export var default_position: Vector2 = Vector2.ZERO

@export var children: Array[VirtualFileEntry] = []

@export_multiline var text_content: String = ""
@export var image_content: Texture2D
@export var sound_content: AudioStream

@export var unlock_password: String = ""
