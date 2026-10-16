from pathlib import Path

from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell


template = Path(
    r"C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/work_reports_20260508/エンジニア作業報告書_テンプレート_改訂版.xlsx"
)
out_dir = Path(r"C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/work_reports_20260612")
out_dir.mkdir(parents=True, exist_ok=True)
out = out_dir / "エンジニア作業報告書_2026年6月第2週.xlsx"

wb = load_workbook(template)
ws = wb.active
ws.title = "2026年6月第2週"


def set_value(cell_ref: str, value):
    cell = ws[cell_ref]
    if isinstance(cell, MergedCell):
        raise ValueError(f"{cell_ref} is a merged child cell")
    cell.value = value


set_value("A2", "対象期間: 2026/06/08〜2026/06/12")
set_value("A4", "2026/06/08〜2026/06/12")
set_value("B4", "6/8, 6/9, 6/10, 6/11, 6/12")
set_value("C4", "キミと恋する15日（仮）")
set_value("D4", "Unity本番開発")
set_value(
    "E4",
    "本番開発として、ADV基盤分割、イベント駆動化、Googleスプレッドシート読込、パラメータ別シート化、Infoパネルデバッグ、Slack通知、書類更新を進行。通知と資料系は一部完了、実装基盤は作業中として整理。",
)

implementation_rows = {
    8: {
        "A": "本番開発基盤",
        "B": "・developブランチ上で本番開発を継続\n・新リポジトリ移動に向けてremote構成を整理\n・originとvisualartsの2系統remoteを確認し、移行状態を把握",
        "D": "D:/KIMIKOI / develop / origin / visualarts",
        "F": "作業中",
        "G": "新しい共有リポジトリへ移る前提で、作業先とブランチの確認を進めている状態",
    },
    9: {
        "A": "ADV基盤分割",
        "B": "・KimikoiADVの基本機能をクラス分割\n・Audio、Choice、Log、PhaseFlow、Visual、Playback系を分離\n・既存ADV機能を保ったまま保守しやすい構成へ整理",
        "D": "KimikoiAdvAudioController.cs / KimikoiAdvChoiceController.cs / KimikoiAdvPhaseFlowController.cs",
        "F": "作業中",
        "G": "会話、選択肢、音、ログなどを分け、今後のシナリオ追加や調整がしやすい形へ移行中",
    },
    10: {
        "A": "イベント駆動/CSV基盤",
        "B": "・Update処理になっていた箇所をイベント駆動へ修正\n・CSV列名や進行条件のコード直書きを整理\n・MasterScenarioCsvLoaderを追加し、読込処理を基盤化",
        "D": "DesktopShellController.cs / MasterScenarioController.cs / MasterScenarioCsvLoader.cs",
        "F": "作業中",
        "G": "毎フレーム監視を減らし、必要なタイミングで処理が動く作りへ整理中",
    },
    11: {
        "A": "シート連携/パラメータ",
        "B": "・Googleスプレッドシート読込基盤を組み込み\n・ADVシナリオパラメータ調整を別シートへ切り出し\n・パラメータID解釈クラスとmaster_parameter_changes.csvを追加",
        "D": "KimikoiScenarioGoogleSheetsLoader.cs / KimikoiScenarioParameterChangeCatalog.cs / master_parameter_changes.csv",
        "F": "作業中",
        "G": "シナリオ本文とパラメータ変動を別管理にし、企画側の調整内容を反映しやすくする対応中",
    },
    12: {
        "A": "デバッグ拡張",
        "B": "・Ctrl+DデバッグパネルをInfoパネル表示用に拡張\n・Infoパネル文言をScriptableObjectへ分離\n・キミコイADV側からInfoパネル表示情報を取得可能に修正",
        "D": "DesktopDebugMenuController.InfoPanel.cs / DesktopEmbeddedCopy.asset / KimikoiAdvWindowController.cs",
        "F": "作業中",
        "G": "プレイ中の状態を画面上で確認できるようにし、不具合確認や調整確認をしやすくしている状態",
    },
    13: {
        "A": "UI/Prefab警告対応",
        "B": "・UnityConsoleLogの警告周りを対応\n・Desktop系Prefabと通知/ウィンドウ関連の参照を調整\n・全クラス、フィールド、メソッドへコメントを追記し保守性を改善",
        "D": "Desktop Prefabs / Desktop Scripts / KimikoiAdv Scripts",
        "F": "作業中",
        "G": "Unity上の警告を減らし、今後の修正時に影響箇所を追いやすい状態へ整備中",
    },
    14: {
        "A": "Slack通知対応",
        "B": "・developへのpushをトリガーにしたGitHub Actionsを追加\n・コミット一覧をSlackへ通知する処理を作成\n・WebhookはGitHub Secrets参照にして運用しやすい形に整理",
        "D": ".github/workflows/develop-commit-notify.yml",
        "F": "完了",
        "G": "developへ更新が入った際に、Slackで作業内容を把握できる通知導線を追加済み",
    },
    15: {
        "A": "QA/確認",
        "B": "・ADVScenarioServiceのコンパイルエラーへ対応\n・シート読込、パラメータ読込、Infoパネルの確認観点を整理\n・本番開発基盤として今週分の実装を完了扱いで確認",
        "D": "KimikoiAdvScenarioScriptService.cs / DesktopDebugLocalPrefs.cs / Screenshots運用",
        "F": "作業中",
        "G": "シナリオ読込、パラメータ読込、Info表示が確認しやすいよう、検証観点を整理中",
    },
}

for row, values in implementation_rows.items():
    for col, value in values.items():
        set_value(f"{col}{row}", value)

other_rows = {
    19: {
        "A": "書類更新",
        "B": "・GitHub TOPリスト表示を再修正\n・KimikoiScenario_Dev1_CurrentCsv.xlsxを更新\n・README、Docs、Scenario、Screenshots運用資料の更新を整理",
        "D": "README.md / Docs/Scenario/KimikoiScenario_Dev1_CurrentCsv.xlsx / Assets/Screenshots/README.md",
        "F": "作業中",
        "G": "本番開発で参照する資料を更新し、企画・実装の確認先を分かりやすく整理中",
    },
    20: {
        "A": "リポジトリ移動/運用",
        "B": "・新しいリポジトリへの移動状況を確認\n・originとvisualartsのremoteを確認\n・developブランチ運用を前提に作業内容を整理",
        "D": "origin: OGOTA101/KIMIKOI / visualarts: visualarts-kimikoi/kimikoi / develop",
        "F": "作業中",
        "G": "旧作業先と新しい共有先を確認し、今後どちらへ反映するかを整理している状態",
    },
    21: {
        "A": "マイルストーン更新",
        "B": "・6月開始マイルストーン報告書を更新\n・納品チェック追加版を作成\n・汎用マイルストーンテンプレートも整理",
        "D": "キミコイ_月次マイルストーン報告書_2026年6月開始_納品チェック追加.xlsx / milestone_template",
        "F": "完了",
        "G": "納品チェックを含めた進行確認用の資料として更新済み",
    },
    22: {
        "A": "報告書整備",
        "B": "・6/8〜6/12分の作業報告をテンプレートに沿って作成\n・Git状況、Slack通知、書類更新、新リポジトリ移動を反映\n・備考に出社日と出社時間を明記",
        "D": "本報告書",
        "F": "完了",
        "G": "内容確認済み",
    },
}

for row, values in other_rows.items():
    for col, value in values.items():
        set_value(f"{col}{row}", value)

set_value(
    "A25",
    "・6/8〜6/12は本番開発週として、ADV基盤分割、シート連携、デバッグ拡張、Slack通知対応を進行。\n"
    "・新リポジトリ移動に伴い、originとvisualartsのremote構成、developブランチ運用を確認中。\n"
    "・出社: 2026/06/08(月) 10:00〜18:00、2026/06/10(水) 15:00〜18:00。",
)

if ws.row_dimensions[14].height:
    ws.row_dimensions[15].height = ws.row_dimensions[14].height

wb.save(out)
print(out)
