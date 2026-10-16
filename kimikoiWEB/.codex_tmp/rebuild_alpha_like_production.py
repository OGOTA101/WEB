from copy import copy
from datetime import date, datetime, timedelta
from math import ceil, floor
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


INPUT = Path(r"C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_自動化完成版.xlsx")
OUTPUT = Path(r"C:/Users/ihogo/Desktop/WEB/kimikoiWEB/outputs/kimikoi_kousu/きみこい・工数表_ダウンチャート_α版.xlsx")

START_DATE = date(2026, 6, 1)
ALPHA_TARGET = date(2026, 11, 30)
POST_ALPHA_START = date(2026, 12, 1)

ALPHA_FILL = "E2F0D9"
POST_FILL = "FFF2CC"
BAR_FILL = "9DC3E6"
TARGET_FILL = "F4B183"
WEEKEND_FILL = "E7E6E6"
HOLIDAY_FILL = "FCE4D6"
HEADER_FILL = "1F4E78"


def as_date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def is_workday(day, holidays):
    return day.weekday() < 5 and day not in holidays


def workdays_from(start_day, count, holidays):
    days = []
    current = start_day
    while len(days) < count:
        if is_workday(current, holidays):
            days.append(current)
        current += timedelta(days=1)
    return days


def schedule_phase(tasks, start_day, holidays, daily_capacity=1.0):
    total_effort = sum(task["planned"] for task in tasks)
    workday_count = max(1, ceil(total_effort / daily_capacity))
    workdays = workdays_from(start_day, workday_count, holidays)
    cumulative = 0.0
    for task in tasks:
        before = cumulative
        after = cumulative + task["planned"]
        start_index = floor(before / daily_capacity) + 1
        end_index = max(start_index, ceil(after / daily_capacity))
        task["phase_cum_before"] = before
        task["phase_cum_after"] = after
        task["start_index"] = start_index
        task["end_index"] = end_index
        task["start_date"] = workdays[start_index - 1]
        task["end_date"] = workdays[end_index - 1]
        cumulative = after


def alpha_decision(no):
    alpha = set(range(1, 121)) | set(range(131, 156))
    alpha |= {178, 179, 180, 181, 183, 184}
    alpha |= {186, 187, 188, 194}
    alpha |= {197, 198, 199, 200}
    alpha |= {209, 210, 211, 212, 213}
    alpha |= {217, 218, 223, 224, 233}

    alpha -= set(range(83, 87))   # backlog replay is useful but not a route blocker.
    alpha -= set(range(94, 97))   # skip functions can wait for beta/polish.
    alpha -= {145, 152, 153}      # gauge/recollection/diagnosis presentation can wait.
    alpha -= {203, 212}           # layer validation and interruption safety are QA-ish.
    return no in alpha


def decision_reason(task):
    no = task["no"]
    large = task["large"] or ""
    mid = task["mid"] or ""
    name = task["task"] or ""
    if task["alpha"]:
        if no <= 17:
            return "α版：制作前提ツール/環境として必須"
        if large.startswith(("01.", "02.", "03.")):
            return "α版：全ルート通しプレイの基盤/ADV中核"
        if large.startswith("04.") and no <= 120:
            return "α版：ルート進行で使うアプリ機能"
        if large.startswith("05."):
            return "α版：分岐・周回・ED到達に必要"
        if large.startswith("07."):
            return "α版：実装確認用の開発/ビルド補助"
        if "表情" in large or "Spine" in large:
            return "α版：最低限の表示切替/フォールバック"
        if "タッチ" in large:
            return "α版：入力判定とパラメータ連携の最低限"
        if "技術剪定" in large:
            return "α版：実装前に潰すべき技術リスク"
        if "シナリオ" in large:
            return "α版：Exeで全ルートを読ませるための必須導線"
        return "α版：通しプレイに必要"

    if "統合/QA" in large:
        return "後回し：QA/検証はα後"
    if large.startswith("06."):
        return "後回し：演出の品質・特殊挙動はα後"
    if large.startswith("07.") and "Steam" in mid:
        return "後回し：Steam/製品化対応はα後"
    if large.startswith("04.") and no >= 121:
        return "後回し：設定/便利機能は通しプレイ後"
    if "表情" in large or "Spine" in large:
        return "後回し：最適化/検証はα後"
    if "タッチ" in large:
        return "後回し：チューニング/細部挙動はα後"
    if "シナリオ" in large:
        return "後回し：追加デバッグ/保護機能はα後"
    return "後回し：α版の通しプレイには必須でない"


def copy_sheet(wb, source_name, target_name):
    if target_name in wb.sheetnames:
        del wb[target_name]
    ws = wb.copy_worksheet(wb[source_name])
    ws.title = target_name
    return ws


def set_header(cell, value):
    cell.value = value
    cell.font = Font(color="FFFFFF", bold=True)
    cell.fill = PatternFill("solid", fgColor=HEADER_FILL)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = Border(bottom=Side(style="thin", color="B7B7B7"))


def clear_cell_soft(cell):
    cell.value = None
    cell.fill = PatternFill(fill_type=None)


def build():
    wb = load_workbook(INPUT, data_only=False)
    holidays_ws = wb["祝日設定"]
    holidays = {
        as_date(holidays_ws.cell(row, 1).value)
        for row in range(2, holidays_ws.max_row + 1)
        if holidays_ws.cell(row, 1).value
    }

    source_chart = wb["ダウンチャート"]
    tasks = []
    for row in range(6, source_chart.max_row + 1):
        no = source_chart.cell(row, 1).value
        if not isinstance(no, int):
            continue
        task = {
            "no": no,
            "large": source_chart.cell(row, 2).value,
            "mid": source_chart.cell(row, 3).value,
            "task": source_chart.cell(row, 4).value,
            "effort": float(source_chart.cell(row, 5).value or 0),
            "planned": float(source_chart.cell(row, 6).value or 0),
            "reason": source_chart.cell(row, 9).value,
            "source_row": source_chart.cell(row, 10).value,
        }
        task["alpha"] = alpha_decision(no)
        task["phase"] = "α版（全ルート通しプレイ必須）" if task["alpha"] else "11月末以降（後回し）"
        task["decision"] = decision_reason(task)
        tasks.append(task)

    alpha_tasks = [task for task in tasks if task["alpha"]]
    post_tasks = [task for task in tasks if not task["alpha"]]
    schedule_phase(alpha_tasks, START_DATE, holidays)
    schedule_phase(post_tasks, POST_ALPHA_START, holidays)
    scheduled = alpha_tasks + post_tasks

    alpha_effort = sum(task["planned"] for task in alpha_tasks)
    post_effort = sum(task["planned"] for task in post_tasks)
    total_effort = alpha_effort + post_effort
    alpha_complete = max(task["end_date"] for task in alpha_tasks)
    final_complete = max(task["end_date"] for task in scheduled)

    effort_ws = copy_sheet(wb, "本番工数", "α版工数")
    effort_ws.sheet_view.showGridLines = False
    effort_ws["C14"] = "α版工数サマリ"
    effort_ws["D14"] = f"α {alpha_effort:.1f} / 後回し {post_effort:.1f}"
    effort_ws["F14"] = "全体工数は変更せず、通しプレイ必須分を11月末までに前倒し"
    effort_ws["C18"] = "α版完了目安"
    effort_ws["D18"] = alpha_complete
    effort_ws["D18"].number_format = "yyyy-mm-dd"
    effort_ws["F18"] = "目標: 2026-11-30 以内"
    effort_ws["L21"] = "α版/後回し判断"
    set_header(effort_ws["L21"], "α版/後回し判断")
    effort_ws.column_dimensions["L"].width = max(effort_ws.column_dimensions["L"].width or 0, 28)

    by_source = {task["source_row"]: task for task in tasks}
    for row, task in by_source.items():
        if not isinstance(row, int) or row > effort_ws.max_row:
            continue
        effort_ws.cell(row, 12).value = task["decision"]
        effort_ws.cell(row, 12).alignment = Alignment(wrap_text=True, vertical="top")
        fill = ALPHA_FILL if task["alpha"] else POST_FILL
        for col in range(2, 13):
            effort_ws.cell(row, col).fill = PatternFill("solid", fgColor=fill)

    chart_ws = copy_sheet(wb, "ダウンチャート", "α版ダウンチャート")
    chart_ws.sheet_view.showGridLines = False
    chart_ws["A1"] = "きみこい α版工数 ダウンチャート（本番書式準拠）"
    chart_ws["A1"].font = Font(size=16, bold=True, color="FFFFFF")

    labels = [
        ("A2", "開始日", START_DATE),
        ("B2", "終了目安", final_complete),
        ("C2", "タスク数", len(scheduled)),
        ("D2", "MAX工数合計", round(sum(task["effort"] for task in scheduled), 3)),
        ("E2", "バッファ係数", 1.25),
        ("F2", "予定工数合計", round(total_effort, 3)),
        ("G2", "日次消化力", 1),
        ("H2", "休日前提", "土日祝休み"),
    ]
    for cell_ref, label, value in labels:
        col = chart_ws[cell_ref].column
        set_header(chart_ws.cell(2, col), label)
        chart_ws.cell(3, col).value = value
        chart_ws.cell(3, col).alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        if isinstance(value, date):
            chart_ws.cell(3, col).number_format = "yyyy-mm-dd"
        elif isinstance(value, float):
            chart_ws.cell(3, col).number_format = "0.000"

    chart_ws["I2"] = (
        "α版: 全ルート通しプレイ必須分を2026-11-30までに完了。"
        f" α版予定工数 {alpha_effort:.3f}人日 / 11月末以降 {post_effort:.3f}人日。"
        " 開始日・バッファ係数・日次消化力・休日前提を変更すると、Excel再計算で日付とバーが更新されます。"
    )
    chart_ws["I2"].fill = PatternFill("solid", fgColor="E2F0D9")
    chart_ws["I2"].font = Font(color="000000")
    chart_ws["I2"].alignment = Alignment(vertical="center", wrap_text=True)
    if "I2:N3" not in [str(r) for r in chart_ws.merged_cells.ranges]:
        chart_ws.merge_cells("I2:N3")

    headers = ["No", "大項目", "中項目", "タスク", "工数", "予定工数", "開始日", "終了日", "根拠/備考", "元行", "累計前", "累計後", "開始Index", "終了Index"]
    for col, header in enumerate(headers, 1):
        set_header(chart_ws.cell(5, col), header)

    max_row = max(chart_ws.max_row, 270)
    max_col = max(chart_ws.max_column, 380)
    for row in range(6, max_row + 1):
        for col in range(1, max_col + 1):
            clear_cell_soft(chart_ws.cell(row, col))

    timeline_start_col = 15
    min_timeline = START_DATE
    max_timeline = final_complete
    days = []
    current = min_timeline
    while current <= max_timeline:
        days.append(current)
        current += timedelta(days=1)
    last_col_letter = get_column_letter(timeline_start_col + len(days) - 1)

    for col in range(timeline_start_col, max_col + 1):
        for row in range(3, 6):
            clear_cell_soft(chart_ws.cell(row, col))

    weekdays = ["月", "火", "水", "木", "金", "土", "日"]
    for offset, day in enumerate(days):
        col = timeline_start_col + offset
        col_letter = get_column_letter(col)
        month = chart_ws.cell(3, col)
        month.value = f"{day.year}/{day.month}" if day.day == 1 else None
        month.font = Font(size=8, bold=True)
        month.alignment = Alignment(horizontal="center")
        day_cell = chart_ws.cell(4, col)
        day_cell.value = day
        day_cell.number_format = "m/d"
        day_cell.alignment = Alignment(horizontal="center")
        day_cell.font = Font(size=8)
        week_cell = chart_ws.cell(5, col)
        week_cell.value = weekdays[day.weekday()]
        week_cell.alignment = Alignment(horizontal="center")
        week_cell.font = Font(size=8, bold=True)
        chart_ws.column_dimensions[get_column_letter(col)].width = 3.0

    for idx, task in enumerate(scheduled, 6):
        values = [
            task["no"], task["large"], task["mid"], task["task"], task["effort"], task["planned"],
            task["start_date"], task["end_date"], task["decision"], task["source_row"],
            task["phase_cum_before"], task["phase_cum_after"], task["start_index"], task["end_index"],
        ]
        fill = ALPHA_FILL if task["alpha"] else POST_FILL
        for col, value in enumerate(values, 1):
            cell = chart_ws.cell(idx, col)
            cell.value = value
            cell.alignment = Alignment(vertical="top", wrap_text=(col in [4, 9, 15]))
            cell.border = Border(bottom=Side(style="hair", color="D9E2F3"))
            if col in [7, 8]:
                cell.number_format = "yyyy-mm-dd"
            if col in [5, 6, 11, 12]:
                cell.number_format = "0.000"
    chart_ws.auto_filter.ref = f"A5:N{5 + len(scheduled)}"
    chart_ws.freeze_panes = "O6"

    last_row = 5 + len(scheduled)
    timeline_range = f"O4:{last_col_letter}{last_row}"
    alpha_range = f"O6:{last_col_letter}{5 + len(alpha_tasks)}"
    post_range = f"O{6 + len(alpha_tasks)}:{last_col_letter}{last_row}"
    chart_ws.conditional_formatting._cf_rules.clear()
    # Match the original chart behavior visually: the Gantt bars are real cell fills,
    # while broad calendar overlays cover the whole date area.
    for idx, task in enumerate(scheduled, 6):
        for offset, day in enumerate(days):
            cell = chart_ws.cell(idx, timeline_start_col + offset)
            cell.value = None
            if task["start_date"] <= day <= task["end_date"]:
                cell.fill = PatternFill("solid", fgColor=BAR_FILL)
    for offset, day in enumerate(days):
        col = timeline_start_col + offset
        overlay = None
        if day.weekday() >= 5:
            overlay = WEEKEND_FILL
        if day in holidays:
            overlay = HOLIDAY_FILL
        if day == ALPHA_TARGET:
            overlay = TARGET_FILL
        if overlay:
            for row in range(4, last_row + 1):
                chart_ws.cell(row, col).fill = PatternFill("solid", fgColor=overlay)

    chart_ws.conditional_formatting.add(
        timeline_range,
        FormulaRule(
            formula=['AND(O$4<>"",$H$3<>"休みなし",WEEKDAY(O$4,2)>5)'],
            fill=PatternFill("solid", fgColor=WEEKEND_FILL),
        ),
    )
    chart_ws.conditional_formatting.add(
        f"O3:{last_col_letter}{last_row}",
        FormulaRule(
            formula=['O$4=DATE(2026,11,30)'],
            fill=PatternFill("solid", fgColor=TARGET_FILL),
        ),
    )

    legend_row = 8 + len(scheduled)
    chart_ws.cell(legend_row, 1).value = "凡例"
    legend = [
        (2, "作業期間", BAR_FILL),
        (3, "後回しタスクは12/1以降に配置", POST_FILL),
        (4, "土日", WEEKEND_FILL),
        (5, "祝日", HOLIDAY_FILL),
        (6, "α版目標日", TARGET_FILL),
    ]
    for col, text, fill in legend:
        chart_ws.cell(legend_row, col).value = text
        chart_ws.cell(legend_row, col).fill = PatternFill("solid", fgColor=fill)
        chart_ws.cell(legend_row, col).alignment = Alignment(wrap_text=True)

    # Restore the left task-table borders from the original down chart.
    # The timeline area already keeps the original hairline grid.
    source_chart = wb["ダウンチャート"]
    for row in range(2, last_row + 1):
        template_row = row if row <= source_chart.max_row else source_chart.max_row
        for col in range(1, 15):
            chart_ws.cell(row, col).border = copy(source_chart.cell(template_row, col).border)

    # Keep the original three sheets first; append the adjusted sheets after them.
    wb._sheets = [wb["本番工数"], wb["ダウンチャート"], wb["祝日設定"], wb["α版工数"], wb["α版ダウンチャート"]]
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    print(build())
