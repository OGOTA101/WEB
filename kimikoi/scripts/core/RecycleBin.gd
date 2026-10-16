extends Node

## RecycleBin - ゴミ箱管理
## 削除されたアイコンを保持し、復元・完全削除を管理する

signal bin_changed()

var _items: Array[Dictionary] = []

## アイテムをゴミ箱に追加（デスクトップアイコンから呼ばれる）
func add_item(item_data: Dictionary) -> void:
	item_data["deleted_at"] = Time.get_datetime_string_from_system()
	_items.append(item_data)
	bin_changed.emit()

## ゴミ箱からアイテムを復元
func restore_item(index: int) -> Dictionary:
	if index >= 0 and index < _items.size():
		var item = _items[index]
		_items.remove_at(index)
		bin_changed.emit()
		return item
	return {}

## 完全削除（ゴミ箱から消去）
func delete_permanently(index: int) -> void:
	if index >= 0 and index < _items.size():
		_items.remove_at(index)
		bin_changed.emit()

## ゴミ箱を空にする
func empty_bin() -> void:
	_items.clear()
	bin_changed.emit()

## アイテムリスト取得
func get_items() -> Array:
	return _items

## アイテム数取得
func get_count() -> int:
	return _items.size()
