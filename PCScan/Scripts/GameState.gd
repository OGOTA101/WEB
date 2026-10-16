extends Node

signal system_crashed
signal file_state_updated
signal refresh_desktop
signal open_window_requested(file_data)

var is_pc_on: bool = false
var is_system_alive: bool = true

var total_deletable_count: int = 0
var deleted_count: int = 0
var trash_files: Array[VirtualFileEntry] = []
var permanently_deleted_ids: Array = []
var is_cursed_file_deleted: bool = false

func reset_state():
	is_pc_on = false
	is_system_alive = true
	deleted_count = 0
	trash_files.clear()
	permanently_deleted_ids.clear()
	is_cursed_file_deleted = false

func get_clean_ratio() -> int:
	if total_deletable_count <= 0: return 0
	return int((float(deleted_count) / float(total_deletable_count)) * 100.0)

func empty_trash():
	var deleted_this_time = 0
	for f in trash_files:
		permanently_deleted_ids.append(f.get_instance_id())
		if f.file_type == VirtualFileEntry.FileType.CURSED:
			is_cursed_file_deleted = true
		deleted_count += 1
		deleted_this_time += 1
	trash_files.clear()
	if deleted_this_time > 0:
		emit_signal("file_state_updated")

func trigger_gameover():
	is_system_alive = false
	emit_signal("system_crashed")

func request_open_window(data: VirtualFileEntry):
	emit_signal("open_window_requested", data)

func evaluate_result() -> String:
	if not is_pc_on:
		return "仕事放棄"
	if not is_cursed_file_deleted:
		return "仕事失敗"
	if get_clean_ratio() < 100:
		return "残留する呪い"
	return "生還"
