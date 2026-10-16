# 呪いのPCクリーナー（仮） 詳細実装仕様書 (Godot Engine版)

## 1. プロジェクト概要・アーキテクチャ詳細

*   **ジャンル:** ホラーテイスト・ポイント＆クリック・デスクトップシミュレーション
*   **ターゲットプラットフォーム:** Webブラウザ (HTML5/WebAssemblyエクスポート)、必要に応じてPCネイティブ(Windows/Mac/Linux)。
*   **ベース解像度:** 1920x1080 (16:9ベース)。 `Window` > `Stretch` 設定: `Mode` = `canvas_items`, `Aspect` = `keep`
*   **コアアーキテクチャ:**
	*   **UI/イベント駆動:** ゲーム全体が疑似PCのデスクトップUI上で進行するため、表示や操作の大部分は `Control` 派生ノード（UI要素）群をフルに活用して実装する。
	*   **Autoload (シングルトン):** `GameState.gd` などのグローバルな状態管理・集約スクリプトをAutoloadとして登録し、各UIコンポーネントやシーン間の結合を疎にし、Godotのシグナル(Signal)で連携させる仕組みを取る。
	*   **データ構造 (Resource):** 疑似PC内のファイル構造・アイコンなどのデータは、Godot組み込みの `Resource` クラスを継承した独自のファイル型定義クラス(例: `VirtualFileEntry`)として作成し、インスペクタ画面上で直感的に作成・調整・階層保持できるようにする。

## 2. シーン（Scene）構成と詳細遷移フロー

各画面は独立したScene(`.tscn`)ファイルとして開発する。本仕様ではルートの最上位に `Main.tscn`（状態管理やシーン切り替えのコントローラーとなるノード）を置き、その子ノードとして各シーンを Instantiate または `queue_free()` してシームレスに切り替える手法を推奨する。

### 2.1. タイトルシーン (`Title.tscn`)
*   **ノードツリー構成:**
	*   `Control` (Root)
		*   `TextureRect` または `ColorRect` (背景画像・黒系統)
		*   `RichTextLabel` または `Label` (ホラー警告、タイトルロゴ等の表記)
		*   `Button` ("アルバイトを始める" トリガーボタン)
		*   `AnimationPlayer` (フェードイン・フェードアウト等、画面のトランジションアニメーション)
*   **機能と遷移:**
	*   起動時の入り口。「アルバイトを始める」ボタン押下時にシグナルを送信し、`AnimationPlayer`にて暗転アニメーションを再生。コールバックとして `GameState` の変数を初期化（`reset_state()`）し、次の `ADV.tscn` などを展開・遷移する。

### 2.2. ADV（アドベンチャー）シーン (`ADV.tscn`)
*   **ノードツリー構成:**
	*   `Control` (Root)
		*   `ColorRect` (半透明の黒オーバーレイ)
		*   `PanelContainer` (テキスト表示テキストウィンドウのパネル枠)
			*   `MarginContainer` (パディング確保)
				*   `RichTextLabel` (テキスト表示用ノード)
		*   `TextureRect` (背景画像・演出用)
		*   `AudioStreamPlayer` (環境音、システムクリック音等)
*   **機能・処理:**
	*   ADVのシナリオ（セリフ）データを配列(`Array[String]`)等で持ち、画面のどこかをクリック（ノードの `_gui_input` など）するごとに1行ずつ文章を進める。
	*   `RichTextLabel` の `visible_characters` プロパティを `Tween` によって時間経過で増加させることで、なめらかな文字送り（タイプライターエフェクト）を実装する。
	*   すべてのテキストが完了したらフェードアウトし、操作のメイン画面である `Room.tscn`（机ビュー）シーンへ遷移する。

### 2.3. 机・部屋視点シーン (`Room.tscn`)
*   **ノードツリー構成:**
	*   `Control` (Root)
		*   `TextureRect` (部屋・机全体の背景画像)
		*   `TextureButton` (PCモニタークリック領域)
		*   `TextureButton` (スマートフォンクリック領域)
		*   `AudioStreamPlayer` (PCの稼働音・冷却ファンの音などの環境アンビエント等)
*   **機能・処理:**
	*   プレイヤーの「リアルとしての視点」。
	*   **PCモニター領域:** クリックで疑似OS画面である `PC_OS.tscn` を全画面へオーバーレイ表示（またはシーン遷移）する。PC電源がON (`GameState.is_pc_on == true`) か OFFかで、ボタンの画像のテクスチャ(`texture_normal`)を動的に差し替えて表示する。
	*   **スマートフォン領域:** クリックで、クリア判定のトリガーとなる報告UI画面 `Phone.tscn` をオーバーレイで表示する。

### 2.4. PC疑似OSシーン (`PC_OS.tscn`) - 【ゲームコア】
Windows 98など古いOSライクなデスクトップUIを再現する。このシーンにシステムのほとんどを統合する。

*   **ノードツリー階層 (Z-Indexとツリー順による描画順管理):**
	*   `Control` (OS Root)
		*   `ColorRect` または カスタム背景 `TextureRect` (デスクトップ描画用背景)
			*   `Control` (デスクトップアイコンの親ノード。手動で `DesktopIcon.tscn` などを配置していく)
			*   `Control` (矩形選択(ドラッグでの範囲選択)の描画用ノード。`_draw` 関数を使用)
		*   `Control` (Window Layer) - フォルダやファイルを「開く」ことで展開されるウィンドウ群 (`OSWindow.tscn`) が動的に Instantiate されて入る階層。クリック等でアクティブになったウィンドウは `move_child(node, -1)` メソッドでツリーの最後尾（描画上は最前面）へ移動させる。
		*   `PanelContainer` (タスクバー。画面下部固定 `Anchor: Bottom Wide`)
			*   `HBoxContainer`
				*   `Button` (スタートメニューボタン)
				*   `HBoxContainer` (起動中のアプリアイコン一覧タブ)
				*   `HBoxContainer` (システムトレイ領域: 時計, ネットワークアイコン, 音量等のダミー)
		*   `ColorRect` + `ShaderMaterial` (ホラーエフェクト/グリッチ/画面崩壊用の最前面レイヤー。通常時はアルファ0で透明)
		*   `ColorRect` (PC電源OFF時、画面を埋める暗幕。中央に「電源ボタン」を配置)

*   **機能・処理詳細:**
	*   **電源ON/OFF:** 初期は暗幕（電源OFF状態）。「電源ボタン」押下で起動音とともに `GameState.is_pc_on = true` となり、暗幕にフェードや非表示処理を行いデスクトップを表示。
	*   **タスクバートレイ・ギミック:** 
		*   時計：OSの現在時刻 (`Time.get_time_dict_from_system()`) を取得して毎分/毎秒表示を更新する。クリック時には「権限がありません」等のダミーダイアログを出す。
		*   ネットワークアイコン：`Timer` ノードを用いて数秒ごとに「送受信」のビット画像フラッシュ（チカチカする）演出をループ再生する。
	*   **右クリック・コンテキストメニュー:** デスクトップ用 `Control` の `_gui_input` で `MOUSE_BUTTON_RIGHT` を検知。Godotの組込UIである `PopupMenu` をマウス位置(`get_global_mouse_position()`) に表示。「最新の情報に更新」「アイコン整列」などを実行できるようにする。
		*   「アイコンの整列」ロジック：デスクトップ上の全ての `DesktopIcon` ノードを取得し、Y軸やX軸、あるいは名前でソートした後、定めたグリッド間隔 (例: x=90px, y=90px の間隔) になるように `Tween` で `position` をそれぞれ再設定し、なめらかに移動・整列させる。

### 2.5. スマホ・報告ビュー (`Phone.tscn`)
*   **ノード構成:** `ColorRect` (半透明黒背景), `TextureRect` (スマホ本体のガワ), 報告画面用UI(`Button` "作業完了を報告する" / "スマホを置く")
*   **機能:** `Room.tscn` あるいはメインの前面にポップアップ。
	*   「スマホを置く」で `queue_free()` または `visible = false` で非表示。
	*   「作業完了を報告する」ボタン押下時、即座に `GameState.evaluate_result()` （エンディング判定処理、後述）を呼び出し、ゲームの結末を決定・リザルトへ移行する。

### 2.6. リザルト・エンディングシーン (`Result.tscn`)
*   **ノード構成:** `Control` (Root), `Label` (エンディングテキスト・シナリオ結末), `ProgressBar` (クリーン度％表示バー), `Button` (もう一度遊ぶ)
*   **機能・処理:**
	*   `GameState.get_clean_ratio()` に基づき Godot内蔵の `ProgressBar` の `value` プロパティを `0` から `クリーン度` へ `Tween` でアニメーション・カウントアップさせる。
	*   演出として、割合が50%未満ならバーの色（`theme_override_styles/fill`など）を赤、50%以上で黄、100%達成時は緑へとスクリプトから制御する。
	*   「もう一度」ボタンで、状態を初期化したのち SceneTree の `reload_current_scene()` もしくは `change_scene_to_file("res://Scene/Title.tscn")` にて最初からやり直す。

---

## 3. ファイルシステムデータとドラッグ機能設計

### 3.1. カスタムリソース `VirtualFileEntry.gd`
単なるスクリプト上でのオブジェクト定義ではなく、GodotのResource機能を活用する。エディタ上でパラメータを調整でき、木構造のデータをインスペクタから容易に作成できるようになる。

```gdscript
class_name VirtualFileEntry extends Resource

enum FileType { FOLDER, TEXT, IMAGE, AUDIO, LOCKED, TRASH, APP_TASKMANAGER, CURSED }

@export var file_type: FileType
@export var file_name: String
@export var icon_texture: Texture2D # アイコン画像 (.svg または .png)
@export var default_position: Vector2

# FileType が FOLDER や LOCKED の場合に格納される子ファイル群
@export var children: Array[VirtualFileEntry]

# ファイルを開いた際("テキスト"や"画像"の場合)に表示するデータ
@export_multiline var text_content: String
@export var image_content: Texture2D
@export var sound_content: AudioStream

# ロックフォルダ時の解除パスフレーズ
@export var unlock_password: String = ""
```
*   ゲーム起動時などに、ルート(例えばCドライブ直下にあたる)の `VirtualFileEntry` を再帰的にスキャンし、「削除可能なファイルの総数」として変数 `GameState.total_deletable_count` をセットしておく。

### 3.2. デスクトップアイコン (`DesktopIcon.tscn`) と ドラッグ＆ドロップ (DnD)
*   **構成:** `VBoxContainer` または `Control` に `TextureRect` (アイコン表示) と `Label` (ファイル名表示) を子に持たせる。
*   **基礎ロジック:**
	*   クリックによるフォーカスイベント (`focus_entered`, などの `_gui_input`) でUI・ラベルの色を青反転ハイライトさせる。
	*   ダブルクリック (`event is InputEventMouseButton and event.double_click`) で、紐づいた `VirtualFileEntry` の `file_type` に合わせて適切なウィンドウ (`OSWindow.tscn` など) を生成する。
*   **DnD（ドラッグ・アンド・ドロップ）のGodot標準機能実装:**
	*   **アイコンノード側:** `_get_drag_data(at_position)` をオーバーライド。マウスドラッグ時に半透明なプレビューアイコンコントロールを新規生成して返しつつ、ファイルのデータ参照（または自分自身のノードの参照）をreturnする。
	*   **ドロップ先（ゴミ箱ノード や デスクトップ背景 `Control`）側:** `_can_drop_data(at_position, data)` でドロップされたものがアイコンデータか判定(`data is Node` や `data is VirtualFileEntry` など)し `true/false` を返す。判定が許せば `_drop_data(at_position, data)` にて実際の処理を実行。ゴミ箱なら削除処理に回し、デスクトップなら `data.position = at_position` へアイコンを移動させる。

---

## 4. ウィンドウUIシステム (`OSWindow.tscn`) の詳細

フォルダやテキスト、画像アプリなど、すべてをラップするWindowsライクな汎用コンポーネント。中身だけを Instantiate で差し替える。

*   **ノード階層構成:**
	*   `Panel` (ウィンドウの枠・ベース背景)
		*   `VBoxContainer` (全体レイアウト)
			*   `MarginContainer` (ヘッダー帯。ここに `Control` 等のドラッグ当たり判定用の面を置く)
				*   `HBoxContainer` (タイトル名前ラベルと、右詰めボタンの配置)
					*   `Label` (ウィンドウ名)
					*   `Control` (空白埋め用 `Size Flags` を `Expand/Fill` に)
					*   `Button` (最小化 `_`)
					*   `Button` (最大化 `□`)
					*   `Button` (閉じる `X`)
			*   `PanelContainer` あるいは `ScrollContainer` (メインコンテンツ表示・差し替え領域)
*   **機能実装ロジック:**
	*   **ドラッグ:** ヘッダー部分の `_gui_input` にて、左クリック押下中(`event.button_mask & MOUSE_BUTTON_MASK_LEFT`) に発生するマウス移動(`InputEventMouseMotion`)を利用し、`event.relative` (移動差分) を ウィンドウノード自体の `position` に毎フレーム加算していくロジックを組む。
	*   **Z-Order管理:** 最前面表示の実現として、ウィンドウをクリックまたはフォーカスした瞬間、親ノードである Window Layer に対して `parent.move_child(self, -1)` を発行する（-1 はGodotにおいて子ノード配列の最後、つまり手前に描画という意味）。
	*   **最小化:** 自身を非表示 (`visible = false`) にし、タスクバー側のボタンを押下した際に表示を戻す。
	*   **最大化トグル:** 変数 `var is_maximized: bool` と 元位置・サイズ保存用の `var prev_rect: Rect2` を用意。最大化ボタン押下時、未最大化なら現在の状態を `prev_rect` に保存後、Godotの Anchor 機能（`set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)`等）を使って瞬時にフルサイズ化する。再押下で `prev_rect` にリストアする。
	*   **閉じる:** 自身を `queue_free()` で安全に破棄する。それに伴いタスクバー側のボタントラッキングも削除する。

---

## 5. ステート管理変数の詳細 (`GameState.gd` / Autoload)

プロジェクト設定(`Project > Project Settings > Autoload`)でグローバルスクリプトとして登録し、どのノードからでも `GameState.変数名` でアクセス・発火できるようにする。

```gdscript
extends Node

# --- UI全体へのシグナル送信 ---
signal system_crashed        # 即死エンド時など
signal file_state_updated    # ゴミ箱空などのファイル増減・削除時
signal refresh_desktop       # 手動更新リクエスト用

# --- ステート変数群 ---
var is_pc_on: bool = false
var is_system_alive: bool = true

# 削除カウント関連
var total_deletable_count: int = 0
var deleted_count: int = 0
var trash_files: Array = []               # 現在「ゴミ箱」に入っているファイルデータの配列
var permanently_deleted_ids: Array = []   # 完全消去（ゴミ箱を空）されたファイルのIDなど

var is_cursed_file_deleted: bool = false  # 呪いの本体ファイルが完全消去されたかの成否

# --- 基礎機能と状態計算メソッド ---
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

# ゴミ箱アイコンUIの「空にする」から呼び出される
func empty_trash():
	for f in trash_files:
		permanently_deleted_ids.append(f.id_or_name)
		if f.file_type == VirtualFileEntry.FileType.CURSED:
			is_cursed_file_deleted = true
		deleted_count += 1
	trash_files.clear()
	emit_signal("file_state_updated")

# 即死イベント処理などをここに発火する
func trigger_gameover():
	is_system_alive = false
	emit_signal("system_crashed")
```

---

## 6. エンディング分岐と進行データ（判定と演出ロジック）

スマートフォンから「完了報告」を実行した際、あるいは特定の致命的アクションをした際に呼び出される `evaluate_result()` 系メソッドの詳細。

### ① 結末：仕事放棄
*   **発動条件:** `!GameState.is_pc_on` (机を調べただけで、「電源を入れる」を実行せずに、そのままスマホから完了報告をする状態)
*   **クリーン度表示:** 0%
*   **テキスト:** 「PCを触る気にもなれず、完了報告だけを済ませた。……楽な仕事でよかった。だが、数日後。深夜、誰もいないはずの玄関からノックの音が鳴り続けている。」

### ② 結末A：意識の同化（即死ゲームオーバートラップ）
*   **発動条件:** 特殊フォルダであるタスクマネージャー（`cleanup`等）を開き、システムプロセスのひとつである `sys` を選択して「強制終了」ボタンを押下する。
*   **処理フロー:** 完了報告アクションを待たず、ボタンを押した瞬間に `GameState.trigger_gameover()` が呼ばれる。
*   **演出仕様:** 画面の前面ノードに配置した `ShaderMaterial`（グリッチシェーダー）のパラメータ `shake_power` や `color_aberration` を `Tween` ノードで急激に上昇させる。不快な高周波ノイズSEなどを `AudioStreamPlayer` で鳴らしながら、ブラックアウトさせてリザルト/ADVへ強制遷移する。
*   **クリーン度表示:** 0%（バー自体をバグらせたノイズ表示などを行う）
*   **テキスト:** 「「警告が出たけど、邪魔だから消してやる」タスクマネージャーからプロセスを強制終了した。……その途端、画面が激しく乱れ始めた。……」

### ③ 結末A：仕事失敗（バッドエンド）
*   **発動条件:** PCを触って完了報告を行ったが `GameState.is_cursed_file_deleted == false` (呪いのファイルをごみ箱に入れ、完全に空にする処理を完了していない)。
*   **クリーン度表示:** 現在のクリーン度（プレイヤーの作業度合いによる 0～99%）。
*   **演出仕様:** リザルト表示前・テキスト表示直前に、「ガガガガ」という自動起動音(SE)を再生し、「『オマエ モ データ ニ シテヤル』」といった赤字の大きなテキストが一瞬表示されてからエンディング文章が進む。
*   **テキスト:** 「「よくわからないけど、これでいいや」適当に報告を済ませ、眠りについた。……真夜中、PCが勝手に起動する音がした。……『オマエ モ データ ニ シテヤル』」

### ④ 結末B：残留する呪い（ノーマルエンド）
*   **発動条件:** `GameState.is_cursed_file_deleted == true` だが `GameState.get_clean_ratio() < 100` (呪い本体は消したが、ゴミデータや不要ファイルが1個でもシステム内に残っている)。
*   **クリーン度表示:** 作業量による％。
*   **テキスト:** 「「やっかいなファイルは粗方消したし、この辺で報告しておくか」作業完了を報告し、端末の電源を落とした。……『ミツケタ、ノニ……マダ……ノコッテル……』」

### ⑤ 結末C：生還（トゥルーエンド）
*   **発動条件:** `GameState.is_cursed_file_deleted == true` かつ `GameState.get_clean_ratio() == 100` (すべての指定目標をごみ箱移動、そして空まで行い完全消去した)。
*   **クリーン度表示:** 100%（プログレスバーは緑色に発光。完了達成感を持たせる）。
*   **テキスト:** 「「……よし、これで完全にすべてのファイルが消えたはずだ」これにてミッションコンプリート。その数日後、口座には目を疑うような額の報酬が振り込まれていた。あの不気味なPCのことは忘れて、自由な生活を楽しもう。」

---

## 7. 不気味さを演出するファイルとディレクトリ内部仕様

Godotエディタ上から `VirtualFileEntry` を構築し、「フレーバーフォルダ群」を作り上げる。

*   **マイドキュメント（Drives/Documents）直下:**
	*   `手順書.txt`: ゲームルールの基礎を教えるチュートリアル情報。
	*   `memo1.txt`: 「0714ではなく9999」と書かれた、ロック解錠パスワード用ヒント。
	*   `memo2.txt`: 「絶対に消せ、あれは見つけるな」といった、世界観を開示する警告テキスト。
*   **ホラーフレーバーファイル群:**
	*   `遺言.doc`: 開くと `Label` に「『あああああ...』」などの文字化けを表示。
	*   `不明な音声.wav`: 開くとミュージックプレイヤー風のウィンドウが立ち上がり、`AudioStreamPlayer` で「...私...見つけ......」という途切れた音声を再生。
	*   `家族写真.png`: 通常の画像ビューワー風のウィンドウが開くが、テクスチャ内容は「顔を血で塗りつぶされた」画像や「ファイルが破損しています」といったフェイクUI画像を当てはめる。
*   **「開かずの領域/残存エリア」 (Locked Folder):**
	*   Resourceの `unlock_password` プロパティに `9999` を設定する。
	*   ユーザーがダブルクリックした際、パスワード入力用のプロンプトウィンドウを出す（`LineEdit`ノードを使用し、パスワード非表示プロパティ `secret` を `true` にして黒丸表示）。
	*   入力後に文字列比較し、解除成功時、Resourceに持たされている `children` の `VirtualFileEntry` リストをインスタンス化・デスクトップまたはウィンドウ内に展開し「呪いの本体.doc」などをプレイヤーの目に見せる形にする。
