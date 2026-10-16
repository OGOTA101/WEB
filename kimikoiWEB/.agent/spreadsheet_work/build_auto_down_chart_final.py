from __future__ import annotations

from datetime import date
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation


ROOT = Path(r"C:\Users\ihogo\Desktop\WEB\kimikoiWEB")
SOURCE = ROOT / "outputs" / "kimikoi_kousu" / "きみこい・工数表_ダウンチャート.xlsx"
OUTPUT = ROOT / "outputs" / "kimikoi_kousu" / "きみこい・工数表_ダウンチャート_自動化完成版.xlsx"

MAX_SOURCE_ROW = 1500
MAX_TASK_ROWS = 650
DATE_DAYS = 730
TASK_START_ROW = 6
DATE_START_COL = 15  # O


HOLIDAYS = [
    date(2026, 1, 1),
    date(2026, 1, 12),
    date(2026, 2, 11),
    date(2026, 2, 23),
    date(2026, 3, 20),
    date(2026, 4, 29),
    date(2026, 5, 3),
    date(2026, 5, 4),
    date(2026, 5, 5),
    date(2026, 5, 6),
    date(2026, 7, 20),
    date(2026, 8, 11),
    date(2026, 9, 21),
    date(2026, 9, 22),
    date(2026, 9, 23),
    date(2026, 10, 12),
    date(2026, 11, 3),
    date(2026, 11, 23),
    date(2027, 1, 1),
    date(2027, 1, 11),
    date(2027, 2, 11),
    date(2027, 2, 23),
    date(2027, 3, 21),
    date(2027, 3, 22),
    date(2027, 4, 29),
    date(2027, 5, 3),
    date(2027, 5, 4),
    date(2027, 5, 5),
    date(2027, 7, 19),
    date(2027, 8, 11),
    date(2027, 9, 20),
    date(2027, 9, 23),
    date(2027, 10, 11),
    date(2027, 11, 3),
    date(2027, 11, 23),
    date(2028, 1, 1),
    date(2028, 1, 10),
    date(2028, 2, 11),
    date(2028, 2, 23),
    date(2028, 3, 20),
    date(2028, 4, 29),
    date(2028, 5, 3),
    date(2028, 5, 4),
    date(2028, 5, 5),
    date(2028, 7, 17),
    date(2028, 8, 11),
    date(2028, 9, 18),
    date(2028, 9, 22),
    date(2028, 11, 3),
    date(2028, 11, 23),
]


def q(sheet_name: str) -> str:
    return f"'{sheet_name}'"


wb = load_workbook(SOURCE)
base_ws = wb["本番工数"]

if "ダウンチャート" in wb.sheetnames:
    del wb["ダウンチャート"]
if "祝日設定" in wb.sheetnames:
    del wb["祝日設定"]

helper_col = 32
helper_letter = get_column_letter(helper_col)
base_ws.cell(21, helper_col, "自動No")
for source_row in range(22, MAX_SOURCE_ROW + 1):
    base_ws.cell(source_row, helper_col, f'=IF($H{source_row}>0,COUNTIF($H$22:$H{source_row},">0"),"")')
    base_ws.cell(source_row, helper_col).number_format = "0"
base_ws.column_dimensions[helper_letter].hidden = True

ws = wb.create_sheet("ダウンチャート", index=1)
holiday_ws = wb.create_sheet("祝日設定")
holiday_ws.sheet_state = "hidden"
holiday_ws["A1"] = "祝日"
for idx, holiday in enumerate(HOLIDAYS, start=2):
    holiday_ws.cell(idx, 1, holiday)
    holiday_ws.cell(idx, 1).number_format = "yyyy/m/d"

ws.sheet_view.showGridLines = False
ws.freeze_panes = f"{get_column_letter(DATE_START_COL)}{TASK_START_ROW}"

dark = "1F4E5F"
dark2 = "173A47"
white = "FFFFFF"
input_fill = "FFF2CC"
linked_fill = "DDEBF7"
summary_fill = "E2F0D9"
weekend_fill = "E7E6E6"
holiday_fill = "D9D2E9"
bar_fill = "9DC3E6"
thin = Side(style="thin", color="B7B7B7")
hair = Side(style="hair", color="D9D9D9")
medium = Side(style="medium", color="666666")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
header_border = Border(left=thin, right=thin, top=medium, bottom=medium)
date_border = Border(left=hair, right=hair, top=thin, bottom=thin)

ws.merge_cells("A1:I1")
ws["A1"] = "きみこい 本番工数 ダウンチャート（自動化完成版）"
ws["A1"].fill = PatternFill("solid", fgColor=dark)
ws["A1"].font = Font(bold=True, color=white, size=16)
ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[1].height = 30

summary_labels = [
    "開始日",
    "終了目安",
    "タスク数",
    "MAX工数合計",
    "バッファ係数",
    "予定工数合計",
    "日次消化力",
    "休日前提",
]
summary_values = [
    date(2026, 6, 1),
    '=IFERROR(MAX($H$6:$H$655),"")',
    f'=COUNTIF({q("本番工数")}!$H$22:$H${MAX_SOURCE_ROW},">0")',
    f'=SUMIF({q("本番工数")}!$H$22:$H${MAX_SOURCE_ROW},">0",{q("本番工数")}!$H$22:$H${MAX_SOURCE_ROW})',
    1.25,
    "=D3*E3",
    1,
    "土日祝休み",
]

for col, label in enumerate(summary_labels, start=1):
    cell = ws.cell(2, col, label)
    cell.fill = PatternFill("solid", fgColor=dark2)
    cell.font = Font(bold=True, color=white, size=10)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = border

    value_cell = ws.cell(3, col, summary_values[col - 1])
    value_cell.fill = PatternFill("solid", fgColor=input_fill if col in {1, 5, 7, 8} else linked_fill)
    value_cell.font = Font(bold=True, size=10)
    value_cell.alignment = Alignment(horizontal="center", vertical="center")
    value_cell.border = border

ws["A3"].number_format = "yyyy/m/d"
ws["B3"].number_format = "yyyy/m/d"
for cell in ("D3", "E3", "F3", "G3"):
    ws[cell].number_format = "0.0"

ws.merge_cells("I2:N3")
ws["I2"] = "黄色セル（開始日・バッファ係数・日次消化力・休日前提）を変更すると、Excel再計算でタスク日付とバーが更新されます。タスクは本番工数シートのMAX工数が0より大きい行から自動取得します。"
ws["I2"].fill = PatternFill("solid", fgColor=summary_fill)
ws["I2"].alignment = Alignment(wrap_text=True, vertical="center")
ws["I2"].border = border

dv_premise = DataValidation(type="list", formula1='"土日祝休み,土日休み,休みなし"', allow_blank=False)
ws.add_data_validation(dv_premise)
dv_premise.add(ws["H3"])

dv_decimal = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=False)
ws.add_data_validation(dv_decimal)
dv_decimal.add(ws["E3"])
dv_decimal.add(ws["G3"])

left_headers = ["No", "大項目", "中項目", "タスク", "MAX工数", "予定工数", "開始日", "終了日", "根拠/備考"]
for col, header in enumerate(left_headers, start=1):
    cell = ws.cell(5, col, header)
    cell.fill = PatternFill("solid", fgColor=dark)
    cell.font = Font(bold=True, color=white)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = header_border

helper_headers = ["元行", "累計前", "累計後", "開始Index", "終了Index"]
for col, header in enumerate(helper_headers, start=10):
    cell = ws.cell(5, col, header)
    cell.fill = PatternFill("solid", fgColor=dark)
    cell.font = Font(bold=True, color=white)
    cell.border = header_border
    ws.column_dimensions[get_column_letter(col)].hidden = True

date_start_letter = get_column_letter(DATE_START_COL)
last_date_col = DATE_START_COL + DATE_DAYS - 1
last_date_letter = get_column_letter(last_date_col)

for col in range(DATE_START_COL, last_date_col + 1):
    letter = get_column_letter(col)
    offset = col - DATE_START_COL
    ws.column_dimensions[letter].width = 3
    ws.cell(3, col, f'=IF({letter}$4="","",IF(DAY({letter}$4)=1,TEXT({letter}$4,"yyyy/m"),""))')
    ws.cell(4, col, f'=IF(OR($A$3="",$B$3="",$A$3+{offset}>$B$3),"",$A$3+{offset})')
    ws.cell(5, col, f'=IF({letter}$4="","",CHOOSE(WEEKDAY({letter}$4,2),"月","火","水","木","金","土","日"))')
    for row in (3, 4, 5):
        cell = ws.cell(row, col)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = date_border
        cell.font = Font(size=8, bold=row == 3)
    ws.cell(4, col).number_format = "d"

widths = {
    "A": 6,
    "B": 18,
    "C": 20,
    "D": 44,
    "E": 10,
    "F": 10,
    "G": 12,
    "H": 12,
    "I": 36,
}
for col, width in widths.items():
    ws.column_dimensions[col].width = width

source_sheet = q("本番工数")
helper_range = f"{source_sheet}!${helper_letter}$22:${helper_letter}${MAX_SOURCE_ROW}"
holiday_range = f"{q('祝日設定')}!$A$2:$A$80"
last_task_row = TASK_START_ROW + MAX_TASK_ROWS - 1

for row in range(TASK_START_ROW, last_task_row + 1):
    row_index = row - TASK_START_ROW + 1
    ws.cell(row, 1, f'=IF(ROW()-{TASK_START_ROW - 1}<=$C$3,ROW()-{TASK_START_ROW - 1},"")')
    ws.cell(row, 10, f'=IF($A{row}="","",IFERROR(MATCH($A{row},{helper_range},0)+21,""))')
    ws.cell(row, 2, f'=IF($J{row}="","",IFERROR(LOOKUP(2,1/({source_sheet}!$C$22:INDEX({source_sheet}!$C:$C,$J{row})<>""),{source_sheet}!$C$22:INDEX({source_sheet}!$C:$C,$J{row})),""))')
    ws.cell(row, 3, f'=IF($J{row}="","",IFERROR(LOOKUP(2,1/({source_sheet}!$D$22:INDEX({source_sheet}!$D:$D,$J{row})<>""),{source_sheet}!$D$22:INDEX({source_sheet}!$D:$D,$J{row})),""))')
    ws.cell(row, 4, f'=IF($J{row}="","",IF(INDEX({source_sheet}!$E:$E,$J{row})<>"",INDEX({source_sheet}!$E:$E,$J{row}),$C{row}))')
    ws.cell(row, 5, f'=IF($J{row}="","",INDEX({source_sheet}!$H:$H,$J{row}))')
    ws.cell(row, 6, f'=IF($E{row}="","",$E{row}*$E$3)')
    ws.cell(row, 11, f'=IF($A{row}="","",SUM($F${TASK_START_ROW}:F{row - 1}))')
    ws.cell(row, 12, f'=IF($A{row}="","",SUM($F${TASK_START_ROW}:F{row}))')
    ws.cell(row, 13, f'=IF($A{row}="","",IF($G$3<=0,"",INT($K{row}/$G$3)+1))')
    ws.cell(row, 14, f'=IF($A{row}="","",IF($G$3<=0,"",ROUNDUP($L{row}/$G$3,0)))')
    ws.cell(row, 7, f'=IF($M{row}="","",IF($H$3="休みなし",$A$3+$M{row}-1,IF($H$3="土日祝休み",WORKDAY.INTL($A$3-1,$M{row},"0000011",{holiday_range}),WORKDAY.INTL($A$3-1,$M{row},"0000011"))))')
    ws.cell(row, 8, f'=IF($N{row}="","",IF($H$3="休みなし",$A$3+$N{row}-1,IF($H$3="土日祝休み",WORKDAY.INTL($A$3-1,$N{row},"0000011",{holiday_range}),WORKDAY.INTL($A$3-1,$N{row},"0000011"))))')
    ws.cell(row, 9, f'=IF($J{row}="","",IFERROR(INDEX({source_sheet}!$I:$I,$J{row}),""))')

    for col in range(1, 15):
        cell = ws.cell(row, col)
        cell.border = border
        cell.font = Font(size=8)
        cell.alignment = Alignment(
            horizontal="left" if col in {2, 3, 4, 9} else "center",
            vertical="center",
            wrap_text=col in {4, 9},
        )
        if col in {5, 6}:
            cell.fill = PatternFill("solid", fgColor=linked_fill)
            cell.number_format = "0.0"
        elif col in {7, 8}:
            cell.number_format = "yyyy/m/d"
    ws.row_dimensions[row].height = 18

for row in range(1, 6):
    ws.row_dimensions[row].height = 20
ws.row_dimensions[1].height = 30
ws.row_dimensions[5].height = 24

date_range = f"{date_start_letter}4:{last_date_letter}{last_task_row}"
task_bar_range = f"{date_start_letter}{TASK_START_ROW}:{last_date_letter}{last_task_row}"
weekend_formula = f'=AND({date_start_letter}$4<>"",$H$3<>"休みなし",WEEKDAY({date_start_letter}$4,2)>5)'
holiday_formula = f'=AND({date_start_letter}$4<>"",$H$3="土日祝休み",COUNTIF({holiday_range},{date_start_letter}$4)>0)'
bar_formula = (
    f'=AND({date_start_letter}$4<>"",$A{TASK_START_ROW}<>"",{date_start_letter}$4>=$G{TASK_START_ROW},'
    f'{date_start_letter}$4<=$H{TASK_START_ROW},OR($H$3="休みなし",WEEKDAY({date_start_letter}$4,2)<=5),'
    f'OR($H$3<>"土日祝休み",COUNTIF({holiday_range},{date_start_letter}$4)=0))'
)
ws.conditional_formatting.add(date_range, FormulaRule(formula=[weekend_formula], fill=PatternFill("solid", fgColor=weekend_fill)))
ws.conditional_formatting.add(date_range, FormulaRule(formula=[holiday_formula], fill=PatternFill("solid", fgColor=holiday_fill)))
ws.conditional_formatting.add(task_bar_range, FormulaRule(formula=[bar_formula], fill=PatternFill("solid", fgColor=bar_fill)))

for row in range(TASK_START_ROW, last_task_row + 1):
    for col in range(DATE_START_COL, last_date_col + 1):
        ws.cell(row, col).border = Border(left=hair, right=hair, top=hair, bottom=hair)

legend_row = last_task_row + 3
ws.cell(legend_row, 1, "凡例")
ws.cell(legend_row, 1).font = Font(bold=True)
for idx, (label, color) in enumerate([("予定作業", bar_fill), ("土日", weekend_fill), ("祝日", holiday_fill), ("入力セル", input_fill)], start=2):
    cell = ws.cell(legend_row, idx, label)
    cell.fill = PatternFill("solid", fgColor=color)
    cell.border = border
    cell.alignment = Alignment(horizontal="center")

ws.auto_filter.ref = f"A5:I{last_task_row}"
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.orientation = "landscape"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0

for sheet in wb.worksheets:
    sheet.sheet_view.tabSelected = False
ws.sheet_view.tabSelected = True
wb.active = wb.sheetnames.index("ダウンチャート")

wb.calculation.fullCalcOnLoad = True
wb.calculation.forceFullCalc = True
wb.calculation.calcMode = "auto"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)
print(OUTPUT)
print("task_formula_rows", MAX_TASK_ROWS)
print("date_days", DATE_DAYS)
