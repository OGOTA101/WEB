extends Node

## SceneBuilder - コードでシーンノードを構築するユーティリティ
## .tscnファイルなしで全UIを動的生成する

## ウィンドウのStyleBox（タイトルバー用・ダーク）
static func make_titlebar_style(color: Color = Color(0.15, 0.15, 0.40)) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = color
	return sb

## ウィンドウ本体のStyleBox
static func make_window_body_style(color: Color = Color(0.12, 0.12, 0.18)) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = color
	sb.border_color = Color(0.3, 0.3, 0.6)
	sb.set_border_width_all(1)
	return sb

## パネルStyleBox（コンテンツ背景）
static func make_panel_style(color: Color = Color(0.10, 0.10, 0.14)) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = color
	return sb

## ボタンStyleBox
static func make_button_normal_style(color: Color = Color(0.2, 0.2, 0.4)) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = color
	sb.corner_radius_top_left = 3
	sb.corner_radius_top_right = 3
	sb.corner_radius_bottom_left = 3
	sb.corner_radius_bottom_right = 3
	return sb

## ボタンホバーStyleBox
static func make_button_hover_style() -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.3, 0.3, 0.6)
	sb.corner_radius_top_left = 3
	sb.corner_radius_top_right = 3
	sb.corner_radius_bottom_left = 3
	sb.corner_radius_bottom_right = 3
	return sb

## 閉じるボタン（赤）
static func make_close_button_style() -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.8, 0.1, 0.1)
	sb.corner_radius_top_left = 3
	sb.corner_radius_top_right = 3
	sb.corner_radius_bottom_left = 3
	sb.corner_radius_bottom_right = 3
	return sb

## 閉じるボタンホバー
static func make_close_button_hover_style() -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(1.0, 0.2, 0.2)
	sb.corner_radius_top_left = 3
	sb.corner_radius_top_right = 3
	sb.corner_radius_bottom_left = 3
	sb.corner_radius_bottom_right = 3
	return sb

## スタイルをButtonに適用
static func style_button(btn: Button, is_close: bool = false) -> void:
	if is_close:
		btn.add_theme_stylebox_override("normal", make_close_button_style())
		btn.add_theme_stylebox_override("hover", make_close_button_hover_style())
	else:
		btn.add_theme_stylebox_override("normal", make_button_normal_style())
		btn.add_theme_stylebox_override("hover", make_button_hover_style())
	btn.add_theme_color_override("font_color", Color.WHITE)

## タスクバーボタン用スタイル
static func make_taskbar_btn_style(active: bool = false) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(0.18, 0.18, 0.35) if active else Color(0.12, 0.12, 0.22)
	return sb
