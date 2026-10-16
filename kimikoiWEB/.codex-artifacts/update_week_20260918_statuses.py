from pathlib import Path

from openpyxl import load_workbook


report = Path(
    r"C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/work_reports_20260918/"
    "エンジニア作業報告書_2026年9月第3週.xlsx"
)

workbook = load_workbook(report)
sheet = workbook.active

# These rows are represented by completed implementation/data commits this week.
for row in [8, 9, 10, 11, 12, 13, 14, 20]:
    sheet[f"F{row}"] = "完了"

sheet["E4"] = (
    "本番開発として、DAY戻り、削除演出、既読SKIP、ADV表示、LIME、"
    "ルート演出を実装・調整。MOCと本番通し確認は継続中。前週完了項目は再掲しない。"
)
sheet["A25"] = (
    "・対象：9/12〜9/18。出社なし。\n"
    "・DAY戻り、削除演出、既読SKIP、ADV表示、LIME、ルート演出は完了。\n"
    "・MOC、版番号0027、本番画面の通し確認を継続。"
)

workbook.save(report)
print(report)
